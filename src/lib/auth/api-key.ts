import { createHash, randomBytes } from "node:crypto";

const API_KEY_PREFIX = "lb_";
const KEY_BYTE_LENGTH = 32;

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const randomPart = randomBytes(KEY_BYTE_LENGTH).toString("hex");
  const rawKey = `${API_KEY_PREFIX}${randomPart}`;

  return {
    rawKey,
    keyHash: hashApiKey(rawKey),
    keyPrefix: rawKey.substring(0, 8),
  };
}
