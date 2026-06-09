# Azure Pipelines — Template Sync Setup

This directory contains an Azure Pipelines YAML definition that syncs template
updates into your Azure DevOps child repo (equivalent to the GitHub Actions
workflow in `.github/workflows/sync-template.yml`).

## Prerequisites

1. **Azure DevOps child repo** created from the template (via `scripts/init-project.ps1`)
2. **Upstream remote** configured pointing to the template mirror repo
3. **Pipeline permissions**: The build service must have:
   - "Contribute" permission on the repo
   - "Contribute to pull requests" permission
   - "Create branch" permission

## Setup Instructions

### 1. Copy the Pipeline YAML

Copy `sync-template.yml` to your child repo (keep it in `pipelines/azdo/` or
move it to the root — adjust the pipeline path in Azure DevOps accordingly).

### 2. Create the Pipeline in Azure DevOps

1. Go to **Pipelines → New Pipeline**
2. Select **Azure Repos Git** and choose your child repo
3. Select **Existing Azure Pipelines YAML file**
4. Set the path to `/pipelines/azdo/sync-template.yml`
5. Save (do not run yet)

### 3. Configure Permissions

1. Go to **Project Settings → Repositories → your repo → Security**
2. Find the **Build Service** identity (e.g., `<Project Name> Build Service`)
3. Grant:
   - **Contribute**: Allow
   - **Contribute to pull requests**: Allow
   - **Create branch**: Allow

### 4. (Optional) Update the Mirror URL

If your template mirror is at a different URL, update the `TEMPLATE_MIRROR_URL`
variable in `sync-template.yml`.

## Usage

### Manual Trigger

1. Go to **Pipelines** in Azure DevOps
2. Select the "Template Sync" pipeline
3. Click **Run pipeline**
4. Optionally change the `templateBranch` parameter (defaults to `main`)

### Scheduled Trigger

By default, the pipeline runs weekly on Monday at 09:00 UTC. Edit the `schedules`
section in the YAML to change this.

### What Happens

1. Pipeline fetches the latest template from the mirror repo
2. If updates exist, it creates a branch `chore/sync-template-updates`
3. Merges template changes (`.gitattributes merge=ours` protects your project files)
4. Removes any template-specific content (`.plans/template/`, `.agent-logs/template/`)
5. Creates a PR for your team to review

### Protected Files (Never Overwritten)

- `.plans/project/**`
- `.agent-logs/project/**`
- `.agent-events/**`
- `.test-specs/project/**`
- `README.md`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Permission denied" on push | Grant "Contribute" + "Create branch" to Build Service |
| "PR already exists" | Close or complete the existing sync PR first |
| Merge conflicts in PR | Resolve manually — project files are safe, conflicts are in template files |
| Cannot fetch upstream | Verify the mirror URL is correct and accessible from the pipeline |
