-- Multi-round interviews (#46). Backfill is by the defaults: every existing
-- session becomes a single HIRING_MANAGER round and every question belongs to it.

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('SCREENING', 'HIRING_MANAGER', 'ASSESSMENT');

-- CreateEnum
CREATE TYPE "StageVerdict" AS ENUM ('ADVANCE', 'STOP', 'INCOMPLETE');

-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "roundEndedAt" TIMESTAMP(3),
ADD COLUMN     "stages" "Stage"[] DEFAULT ARRAY['HIRING_MANAGER']::"Stage"[];

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "stage" "Stage" NOT NULL DEFAULT 'HIRING_MANAGER';

-- CreateTable
CREATE TABLE "StageResult" (
    "id" TEXT NOT NULL,
    "interviewSessionId" TEXT NOT NULL,
    "stage" "Stage" NOT NULL,
    "verdict" "StageVerdict" NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StageResult_interviewSessionId_stage_key" ON "StageResult"("interviewSessionId", "stage");

-- AddForeignKey
ALTER TABLE "StageResult" ADD CONSTRAINT "StageResult_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
