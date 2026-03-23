import {
  KMSClient,
  CreateKeyCommand,
  CreateAliasCommand,
  SignCommand,
  VerifyCommand,
  EnableKeyRotationCommand,
  KeyUsageType,
  KeySpec,
  SigningAlgorithmSpec,
} from "@aws-sdk/client-kms";
import * as crypto from "crypto";

export class KMSService {
  private client: KMSClient;

  constructor() {
    this.client = new KMSClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async createManufacturerKey(name: string, license: string) {
    const alias = `alias/pharmtrace-mfr-${license
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")}`;

    const result = await this.client.send(
      new CreateKeyCommand({
        Description: `PharmTrace signing key for ${name} (${license})`,
        KeyUsage: KeyUsageType.SIGN_VERIFY,
        KeySpec: KeySpec.ECC_NIST_P256,
        Tags: [
          { TagKey: "Application", TagValue: "PharmTrace" },
          { TagKey: "LicenseNumber", TagValue: license },
        ],
      })
    );

    const keyId = result.KeyMetadata!.KeyId!;
    await this.client.send(
      new CreateAliasCommand({ AliasName: alias, TargetKeyId: keyId })
    );
    await this.client.send(new EnableKeyRotationCommand({ KeyId: keyId }));

    return {
      keyId,
      keyArn: result.KeyMetadata!.Arn!,
      alias,
    };
  }

  async signHandoffData(keyId: string, data: Record<string, unknown>) {
    const hash = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({ ...data, signedAt: new Date().toISOString() })
      )
      .digest();

    const result = await this.client.send(
      new SignCommand({
        KeyId: keyId,
        Message: hash,
        MessageType: "DIGEST",
        SigningAlgorithm: SigningAlgorithmSpec.ECDSA_SHA_256,
      })
    );

    return {
      signature: Buffer.from(result.Signature!).toString("base64"),
      keyId,
      algorithm: "ECDSA_SHA_256",
    };
  }

  async verifyHandoffSignature(
    keyId: string,
    data: Record<string, unknown>,
    signature: string
  ): Promise<boolean> {
    try {
      const hash = crypto
        .createHash("sha256")
        .update(JSON.stringify(data))
        .digest();

      const result = await this.client.send(
        new VerifyCommand({
          KeyId: keyId,
          Message: hash,
          MessageType: "DIGEST",
          Signature: Buffer.from(signature, "base64"),
          SigningAlgorithm: SigningAlgorithmSpec.ECDSA_SHA_256,
        })
      );

      return result.SignatureValid === true;
    } catch {
      return false;
    }
  }
}
