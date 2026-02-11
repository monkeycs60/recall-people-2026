-- AlterTable
ALTER TABLE "users" ADD COLUMN "trial_start_date" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "trial_end_date" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "avatar_monthly_used" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "avatar_month_key" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "ask_monthly_used" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "ask_month_key" TEXT NOT NULL DEFAULT '';
