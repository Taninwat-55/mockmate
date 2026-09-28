-- AlterTable: optional company, separate from the role title (#65)
ALTER TABLE "InterviewSession" ADD COLUMN     "company" TEXT;
