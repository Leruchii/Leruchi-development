#!/usr/bin/env bash
set -euo pipefail

# Compatibility wrapper. New integrations should call scripts/leruchi-backup.sh.
export LERUCHI_BACKUP_PREFIX="${LERUCHI_BACKUP_PREFIX:-vibedb}"
exec "$(dirname "${BASH_SOURCE[0]}")/leruchi-backup.sh" "$@"
