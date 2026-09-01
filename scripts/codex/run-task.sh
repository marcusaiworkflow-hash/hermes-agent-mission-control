#!/usr/bin/env bash
set -u
set -o pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <task-file>"
  exit 2
fi

TASK_FILE="$1"

if [[ ! -f "$TASK_FILE" ]]; then
  echo "Task file not found: $TASK_FILE"
  exit 2
fi

BRANCH="$(git branch --show-current)"

if [[ "$BRANCH" == "main" || "$BRANCH" != codex/* ]]; then
  echo "REFUSED: automation may only run on a codex/* branch, never main."
  echo "Current branch: $BRANCH"
  exit 3
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "REFUSED: tracked files already have uncommitted changes."
  echo "Commit or review them before starting a new Codex task."
  git status --short
  exit 4
fi

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$REPO_ROOT/.codex-runs/$RUN_ID"
mkdir -p "$RUN_DIR"

SUMMARY_FILE="$RUN_DIR/codex-summary.txt"
CODEX_LOG="$RUN_DIR/codex.log"
BUILD_LOG="$RUN_DIR/build.log"
REPAIR_LOG="$RUN_DIR/repair.log"
REPAIR_SUMMARY="$RUN_DIR/repair-summary.txt"
MANIFEST="$RUN_DIR/manifest.txt"
REVIEW_REPORT="$RUN_DIR/review-report.txt"
START_STATUS="$RUN_DIR/start-status.txt"
FINAL_STATUS="$RUN_DIR/final-status.txt"
CHANGED_FILES="$RUN_DIR/changed-files.txt"
START_UNTRACKED="$RUN_DIR/start-untracked.txt"
FINAL_UNTRACKED="$RUN_DIR/final-untracked.txt"
NEW_UNTRACKED="$RUN_DIR/new-untracked.txt"

TASK_TEXT="$(cat "$TASK_FILE")"

git status --short > "$START_STATUS"
git ls-files --others --exclude-standard | sort -u > "$START_UNTRACKED"

cat > "$MANIFEST" <<MANIFEST
Run ID: $RUN_ID
Started UTC: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Repository: $REPO_ROOT
Branch: $BRANCH
Task file: $TASK_FILE
Starting commit: $(git rev-parse HEAD)
Safety mode: isolated codex/* branch
Automatic commit: NO
Automatic push: NO
Automatic merge: NO
Automatic deploy: NO
Maximum repair attempts: 1
MANIFEST

PROMPT="$TASK_TEXT

Permanent execution rules for this job:
- Read and obey AGENTS.md before editing.
- Read docs/codex-context/README.md and the relevant context-pack files before substantial work.
- Inspect the existing implementation before making changes.
- Keep changes scoped to this task.
- Preserve working Hermes, Bridge, Supabase, Prisma, auth, GitHub, and Vercel architecture.
- Reuse existing APIs and components wherever practical.
- Do not expose secrets.
- Do not commit.
- Do not push.
- Do not merge.
- Do not deploy.
- Do not switch to main.
- At completion, summarize changed files, behavior, tests, risks, assumptions, and unresolved issues."

echo "Starting Codex task"
echo "Branch: $BRANCH"
echo "Run: $RUN_ID"
echo "Artifacts: $RUN_DIR"
echo

set +e
codex exec \
  --sandbox workspace-write \
  --cd "$REPO_ROOT" \
  --output-last-message "$SUMMARY_FILE" \
  "$PROMPT" 2>&1 | tee "$CODEX_LOG"
CODEX_EXIT=${PIPESTATUS[0]}
set -e

echo
echo "Codex exit code: $CODEX_EXIT"
echo "Running independent validation..."

set +e
npm run build 2>&1 | tee "$BUILD_LOG"
BUILD_EXIT=${PIPESTATUS[0]}

git diff --check > "$RUN_DIR/diff-check.log" 2>&1
DIFF_EXIT=$?
set -e

if [[ $BUILD_EXIT -eq 0 ]]; then
  BUILD_RESULT="PASS"
else
  BUILD_RESULT="FAIL"
fi

if [[ $DIFF_EXIT -eq 0 ]]; then
  DIFF_RESULT="PASS"
else
  DIFF_RESULT="FAIL"
fi

REPAIR_ATTEMPTED="NO"
REPAIR_EXIT="N/A"

if [[ $CODEX_EXIT -ne 0 || $BUILD_EXIT -ne 0 || $DIFF_EXIT -ne 0 ]]; then
  REPAIR_ATTEMPTED="YES"

  REPAIR_PROMPT="The original task was:

$TASK_TEXT

The first unattended implementation/validation pass did not fully succeed.

Current validation state:
- Codex exit code: $CODEX_EXIT
- npm run build: $BUILD_RESULT
- git diff --check: $DIFF_RESULT

Perform exactly one bounded repair pass.

Rules:
- Read AGENTS.md and the relevant docs/codex-context files.
- Inspect the current working tree and the run artifacts in $RUN_DIR.
- Read build.log and diff-check.log when relevant.
- Fix only issues related to the assigned task or validation failure.
- Do not broaden scope.
- Do not modify protected infrastructure unless the original task explicitly required it.
- Do not expose secrets.
- Do not commit, push, merge, deploy, or switch to main.
- If the problem cannot be safely repaired in this one pass, stop and clearly report the blocker.
- Finish with a concise summary of repairs, remaining risks, and unresolved issues."

  echo
  echo "Validation failed or Codex exited unsuccessfully."
  echo "Starting ONE bounded self-repair attempt..."
  echo

  set +e
  codex exec \
    --sandbox workspace-write \
    --cd "$REPO_ROOT" \
    --output-last-message "$REPAIR_SUMMARY" \
    "$REPAIR_PROMPT" 2>&1 | tee "$REPAIR_LOG"
  REPAIR_EXIT=${PIPESTATUS[0]}
  set -e

  echo
  echo "Repair exit code: $REPAIR_EXIT"
  echo "Re-running independent validation..."

  set +e
  npm run build 2>&1 | tee "$BUILD_LOG"
  BUILD_EXIT=${PIPESTATUS[0]}

  git diff --check > "$RUN_DIR/diff-check.log" 2>&1
  DIFF_EXIT=$?
  set -e

  if [[ $BUILD_EXIT -eq 0 ]]; then
    BUILD_RESULT="PASS"
  else
    BUILD_RESULT="FAIL"
  fi

  if [[ $DIFF_EXIT -eq 0 ]]; then
    DIFF_RESULT="PASS"
  else
    DIFF_RESULT="FAIL"
  fi
fi

git status --short > "$FINAL_STATUS"
git ls-files --others --exclude-standard | sort -u > "$FINAL_UNTRACKED"
comm -13 "$START_UNTRACKED" "$FINAL_UNTRACKED" > "$NEW_UNTRACKED"

{
  git diff --name-only
  cat "$NEW_UNTRACKED"
} | sort -u > "$CHANGED_FILES"

FINAL_RESULT="PASS"
if [[ $BUILD_EXIT -ne 0 || $DIFF_EXIT -ne 0 ]]; then
  FINAL_RESULT="FAIL"
fi

cat >> "$MANIFEST" <<MANIFEST
Finished UTC: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Initial Codex exit code: $CODEX_EXIT
Repair attempted: $REPAIR_ATTEMPTED
Repair exit code: $REPAIR_EXIT
Final build: $BUILD_RESULT
Final git diff --check: $DIFF_RESULT
Final result: $FINAL_RESULT
MANIFEST

{
  echo "# CODEX AUTOMATION REVIEW REPORT"
  echo
  echo "Run ID: $RUN_ID"
  echo "Branch: $BRANCH"
  echo "Task file: $TASK_FILE"
  echo "Starting commit: $(git rev-parse HEAD)"
  echo
  echo "## Validation"
  echo "Initial Codex exit code: $CODEX_EXIT"
  echo "Repair attempted: $REPAIR_ATTEMPTED"
  echo "Repair exit code: $REPAIR_EXIT"
  echo "Build: $BUILD_RESULT"
  echo "git diff --check: $DIFF_RESULT"
  echo "Final result: $FINAL_RESULT"
  echo
  echo "## Changed files"
  if [[ -s "$CHANGED_FILES" ]]; then
    cat "$CHANGED_FILES"
  else
    echo "(none)"
  fi
  echo
  echo "## Git status"
  cat "$FINAL_STATUS"
  echo
  echo "## Diff summary"
  git diff --stat
  echo
  echo "## Codex final summary"
  cat "$SUMMARY_FILE" 2>/dev/null || echo "(No initial summary produced)"
  if [[ "$REPAIR_ATTEMPTED" == "YES" ]]; then
    echo
    echo "## Repair summary"
    cat "$REPAIR_SUMMARY" 2>/dev/null || echo "(No repair summary produced)"
  fi
  echo
  echo "## Human review checkpoint"
  echo "Nothing was automatically committed, pushed, merged, or deployed."
  echo "Review the implementation, logs, build result, diff, risks, and unresolved issues before approval."
} > "$REVIEW_REPORT"

echo
echo "========================================"
echo "CODEX AUTOMATION RESULT"
echo "========================================"
echo "Branch: $BRANCH"
echo "Run files: $RUN_DIR"
echo "Codex exit: $CODEX_EXIT"
echo "Repair attempted: $REPAIR_ATTEMPTED"
echo "Build: $BUILD_RESULT"
echo "git diff --check: $DIFF_RESULT"
echo "Final result: $FINAL_RESULT"
echo
echo "Changed files:"
cat "$CHANGED_FILES"
echo
echo "Diff summary:"
git diff --stat
echo
echo "Review report:"
echo "$REVIEW_REPORT"
echo
echo "STOP: Human review required."
echo "Nothing was committed, pushed, merged, or deployed."

if [[ "$FINAL_RESULT" != "PASS" ]]; then
  exit 5
fi
