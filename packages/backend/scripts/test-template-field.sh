#!/usr/bin/env bash
# test-template-field.sh
#
# Integration test for the POST /api/tasks template field feature.
# Tests that:
#   1. template="full"    creates task + 5 standard lifecycle subtasks
#   2. template="minimal" creates task + 3 subtasks
#   3. No template        creates task with no auto-subtasks (backward compat)
#   4. Invalid template   returns 400
#
# Usage:
#   API_URL=http://localhost:3001 API_KEY=your_key bash test-template-field.sh
#   Or with defaults (Railway production URL from env):
#   bash test-template-field.sh

set -euo pipefail

API_URL="${API_URL:-https://${CLAW_CONTROL_URL:-localhost:3001}}"
API_KEY="${API_KEY:-${CLAW_CONTROL_API_KEY:-}}"
AUTH_HEADER="x-api-key: $API_KEY"

PASS=0
FAIL=0

check() {
  local desc="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✅ PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL: $desc"
    echo "     Expected: $expected"
    echo "     Actual:   $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Claw Control — template field integration tests"
echo "  Target: $API_URL"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── Test 1: template=full ──────────────────────────────────────
echo "[ Test 1 ] POST /api/tasks with template=\"full\""
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"title":"[TEST] Full template task","status":"todo","template":"full"}')
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)

TASK_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || echo "")
SUBTASK_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('subtasks',[])))" 2>/dev/null || echo "0")
FIRST_SUBTASK=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); st=d.get('subtasks',[]); print(st[0]['title'] if st else '')" 2>/dev/null || echo "")
LAST_SUBTASK=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); st=d.get('subtasks',[]); print(st[-1]['title'] if st else '')" 2>/dev/null || echo "")
WARNING=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('subtask_creation_warning','none') or 'none')" 2>/dev/null || echo "none")

check "HTTP status 201" "201" "$HTTP_CODE"
check "Task created (has ID)" "true" "$([ -n "$TASK_ID" ] && echo true || echo false)"
check "Returns 5 subtasks in response" "5" "$SUBTASK_COUNT"
check "First subtask is 'Execute'" "Execute" "$FIRST_SUBTASK"
check "Last subtask is 'Follow-on Check'" "Follow-on Check" "$LAST_SUBTASK"
check "No subtask creation warning" "none" "$WARNING"

# Verify subtasks via GET
if [ -n "$TASK_ID" ]; then
  ST_RESP=$(curl -s "$API_URL/api/tasks/$TASK_ID/subtasks" -H "$AUTH_HEADER")
  DB_COUNT=$(echo "$ST_RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
  check "GET /subtasks confirms 5 subtasks in DB" "5" "$DB_COUNT"
  
  TASK_ID_ON_SUBTASK=$(echo "$ST_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['task_id'] if d else '')" 2>/dev/null || echo "")
  check "Subtasks link to parent task ID" "$TASK_ID" "$TASK_ID_ON_SUBTASK"

  # Cleanup
  curl -s -X DELETE "$API_URL/api/tasks/$TASK_ID" -H "$AUTH_HEADER" > /dev/null
fi

echo ""

# ── Test 2: template=minimal ───────────────────────────────────
echo "[ Test 2 ] POST /api/tasks with template=\"minimal\""
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"title":"[TEST] Minimal template task","status":"todo","template":"minimal"}')
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)

TASK_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || echo "")
SUBTASK_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('subtasks',[])))" 2>/dev/null || echo "0")
FIRST_SUBTASK=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); st=d.get('subtasks',[]); print(st[0]['title'] if st else '')" 2>/dev/null || echo "")
LAST_SUBTASK=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); st=d.get('subtasks',[]); print(st[-1]['title'] if st else '')" 2>/dev/null || echo "")

check "HTTP status 201" "201" "$HTTP_CODE"
check "Returns 3 subtasks in response" "3" "$SUBTASK_COUNT"
check "First subtask is 'Execute'" "Execute" "$FIRST_SUBTASK"
check "Last subtask is 'Follow-on Check'" "Follow-on Check" "$LAST_SUBTASK"

if [ -n "$TASK_ID" ]; then
  ST_RESP=$(curl -s "$API_URL/api/tasks/$TASK_ID/subtasks" -H "$AUTH_HEADER")
  DB_COUNT=$(echo "$ST_RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
  check "GET /subtasks confirms 3 subtasks in DB" "3" "$DB_COUNT"
  
  # Cleanup
  curl -s -X DELETE "$API_URL/api/tasks/$TASK_ID" -H "$AUTH_HEADER" > /dev/null
fi

echo ""

# ── Test 3: No template (backward compat) ──────────────────────
echo "[ Test 3 ] POST /api/tasks without template (backward compat)"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"title":"[TEST] No template task","status":"todo"}')
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)

TASK_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || echo "")
HAS_SUBTASKS_KEY=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if 'subtasks' in d else 'no')" 2>/dev/null || echo "no")

check "HTTP status 201" "201" "$HTTP_CODE"
check "Task created" "true" "$([ -n "$TASK_ID" ] && echo true || echo false)"
check "No subtasks key in response" "no" "$HAS_SUBTASKS_KEY"

if [ -n "$TASK_ID" ]; then
  ST_RESP=$(curl -s "$API_URL/api/tasks/$TASK_ID/subtasks" -H "$AUTH_HEADER")
  DB_COUNT=$(echo "$ST_RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
  check "No subtasks created in DB" "0" "$DB_COUNT"
  
  # Cleanup
  curl -s -X DELETE "$API_URL/api/tasks/$TASK_ID" -H "$AUTH_HEADER" > /dev/null
fi

echo ""

# ── Test 4: Invalid template value ────────────────────────────
echo "[ Test 4 ] POST /api/tasks with invalid template value"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"title":"[TEST] Bad template","template":"invalid"}')
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)

check "HTTP status 400" "400" "$HTTP_CODE"
HAS_ERROR=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if 'error' in d or 'message' in d else 'no')" 2>/dev/null || echo "no")
check "Response has error field" "yes" "$HAS_ERROR"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

exit 0
