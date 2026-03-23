#!/usr/bin/env tsx
/**
 * setup-hedera.ts
 * Creates two HCS topics for PharmTrace and writes their IDs to .env
 */
import "dotenv/config";
import {
  Client,
  AccountId,
  PrivateKey,
  TopicCreateTransaction,
} from "@hashgraph/sdk";
import * as fs from "fs";
import * as path from "path";

async function main() {
  if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_KEY) {
    console.error(
      "ERROR: HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in .env"
    );
    process.exit(1);
  }

  const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_OPERATOR_KEY!);

  const client =
    process.env.HEDERA_NETWORK === "mainnet"
      ? Client.forMainnet()
      : Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  console.log(`Creating HCS topics on Hedera ${process.env.HEDERA_NETWORK ?? "testnet"}...`);

  // Create supply chain topic
  const supplyChainTx = await new TopicCreateTransaction()
    .setTopicMemo("PharmTrace Supply Chain")
    .setSubmitKey(operatorKey)
    .execute(client);
  const supplyChainTopicId = (
    await supplyChainTx.getReceipt(client)
  ).topicId!.toString();
  console.log(`✅ Supply Chain Topic ID: ${supplyChainTopicId}`);

  // Create alerts topic
  const alertsTx = await new TopicCreateTransaction()
    .setTopicMemo("PharmTrace AI Alerts")
    .setSubmitKey(operatorKey)
    .execute(client);
  const alertsTopicId = (
    await alertsTx.getReceipt(client)
  ).topicId!.toString();
  console.log(`✅ Alerts Topic ID: ${alertsTopicId}`);

  // Update .env file
  const envPath = path.join(process.cwd(), ".env");
  let envContent = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf-8")
    : "";

  envContent = setEnvVar(envContent, "HEDERA_SUPPLY_CHAIN_TOPIC_ID", supplyChainTopicId);
  envContent = setEnvVar(envContent, "HEDERA_ALERTS_TOPIC_ID", alertsTopicId);

  fs.writeFileSync(envPath, envContent);
  console.log(`\n✅ Updated .env with topic IDs`);
  console.log(`\nAdd these to your .env if not already set:`);
  console.log(`HEDERA_SUPPLY_CHAIN_TOPIC_ID=${supplyChainTopicId}`);
  console.log(`HEDERA_ALERTS_TOPIC_ID=${alertsTopicId}`);
}

function setEnvVar(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  if (regex.test(content)) {
    return content.replace(regex, line);
  }
  return content + `\n${line}`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
