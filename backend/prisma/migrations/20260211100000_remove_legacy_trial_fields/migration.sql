-- AlterTable: Remove legacy one-time trial fields
ALTER TABLE "users" DROP COLUMN IF EXISTS "free_note_trials";
ALTER TABLE "users" DROP COLUMN IF EXISTS "free_ask_trials";
ALTER TABLE "users" DROP COLUMN IF EXISTS "free_avatar_trials";
