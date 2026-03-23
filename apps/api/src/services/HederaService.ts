import {
  Client,
  AccountId,
  PrivateKey,
  TokenId,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  NftId,
  TokenMintTransaction,
  TransferTransaction,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  Hbar,
} from "@hashgraph/sdk";

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
}

export interface HCSMessage {
  sequenceNumber: number;
  timestamp: string;
  message: HandoffMessage & { timestamp?: string; v?: string };
}

export interface VerificationResult {
  verified: boolean;
  reason: string;
  chain: HCSMessage[];
  handoffCount?: number;
  latestEvent?: string;
}

export class HederaService {
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;

  constructor() {
    this.operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID!);
    this.operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY!);
    this.client =
      process.env.HEDERA_NETWORK === "mainnet"
        ? Client.forMainnet()
        : Client.forTestnet();
    this.client.setOperator(this.operatorId, this.operatorKey);
  }

  async createDrugBatchCollection(
    drugName: string,
    symbol: string
  ): Promise<string> {
    const tx = await new TokenCreateTransaction()
      .setTokenName(`PharmTrace: ${drugName}`)
      .setTokenSymbol(symbol.toUpperCase().slice(0, 10))
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(TokenSupplyType.Infinite)
      .setTreasuryAccountId(this.operatorId)
      .setSupplyKey(this.operatorKey)
      .setAdminKey(this.operatorKey)
      .setMaxTransactionFee(new Hbar(30))
      .execute(this.client);
    const receipt = await tx.getReceipt(this.client);
    return receipt.tokenId!.toString();
  }

  async mintBatchNFT(tokenId: string, metadataUri: string): Promise<number> {
    const tx = await new TokenMintTransaction()
      .setTokenId(TokenId.fromString(tokenId))
      .addMetadata(Buffer.from(metadataUri))
      .setMaxTransactionFee(new Hbar(10))
      .execute(this.client);
    const receipt = await tx.getReceipt(this.client);
    return receipt.serials[0].toNumber();
  }

  async transferBatchNFT(
    tokenId: string,
    serial: number,
    from: string,
    to: string,
    fromKey: PrivateKey
  ): Promise<string> {
    const tx = await new TransferTransaction()
      .addNftTransfer(
        new NftId(TokenId.fromString(tokenId), serial),
        AccountId.fromString(from),
        AccountId.fromString(to)
      )
      .freezeWith(this.client);
    const signed = await tx.sign(fromKey);
    const resp = await signed.execute(this.client);
    await resp.getReceipt(this.client);
    return resp.transactionId.toString();
  }

  async createSupplyChainTopic(memo: string): Promise<string> {
    const tx = await new TopicCreateTransaction()
      .setTopicMemo(memo)
      .setSubmitKey(this.operatorKey)
      .execute(this.client);
    return (await tx.getReceipt(this.client)).topicId!.toString();
  }

  async submitHandoffMessage(
    topicId: string,
    message: HandoffMessage
  ): Promise<string> {
    const payload = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
      v: "1.0",
    });
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(payload)
      .setMaxTransactionFee(new Hbar(2))
      .execute(this.client);
    return (await tx.getReceipt(this.client)).topicSequenceNumber!.toString();
  }

  async getBatchCustodyChain(
    topicId: string,
    batchId: string
  ): Promise<HCSMessage[]> {
    const network =
      process.env.HEDERA_NETWORK === "mainnet" ? "mainnet" : "testnet";
    const url = `https://${network}.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?limit=100`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = await resp.json() as { messages?: Array<{ sequence_number: number; consensus_timestamp: string; message: string }> };
    return (data.messages ?? [])
      .map((m: { sequence_number: number; consensus_timestamp: string; message: string }) => ({
        sequenceNumber: m.sequence_number,
        timestamp: m.consensus_timestamp,
        message: JSON.parse(Buffer.from(m.message, "base64").toString()),
      }))
      .filter((m: HCSMessage) => m.message.batchId === batchId);
  }

  async verifyChainIntegrity(
    batchId: string,
    topicId: string
  ): Promise<VerificationResult> {
    const chain = await this.getBatchCustodyChain(topicId, batchId);
    if (chain.length === 0) {
      return { verified: false, reason: "NO_CHAIN_FOUND", chain: [] };
    }
    for (let i = 1; i < chain.length; i++) {
      if (chain[i].message.fromParty !== chain[i - 1].message.toParty) {
        return {
          verified: false,
          reason: "CHAIN_BREAK",
          chain,
          handoffCount: chain.length,
        };
      }
    }
    return {
      verified: true,
      reason: "VERIFIED",
      chain,
      handoffCount: chain.length,
      latestEvent: chain[chain.length - 1]?.message?.event,
    };
  }
}
