-- AlterTable: Remove obsolete monetization tracking fields
ALTER TABLE "users" DROP COLUMN IF EXISTS "trial_start_date";
ALTER TABLE "users" DROP COLUMN IF EXISTS "trial_end_date";
