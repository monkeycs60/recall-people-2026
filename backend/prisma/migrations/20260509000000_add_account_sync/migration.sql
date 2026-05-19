-- CreateEnum
CREATE TYPE "SyncEntityType" AS ENUM ('contact', 'note', 'group', 'contact_group', 'hot_topic');

-- CreateEnum
CREATE TYPE "SyncOperation" AS ENUM ('upsert', 'delete');

-- CreateTable
CREATE TABLE "synced_contacts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "encrypted_first_name" TEXT NOT NULL,
  "encrypted_last_name" TEXT,
  "encrypted_nickname" TEXT,
  "encrypted_phone" TEXT,
  "encrypted_email" TEXT,
  "encrypted_ai_summary" TEXT,
  "encrypted_suggested_questions" TEXT,
  "encrypted_meeting_context" TEXT,
  "avatar_url" TEXT,
  "gender" TEXT NOT NULL DEFAULT 'unknown',
  "birthday_day" INTEGER,
  "birthday_month" INTEGER,
  "birthday_year" INTEGER,
  "reminder_frequency_days" INTEGER,
  "last_contact_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "synced_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "synced_notes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "contact_id" TEXT NOT NULL,
  "encrypted_title" TEXT,
  "encrypted_transcription" TEXT,
  "audio_duration_ms" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "synced_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "synced_groups" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "encrypted_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "synced_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "synced_contact_groups" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "contact_id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "synced_contact_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "synced_hot_topics" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "contact_id" TEXT NOT NULL,
  "encrypted_title" TEXT NOT NULL,
  "encrypted_context" TEXT,
  "encrypted_resolution" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "source_note_id" TEXT,
  "event_date" TIMESTAMP(3),
  "birthday_contact_id" TEXT,
  "notified_at" TIMESTAMP(3),
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "synced_hot_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_changes" (
  "sequence" BIGSERIAL NOT NULL,
  "user_id" TEXT NOT NULL,
  "entity_type" "SyncEntityType" NOT NULL,
  "entity_id" TEXT NOT NULL,
  "operation" "SyncOperation" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sync_changes_pkey" PRIMARY KEY ("sequence")
);

-- CreateIndex
CREATE INDEX "synced_contacts_user_id_updated_at_idx" ON "synced_contacts"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "synced_contacts_user_id_deleted_at_idx" ON "synced_contacts"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "synced_notes_user_id_contact_id_idx" ON "synced_notes"("user_id", "contact_id");

-- CreateIndex
CREATE INDEX "synced_notes_user_id_updated_at_idx" ON "synced_notes"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "synced_groups_user_id_updated_at_idx" ON "synced_groups"("user_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "synced_contact_groups_user_id_contact_id_group_id_key" ON "synced_contact_groups"("user_id", "contact_id", "group_id");

-- CreateIndex
CREATE INDEX "synced_contact_groups_user_id_updated_at_idx" ON "synced_contact_groups"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "synced_hot_topics_user_id_contact_id_idx" ON "synced_hot_topics"("user_id", "contact_id");

-- CreateIndex
CREATE INDEX "synced_hot_topics_user_id_updated_at_idx" ON "synced_hot_topics"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "synced_hot_topics_user_id_event_date_idx" ON "synced_hot_topics"("user_id", "event_date");

-- CreateIndex
CREATE INDEX "sync_changes_user_id_sequence_idx" ON "sync_changes"("user_id", "sequence");

-- CreateIndex
CREATE INDEX "sync_changes_user_id_entity_type_entity_id_idx" ON "sync_changes"("user_id", "entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "synced_contacts" ADD CONSTRAINT "synced_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "synced_notes" ADD CONSTRAINT "synced_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "synced_notes" ADD CONSTRAINT "synced_notes_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "synced_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "synced_groups" ADD CONSTRAINT "synced_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "synced_contact_groups" ADD CONSTRAINT "synced_contact_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "synced_hot_topics" ADD CONSTRAINT "synced_hot_topics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_changes" ADD CONSTRAINT "sync_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
