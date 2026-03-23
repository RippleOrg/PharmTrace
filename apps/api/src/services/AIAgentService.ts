import { ChatOpenAI } from "@langchain/openai";
import { HederaService } from "./HederaService";
import { prisma } from "../lib/prisma";

type AIProvider = {
  name: "openai" | "openrouter";
  llm: ChatOpenAI;
};

export class AIAgentService {
  private providers: AIProvider[];

  constructor(private hedera: HederaService) {
    this.providers = this.createProviders();

    if (this.providers.length === 0) {
      throw new Error(
        "AI monitoring requires OPENAI_API_KEY or OPENROUTER_API_KEY"
      );
    }
  }

  static isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY);
  }

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

    const resp = await this.invokeWithFallback([
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

  private createProviders(): AIProvider[] {
    const providers: AIProvider[] = [];

    if (process.env.OPENAI_API_KEY) {
      providers.push({
        name: "openai",
        llm: new ChatOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || "gpt-4o",
          temperature: 0,
        }),
      });
    }

    if (process.env.OPENROUTER_API_KEY) {
      providers.push({
        name: "openrouter",
        llm: new ChatOpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          model:
            process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash-lite",
          temperature: 0,
          configuration: {
            baseURL:
              process.env.OPENROUTER_BASE_URL ||
              "https://openrouter.ai/api/v1",
            defaultHeaders: {
              "HTTP-Referer":
                process.env.OPENROUTER_SITE_URL ||
                process.env.NEXT_PUBLIC_URL ||
                "http://localhost:3000",
              "X-Title": process.env.OPENROUTER_APP_NAME || "PharmTrace",
            },
          },
        }),
      });
    }

    return providers;
  }

  private async invokeWithFallback(
    messages: [string, string][]
  ): Promise<Awaited<ReturnType<ChatOpenAI["invoke"]>>> {
    let lastError: unknown;

    for (const provider of this.providers) {
      try {
        return await provider.llm.invoke(messages);
      } catch (error) {
        lastError = error;
        console.warn(
          `AI provider ${provider.name} failed, trying next provider`,
          error
        );
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("All AI providers failed");
  }
}
