import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HederaService } from "../services/HederaService";
import { KMSService } from "../services/KMSService";
import { IPFSService } from "../services/IPFSService";
import { auth, AuthRequest } from "../middleware/auth";

const router = Router();
const hedera = new HederaService();
const kms = new KMSService();
const ipfs = new IPFSService();

const CreateBatchSchema = z.object({
  drugName: z.string().min(1),
  genericName: z.string().min(1),
  ndcCode: z.string().min(1),
  lotNumber: z.string().min(1),
  manufacturerId: z.string().min(1),
  manufactureDate: z.string().datetime(),
  expiryDate: z.string().datetime(),
  quantity: z.number().int().positive(),
  strengthMg: z.number().positive(),
});

// GET /api/batches — list all batches
router.get("/", auth, async (req: AuthRequest, res: Response) => {
  try {
    const batches = await prisma.batch.findMany({
      include: {
        manufacturer: { select: { name: true, licenseNumber: true } },
        _count: { select: { handoffs: true, alerts: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(batches);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch batches" });
  }
});

// POST /api/batches — mint NFT, publish HCS genesis, sign with KMS
router.post("/", auth, async (req: AuthRequest, res: Response) => {
  try {
    const data = CreateBatchSchema.parse(req.body);
    const mfr = await prisma.manufacturer.findUniqueOrThrow({
      where: { id: data.manufacturerId },
    });

    const ipfsHash = await ipfs.uploadJSON({
      ...data,
      manufacturer: mfr.name,
    });

    const tokenId =
      mfr.htsTokenId ||
      (await hedera.createDrugBatchCollection(
        data.drugName,
        data.genericName.slice(0, 6)
      ));

    const serial = await hedera.mintBatchNFT(
      tokenId,
      `ipfs://${ipfsHash}`
    );

    const { signature, keyId } = await kms.signHandoffData(mfr.kmsKeyId, {
      ...data,
      serial,
      tokenId,
      event: "MANUFACTURED",
    });

    const hcsSeq = await hedera.submitHandoffMessage(
      process.env.HEDERA_SUPPLY_CHAIN_TOPIC_ID!,
      {
        batchId: "GENESIS",
        batchNumber: data.lotNumber,
        drugName: data.drugName,
        event: "MANUFACTURED",
        fromParty: mfr.name,
        toParty: mfr.name,
        fromAccountId: mfr.hederaAccountId,
        toAccountId: mfr.hederaAccountId,
        kmsSignature: signature,
        kmsKeyId: keyId,
      }
    );

    const batch = await prisma.batch.create({
      data: {
        ...data,
        batchNumber: `PT-${Date.now()}`,
        manufactureDate: new Date(data.manufactureDate),
        expiryDate: new Date(data.expiryDate),
        htsTokenId: tokenId,
        htsSerialNumber: serial,
        ipfsHash,
        handoffs: {
          create: {
            fromParty: mfr.name,
            fromPartyType: "MANUFACTURER",
            toParty: mfr.name,
            toPartyType: "MANUFACTURER",
            fromAccountId: mfr.hederaAccountId,
            toAccountId: mfr.hederaAccountId,
            hcsMessageId: hcsSeq,
            hcsTopicId: process.env.HEDERA_SUPPLY_CHAIN_TOPIC_ID!,
            kmsSignature: signature,
          },
        },
      },
      include: { handoffs: true, manufacturer: true },
    });

    // Update htsTokenId on manufacturer if it was just created
    if (!mfr.htsTokenId) {
      await prisma.manufacturer.update({
        where: { id: mfr.id },
        data: { htsTokenId: tokenId },
      });
    }

    res.status(201).json({
      batch,
      qrUrl: `${process.env.NEXT_PUBLIC_URL}/verify/${batch.id}`,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to create batch" });
  }
});

// GET /api/batches/:id — get single batch
router.get("/:id", auth, async (req: AuthRequest, res: Response) => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: {
        manufacturer: true,
        handoffs: { orderBy: { timestamp: "asc" } },
        alerts: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });
    res.json(batch);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch batch" });
  }
});

// GET /api/batches/:id/verify — public, no auth required
router.get("/:id/verify", async (req: AuthRequest, res: Response) => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: {
        manufacturer: true,
        handoffs: { orderBy: { timestamp: "asc" } },
        alerts: true,
      },
    });
    if (!batch) {
      return res.status(404).json({ verified: false, reason: "BATCH_NOT_FOUND" });
    }

    const result = await hedera.verifyChainIntegrity(
      batch.id,
      process.env.HEDERA_SUPPLY_CHAIN_TOPIC_ID!
    );

    res.json({
      verified: result.verified,
      reason: result.reason,
      batch: {
        id: batch.id,
        batchNumber: batch.batchNumber,
        drugName: batch.drugName,
        manufacturer: batch.manufacturer.name,
        manufactureDate: batch.manufactureDate,
        expiryDate: batch.expiryDate,
        status: batch.status,
        htsTokenId: batch.htsTokenId,
        htsSerialNumber: batch.htsSerialNumber,
      },
      chain: result.chain,
      handoffCount: result.handoffCount,
      activeAlerts: batch.alerts.filter((a: { resolved: boolean }) => !a.resolved).length,
      mirrorNodeUrl: `https://hashscan.io/testnet/token/${batch.htsTokenId}/${batch.htsSerialNumber}`,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
