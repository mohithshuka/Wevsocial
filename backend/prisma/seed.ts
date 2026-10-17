import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { obfuscateCoordinates } from "../src/utils/geo";

const prisma = new PrismaClient();
const GEO_SEED = process.env.GEO_OBFUSCATION_SEED ?? "wev_geo_salt_dev_only";

async function main(): Promise<void> {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@wev.dev" },
    update: {},
    create: { email: "admin@wev.dev", passwordHash, name: "Ada Admin", role: "ADMIN" },
  });

  const host = await prisma.user.upsert({
    where: { email: "host@wev.dev" },
    update: {},
    create: { email: "host@wev.dev", passwordHash, name: "Harper Host", role: "HOST" },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@wev.dev" },
    update: {},
    create: { email: "user@wev.dev", passwordHash, name: "Uma User", role: "USER" },
  });

  console.log("Users:", { admin: admin.email, host: host.email, user: user.email });

  await prisma.miniApp.upsert({
    where: { id: "sports" },
    update: {},
    create: {
      id: "sports",
      name: "Sports",
      version: "1.0.0",
      entry: "mini-apps/sports",
      permissions: ["storage.sports", "bridge.emit", "bridge.on", "nav.navigate", "auth.getUser"],
    },
  });

  await prisma.miniApp.upsert({
    where: { id: "care" },
    update: {},
    create: {
      id: "care",
      name: "Care",
      version: "1.0.0",
      entry: "mini-apps/care",
      permissions: ["storage.care", "bridge.emit", "bridge.on", "nav.navigate", "auth.getUser"],
    },
  });

  await prisma.miniApp.upsert({
    where: { id: "events" },
    update: {},
    create: {
      id: "events",
      name: "Events",
      version: "1.0.0",
      entry: "mini-apps/events",
      permissions: ["storage.events", "nav.navigate"],
    },
  });

  const now = new Date();
  const inHours = (h: number): Date => new Date(now.getTime() + h * 60 * 60 * 1000);

  const activitiesData = [
    { title: "5-a-side Football", description: "Casual indoor football, all levels welcome.", location: "Koramangala Sports Arena", durationMins: 60 },
    { title: "Tennis Doubles", description: "Doubles court booking with equipment provided.", location: "Indiranagar Tennis Club", durationMins: 90 },
    { title: "Basketball Full Court", description: "Full court 5v5 pickup games.", location: "HSR Layout Courts", durationMins: 120 },
    { title: "Badminton Singles", description: "Singles court, bring your own racket.", location: "Whitefield Badminton Hall", durationMins: 60 },
    { title: "Swimming Lane Booking", description: "50m lane booking, lap swim only.", location: "Jayanagar Aquatic Center", durationMins: 45 },
  ];

  for (const a of activitiesData) {
    const existing = await prisma.activity.findFirst({ where: { title: a.title } });
    if (!existing) {
      await prisma.activity.create({
        data: {
          ...a,
          startTimes: [inHours(4), inHours(8), inHours(24), inHours(30)],
        },
      });
    }
  }

  console.log("Activities seeded.");

  const providersData = [
    { name: "Little Stars Childcare", category: "Daycare", bio: "Certified daycare for ages 1-6.", realLat: 12.9352, realLng: 77.6146 },
    { name: "Sunshine Nanny Services", category: "In-home", bio: "Background-checked nannies, hourly booking.", realLat: 12.9784, realLng: 77.6408 },
    { name: "Bright Beginnings Creche", category: "Creche", bio: "Drop-in creche near sports facilities.", realLat: 12.9081, realLng: 77.6476 },
    { name: "TinyTots Care Collective", category: "Daycare", bio: "Small-group daycare with outdoor play area.", realLat: 12.9698, realLng: 77.7500 },
  ];

  for (const p of providersData) {
    const existing = await prisma.provider.findFirst({ where: { name: p.name } });
    if (existing) continue;

    // First create to get a stable id, then compute & persist the
    // deterministic obfuscated coordinates derived from that id.
    const created = await prisma.provider.create({
      data: {
        name: p.name,
        category: p.category,
        bio: p.bio,
        realLat: p.realLat,
        realLng: p.realLng,
        obfuscatedLat: p.realLat,
        obfuscatedLng: p.realLng,
      },
    });

    const obfuscated = obfuscateCoordinates(
      created.id,
      { lat: p.realLat, lng: p.realLng },
      GEO_SEED
    );

    await prisma.provider.update({
      where: { id: created.id },
      data: { obfuscatedLat: obfuscated.lat, obfuscatedLng: obfuscated.lng },
    });
  }

  console.log("Providers seeded with deterministic geo obfuscation.");
  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
