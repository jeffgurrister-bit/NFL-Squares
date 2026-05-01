-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Pool" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entryFeePerSquare" INTEGER NOT NULL,
    "weeklyPrize" INTEGER NOT NULL,
    "reverseWeeklyPrize" INTEGER NOT NULL,
    "activeWeekNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Square" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Square_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolWeek" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "rowDigits" TEXT,
    "colDigits" TEXT,
    "randomizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoolWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayScore" INTEGER,
    "homeScore" INTEGER,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "kickoffAt" TIMESTAMP(3),
    "espnId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pool_slug_key" ON "Pool"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_poolId_name_key" ON "Participant"("poolId", "name");

-- CreateIndex
CREATE INDEX "Square_participantId_idx" ON "Square"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Square_poolId_row_col_key" ON "Square"("poolId", "row", "col");

-- CreateIndex
CREATE UNIQUE INDEX "PoolWeek_poolId_weekNumber_key" ON "PoolWeek"("poolId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Game_espnId_key" ON "Game"("espnId");

-- CreateIndex
CREATE INDEX "Game_weekNumber_idx" ON "Game"("weekNumber");

-- CreateIndex
CREATE INDEX "Payment_participantId_idx" ON "Payment"("participantId");

-- CreateIndex
CREATE INDEX "ActivityLog_poolId_createdAt_idx" ON "ActivityLog"("poolId", "createdAt");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Square" ADD CONSTRAINT "Square_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Square" ADD CONSTRAINT "Square_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolWeek" ADD CONSTRAINT "PoolWeek_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

