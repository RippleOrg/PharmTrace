import { mockClient } from "aws-sdk-client-mock";
import {
  KMSClient,
  CreateKeyCommand,
  CreateAliasCommand,
  EnableKeyRotationCommand,
  SignCommand,
  VerifyCommand,
} from "@aws-sdk/client-kms";
import { KMSService } from "../services/KMSService";

const kmsMock = mockClient(KMSClient);

// Set required env vars before import
process.env.AWS_REGION = "us-east-1";
process.env.AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE";
process.env.AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

describe("KMSService", () => {
  let service: KMSService;

  beforeEach(() => {
    kmsMock.reset();
    service = new KMSService();
  });

  describe("createManufacturerKey", () => {
    it("creates a KMS key, alias, and enables rotation", async () => {
      const mockKeyId = "key-123-456";
      const mockArn = `arn:aws:kms:us-east-1:123456789012:key/${mockKeyId}`;

      kmsMock.on(CreateKeyCommand).resolves({
        KeyMetadata: { KeyId: mockKeyId, Arn: mockArn },
      });
      kmsMock.on(CreateAliasCommand).resolves({});
      kmsMock.on(EnableKeyRotationCommand).resolves({});

      const result = await service.createManufacturerKey("Pfizer", "PFIZER-001");

      expect(result.keyId).toBe(mockKeyId);
      expect(result.keyArn).toBe(mockArn);
      expect(result.alias).toBe("alias/pharmtrace-mfr-pfizer-001");

      // Verify all three commands were called
      expect(kmsMock.commandCalls(CreateKeyCommand)).toHaveLength(1);
      expect(kmsMock.commandCalls(CreateAliasCommand)).toHaveLength(1);
      expect(kmsMock.commandCalls(EnableKeyRotationCommand)).toHaveLength(1);
    });

    it("sanitizes license number in alias", async () => {
      kmsMock.on(CreateKeyCommand).resolves({
        KeyMetadata: { KeyId: "key-abc", Arn: "arn:aws:kms:us-east-1:123:key/key-abc" },
      });
      kmsMock.on(CreateAliasCommand).resolves({});
      kmsMock.on(EnableKeyRotationCommand).resolves({});

      const result = await service.createManufacturerKey(
        "Test Pharma",
        "TEST/PHARMA 123!"
      );

      expect(result.alias).toBe("alias/pharmtrace-mfr-test-pharma-123-");
    });
  });

  describe("signHandoffData", () => {
    it("signs handoff data and returns base64 signature", async () => {
      const mockSignature = new Uint8Array([1, 2, 3, 4, 5]);
      kmsMock.on(SignCommand).resolves({ Signature: mockSignature });

      const result = await service.signHandoffData("key-123", {
        batchId: "batch-1",
        event: "MANUFACTURED",
      });

      expect(result.signature).toBe(
        Buffer.from(mockSignature).toString("base64")
      );
      expect(result.keyId).toBe("key-123");
      expect(result.algorithm).toBe("ECDSA_SHA_256");

      const calls = kmsMock.commandCalls(SignCommand);
      expect(calls).toHaveLength(1);
      const input = calls[0].args[0].input;
      expect(input.KeyId).toBe("key-123");
      expect(input.MessageType).toBe("DIGEST");
      expect(input.SigningAlgorithm).toBe("ECDSA_SHA_256");
    });
  });

  describe("verifyHandoffSignature", () => {
    it("returns true when signature is valid", async () => {
      kmsMock.on(VerifyCommand).resolves({ SignatureValid: true });

      const valid = await service.verifyHandoffSignature(
        "key-123",
        { batchId: "batch-1" },
        Buffer.from([1, 2, 3]).toString("base64")
      );

      expect(valid).toBe(true);
    });

    it("returns false when signature is invalid", async () => {
      kmsMock.on(VerifyCommand).resolves({ SignatureValid: false });

      const valid = await service.verifyHandoffSignature(
        "key-123",
        { batchId: "batch-1" },
        Buffer.from([9, 9, 9]).toString("base64")
      );

      expect(valid).toBe(false);
    });

    it("returns false when KMS throws an error", async () => {
      kmsMock.on(VerifyCommand).rejects(new Error("Invalid signature"));

      const valid = await service.verifyHandoffSignature(
        "key-123",
        { batchId: "batch-1" },
        "invalid-base64-sig"
      );

      expect(valid).toBe(false);
    });

    it("verifies using DIGEST message type", async () => {
      kmsMock.on(VerifyCommand).resolves({ SignatureValid: true });

      await service.verifyHandoffSignature(
        "key-123",
        { batchId: "batch-1" },
        Buffer.from([1, 2, 3]).toString("base64")
      );

      const calls = kmsMock.commandCalls(VerifyCommand);
      expect(calls[0].args[0].input.MessageType).toBe("DIGEST");
      expect(calls[0].args[0].input.SigningAlgorithm).toBe("ECDSA_SHA_256");
    });
  });
});
