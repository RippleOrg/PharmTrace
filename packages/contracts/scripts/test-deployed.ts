import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Testing contracts with:", deployer.address);

  const BATCH_REGISTRY_ADDRESS = "0x99E649c8a79C23B949b6fEBe734980590cf7F21C";
  const RECALL_MANAGER_ADDRESS = "0xA5c6be9555523779AaE828848b7c87FCE957DBA4";

  const batchRegistry = await ethers.getContractAt("BatchRegistry", BATCH_REGISTRY_ADDRESS);
  const recallManager = await ethers.getContractAt("RecallManager", RECALL_MANAGER_ADDRESS);

  const gasOptions = { gasLimit: 1000000 };

  console.log("\n1. Authorizing manufacturer...");
  let tx = await batchRegistry.authorizeManufacturer(deployer.address, gasOptions);
  await tx.wait();
  console.log("✅ Manufacturer authorized on BatchRegistry");

  tx = await recallManager.authorizeManufacturer(deployer.address, gasOptions);
  await tx.wait();
  console.log("✅ Manufacturer authorized on RecallManager");

  console.log("\n2. Registering a test batch...");
  const testBatchId = "TEST-BATCH-" + Date.now();
  tx = await batchRegistry.registerBatch(
    testBatchId,
    "Test Drug",
    "0.0.12345",
    1,
    "0.0.99999",
    gasOptions
  );
  await tx.wait();
  console.log(`✅ Batch ${testBatchId} registered`);

  console.log("\n3. Verifying batch registration...");
  const batch = await batchRegistry.getBatch(testBatchId);
  console.log("Registered Batch Drug Name:", batch.drugName);

  console.log("\n4. Initiating a recall...");
  tx = await recallManager.initiateRecall(
    testBatchId,
    "Contamination detected",
    ["LOT-A", "LOT-B"],
    gasOptions
  );
  await tx.wait();
  console.log(`✅ Recall initiated for ${testBatchId}`);

  console.log("\n5. Verifying recall status...");
  const isRecalled = await recallManager.isRecalled(testBatchId);
  console.log("Is Recalled?", isRecalled);

  console.log("\nAll tests passed successfully! 🚀");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
