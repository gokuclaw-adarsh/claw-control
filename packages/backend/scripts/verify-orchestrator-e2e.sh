#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"
API_KEY="${API_KEY:-}"
TASK_TITLE="${1:-[E2E] verify orchestrator flow}"

AUTH_ARGS=()
if [[ -n "$API_KEY" ]]; then
  AUTH_ARGS+=( -H "x-api-key: ${API_KEY}" )
fi

echo "[verify] Triggering orchestrator E2E simulation against ${BASE_URL}"
RESP=$(curl -sS -X POST "${BASE_URL}/api/orchestrator/simulate/e2e" \
  -H "content-type: application/json" \
  "${AUTH_ARGS[@]}" \
  -d "{\"taskTitle\":\"${TASK_TITLE}\"}")

echo "$RESP"

FINAL_STATUS=$(echo "$RESP" | node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(0,"utf8"));process.stdout.write(String(d.final_status||""));')
if [[ "$FINAL_STATUS" != "review" && "$FINAL_STATUS" != "in_progress" ]]; then
  echo "[verify] FAILED: expected final_status review/in_progress, got: ${FINAL_STATUS}" >&2
  exit 1
fi

echo "[verify] PASS: final_status=${FINAL_STATUS}"
