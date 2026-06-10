# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.
# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited.
# ──────────────────────────────────────────────────────────────────────────────
# init-project.ps1 — Create a new project repo from the template on any platform
#
# Usage:
#   .\scripts\init-project.ps1 -Platform azdo -Name "my-app" [-AzDoProject "MyProject"]
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
#
# The result is equivalent to GitHub's "Use this template" button — a clean
# repo with template content but no fork relationship or shared history.
# ──────────────────────────────────────────────────────────────────────────────
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("azdo", "gitlab")]
    [string]$Platform,

    [Parameter(Mandatory=$true)]
    [string]$Name,

    [string]$AzDoProject = "",
    [switch]$IncludePipeline,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

function Write-Info  { param([string]$Msg) Write-Host "[init] $Msg" -ForegroundColor Green }
function Write-Warn  { param([string]$Msg) Write-Host "[init] $Msg" -ForegroundColor Yellow }
function Write-Err   { param([string]$Msg) Write-Host "[init] $Msg" -ForegroundColor Red }

if ($Help) {
    Get-Help $MyInvocation.MyCommand.Path -Detailed
    exit 0
}

# ── Load platform config ────────────────────────────────────────────────────
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $scriptDir "platforms.json"

if (-not (Test-Path $configPath)) {
    Write-Err "Platform config not found: $configPath"
    exit 1
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$platformConfig = $config.platforms.$Platform

if (-not $platformConfig) {
    Write-Err "Platform '$Platform' not found in platforms.json"
    exit 1
}

if (-not $platformConfig.enabled) {
    Write-Err "Platform '$Platform' is not yet enabled. Check platforms.json."
    exit 1
}

# ── Platform dispatch ────────────────────────────────────────────────────────
switch ($Platform) {
    "azdo" {
        # ── Validate prerequisites ───────────────────────────────────────────
        $azCmd = Get-Command az -ErrorAction SilentlyContinue
        if (-not $azCmd) {
            Write-Err "Azure CLI (az) is not installed or not in PATH."
            Write-Err "Install: https://learn.microsoft.com/cli/azure/install-azure-cli"
            exit 1
        }

        # Check az login status
        $ErrorActionPreference = "SilentlyContinue"
        $account = az account show 2>$null | ConvertFrom-Json
        $ErrorActionPreference = "Stop"
        if (-not $account) {
            Write-Err "Not logged into Azure CLI. Run: az login"
            exit 1
        }
        Write-Info "Logged in as: $($account.user.name)"

        # Determine project
        $project = if ($AzDoProject) { $AzDoProject } else { $platformConfig.defaultProject }
        if (-not $project) {
            Write-Err "No Azure DevOps project specified. Use -AzDoProject or set defaultProject in platforms.json"
            exit 1
        }

        $orgUrl = $platformConfig.orgUrl
        $mirrorUrl = $platformConfig.mirrorUrl
        Write-Info "Organization: $orgUrl"
        Write-Info "Project: $project"
        Write-Info "New repo: $Name"

        # ── Create the repo ──────────────────────────────────────────────────
        Write-Info "Creating Azure DevOps repository..."
        $ErrorActionPreference = "SilentlyContinue"
        $repoJson = az repos create --name $Name --org $orgUrl --project $project 2>&1
        $createExitCode = $LASTEXITCODE
        $ErrorActionPreference = "Stop"

        if ($createExitCode -ne 0) {
            Write-Err "Failed to create repo. Error: $repoJson"
            Write-Err "Check that the project exists and you have permission."
            exit 1
        }

        $repo = $repoJson | ConvertFrom-Json
        $repoCloneUrl = $repo.remoteUrl
        Write-Info "Repo created: $repoCloneUrl"

        # ── Clone mirror to temp dir ─────────────────────────────────────────
        $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "init-project-$Name-$(Get-Random)"
        Write-Info "Cloning template from mirror..."
        git clone $mirrorUrl $tempDir --depth 1
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Failed to clone mirror repo. Check access to: $mirrorUrl"
            exit 1
        }

        # ── Reinitialize (clean history) ─────────────────────────────────────
        Write-Info "Reinitializing with clean history..."
        Remove-Item -Recurse -Force (Join-Path $tempDir ".git")
        Push-Location $tempDir
        git init
        git checkout -b main

        # Remove template context
        $templateDirs = @(".plans/template", ".agent-logs/template")
        foreach ($dir in $templateDirs) {
            if (Test-Path $dir) {
                $files = Get-ChildItem -Path $dir -Recurse -File | Where-Object { $_.Name -ne "README.md" }
                foreach ($f in $files) {
                    Remove-Item $f.FullName -Force
                }
            }
        }

        # Copy Azure Pipelines sync if requested
        if ($IncludePipeline) {
            Write-Info "Including Azure Pipelines sync pipeline..."
            # Already included from template clone
        }

        # Initial commit
        git add -A
        git commit -m "feat: initialize project from agentic-vibe-coding template"

        # ── Push to new repo ─────────────────────────────────────────────────
        Write-Info "Pushing to new Azure DevOps repo..."
        git remote add origin $repoCloneUrl
        git push -u origin main
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Failed to push. Check credentials and repo permissions."
            Pop-Location
            exit 1
        }

        # ── Configure upstream for template sync ─────────────────────────────
        Write-Info "Configuring upstream remote for template sync..."
        git remote add upstream $mirrorUrl
        git config merge.ours.driver true

        Pop-Location

        # ── Print next steps ─────────────────────────────────────────────────
        Write-Info ""
        Write-Info "═══════════════════════════════════════════════════════════"
        Write-Info "✓ Project '$Name' created successfully!"
        Write-Info "═══════════════════════════════════════════════════════════"
        Write-Info ""
        Write-Info "  Repo URL:  $repoCloneUrl"
        Write-Info "  Upstream:  $mirrorUrl"
        Write-Info ""
        Write-Info "Next steps:"
        Write-Info "  1. Clone your new repo:"
        Write-Info "     git clone $repoCloneUrl"
        Write-Info ""
        Write-Info "  2. The upstream remote is already configured. To sync template updates:"
        Write-Info "     .\scripts\sync-template.ps1"
        Write-Info ""
        if (-not $IncludePipeline) {
            Write-Info "  3. (Optional) Set up automated sync pipeline:"
            Write-Info "     Copy pipelines/azdo/sync-template.yml to your repo"
            Write-Info "     See pipelines/azdo/README.md for instructions"
            Write-Info ""
        }
        Write-Info "  4. Update README.md with your project description"
        Write-Info "  5. Start building! Use @architect in VS Code Copilot Chat"
        Write-Info ""

        # Clean up temp dir
        Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    }

    "gitlab" {
        Write-Err "GitLab platform adapter is not yet implemented."
        Write-Err "To add GitLab support, implement the adapter in this script"
        Write-Err "and update scripts/platforms.json with the mirror URL."
        exit 1
    }
}
