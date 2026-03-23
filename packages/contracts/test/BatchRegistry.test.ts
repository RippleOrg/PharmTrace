import { expect } from "chai";
import { ethers } from "hardhat";
import { BatchRegistry } from "../typechain-types";

describe("BatchRegistry", () => {
  let registry: BatchRegistry;
  let owner: any;
  let mfr: any;
  let other: any;

  beforeEach(async () => {
    [owner, mfr, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BatchRegistry");
    registry = (await Factory.deploy()) as BatchRegistry;
    await registry.waitForDeployment();
  });

  it("deploys with correct owner", async () => {
    expect(await registry.owner()).to.equal(owner.address);
  });

  it("owner can authorize manufacturer", async () => {
    await registry.authorizeManufacturer(mfr.address);
    expect(await registry.authorizedManufacturers(mfr.address)).to.equal(true);
  });

  it("non-owner cannot authorize manufacturer", async () => {
    await expect(
      registry.connect(other).authorizeManufacturer(mfr.address)
    ).to.be.revertedWith("Not owner");
  });

  it("authorized manufacturer can register a batch", async () => {
    await registry.authorizeManufacturer(mfr.address);
    await registry
      .connect(mfr)
      .registerBatch("BATCH-001", "Aspirin", "0.0.12345", 1, "0.0.99999");

    const record = await registry.getBatch("BATCH-001");
    expect(record.batchId).to.equal("BATCH-001");
    expect(record.drugName).to.equal("Aspirin");
    expect(record.recalled).to.equal(false);
  });

  it("unauthorized address cannot register a batch", async () => {
    await expect(
      registry
        .connect(other)
        .registerBatch("BATCH-002", "Ibuprofen", "0.0.12345", 2, "0.0.99999")
    ).to.be.revertedWith("Not authorized");
  });

  it("cannot register the same batch twice", async () => {
    await registry.authorizeManufacturer(mfr.address);
    await registry
      .connect(mfr)
      .registerBatch("BATCH-003", "Paracetamol", "0.0.12345", 3, "0.0.99999");
    await expect(
      registry
        .connect(mfr)
        .registerBatch("BATCH-003", "Paracetamol", "0.0.12345", 3, "0.0.99999")
    ).to.be.revertedWith("Already registered");
  });

  it("authorized manufacturer can recall a batch", async () => {
    await registry.authorizeManufacturer(mfr.address);
    await registry
      .connect(mfr)
      .registerBatch("BATCH-004", "Metformin", "0.0.12345", 4, "0.0.99999");
    await registry.connect(mfr).recallBatch("BATCH-004", "Contamination detected");

    const record = await registry.getBatch("BATCH-004");
    expect(record.recalled).to.equal(true);
    expect(record.recallReason).to.equal("Contamination detected");
    expect(await registry.isBatchRecalled("BATCH-004")).to.equal(true);
  });

  it("emits BatchRegistered event", async () => {
    await registry.authorizeManufacturer(mfr.address);
    await expect(
      registry
        .connect(mfr)
        .registerBatch("BATCH-005", "Lisinopril", "0.0.12345", 5, "0.0.99999")
    ).to.emit(registry, "BatchRegistered");
  });

  it("emits BatchRecalled event", async () => {
    await registry.authorizeManufacturer(mfr.address);
    await registry
      .connect(mfr)
      .registerBatch("BATCH-006", "Atorvastatin", "0.0.12345", 6, "0.0.99999");
    await expect(
      registry.connect(mfr).recallBatch("BATCH-006", "Quality issue")
    ).to.emit(registry, "BatchRecalled");
  });
});
