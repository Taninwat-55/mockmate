-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('STUDENT', 'ENTRY', 'JUNIOR', 'MID_SENIOR');

-- CreateEnum
CREATE TYPE "WorkSetting" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'INTERNSHIP');

-- AlterTable: interview context (#44); resume + job description become optional
ALTER TABLE "InterviewSession" ADD COLUMN     "seniority" "Seniority" NOT NULL DEFAULT 'JUNIOR',
ADD COLUMN     "workSetting" "WorkSetting",
ADD COLUMN     "employmentType" "EmploymentType",
ALTER COLUMN "jobDescription" DROP NOT NULL,
ALTER COLUMN "resume" DROP NOT NULL;

-- AlterTable: technicalAccuracy* -> roleKnowledge*. Hand-written as RENAME so
-- existing feedback rows keep their data (Prisma would drop + re-add).
ALTER TABLE "Feedback" RENAME COLUMN "technicalAccuracyScore" TO "roleKnowledgeScore";
ALTER TABLE "Feedback" RENAME COLUMN "technicalAccuracyStrength" TO "roleKnowledgeStrength";
ALTER TABLE "Feedback" RENAME COLUMN "technicalAccuracyWeakness" TO "roleKnowledgeWeakness";
ALTER TABLE "Feedback" RENAME COLUMN "technicalAccuracyTip" TO "roleKnowledgeTip";
