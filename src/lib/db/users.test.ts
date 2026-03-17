// @vitest-environment node

import "dotenv/config";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/linkboard";

import { randomUUID } from "node:crypto";

const [{ prisma }, usersModule] = await Promise.all([import("./client"), import("./users")]);
const { createUser, findUserByEmail, findUserById, updateUser } = usersModule;

let dbReachable = true;

try {
  await prisma.$queryRaw`SELECT 1`;
} catch {
  dbReachable = false;
  console.warn("⚠️  DATABASE_URL unreachable — skipping all user CRUD tests. Start Docker to run them.");
}

describe("src/lib/db/client.ts", () => {
  it("exports a cached Prisma singleton", async () => {
    const first = prisma;
    const second = (await import("./client")).prisma;

    expect(second).toBe(first);
    expect(globalThis.prisma).toBe(first);
    expect(typeof first.$connect).toBe("function");
  });
});

describe.skipIf(!dbReachable)("src/lib/db/users.ts", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    if (createdUserIds.length === 0) {
      return;
    }

    await prisma.session.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.account.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates and reads a user by email and id", async () => {
    const email = `story-1-2-${randomUUID()}@linkboard.dev`;
    const user = await createUser({
      email,
      name: "Story 1.2 User",
      passwordHash: "hashed-password",
    });

    createdUserIds.push(user.id);

    await expect(findUserByEmail(email)).resolves.toMatchObject({
      id: user.id,
      email,
      name: "Story 1.2 User",
      passwordHash: "hashed-password",
    });

    await expect(findUserById(user.id)).resolves.toMatchObject({
      id: user.id,
      email,
    });
  });

  it("updates persisted user fields", async () => {
    const user = await createUser({
      email: `story-1-2-update-${randomUUID()}@linkboard.dev`,
      name: "Before",
    });

    createdUserIds.push(user.id);

    const verifiedAt = new Date("2026-03-16T12:00:00.000Z");
    const updated = await updateUser(user.id, {
      name: "After",
      image: "https://example.com/avatar.png",
      emailVerified: verifiedAt,
      passwordHash: "next-hash",
    });

    expect(updated).toMatchObject({
      id: user.id,
      name: "After",
      image: "https://example.com/avatar.png",
      passwordHash: "next-hash",
    });
    expect(updated.emailVerified?.toISOString()).toBe(verifiedAt.toISOString());
  });
});
