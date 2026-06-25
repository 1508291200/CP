-- CP Archive — D1 初始化迁移
-- SQLite/D1 版本（原 PostgreSQL schema 移植）
-- 运行：wrangler d1 migrations apply cp-archive-db [--local|--remote]

PRAGMA foreign_keys = ON;

-- ── users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('owner','admin','cp_admin','editor','viewer')),
  display_name  TEXT,
  avatar_url    TEXT,
  preferences   TEXT NOT NULL DEFAULT '{}',
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

-- ── invitations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
  id         TEXT PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL DEFAULT 'editor'
               CHECK (role IN ('owner','admin','cp_admin','editor','viewer')),
  cp_id      TEXT,
  created_by TEXT REFERENCES users(id),
  used_by    TEXT REFERENCES users(id),
  max_uses   INTEGER NOT NULL DEFAULT 1,
  use_count  INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER,
  label      TEXT,
  created_at INTEGER NOT NULL
);

-- ── tags ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#7B5EA7',
  category   TEXT,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL
);

-- ── cps ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cps (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  subtitle      TEXT,
  description   TEXT,
  cover_url     TEXT,
  banner_url    TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','archived','completed')),
  visibility    TEXT NOT NULL DEFAULT 'private'
                  CHECK (visibility IN ('public','members','private')),
  theme_config  TEXT NOT NULL DEFAULT '{}',
  custom_fields TEXT NOT NULL DEFAULT '[]',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_by    TEXT REFERENCES users(id),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

-- ── cp_tags ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_tags (
  cp_id  TEXT NOT NULL REFERENCES cps(id)  ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (cp_id, tag_id)
);

-- ── cp_tabs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_tabs (
  id         TEXT PRIMARY KEY,
  cp_id      TEXT NOT NULL REFERENCES cps(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  tab_type   TEXT NOT NULL
               CHECK (tab_type IN ('profile','timeline','milestone','custom')),
  content    TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- ── cp_members ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_members (
  id         TEXT PRIMARY KEY,
  cp_id      TEXT NOT NULL REFERENCES cps(id)   ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'viewer'
               CHECK (role IN ('cp_admin','editor','viewer')),
  created_at INTEGER NOT NULL,
  UNIQUE (cp_id, user_id)
);

-- ── characters ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS characters (
  id            TEXT PRIMARY KEY,
  cp_id         TEXT NOT NULL REFERENCES cps(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  aliases       TEXT NOT NULL DEFAULT '[]',
  avatar_url    TEXT,
  role_label    TEXT,
  birthday      TEXT,
  bio           TEXT,
  custom_fields TEXT NOT NULL DEFAULT '[]',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

-- ── events ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id             TEXT PRIMARY KEY,
  cp_id          TEXT NOT NULL REFERENCES cps(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  summary        TEXT,
  content        TEXT NOT NULL DEFAULT '{}',
  event_date     TEXT,
  date_precision TEXT NOT NULL DEFAULT 'day'
                   CHECK (date_precision IN ('year','month','day')),
  importance     TEXT NOT NULL DEFAULT 'normal'
                   CHECK (importance IN ('critical','high','medium','normal','low')),
  visibility     TEXT NOT NULL DEFAULT 'members'
                   CHECK (visibility IN ('public','members','specified','private')),
  is_milestone   INTEGER NOT NULL DEFAULT 0,
  source_ref     TEXT,
  emotion_icon   TEXT,
  custom_fields  TEXT NOT NULL DEFAULT '{}',
  created_by     TEXT REFERENCES users(id),
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

-- ── event_versions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_versions (
  id         TEXT PRIMARY KEY,
  event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  snapshot   TEXT NOT NULL,
  edited_by  TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL
);

-- ── event_relations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_relations (
  id            TEXT PRIMARY KEY,
  source_id     TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  target_id     TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'related',
  created_at    INTEGER NOT NULL
);

-- ── event_tags ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_tags (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (event_id, tag_id)
);

-- ── milestones ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestones (
  id             TEXT PRIMARY KEY,
  cp_id          TEXT NOT NULL REFERENCES cps(id)    ON DELETE CASCADE,
  event_id       TEXT          REFERENCES events(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  milestone_date TEXT,
  icon           TEXT DEFAULT '⭐',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

-- ── media ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media (
  id            TEXT PRIMARY KEY,
  original_name TEXT,
  r2_key        TEXT NOT NULL,
  file_type     TEXT NOT NULL DEFAULT 'image'
                  CHECK (file_type IN ('image','video','file')),
  mime_type     TEXT,
  file_size     INTEGER,
  width         INTEGER,
  height        INTEGER,
  uploaded_by   TEXT REFERENCES users(id),
  created_at    INTEGER NOT NULL
);

-- ── event_media ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_media (
  id         TEXT PRIMARY KEY,
  event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  media_id   TEXT          REFERENCES media(id)  ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ── operation_logs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operation_logs (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id),
  action        TEXT NOT NULL,
  resource_type TEXT,
  resource_id   TEXT,
  detail        TEXT NOT NULL DEFAULT '{}',
  ip            TEXT,
  created_at    INTEGER NOT NULL
);

-- ── site_settings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  updated_at INTEGER NOT NULL
);

-- ── notifications ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  payload    TEXT NOT NULL DEFAULT '{}',
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- ── 索引 ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_cp_id        ON events(cp_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date   ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_importance   ON events(importance);
CREATE INDEX IF NOT EXISTS idx_events_visibility   ON events(visibility);
CREATE INDEX IF NOT EXISTS idx_cp_members_cp_id    ON cp_members(cp_id);
CREATE INDEX IF NOT EXISTS idx_cp_members_user_id  ON cp_members(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user  ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by   ON media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_op_logs_user_id     ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_op_logs_created_at  ON operation_logs(created_at);

-- ── FTS5 全文搜索（替代 PostgreSQL ILIKE）──────────────────────────────────
CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
  title,
  summary,
  content=events,
  content_rowid=rowid,
  tokenize='unicode61'
);

-- FTS 触发器：保持索引同步
CREATE TRIGGER IF NOT EXISTS events_fts_insert AFTER INSERT ON events BEGIN
  INSERT INTO events_fts(rowid, title, summary) VALUES (new.rowid, new.title, new.summary);
END;

CREATE TRIGGER IF NOT EXISTS events_fts_update AFTER UPDATE ON events BEGIN
  INSERT INTO events_fts(events_fts, rowid, title, summary) VALUES('delete', old.rowid, old.title, old.summary);
  INSERT INTO events_fts(rowid, title, summary) VALUES (new.rowid, new.title, new.summary);
END;

CREATE TRIGGER IF NOT EXISTS events_fts_delete AFTER DELETE ON events BEGIN
  INSERT INTO events_fts(events_fts, rowid, title, summary) VALUES('delete', old.rowid, old.title, old.summary);
END;
