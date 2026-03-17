import { prisma } from "./client";

export async function deleteVerificationTokensByIdentifier(identifier: string) {
  return prisma.verificationToken.deleteMany({
    where: { identifier },
  });
}

export async function createVerificationToken(data: {
  identifier: string;
  token: string;
  expires: Date;
}) {
  return prisma.verificationToken.create({
    data,
  });
}

export async function findVerificationTokenByToken(token: string) {
  return prisma.verificationToken.findUnique({
    where: { token },
  });
}

export async function deleteVerificationTokenByToken(token: string) {
  return prisma.verificationToken.deleteMany({
    where: { token },
  });
}
