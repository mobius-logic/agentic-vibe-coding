# ──────────────────────────────────────────────────────────────────────────────
# sync-template.ps1 — Pull updates from the upstream template repository
#
# Usage:
#   .\scripts\sync-template.ps1 [-TemplateUrl <URL>]
#
# If -TemplateUrl is omitted, the script uses the existing "upstream" remote.
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
param(
    [string]$TemplateUrl = ""
)

$ErrorActionPreference = "Stop"
$UpstreamRemote = "upstream"
$UpstreamBranch = "main"

function Write-Info  { param([string]$Msg) Write-Host "[sync] $Msg" -ForegroundColor Green }
function Write-Warn  { param([string]$Msg) Write-Host "[sync] $Msg" -ForegroundColor Yellow }
function Write-Err   { param([string]$Msg) Write-Host "[sync] $Msg" -ForegroundColor Red }

# ── Pre-flight checks ───────────────────────────────────────────────────────
$isGitRepo = git rev-parse --is-inside-work-tree 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Err "Not inside a Git repository. Run this from your project root."
    exit 1
}

$dirty = git status --porcelain
if ($dirty) {
    Write-Err "Working tree is dirty. Commit or stash changes before syncing."
    exit 1
}

# ── 1. Configure upstream remote ────────────────────────────────────────────
$currentUrl = git remote get-url $UpstreamRemote 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Info "Upstream remote already exists: $currentUrl"
    if ($TemplateUrl -and $currentUrl -ne $TemplateUrl) {
        Write-Warn "Updating upstream URL to: $TemplateUrl"
        git remote set-url $UpstreamRemote $TemplateUrl
    }
} else {
    if (-not $TemplateUrl) {
        Write-Err "No upstream remote found. Provide the template URL:"
        Write-Err "  .\scripts\sync-template.ps1 -TemplateUrl https://github.com/YOUR_ORG/agentic-vibe-coding.git"
        exit 1
    }
    Write-Info "Adding upstream remote: $TemplateUrl"
    git remote add $UpstreamRemote $TemplateUrl
}

# ── 2. Configure the "ours" merge driver ────────────────────────────────────
$oursDriver = git config merge.ours.driver 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Info "Configuring 'ours' merge driver..."
    git config merge.ours.driver true
} else {
    Write-Info "'ours' merge driver already configured."
}

# ── 3. Fetch upstream ───────────────────────────────────────────────────────
Write-Info "Fetching $UpstreamRemote/$UpstreamBranch..."
git fetch $UpstreamRemote $UpstreamBranch
if ($LASTEXITCODE -ne 0) {
    Write-Err "Failed to fetch from upstream."
    exit 1
}

# ── 4. Check if there are changes to merge ──────────────────────────────────
$localHead = git rev-parse HEAD
$upstreamHead = git rev-parse "$UpstreamRemote/$UpstreamBranch"
$mergeBase = git merge-base HEAD "$UpstreamRemote/$UpstreamBranch" 2>$null

if ($localHead -eq $upstreamHead) {
    Write-Info "Already up to date with upstream template."
    exit 0
}

if ($upstreamHead -eq $mergeBase) {
    Write-Info "Already up to date (local is ahead of upstream)."
    exit 0
}

# ── 5. Merge upstream changes ───────────────────────────────────────────────
$currentBranch = git branch --show-current
$today = Get-Date -Format "yyyy-MM-dd"
Write-Info "Merging $UpstreamRemote/$UpstreamBranch into $currentBranch..."

git merge "$UpstreamRemote/$UpstreamBranch" `
    --no-edit `
    -m "chore(template): sync with upstream template $today" `
    --allow-unrelated-histories

if ($LASTEXITCODE -ne 0) {
    Write-Warn "Merge conflicts detected. Resolve them, then commit."
    Write-Warn "Project-specific files (.plans/, .agent-logs/, README.md) should be safe"
    Write-Warn "thanks to .gitattributes merge=ours."
    Write-Warn ""
    Write-Warn "After resolving conflicts:"
    Write-Warn "  git add ."
    Write-Warn "  git commit"
    exit 1
}

# ── Summary ──────────────────────────────────────────────────────────────────
Write-Info ""
Write-Info "Synced with upstream template."
Write-Info "  Protected paths (kept your version):"
Write-Info "    .plans/**"
Write-Info "    .agent-logs/**"
Write-Info "    README.md"
Write-Info ""
Write-Info "  Updated paths (from template):"
Write-Info "    .github/agents/"
Write-Info "    .github/hooks/"
Write-Info "    .github/prompts/"
Write-Info "    .github/instructions/"
Write-Info "    .devcontainer/"
Write-Info "    TEMPLATE-GUIDE.md"
Write-Info "    scripts/"

Write-Info ""
Write-Info "Review the changes with: git log --oneline -5"
