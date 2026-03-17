import { createHash, randomBytes } from "node:crypto";

import {
  createVerificationToken,
  deleteVerificationTokenByToken,
  deleteVerificationTokensByIdentifier,
  findVerificationTokenByToken,
} from "@/lib/db/tokens";

const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(email: string) {
  const rawToken = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");
  const hashedToken = hashPasswordResetToken(rawToken);
  const expires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await deleteVerificationTokensByIdentifier(email);
  await createVerificationToken({
    identifier: email,
    token: hashedToken,
    expires,
  });

  return {
    token: rawToken,
    expires,
  };
}

export async function validatePasswordResetToken(token: string) {
  const hashedToken = hashPasswordResetToken(token);
  const verificationToken = await findVerificationTokenByToken(hashedToken);

  if (!verificationToken) {
    return null;
  }

  if (verificationToken.expires.getTime() <= Date.now()) {
    await deleteVerificationTokenByToken(hashedToken);
    return null;
  }

  return verificationToken.identifier;
}

export async function consumePasswordResetToken(token: string) {
  const hashedToken = hashPasswordResetToken(token);
  await deleteVerificationTokenByToken(hashedToken);
}
