#!/usr/bin/env bash
set -euo pipefail

# Compatibility wrapper. LERUCHI_RESTORE_MODE takes precedence when both are set.
export LERUCHI_RESTORE_MODE="${LERUCHI_RESTORE_MODE:-${VIBEDB_RESTORE_MODE:-replace}}"
exec "$(dirname "${BASH_SOURCE[0]}")/leruchi-restore.sh" "$@"
