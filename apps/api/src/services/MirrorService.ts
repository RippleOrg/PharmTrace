import axios from "axios";
import type { HCSMessage } from "./HederaService";

const BASE_URL_TESTNET = "https://testnet.mirrornode.hedera.com/api/v1";
const BASE_URL_MAINNET = "https://mainnet.mirrornode.hedera.com/api/v1";

export class MirrorService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.HEDERA_NETWORK === "mainnet"
        ? BASE_URL_MAINNET
        : BASE_URL_TESTNET;
  }

  async getTopicMessages(
    topicId: string,
    limit = 100
  ): Promise<HCSMessage[]> {
    const resp = await axios.get(
      `${this.baseUrl}/topics/${topicId}/messages?limit=${limit}`
    );
    const messages = resp.data?.messages ?? [];
    return messages.map(
      (m: { sequence_number: number; consensus_timestamp: string; message: string }) => ({
        sequenceNumber: m.sequence_number,
        timestamp: m.consensus_timestamp,
        message: JSON.parse(Buffer.from(m.message, "base64").toString()),
      })
    );
  }

  async getTokenInfo(tokenId: string) {
    const resp = await axios.get(`${this.baseUrl}/tokens/${tokenId}`);
    return resp.data;
  }

  async getNftInfo(tokenId: string, serialNumber: number) {
    const resp = await axios.get(
      `${this.baseUrl}/tokens/${tokenId}/nfts/${serialNumber}`
    );
    return resp.data;
  }

  async getAccountBalance(accountId: string) {
    const resp = await axios.get(
      `${this.baseUrl}/balances?account.id=${accountId}`
    );
    return resp.data;
  }

  getHashScanUrl(tokenId: string, serialNumber?: number): string {
    const network =
      process.env.HEDERA_NETWORK === "mainnet" ? "mainnet" : "testnet";
    if (serialNumber !== undefined) {
      return `https://hashscan.io/${network}/token/${tokenId}/${serialNumber}`;
    }
    return `https://hashscan.io/${network}/token/${tokenId}`;
  }
}
