#!/usr/bin/env bash
# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.
# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited.
# ──────────────────────────────────────────────────────────────────────────────
# init-project.sh — Create a new project repo from the template on any platform
#
# Usage:
#   ./scripts/init-project.sh --platform azdo --name "my-app" [--azdo-project "MyProject"]
#
# Supported platforms:
#   azdo    — Azure DevOps (creates repo via az CLI)
#   gitlab  — GitLab (future)
#
# What this script does:
#   1. Validates prerequisites for the target platform
#   2. Creates a new repo on the platform
#   3. Seeds it with the template content (clean history)
#   4. Configures the upstream remote for future template sync
#   5. Removes template-specific context
#   6. Prints next steps
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[init]${NC} $*"; }
warn()  { echo -e "${YELLOW}[init]${NC} $*"; }
error() { echo -e "${RED}[init]${NC} $*" >&2; }

# ── Parse arguments ──────────────────────────────────────────────────────────
PLATFORM=""
NAME=""
AZDO_PROJECT=""
INCLUDE_PIPELINE=false

usage() {
    echo "Usage: $0 --platform <azdo|gitlab> --name <repo-name> [options]"
    echo ""
    echo "Options:"
    echo "  --platform        Target platform (required): azdo, gitlab"
    echo "  --name            Repository name (required)"
    echo "  --azdo-project    Azure DevOps project (optional, uses default from config)"
    echo "  --include-pipeline  Copy the sync pipeline YAML into the new repo"
    echo "  --help            Show this help"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --platform) PLATFORM="$2"; shift 2 ;;
        --name) NAME="$2"; shift 2 ;;
        --azdo-project) AZDO_PROJECT="$2"; shift 2 ;;
        --include-pipeline) INCLUDE_PIPELINE=true; shift ;;
        --help) usage ;;
        *) error "Unknown option: $1"; usage ;;
    esac
done

if [ -z "$PLATFORM" ] || [ -z "$NAME" ]; then
    error "Both --platform and --name are required."
    usage
fi

# ── Load platform config ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_PATH="$SCRIPT_DIR/platforms.json"

if [ ! -f "$CONFIG_PATH" ]; then
    error "Platform config not found: $CONFIG_PATH"
    exit 1
fi

# Parse JSON config (requires jq)
if ! command -v jq &>/dev/null; then
    error "jq is required but not installed. Install: https://jqlang.github.io/jq/"
    exit 1
fi

PLATFORM_ENABLED=$(jq -r ".platforms.${PLATFORM}.enabled // false" "$CONFIG_PATH")
if [ "$PLATFORM_ENABLED" != "true" ]; then
    error "Platform '$PLATFORM' is not enabled in platforms.json"
    exit 1
fi

MIRROR_URL=$(jq -r ".platforms.${PLATFORM}.mirrorUrl" "$CONFIG_PATH")
ORG_URL=$(jq -r ".platforms.${PLATFORM}.orgUrl" "$CONFIG_PATH")
DEFAULT_PROJECT=$(jq -r ".platforms.${PLATFORM}.defaultProject" "$CONFIG_PATH")

# ── Platform dispatch ────────────────────────────────────────────────────────
case "$PLATFORM" in
    azdo)
        # ── Validate prerequisites ───────────────────────────────────────────
        if ! command -v az &>/dev/null; then
            error "Azure CLI (az) is not installed or not in PATH."
            error "Install: https://learn.microsoft.com/cli/azure/install-azure-cli"
            exit 1
        fi

        # Check az login status
        ACCOUNT=$(az account show 2>/dev/null) || {
            error "Not logged into Azure CLI. Run: az login"
            exit 1
        }
        USER_NAME=$(echo "$ACCOUNT" | jq -r '.user.name')
        info "Logged in as: $USER_NAME"

        # Determine project
        PROJECT="${AZDO_PROJECT:-$DEFAULT_PROJECT}"
        if [ -z "$PROJECT" ]; then
            error "No Azure DevOps project specified. Use --azdo-project or set defaultProject in platforms.json"
            exit 1
        fi

        info "Organization: $ORG_URL"
        info "Project: $PROJECT"
        info "New repo: $NAME"

        # ── Create the repo ──────────────────────────────────────────────────
        info "Creating Azure DevOps repository..."
        REPO_JSON=$(az repos create --name "$NAME" --org "$ORG_URL" --project "$PROJECT" 2>&1) || {
            error "Failed to create repo: $REPO_JSON"
            error "Check that the project exists and you have permission."
            exit 1
        }

        REPO_CLONE_URL=$(echo "$REPO_JSON" | jq -r '.remoteUrl')
        info "Repo created: $REPO_CLONE_URL"

        # ── Clone mirror to temp dir ─────────────────────────────────────────
        TEMP_DIR=$(mktemp -d)
        info "Cloning template from mirror..."
        git clone "$MIRROR_URL" "$TEMP_DIR" --depth 1 || {
            error "Failed to clone mirror repo. Check access to: $MIRROR_URL"
            rm -rf "$TEMP_DIR"
            exit 1
        }

        # ── Reinitialize (clean history) ─────────────────────────────────────
        info "Reinitializing with clean history..."
        rm -rf "$TEMP_DIR/.git"
        cd "$TEMP_DIR"
        git init
        git checkout -b main

        # Remove template context
        for dir in .plans/template .agent-logs/template; do
            if [ -d "$dir" ]; then
                find "$dir" -type f ! -name "README.md" -delete 2>/dev/null || true
                # Remove empty directories
                find "$dir" -type d -empty -delete 2>/dev/null || true
            fi
        done

        # Initial commit
        git add -A
        git commit -m "feat: initialize project from agentic-vibe-coding template"

        # ── Push to new repo ─────────────────────────────────────────────────
        info "Pushing to new Azure DevOps repo..."
        git remote add origin "$REPO_CLONE_URL"
        git push -u origin main || {
            error "Failed to push. Check credentials and repo permissions."
            cd /
            rm -rf "$TEMP_DIR"
            exit 1
        }

        # ── Configure upstream for template sync ─────────────────────────────
        info "Configuring upstream remote for template sync..."
        git remote add upstream "$MIRROR_URL"
        git config merge.ours.driver true

        cd /
        rm -rf "$TEMP_DIR"

        # ── Print next steps ─────────────────────────────────────────────────
        info ""
        info "═══════════════════════════════════════════════════════════"
        info "✓ Project '$NAME' created successfully!"
        info "═══════════════════════════════════════════════════════════"
        info ""
        info "  Repo URL:  $REPO_CLONE_URL"
        info "  Upstream:  $MIRROR_URL"
        info ""
        info "Next steps:"
        info "  1. Clone your new repo:"
        info "     git clone $REPO_CLONE_URL"
        info ""
        info "  2. The upstream remote is already configured. To sync template updates:"
        info "     ./scripts/sync-template.sh"
        info ""
        if [ "$INCLUDE_PIPELINE" != true ]; then
            info "  3. (Optional) Set up automated sync pipeline:"
            info "     Copy pipelines/azdo/sync-template.yml to your repo"
            info "     See pipelines/azdo/README.md for instructions"
            info ""
        fi
        info "  4. Update README.md with your project description"
        info "  5. Start building! Use @architect in VS Code Copilot Chat"
        info ""
        ;;

    gitlab)
        error "GitLab platform adapter is not yet implemented."
        error "To add GitLab support, implement the adapter in this script"
        error "and update scripts/platforms.json with the mirror URL."
        exit 1
        ;;

    *)
        error "Unsupported platform: $PLATFORM"
        exit 1
        ;;
esac
