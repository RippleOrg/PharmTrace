import { Router, Response } from "express";
import { z } from "zod";
import { PrivateKey } from "@hashgraph/sdk";
import { prisma } from "../lib/prisma";
import { HederaService } from "../services/HederaService";
import { KMSService } from "../services/KMSService";
import { auth, AuthRequest } from "../middleware/auth";

const router = Router();
const hedera = new HederaService();
const kms = new KMSService();

const CreateHandoffSchema = z.object({
  batchId: z.string().min(1),
  fromParty: z.string().min(1),
  fromPartyType: z.enum(["MANUFACTURER", "DISTRIBUTOR", "PHARMACY", "HOSPITAL", "REGULATOR"]),
  toParty: z.string().min(1),
  toPartyType: z.enum(["MANUFACTURER", "DISTRIBUTOR", "PHARMACY", "HOSPITAL", "REGULATOR"]),
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  fromPrivateKey: z.string().optional(),
  temperature: z.number().optional(),
  location: z.string().optional(),
});

// GET /api/handoffs — list handoffs (optionally filtered by batchId)
router.get("/", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { batchId } = req.query;
    const handoffs = await prisma.handoff.findMany({
      where: batchId ? { batchId: batchId as string } : undefined,
      include: { batch: { select: { drugName: true, batchNumber: true } } },
      orderBy: { timestamp: "desc" },
    });
    res.json(handoffs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch handoffs" });
  }
});

// POST /api/handoffs — record a batch handoff
router.post("/", auth, async (req: AuthRequest, res: Response) => {
  try {
    const data = CreateHandoffSchema.parse(req.body);

    const batch = await prisma.batch.findUniqueOrThrow({
      where: { id: data.batchId },
      include: { manufacturer: true },
    });

    // Sign the handoff data with KMS
    const { signature, keyId } = await kms.signHandoffData(
      batch.manufacturer.kmsKeyId,
      {
        batchId: data.batchId,
        fromParty: data.fromParty,
        toParty: data.toParty,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        temperature: data.temperature,
        location: data.location,
      }
    );

    // Submit to HCS
    const hcsSeq = await hedera.submitHandoffMessage(
      process.env.HEDERA_SUPPLY_CHAIN_TOPIC_ID!,
      {
        batchId: data.batchId,
        batchNumber: batch.batchNumber,
        drugName: batch.drugName,
        event: `HANDOFF_${data.fromPartyType}_TO_${data.toPartyType}`,
        fromParty: data.fromParty,
        toParty: data.toParty,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        temperature: data.temperature,
        location: data.location,
        kmsSignature: signature,
        kmsKeyId: keyId,
      }
    );

    // Transfer NFT if private key provided
    if (
      data.fromPrivateKey &&
      batch.htsTokenId &&
      batch.htsSerialNumber !== null
    ) {
      const fromKey = PrivateKey.fromString(data.fromPrivateKey);
      await hedera.transferBatchNFT(
        batch.htsTokenId,
        batch.htsSerialNumber!,
        data.fromAccountId,
        data.toAccountId,
        fromKey
      );
    }

    // Determine new batch status
    const statusMap: Record<string, "DISTRIBUTED" | "IN_TRANSIT" | "AT_PHARMACY"> = {
      DISTRIBUTOR: "DISTRIBUTED",
      PHARMACY: "AT_PHARMACY",
      HOSPITAL: "AT_PHARMACY",
    };
    const newStatus = statusMap[data.toPartyType] ?? "IN_TRANSIT";

    const [handoff] = await prisma.$transaction([
      prisma.handoff.create({
        data: {
          batchId: data.batchId,
          fromParty: data.fromParty,
          fromPartyType: data.fromPartyType,
          toParty: data.toParty,
          toPartyType: data.toPartyType,
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          hcsMessageId: hcsSeq,
          hcsTopicId: process.env.HEDERA_SUPPLY_CHAIN_TOPIC_ID!,
          kmsSignature: signature,
          temperature: data.temperature,
          location: data.location,
        },
      }),
      prisma.batch.update({
        where: { id: data.batchId },
        data: { status: newStatus },
      }),
    ]);

    res.status(201).json({ handoff, hcsSequenceNumber: hcsSeq });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to create handoff" });
  }
});

export default router;
