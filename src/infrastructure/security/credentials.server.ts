import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";

const envelopeSchema = z.object({
  v: z.literal(1),
  algorithm: z.literal("aes-256-gcm"),
  nonce: z.string(),
  ciphertext: z.string(),
  tag: z.string(),
});

function encryptionKey() {
  const encoded = process.env.DATABASE_ENCRYPTION_KEY;
  if (!encoded) throw new Error("MISSING_DATABASE_ENCRYPTION_KEY");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64") !== encoded) throw new Error("INVALID_DATABASE_ENCRYPTION_KEY");
  return key;
}

/** 使用带认证标签的 AES-256-GCM 加密平台凭据。 */
export function encryptCredential(value: string): Buffer {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.from(JSON.stringify({
    v: 1,
    algorithm: "aes-256-gcm",
    nonce: nonce.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  }));
}

/** 解密仅发生在服务端工具执行边界，明文不会进入 DTO 或日志。 */
export function decryptCredential(payload: Uint8Array): string {
  const envelope = envelopeSchema.parse(JSON.parse(Buffer.from(payload).toString("utf8")));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(envelope.nonce, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

export function maskCredential(value: string) {
  if (value.length <= 4) return "••••";
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}

