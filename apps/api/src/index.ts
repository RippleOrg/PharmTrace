import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import batchesRouter from "./routes/batches";
import handoffsRouter from "./routes/handoffs";
import verifyRouter from "./routes/verify";
import alertsRouter from "./routes/alerts";
import { HederaService } from "./services/HederaService";
import { AIAgentService } from "./services/AIAgentService";

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/batches", batchesRouter);
app.use("/api/handoffs", handoffsRouter);
app.use("/api/verify", verifyRouter);
app.use("/api/alerts", alertsRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start AI monitoring agent
if (AIAgentService.isConfigured()) {
  try {
    const hederaService = new HederaService();
    const aiAgent = new AIAgentService(hederaService);
    aiAgent.startMonitoring();
    console.log("AI monitoring agent started");
  } catch (e) {
    console.warn("AI monitoring agent failed to start:", e);
  }
}

app.listen(PORT, () => {
  console.log(`PharmTrace API running on port ${PORT}`);
});

export default app;
