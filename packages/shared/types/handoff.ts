export type PartyType =
  | "MANUFACTURER"
  | "DISTRIBUTOR"
  | "PHARMACY"
  | "HOSPITAL"
  | "REGULATOR";

export interface Handoff {
  id: string;
  batchId: string;
  fromParty: string;
  fromPartyType: PartyType;
  toParty: string;
  toPartyType: PartyType;
  fromAccountId: string;
  toAccountId: string;
  hcsMessageId?: string;
  hcsTopicId: string;
  kmsSignature?: string;
  temperature?: number;
  location?: string;
  timestamp: string;
}

export interface CreateHandoffInput {
  batchId: string;
  fromParty: string;
  fromPartyType: PartyType;
  toParty: string;
  toPartyType: PartyType;
  fromAccountId: string;
  toAccountId: string;
  temperature?: number;
  location?: string;
}
