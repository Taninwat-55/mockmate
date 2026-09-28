-- AlterEnum: verdict for sessions ended with too few answers to judge (#63).
-- Set in code (lib/generate-feedback.ts), never chosen by the model.
ALTER TYPE "OverallSignal" ADD VALUE 'INCOMPLETE';
