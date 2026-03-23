export type BatchStatus =
  | "MANUFACTURED"
  | "DISTRIBUTED"
  | "IN_TRANSIT"
  | "AT_PHARMACY"
  | "DISPENSED"
  | "RECALLED"
  | "FLAGGED";

export interface Batch {
  id: string;
  batchNumber: string;
  drugName: string;
  genericName: string;
  ndcCode: string;
  lotNumber: string;
  manufacturerId: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  strengthMg: number;
  htsTokenId?: string;
  htsSerialNumber?: number;
  ipfsHash?: string;
  status: BatchStatus;
  createdAt: string;
}

export interface CreateBatchInput {
  drugName: string;
  genericName: string;
  ndcCode: string;
  lotNumber: string;
  manufacturerId: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  strengthMg: number;
}
