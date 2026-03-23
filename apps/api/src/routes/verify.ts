import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { HederaService } from "../services/HederaService";

const router = Router();
const hedera = new HederaService();

// GET /api/verify/:batchId — public verification endpoint
router.get("/:batchId", async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        manufacturer: true,
        handoffs: { orderBy: { timestamp: "asc" } },
        alerts: true,
      },
    });

    if (!batch) {
      return res.status(404).json({ verified: false, reason: "BATCH_NOT_FOUND" });
    }

    // Check if recalled
    if (batch.status === "RECALLED") {
      return res.json({
        verified: false,
        reason: "BATCH_RECALLED",
        batch: {
          id: batch.id,
          batchNumber: batch.batchNumber,
          drugName: batch.drugName,
          manufacturer: batch.manufacturer.name,
          status: batch.status,
        },
      });
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
