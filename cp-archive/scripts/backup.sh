#!/bin/bash
# 数据库自动备份脚本
# 用法：加入 crontab：0 3 * * * /app/cp-archive/scripts/backup.sh >> /var/log/cp-backup.log 2>&1

set -e

BACKUP_DIR=${BACKUP_DIR:-/data/backups}
RETAIN_DAYS=${RETAIN_DAYS:-30}
DATE=$(date +%Y%m%d_%H%M%S)
COMPOSE_DIR=$(dirname "$(dirname "$(realpath "$0")")")

echo "[$(date)] Starting backup..."

# 确保备份目录存在
mkdir -p "$BACKUP_DIR"

# 数据库全量备份
docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T postgres \
  pg_dump -U cpuser cparchive | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

echo "[$(date)] Database backup: db_$DATE.sql.gz"

# 上传文件增量同步（保持最新镜像）
rsync -av --delete /data/uploads/ "$BACKUP_DIR/uploads_latest/"

echo "[$(date)] Uploads synced"

# 删除超过保留天数的旧备份
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime "+$RETAIN_DAYS" -delete

echo "[$(date)] Backup complete. Retained last $RETAIN_DAYS days."
