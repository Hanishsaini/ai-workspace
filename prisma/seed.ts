import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Dev seed — opt-in via env. Two independent fixtures:
 *
 *   SEED_DEV_USERS=true   → create alice@example.com + bob@example.com,
 *                           each with their OWN personal workspace +
 *                           conversation + canvas. Used by the dev
 *                           CredentialsProvider for two-user testing.
 *
 *   SEED_DEMO_SHARED=true → additionally create a shared "Demo Workspace"
 *                           with both seeded users as members, for testing
 *                           the realtime collaboration flow without setting
 *                           up OAuth + inviting a second account.
 *
 * Defaults: nothing happens. This file is idempotent — it upserts users and
 * only creates a workspace if the named one doesn't already exist.
 */

const CURSOR_COLORS = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b"];

const seedUsers = process.env.SEED_DEV_USERS === "true";
const seedShared = process.env.SEED_DEMO_SHARED === "true";

async function upsertUser(email: string, name: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name },
  });
}

async function ensurePersonalWorkspace(
  userId: string,
  name: string,
  cursorColor: string,
) {
  const existing = await prisma.workspace.findFirst({
    where: { ownerId: userId, name },
    select: { id: true },
  });
  if (existing) return existing.id;

  const ws = await prisma.workspace.create({
    data: {
      name,
      ownerId: userId,
      members: { create: { userId, role: "OWNER", cursorColor } },
      conversations: { create: { title: "New conversation" } },
      canvases: { create: { type: "NOTES", snapshot: { blocks: [] } } },
    },
    select: { id: true },
  });
  return ws.id;
}

async function ensureSharedWorkspace(
  ownerId: string,
  collaboratorId: string,
  ownerColor: string,
  collaboratorColor: string,
) {
  const existing = await prisma.workspace.findFirst({
    where: { name: "Demo Workspace" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const ws = await prisma.workspace.create({
    data: {
      name: "Demo Workspace",
      ownerId,
      members: {
        create: [
          { userId: ownerId, role: "OWNER", cursorColor: ownerColor },
          {
            userId: collaboratorId,
            role: "EDITOR",
            cursorColor: collaboratorColor,
          },
        ],
      },
      conversations: { create: { title: "Getting started" } },
      canvases: { create: { type: "NOTES", snapshot: { blocks: [] } } },
    },
    select: { id: true },
  });
  return ws.id;
}

async function main() {
  if (!seedUsers && !seedShared) {
    console.log(
      "[seed] no SEED_* flags set — nothing to do.\n" +
        "       Set SEED_DEV_USERS=true and/or SEED_DEMO_SHARED=true in .env.local to populate fixtures.",
    );
    return;
  }

  const alice = await upsertUser("alice@example.com", "Alice");
  const bob = await upsertUser("bob@example.com", "Bob");

  if (seedUsers) {
    const aliceWs = await ensurePersonalWorkspace(
      alice.id,
      "Alice's workspace",
      CURSOR_COLORS[0],
    );
    const bobWs = await ensurePersonalWorkspace(
      bob.id,
      "Bob's workspace",
      CURSOR_COLORS[1],
    );
    console.log(`[seed] alice → workspace ${aliceWs}`);
    console.log(`[seed] bob   → workspace ${bobWs}`);
  }

  if (seedShared) {
    const sharedWs = await ensureSharedWorkspace(
      alice.id,
      bob.id,
      CURSOR_COLORS[0],
      CURSOR_COLORS[1],
    );
    console.log(`[seed] shared demo workspace: ${sharedWs}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
