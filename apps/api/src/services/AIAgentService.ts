import { ChatOpenAI } from "@langchain/openai";
import { HederaService } from "./HederaService";
import { prisma } from "../lib/prisma";

export class AIAgentService {
  private llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });

  constructor(private hedera: HederaService) {}

  startMonitoring(intervalMs = 30000) {
    setInterval(() => this.runCycle(), intervalMs);
  }

  async runCycle() {
    try {
      const batches = await prisma.batch.findMany({
        where: { status: { notIn: ["RECALLED", "DISPENSED"] } },
      });
      for (const batch of batches) {
        await this.analyzeBatch(batch);
      }
    } catch (e) {
      console.error("AI monitoring cycle error", e);
    }
  }

  private async analyzeBatch(batch: {
    id: string;
    drugName: string;
    batchNumber: string;
    expiryDate: Date;
  }) {
    const topicId = process.env.HEDERA_SUPPLY_CHAIN_TOPIC_ID!;
    const chain = await this.hedera.getBatchCustodyChain(topicId, batch.id);

    const resp = await this.llm.invoke([
      ["system", `Pharma supply chain security AI. Respond ONLY as JSON:
        { "anomalyDetected": boolean, "anomalyType": string|null,
          "severity": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL"|null, "description": string }
        Check: chain gaps, delays >48h, geographic jumps, batches expiring in transit.`],
      ["user", `Batch: ${batch.drugName} ${batch.batchNumber}, expires ${batch.expiryDate}.
        Chain (${chain.length} entries): ${JSON.stringify(chain.slice(-5))}`],
    ]);

    try {
      const r = JSON.parse(resp.content as string) as {
        anomalyDetected: boolean;
        anomalyType: string | null;
        severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
        description: string;
      };

      if (r.anomalyDetected) {
        await prisma.alert.create({
          data: {
            batchId: batch.id,
            alertType: (r.anomalyType as "CHAIN_BREAK" | "TEMPERATURE_EXCURSION" | "EXPIRY_RISK" | "COUNTERFEIT_SUSPECTED" | "RECALL") || "CHAIN_BREAK",
            severity: r.severity || "MEDIUM",
            description: r.description,
          },
        });

        await this.hedera.submitHandoffMessage(
          process.env.HEDERA_ALERTS_TOPIC_ID!,
          {
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            drugName: batch.drugName,
            event: "ANOMALY_DETECTED",
            fromParty: "AI_AGENT",
            toParty: "REGULATOR",
            fromAccountId: process.env.HEDERA_OPERATOR_ID!,
            toAccountId: "",
            kmsSignature: "AGENT_SIGNED",
            kmsKeyId: "SYSTEM",
          }
        );
      }
    } catch (e) {
      console.error("AI parse error", e);
    }
  }
}
