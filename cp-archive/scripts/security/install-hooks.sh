#!/bin/sh
#
# install-hooks.sh
#
# 将 scripts/security/pre-commit 安装到 .git/hooks/
# 在克隆仓库后运行一次即可。
#
# 用法：
#   sh scripts/security/install-hooks.sh
#

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
HOOK_DIR="$REPO_ROOT/.git/hooks"
HOOK_SRC="$REPO_ROOT/cp-archive/scripts/security/pre-commit"
HOOK_DST="$HOOK_DIR/pre-commit"

if [ ! -f "$HOOK_SRC" ]; then
  echo "ERROR: Hook source not found: $HOOK_SRC"
  exit 1
fi

cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"

echo "✅ pre-commit hook installed: $HOOK_DST"
echo "   The hook will scan staged files for secrets before every commit."
