# Azure DevOps - Create a New Project from This Template

This guide walks you through creating a new Azure DevOps project and repo that
inherits from the agentic-vibe-coding template, using the Azure DevOps UI portal.

## Prerequisites

- Access to `dev.azure.com/mobiuslogic`
- The mirror repo already exists at `ML Templates/_git/agentic-vibe-coding` (one-time admin setup - see [TEMPLATE-GUIDE.md](TEMPLATE-GUIDE.md#one-time-admin-setup-mirror-repo))
- Azure CLI installed locally (`az`) or Git Credential Manager
- VS Code with GitHub Copilot Chat extension
---

## Step 1: Create a New Project (if needed)

1. Go to `https://dev.azure.com/mobiuslogic`
2. Click **+ New project** (top-right)
3. Fill in:
   - **Project name**: e.g., `My App`
   - **Visibility**: Private (or as needed)
   - **Version control**: Git
   - **Work item process**: Agile (or your preference)
4. Click **Create**

> Skip this step if you are adding the repo to an existing project.

---

## Step 2: Create the Repo via Import (UI)

This is the cleanest way to seed a repo from the template mirror — no scripts needed.

1. In your project, go to **Repos** → **Files**
2. If this is a brand-new project with the default empty repo:
   - Click **Import** (shown on the empty repo landing page)
3. If you already have repos in the project:
   - Click the repo dropdown (top-left) → **+ New repository**
   - Name it (e.g., `my-app`) → Click **Create**
   - On the empty repo page, click **Import**
4. In the Import dialog:
   - **Source type**: Git
   - **Clone URL**: `https://dev.azure.com/mobiuslogic/ML%20Templates/_git/agentic-vibe-coding`
   - **Requires authentication**: Check this box if the mirror repo is in a different project with restricted access
     - **Username**: (anything, e.g., `pat`)
     - **Password**: Your Azure DevOps PAT with Code Read access
   - If both projects are in the same org with default permissions, auth may not be needed
5. Click **Import**

> This gives you a clean copy of the template content. It is the Azure DevOps equivalent of GitHub's "Use this template."
---

## Step 3: Configure Upstream Remote (for future template syncs)

After importing, clone the repo locally and configure the upstream:

```powershell
# Clone your new repo
git clone https://dev.azure.com/mobiuslogic/My%20App/_git/my-app
cd my-app

# Add the template mirror as upstream
git remote add upstream https://dev.azure.com/mobiuslogic/ML%20Templates/_git/agentic-vibe-coding

# Configure the merge protection driver
git config merge.ours.driver true
```

---

## Step 4: Remove Template Context

Template-specific plans and logs should not exist in project repos. Remove them:

```powershell
# Remove template-specific plans/logs (not needed in your project)
Remove-Item -Recurse -Force .plans/template/* -Exclude README.md -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .agent-logs/template/* -Exclude README.md -ErrorAction SilentlyContinue

git add -A
git commit -m "chore: remove template context from project repo"
git push
```

---

## Step 5: (Optional) Set Up Automated Sync Pipeline

This Azure Pipeline will create PRs in your repo whenever the template has updates.

1. In Azure DevOps, go to **Pipelines** → **New Pipeline**
2. Select **Azure Repos Git** → select your new repo
3. Choose **Existing Azure Pipelines YAML file**
4. Set path to: `/pipelines/azdo/sync-template.yml`
5. Click **Save** (not "Run" yet)
6. Go to **Project Settings** → **Repositories** → your repo → **Security**
7. Find the **Build Service** identity (e.g., `<Project Name> Build Service`) and grant:
   - **Contribute**: Allow
   - **Contribute to pull requests**: Allow
   - **Create branch**: Allow

Now you can trigger template syncs from **Pipelines** → **Run pipeline** whenever you want updates.

> See [pipelines/azdo/README.md](pipelines/azdo/README.md) for additional details and troubleshooting.
---

## Step 6: Start Building

1. Open the cloned repo in VS Code
2. Update `README.md` with your project description
3. Open Copilot Chat → invoke `@architect` to design your system
4. The full multi-agent workflow is documented in [TEMPLATE-GUIDE.md](TEMPLATE-GUIDE.md)

---

## Alternative: Use the Init Script (CLI)

If you prefer automation over the UI, the init script does steps 2–4 in one command:

**PowerShell:**
```powershell
.\scripts\init-project.ps1 -Platform azdo -Name "my-app" -AzDoProject "My App"
```

**Bash:**
```bash
./scripts/init-project.sh --platform azdo --name "my-app" --azdo-project "My App"
```

---

## Syncing Template Updates Later

Anytime the template gets improvements (new agents, better prompts, dashboard updates):

**Option A** — Manual (from your cloned repo):
```powershell
.\scripts\sync-template.ps1
```

**Option B** — Azure Pipeline (creates a PR for review):

Go to **Pipelines** → select the sync pipeline → **Run pipeline**

Either way, your project files (`.plans/project/`, `README.md`, all source code) are
**never overwritten** thanks to `.gitattributes merge=ours`.

---

## How File Protection Works

When syncing, these paths are always kept as-is (your version wins):

| Protected Path | Why |
|----------------|-----|
| `.plans/project/**` | Your architecture plans |
| `.agent-logs/project/**` | Your agent session logs |
| `.agent-events/**` | Your dashboard events |
| `.test-specs/project/**` | Your test specifications |
| `README.md` | Your project documentation |

These paths are removed after sync (template context, not needed in projects):

| Removed Path | Why |
|--------------|-----|
| `.plans/template/**` | Template-internal plans |
| `.agent-logs/template/**` | Template-internal logs |