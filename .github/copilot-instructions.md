# Project Standards

## Repository
- Main branch: `main` (protected)
- Feature branches: `feature/<area>/<short-description>`
- Bug fix branches: `fix/<area>/<short-description>`

## Branching Workflow
- Always create a feature branch before making changes
- Never commit directly to `main`
- Write descriptive commit messages: `<type>(<scope>): <description>`
- Types: feat, fix, docs, test, refactor, chore

## Planning Workflow
- Team leads MUST present plans to the human user for approval before execution
- Approved plans are saved to `.plans/` with date-timestamped filenames
- All agents must reference the relevant plan file in their work and logs
- Plans are immutable after approval — they serve as the source of truth

## Code Quality
- All code must have tests before merge
- Run the project's test command before considering work complete
- Follow existing patterns in the codebase
- No commented-out code in commits

## Documentation
- Team leads MUST invoke @docs-writer after implementation to update project documentation
- `README.md` contains project-specific documentation (features, setup, usage)
- `TEMPLATE-GUIDE.md` contains template usage instructions — do not overwrite
- Agent logs in `.agent-logs/` must include plan references and full timestamps

## Collaboration
- Each workstream operates on its own feature branch
- Use pull requests for integration to `main`
- Agents must document non-obvious decisions in code comments
