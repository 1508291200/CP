-- Migration: 0003_notifications_fix
-- 描述: 修复 notification_preferences 的 NULL cpId 唯一约束
--       PostgreSQL NULL != NULL，原 UNIQUE 约束无法防止 cpId=NULL 的重复行
--       改用 partial unique index 来覆盖全站偏好（cpId IS NULL）的情况

-- 删除旧约束（若存在）
ALTER TABLE notification_preferences
  DROP CONSTRAINT IF EXISTS notif_pref_unique;

-- 全站偏好的唯一索引（cpId IS NULL）
CREATE UNIQUE INDEX IF NOT EXISTS notif_pref_global_unique
  ON notification_preferences (user_id, type)
  WHERE cp_id IS NULL;

-- CP 级偏好的唯一索引（cpId IS NOT NULL）
CREATE UNIQUE INDEX IF NOT EXISTS notif_pref_cp_unique
  ON notification_preferences (user_id, cp_id, type)
  WHERE cp_id IS NOT NULL;

-- 清理因旧约束失效产生的重复数据
DELETE FROM notification_preferences a
USING notification_preferences b
WHERE a.ctid < b.ctid
  AND a.user_id = b.user_id
  AND a.type = b.type
  AND a.cp_id IS NULL
  AND b.cp_id IS NULL;
