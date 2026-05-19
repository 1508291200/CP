-- Migration: 0002_cp_permission_system
-- 第二阶段：数据迁移 + 新建表（此时 cp_admin 枚举值已提交可用）

-- ─── Step 1: 数据迁移（角色枚举重映射）───────────────────────────────────────
-- 原 editor → cp_admin（先处理，避免被 contributor→editor 覆盖）
UPDATE users SET role = 'cp_admin' WHERE role = 'editor';
-- 原 contributor → editor
UPDATE users SET role = 'editor'   WHERE role = 'contributor';

-- 同步 invitations 表中的 role 字段
UPDATE invitations SET role = 'cp_admin' WHERE role = 'editor';
UPDATE invitations SET role = 'editor'   WHERE role = 'contributor';

-- ─── Step 2: invitations 表新增字段 ─────────────────────────────────────────
ALTER TABLE "invitations"
  ADD COLUMN IF NOT EXISTS "cp_id"     uuid REFERENCES cps(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "max_uses"  integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "use_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "label"     varchar(100);

-- 对已使用邀请码补充 use_count（向后兼容）
UPDATE invitations SET use_count = 1 WHERE used_by IS NOT NULL;

-- ─── Step 3: cp_member_role 枚举 ────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "cp_member_role" AS ENUM ('cp_admin', 'editor');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Step 4: cp_members 表 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "cp_members" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "cp_id"      uuid NOT NULL REFERENCES cps(id) ON DELETE CASCADE,
  "user_id"    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "cp_role"    cp_member_role NOT NULL,
  "granted_by" uuid REFERENCES users(id),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "cp_members_cp_id_user_id_unique" UNIQUE ("cp_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "cp_members_cp_id_idx"   ON "cp_members"("cp_id");
CREATE INDEX IF NOT EXISTS "cp_members_user_id_idx" ON "cp_members"("user_id");

-- ─── Step 5: cp_admin_quota 表 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "cp_admin_quota" (
  "user_id"       uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "cp_id"         uuid NOT NULL REFERENCES cps(id) ON DELETE CASCADE,
  "invite_quota"  integer NOT NULL DEFAULT 5,
  "invite_used"   integer NOT NULL DEFAULT 0,
  "updated_at"    timestamptz NOT NULL DEFAULT now()
);
