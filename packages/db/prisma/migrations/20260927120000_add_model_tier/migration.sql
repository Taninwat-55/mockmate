-- CreateEnum
CREATE TYPE "ModelTier" AS ENUM ('FREE', 'PAID', 'MAX');

-- AlterTable: per-session model tier (#52)
ALTER TABLE "InterviewSession" ADD COLUMN     "modelTier" "ModelTier" NOT NULL DEFAULT 'FREE';

-- Backfill (hand-written): existing paid and owner sessions ran on the paid models.
UPDATE "InterviewSession" SET "modelTier" = 'PAID' WHERE "isPaid" = true;

-- CreateIndex: site-wide daily free-session cap
CREATE INDEX "InterviewSession_isPaid_createdAt_idx" ON "InterviewSession"("isPaid", "createdAt");
