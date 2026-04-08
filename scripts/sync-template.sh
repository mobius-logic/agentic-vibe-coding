#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# sync-template.sh — Pull updates from the upstream template repository
#
# Usage:
#   ./scripts/sync-template.sh [TEMPLATE_URL]
#
# If TEMPLATE_URL is omitted, the script uses the existing "upstream" remote.
# On first run you must supply the URL so the remote can be created.
#
# What this script does:
#   1. Adds/verifies the "upstream" remote pointing to the template repo
#   2. Configures the "ours" merge driver (keeps local project files safe)
#   3. Fetches the latest template changes
#   4. Merges upstream/main into the current branch
#   5. Project-specific paths (.plans/, .agent-logs/, README.md) are protected
#      by .gitattributes merge=ours — they will NOT be overwritten
#
# Safe to run repeatedly — idempotent.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

TEMPLATE_URL="${1:-}"
UPSTREAM_REMOTE="upstream"
UPSTREAM_BRANCH="main"

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[sync]${NC} $*"; }
warn()  { echo -e "${YELLOW}[sync]${NC} $*"; }
error() { echo -e "${RED}[sync]${NC} $*" >&2; }

# ── Pre-flight checks ───────────────────────────────────────────────────────
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    error "Not inside a Git repository. Run this from your project root."
    exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
    error "Working tree is dirty. Commit or stash changes before syncing."
    exit 1
fi

# ── 1. Configure upstream remote ────────────────────────────────────────────
if git remote get-url "$UPSTREAM_REMOTE" &>/dev/null; then
    CURRENT_URL=$(git remote get-url "$UPSTREAM_REMOTE")
    info "Upstream remote already exists: $CURRENT_URL"
    if [ -n "$TEMPLATE_URL" ] && [ "$CURRENT_URL" != "$TEMPLATE_URL" ]; then
        warn "Updating upstream URL to: $TEMPLATE_URL"
        git remote set-url "$UPSTREAM_REMOTE" "$TEMPLATE_URL"
    fi
else
    if [ -z "$TEMPLATE_URL" ]; then
        error "No upstream remote found. Provide the template URL:"
        error "  ./scripts/sync-template.sh https://github.com/YOUR_ORG/agentic-vibe-coding.git"
        exit 1
    fi
    info "Adding upstream remote: $TEMPLATE_URL"
    git remote add "$UPSTREAM_REMOTE" "$TEMPLATE_URL"
fi

# ── 2. Configure the "ours" merge driver ────────────────────────────────────
if ! git config merge.ours.driver &>/dev/null; then
    info "Configuring 'ours' merge driver..."
    git config merge.ours.driver true
else
    info "'ours' merge driver already configured."
fi

# ── 3. Fetch upstream ───────────────────────────────────────────────────────
info "Fetching upstream/$UPSTREAM_BRANCH..."
git fetch "$UPSTREAM_REMOTE" "$UPSTREAM_BRANCH"

# ── 4. Check if there are changes to merge ──────────────────────────────────
LOCAL_HEAD=$(git rev-parse HEAD)
UPSTREAM_HEAD=$(git rev-parse "$UPSTREAM_REMOTE/$UPSTREAM_BRANCH")
MERGE_BASE=$(git merge-base HEAD "$UPSTREAM_REMOTE/$UPSTREAM_BRANCH" 2>/dev/null || echo "")

if [ "$LOCAL_HEAD" = "$UPSTREAM_HEAD" ]; then
    info "Already up to date with upstream template."
    exit 0
fi

if [ "$UPSTREAM_HEAD" = "$MERGE_BASE" ]; then
    info "Already up to date (local is ahead of upstream)."
    exit 0
fi

# ── 5. Merge upstream changes ───────────────────────────────────────────────
CURRENT_BRANCH=$(git branch --show-current)
info "Merging upstream/$UPSTREAM_BRANCH into $CURRENT_BRANCH..."

if git merge "$UPSTREAM_REMOTE/$UPSTREAM_BRANCH" \
    --no-edit \
    -m "chore(template): sync with upstream template $(date +%Y-%m-%d)" \
    --allow-unrelated-histories; then
    info "Template sync complete! Review the changes with: git log --oneline -5"
else
    warn "Merge conflicts detected. Resolve them, then commit."
    warn "Project-specific files (.plans/, .agent-logs/, README.md) should be safe"
    warn "thanks to .gitattributes merge=ours."
    warn ""
    warn "After resolving conflicts:"
    warn "  git add ."
    warn "  git commit"
    exit 1
fi

# ── Summary ──────────────────────────────────────────────────────────────────
info ""
info "✓ Synced with upstream template."
info "  Protected paths (kept your version):"
info "    .plans/**"
info "    .agent-logs/**"
info "    README.md"
info ""
info "  Updated paths (from template):"
info "    .github/agents/"
info "    .github/hooks/"
info "    .github/prompts/"
info "    .github/instructions/"
info "    .devcontainer/"
info "    TEMPLATE-GUIDE.md"
info "    scripts/"
