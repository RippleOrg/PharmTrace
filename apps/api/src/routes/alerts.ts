import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { auth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/alerts — list alerts
router.get("/", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { batchId, resolved, severity } = req.query;

    const alerts = await prisma.alert.findMany({
      where: {
        ...(batchId ? { batchId: batchId as string } : {}),
        ...(resolved !== undefined
          ? { resolved: resolved === "true" }
          : {}),
        ...(severity
          ? { severity: severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }
          : {}),
      },
      include: {
        batch: {
          select: {
            drugName: true,
            batchNumber: true,
            manufacturer: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(alerts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// GET /api/alerts/:id — get single alert
router.get("/:id", auth, async (req: AuthRequest, res: Response) => {
  try {
    const alert = await prisma.alert.findUnique({
      where: { id: req.params.id },
      include: {
        batch: {
          include: {
            manufacturer: true,
            handoffs: { orderBy: { timestamp: "asc" } },
          },
        },
      },
    });
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json(alert);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch alert" });
  }
});

// PATCH /api/alerts/:id/resolve — resolve an alert
router.patch("/:id/resolve", auth, async (req: AuthRequest, res: Response) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: { resolved: true },
    });
    res.json(alert);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to resolve alert" });
  }
});

export default router;
