// @vitest-environment node

import "dotenv/config";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/linkboard";

import { randomUUID } from "node:crypto";

const [{ prisma }, linksModule, usersModule] = await Promise.all([
  import("./client"),
  import("./links"),
  import("./users"),
]);
const { createLink, findLinkById, findLinkBySlug, findLinksByUserId, updateLink } = linksModule;
const { createUser } = usersModule;

let dbReady = true;

try {
  await prisma.$queryRaw`SELECT 1`;
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'links'
  `;

  dbReady = tables.length > 0;
} catch {
  dbReady = false;
}

if (!dbReady) {
  process.stderr.write("⚠️  Link table unavailable — skipping link CRUD tests. Apply migrations to run them.\n");
}

describe.skipIf(!dbReady)("src/lib/db/links.ts", () => {
  const createdUserIds: string[] = [];
  const createdLinkIds: string[] = [];

  afterEach(async () => {
    if (createdLinkIds.length > 0) {
      await prisma.link.deleteMany({ where: { id: { in: createdLinkIds } } });
      createdLinkIds.length = 0;
    }

    if (createdUserIds.length > 0) {
      await prisma.session.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.account.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      createdUserIds.length = 0;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a link and finds it by slug", async () => {
    const user = await createUser({
      email: `story-2-1-${randomUUID()}@linkboard.dev`,
    });
    createdUserIds.push(user.id);

    const link = await createLink({
      slug: `a${randomUUID().replace(/-/g, "").slice(0, 6)}`,
      targetUrl: "https://example.com/docs",
      userId: user.id,
      title: "Docs",
      description: "Important docs",
      tags: ["docs"],
    });
    createdLinkIds.push(link.id);

    await expect(findLinkBySlug(link.slug)).resolves.toMatchObject({
      id: link.id,
      slug: link.slug,
      targetUrl: "https://example.com/docs",
      userId: user.id,
      title: "Docs",
      description: "Important docs",
      tags: ["docs"],
    });
  });

  it("finds a link by id scoped to the owner and updates metadata", async () => {
    const owner = await createUser({
      email: `story-2-3-owner-${randomUUID()}@linkboard.dev`,
    });
    const otherUser = await createUser({
      email: `story-2-3-other-${randomUUID()}@linkboard.dev`,
    });
    createdUserIds.push(owner.id, otherUser.id);

    const link = await createLink({
      slug: `b${randomUUID().replace(/-/g, "").slice(0, 6)}`,
      targetUrl: "https://example.com/start",
      userId: owner.id,
    });
    createdLinkIds.push(link.id);

    await expect(findLinkById(link.id, owner.id)).resolves.toMatchObject({ id: link.id });
    await expect(findLinkById(link.id, otherUser.id)).resolves.toBeNull();

    const updated = await updateLink(link.id, owner.id, {
      title: "Updated title",
      description: "Updated description",
      tags: ["docs", "launch"],
    });

    expect(updated).toMatchObject({
      id: link.id,
      title: "Updated title",
      description: "Updated description",
      tags: ["docs", "launch"],
    });

    await expect(updateLink(link.id, otherUser.id, { title: "No access" })).resolves.toBeNull();
  });

  it("lists a user's links newest-first", async () => {
    const user = await createUser({
      email: `story-2-1-list-${randomUUID()}@linkboard.dev`,
    });
    createdUserIds.push(user.id);

    const first = await createLink({
      slug: `a${randomUUID().replace(/-/g, "").slice(0, 6)}`,
      targetUrl: "https://example.com/first",
      userId: user.id,
    });
    const second = await createLink({
      slug: `b${randomUUID().replace(/-/g, "").slice(0, 6)}`,
      targetUrl: "https://example.com/second",
      userId: user.id,
    });
    createdLinkIds.push(first.id, second.id);

    await expect(findLinksByUserId(user.id)).resolves.toMatchObject([
      { id: second.id, slug: second.slug },
      { id: first.id, slug: first.slug },
    ]);
  });
});
