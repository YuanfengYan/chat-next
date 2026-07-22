import { afterEach, describe, expect, it } from "vitest";
import { decryptCredential, encryptCredential, maskCredential } from "@/infrastructure/security/credentials.server";

const previous = process.env.DATABASE_ENCRYPTION_KEY;
afterEach(() => { process.env.DATABASE_ENCRYPTION_KEY = previous; });

describe("credential encryption", () => {
  it("round trips AES-256-GCM payloads without storing plaintext", () => {
    process.env.DATABASE_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const encrypted = encryptCredential("very-secret-token");
    expect(encrypted.toString()).not.toContain("very-secret-token");
    expect(decryptCredential(encrypted)).toBe("very-secret-token");
    expect(maskCredential("very-secret-token")).toBe("ve••••en");
  });
});

