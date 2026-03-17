import bcrypt from "bcrypt";

import { prisma } from "../src/lib/db/client";

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  await prisma.user.upsert({
    where: { email: "test@linkboard.dev" },
    update: {
      name: "Linkboard Test User",
      passwordHash,
    },
    create: {
      email: "test@linkboard.dev",
      name: "Linkboard Test User",
      passwordHash,
    },
  });
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
