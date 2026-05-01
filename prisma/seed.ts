import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Wipe existing data so seeding is idempotent.
  await prisma.payment.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.square.deleteMany();
  await prisma.poolWeek.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.game.deleteMany();

  const smith = await prisma.pool.create({
    data: {
      slug: "smith-family",
      name: "Smith Family",
      entryFeePerSquare: 50,
      weeklyPrize: 200,
      reverseWeeklyPrize: 50,
      activeWeekNumber: 1,
    },
  });
  await prisma.pool.create({
    data: {
      slug: "main-pool",
      name: "Main Pool",
      entryFeePerSquare: 100,
      weeklyPrize: 400,
      reverseWeeklyPrize: 100,
      activeWeekNumber: 1,
    },
  });

  const alice = await prisma.participant.create({
    data: { poolId: smith.id, name: "Alice", color: "#fecaca" },
  });
  const jimmie = await prisma.participant.create({
    data: { poolId: smith.id, name: "Jimmie", color: "#bbf7d0" },
  });

  await prisma.square.create({
    data: { poolId: smith.id, participantId: alice.id, row: 0, col: 2 },
  });
  await prisma.square.create({
    data: { poolId: smith.id, participantId: jimmie.id, row: 8, col: 7 },
  });

  await prisma.poolWeek.create({
    data: {
      poolId: smith.id,
      weekNumber: 1,
      rowDigits: "1473605289",
      colDigits: "5347816209",
      randomizedAt: new Date(),
    },
  });

  await prisma.activityLog.createMany({
    data: [
      { poolId: smith.id, message: "Alice joined the pool" },
      { poolId: smith.id, message: "Alice claimed 1 square" },
      { poolId: smith.id, message: "Week 1 digits randomized" },
      { poolId: smith.id, message: "Jimmie joined the pool" },
      { poolId: smith.id, message: "Jimmie claimed 1 square" },
    ],
  });

  await prisma.game.createMany({
    data: [
      { weekNumber: 1, awayTeam: "Ravens", homeTeam: "Chiefs", awayScore: 20, homeScore: 27, isFinal: true },
      { weekNumber: 1, awayTeam: "Packers", homeTeam: "Eagles", awayScore: 29, homeScore: 34, isFinal: true },
      { weekNumber: 1, awayTeam: "Browns", homeTeam: "Cowboys", awayScore: 17, homeScore: 33, isFinal: true },
      { weekNumber: 1, awayTeam: "Jets", homeTeam: "49ers", awayScore: 19, homeScore: 32, isFinal: true },
      { weekNumber: 1, awayTeam: "Bears", homeTeam: "Packers", awayScore: 27, homeScore: 24, isFinal: true },
    ],
  });

  console.log("Seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
