export interface VerificationResult {
  verified: boolean;
  reason: string;
  chain: HCSMessage[];
  handoffCount?: number;
  latestEvent?: string;
}

export interface HCSMessage {
  sequenceNumber: number;
  timestamp: string;
  message: HandoffMessage;
}

export interface HandoffMessage {
  batchId: string;
  batchNumber: string;
  drugName: string;
  event: string;
  fromParty: string;
  toParty: string;
  fromAccountId: string;
  toAccountId: string;
  temperature?: number;
  location?: string;
  kmsSignature: string;
  kmsKeyId: string;
  timestamp?: string;
  v?: string;
}

export type AlertType =
  | "CHAIN_BREAK"
  | "TEMPERATURE_EXCURSION"
  | "EXPIRY_RISK"
  | "COUNTERFEIT_SUSPECTED"
  | "RECALL";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Alert {
  id: string;
  batchId: string;
  alertType: AlertType;
  severity: Severity;
  description: string;
  aiAnalysis?: string;
  resolved: boolean;
  createdAt: string;
}
