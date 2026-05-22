-- Migration: 0003_notifications
-- 描述: 添加消息提醒系统（notifications + notification_preferences 表）

-- ─── Step 1: notification_type 枚举 ─────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "notification_type" AS ENUM (
    'event:created',
    'event:updated',
    'event:deleted',
    'event:milestone',
    'member:joined',
    'member:role_changed',
    'member:removed',
    'cp:updated'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Step 2: notifications 表 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "notifications" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "recipient_id" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "type"         notification_type NOT NULL,
  "cp_id"        uuid REFERENCES cps(id) ON DELETE CASCADE,
  "actor_id"     uuid REFERENCES users(id) ON DELETE SET NULL,
  "entity_id"    uuid,
  "entity_type"  varchar(50),
  "title"        varchar(200) NOT NULL,
  "body"         text,
  "is_read"      boolean NOT NULL DEFAULT false,
  "created_at"   timestamptz NOT NULL DEFAULT now()
);

-- 查询优化索引：未读消息 + 时间分页
CREATE INDEX IF NOT EXISTS "notif_recipient_read_idx"
  ON "notifications"("recipient_id", "is_read", "created_at" DESC);

-- ─── Step 3: notification_preferences 表 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "user_id"  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "cp_id"    uuid REFERENCES cps(id) ON DELETE CASCADE,
  "type"     notification_type NOT NULL,
  "enabled"  boolean NOT NULL DEFAULT true,
  CONSTRAINT "notif_pref_unique" UNIQUE ("user_id", "cp_id", "type")
);
