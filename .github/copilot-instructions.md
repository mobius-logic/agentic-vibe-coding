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

## Code Quality
- All code must have tests before merge
- Run the project's test command before considering work complete
- Follow existing patterns in the codebase
- No commented-out code in commits

## Collaboration
- Each workstream operates on its own feature branch
- Use pull requests for integration to `main`
- Agents must document non-obvious decisions in code comments
