-- AlterTable
ALTER TABLE "Pool" ADD COLUMN     "venmoHandle" TEXT,
ADD COLUMN     "zelleHandle" TEXT;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "entryFeePaid" INTEGER NOT NULL DEFAULT 0;

