import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log("Network chain ID:", (await ethers.provider.getNetwork()).chainId);

  // Deploy BatchRegistry
  const BatchRegistry = await ethers.getContractFactory("BatchRegistry");
  const batchRegistry = await BatchRegistry.deploy();
  await batchRegistry.waitForDeployment();
  const batchRegistryAddr = await batchRegistry.getAddress();
  console.log("BatchRegistry deployed to:", batchRegistryAddr);

  // Deploy RecallManager
  const RecallManager = await ethers.getContractFactory("RecallManager");
  const recallManager = await RecallManager.deploy();
  await recallManager.waitForDeployment();
  const recallManagerAddr = await recallManager.getAddress();
  console.log("RecallManager deployed to:", recallManagerAddr);

  console.log("\nAdd to your .env:");
  console.log(`HEDERA_BATCH_REGISTRY_ADDRESS=${batchRegistryAddr}`);
  console.log(`HEDERA_RECALL_MANAGER_ADDRESS=${recallManagerAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
