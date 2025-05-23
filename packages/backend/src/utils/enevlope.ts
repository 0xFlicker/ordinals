import {
  KMSClient,
  GenerateDataKeyCommand,
  DecryptCommand,
} from "@aws-sdk/client-kms";
import crypto from "crypto";

export async function decryptEnvelope({
  base64DataKey,
  base64AuthTag,
  base64Ciphertext,
  base64Iv,
  kmsClient,
}: {
  base64DataKey: string;
  base64AuthTag: string;
  base64Ciphertext: string;
  base64Iv: string;
  kmsClient: KMSClient;
}) {
  const encryptedDataKey = Buffer.from(base64DataKey, "base64");
  const decryptedKey = await kmsClient.send(
    new DecryptCommand({
      CiphertextBlob: encryptedDataKey,
    }),
  );

  if (!decryptedKey.Plaintext) {
    throw new Error("Failed to decrypt data key");
  }

  // First use the key for decryption
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    decryptedKey.Plaintext,
    Buffer.from(base64Iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(base64AuthTag, "base64"));
  let decryptedSecKey = decipher.update(base64Ciphertext, "base64", "utf8");
  decryptedSecKey += decipher.final("utf8");

  // clear from memory
  crypto.webcrypto.getRandomValues(new Uint8Array(decryptedKey.Plaintext));

  return decryptedSecKey;
}

export async function encryptEnvelope({
  plaintext,
  kmsClient,
  keyId,
}: {
  plaintext: string;
  kmsClient: KMSClient;
  keyId: string;
}) {
  const iv = crypto.randomBytes(12); // Initialization Vector
  const dataKey = await kmsClient.send(
    new GenerateDataKeyCommand({
      KeyId: keyId,
      KeySpec: "AES_256",
    }),
  );

  if (!dataKey.Plaintext || !dataKey.CiphertextBlob) {
    throw new Error("Failed to generate data key");
  }

  const cipher = crypto.createCipheriv("aes-256-gcm", dataKey.Plaintext, iv);
  let encryptedSecKey = cipher.update(plaintext, "utf8", "base64");
  encryptedSecKey += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  return {
    base64DataKey: Buffer.from(dataKey.CiphertextBlob).toString("base64"),
    base64Ciphertext: encryptedSecKey,
    base64AuthTag: authTag,
    base64Iv: iv.toString("base64"),
  };
}
export function serializeEnvelope({
  base64AuthTag,
  base64Ciphertext,
  base64DataKey,
  base64Iv,
}: {
  base64AuthTag: string;
  base64Ciphertext: string;
  base64DataKey: string;
  base64Iv: string;
}) {
  return `ENVELOPE[${base64AuthTag}:${base64Ciphertext}:${base64DataKey}:${base64Iv}]`;
}

export function deserializeEnvelope(serializedEnvelope: string) {
  if (
    !serializedEnvelope.startsWith("ENVELOPE[") ||
    !serializedEnvelope.endsWith("]")
  ) {
    throw new Error("Invalid envelope format");
  }

  const parts = serializedEnvelope.split("[")[1].split("]")[0].split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid number of envelope components");
  }

  const [base64AuthTag, base64Ciphertext, base64DataKey, base64Iv] = parts;

  // Validate base64 strings
  try {
    [base64AuthTag, base64Ciphertext, base64DataKey, base64Iv].forEach((str) =>
      Buffer.from(str, "base64"),
    );
  } catch (e) {
    throw new Error("Invalid base64 encoding in envelope components");
  }

  return {
    base64AuthTag,
    base64Ciphertext,
    base64DataKey,
    base64Iv,
  };
}
