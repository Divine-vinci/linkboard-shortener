import type { User } from "@prisma/client";

import { prisma } from "./client";

export type CreateUserInput = {
  email: string;
  name?: string | null;
  passwordHash?: string | null;
};

export type UpdateUserInput = Partial<
  Pick<User, "name" | "email" | "emailVerified" | "image" | "passwordHash">
>;

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function createUser(data: CreateUserInput) {
  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
    },
  });
}

export async function updateUser(id: string, data: UpdateUserInput) {
  return prisma.user.update({
    where: { id },
    data,
  });
}
