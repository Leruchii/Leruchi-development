#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-apps/studio}"
fail=0
if grep -RInE '@radix-ui|from[[:space:]]+["'"'"']radix|asChild|data-\[state=' "$ROOT" --include='*.ts' --include='*.tsx' 2>/dev/null; then
  echo "BASE UI AUDIT: forbidden Radix/asChild/state usage found"; fail=1
fi
if grep -RInE '#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(' "$ROOT" --include='*.ts' --include='*.tsx' --include='*.css' 2>/dev/null; then
  echo "BASE UI AUDIT: raw color found; use semantic Vibe tokens"; fail=1
fi
if [[ ! -f "$ROOT/app/globals.css" ]]; then
  echo "BASE UI AUDIT: expected Graph Studio global stylesheet missing"; fail=1
fi
exit "$fail"
