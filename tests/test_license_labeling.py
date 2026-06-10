# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.
# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited.

"""Plan-compliance tests for proprietary license labeling.

Test spec: .test-specs/template/2026-06-10-infra-license-test-spec.md
Architecture: .plans/template/2026-06-10-163053-architecture-proprietary-license.md
"""

from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent

COPYRIGHT_LINE = "# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved."
CONFIDENTIAL_LINE = "# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited."


# ─── Module: LICENSE file ─────────────────────────────────────────────────────


class TestLicenseFile:
    """Validate LICENSE file exists with correct proprietary content."""

    @pytest.fixture()
    def license_content(self) -> str:
        return (REPO_ROOT / "LICENSE").read_text(encoding="utf-8")

    def test_license_exists(self) -> None:
        assert (REPO_ROOT / "LICENSE").exists()

    def test_license_contains_copyright_holder(self, license_content: str) -> None:
        assert "Mobius Logic, Inc." in license_content

    def test_license_contains_all_rights_reserved(self, license_content: str) -> None:
        assert "All rights reserved" in license_content

    def test_license_contains_proprietary_marker(self, license_content: str) -> None:
        assert "PROPRIETARY AND CONFIDENTIAL" in license_content

    def test_license_contains_contact_email(self, license_content: str) -> None:
        assert "legal@mobiuslogic.com" in license_content

    def test_license_contains_year(self, license_content: str) -> None:
        assert "2026" in license_content


# ─── Module: THIRD-PARTY-NOTICES.md ──────────────────────────────────────────


class TestThirdPartyNotices:
    """Validate THIRD-PARTY-NOTICES.md exists with correct attributions."""

    @pytest.fixture()
    def notices_content(self) -> str:
        return (REPO_ROOT / "THIRD-PARTY-NOTICES.md").read_text(encoding="utf-8")

    def test_third_party_notices_exists(self) -> None:
        assert (REPO_ROOT / "THIRD-PARTY-NOTICES.md").exists()

    def test_notices_references_devcontainer_images(self, notices_content: str) -> None:
        assert "mcr.microsoft.com/devcontainers" in notices_content

    def test_notices_references_devcontainer_features(self, notices_content: str) -> None:
        assert "ghcr.io/devcontainers/features" in notices_content

    def test_notices_references_github_actions(self, notices_content: str) -> None:
        assert "actions/checkout" in notices_content
        assert "actions/github-script" in notices_content

    def test_notices_declares_mit_license(self, notices_content: str) -> None:
        assert "MIT" in notices_content


# ─── Module: Python file headers ─────────────────────────────────────────────


class TestPythonHeaders:
    """Validate copyright headers on Python source files."""

    def test_edit_script_has_copyright_header(self) -> None:
        lines = (REPO_ROOT / "_edit_script.py").read_text(encoding="utf-8").splitlines()
        assert lines[0] == COPYRIGHT_LINE

    def test_edit_script_has_confidential_line(self) -> None:
        lines = (REPO_ROOT / "_edit_script.py").read_text(encoding="utf-8").splitlines()
        assert lines[1] == CONFIDENTIAL_LINE


# ─── Module: PowerShell file headers ─────────────────────────────────────────


class TestPowerShellHeaders:
    """Validate copyright headers on PowerShell source files."""

    def test_init_project_ps1_has_copyright_at_line_1(self) -> None:
        lines = (REPO_ROOT / "scripts" / "init-project.ps1").read_text(encoding="utf-8").splitlines()
        assert lines[0] == COPYRIGHT_LINE

    def test_init_project_ps1_has_confidential_at_line_2(self) -> None:
        lines = (REPO_ROOT / "scripts" / "init-project.ps1").read_text(encoding="utf-8").splitlines()
        assert lines[1] == CONFIDENTIAL_LINE

    def test_sync_template_ps1_has_copyright_at_line_1(self) -> None:
        lines = (REPO_ROOT / "scripts" / "sync-template.ps1").read_text(encoding="utf-8").splitlines()
        assert lines[0] == COPYRIGHT_LINE

    def test_sync_template_ps1_has_confidential_at_line_2(self) -> None:
        lines = (REPO_ROOT / "scripts" / "sync-template.ps1").read_text(encoding="utf-8").splitlines()
        assert lines[1] == CONFIDENTIAL_LINE


# ─── Module: Shell script headers ────────────────────────────────────────────


class TestShellHeaders:
    """Validate shell scripts have shebang at line 1 and copyright after."""

    def test_init_project_sh_shebang_preserved(self) -> None:
        lines = (REPO_ROOT / "scripts" / "init-project.sh").read_text(encoding="utf-8").splitlines()
        assert lines[0] == "#!/usr/bin/env bash"

    def test_init_project_sh_has_copyright_after_shebang(self) -> None:
        lines = (REPO_ROOT / "scripts" / "init-project.sh").read_text(encoding="utf-8").splitlines()
        assert lines[1] == COPYRIGHT_LINE

    def test_init_project_sh_has_confidential_at_line_3(self) -> None:
        lines = (REPO_ROOT / "scripts" / "init-project.sh").read_text(encoding="utf-8").splitlines()
        assert lines[2] == CONFIDENTIAL_LINE

    def test_sync_template_sh_shebang_preserved(self) -> None:
        lines = (REPO_ROOT / "scripts" / "sync-template.sh").read_text(encoding="utf-8").splitlines()
        assert lines[0] == "#!/usr/bin/env bash"

    def test_sync_template_sh_has_copyright_after_shebang(self) -> None:
        lines = (REPO_ROOT / "scripts" / "sync-template.sh").read_text(encoding="utf-8").splitlines()
        assert lines[1] == COPYRIGHT_LINE

    def test_sync_template_sh_has_confidential_at_line_3(self) -> None:
        lines = (REPO_ROOT / "scripts" / "sync-template.sh").read_text(encoding="utf-8").splitlines()
        assert lines[2] == CONFIDENTIAL_LINE


# ─── Module: YAML workflow file headers ──────────────────────────────────────


class TestYamlHeaders:
    """Validate copyright headers on YAML workflow files."""

    def test_mirror_to_azdo_yml_has_copyright_at_line_1(self) -> None:
        lines = (REPO_ROOT / ".github" / "workflows" / "mirror-to-azdo.yml").read_text(encoding="utf-8").splitlines()
        assert lines[0] == COPYRIGHT_LINE

    def test_mirror_to_azdo_yml_has_confidential_at_line_2(self) -> None:
        lines = (REPO_ROOT / ".github" / "workflows" / "mirror-to-azdo.yml").read_text(encoding="utf-8").splitlines()
        assert lines[1] == CONFIDENTIAL_LINE

    def test_sync_template_yml_gh_has_copyright_at_line_1(self) -> None:
        lines = (REPO_ROOT / ".github" / "workflows" / "sync-template.yml").read_text(encoding="utf-8").splitlines()
        assert lines[0] == COPYRIGHT_LINE

    def test_sync_template_yml_gh_has_confidential_at_line_2(self) -> None:
        lines = (REPO_ROOT / ".github" / "workflows" / "sync-template.yml").read_text(encoding="utf-8").splitlines()
        assert lines[1] == CONFIDENTIAL_LINE

    def test_sync_template_yml_azdo_has_copyright_at_line_1(self) -> None:
        lines = (REPO_ROOT / "pipelines" / "azdo" / "sync-template.yml").read_text(encoding="utf-8").splitlines()
        assert lines[0] == COPYRIGHT_LINE

    def test_sync_template_yml_azdo_has_confidential_at_line_2(self) -> None:
        lines = (REPO_ROOT / "pipelines" / "azdo" / "sync-template.yml").read_text(encoding="utf-8").splitlines()
        assert lines[1] == CONFIDENTIAL_LINE


# ─── Module: Files NOT modified (negative tests) ─────────────────────────────


class TestFilesNotModified:
    """Validate that JSON, markdown, and frontmatter files were NOT modified."""

    @pytest.mark.parametrize(
        "rel_path",
        [
            "scripts/platforms.json",
            ".devcontainer/devcontainer.json",
            ".vscode/settings.json",
            ".github/hooks/safety-gates.json",
        ],
    )
    def test_json_files_have_no_copyright_header(self, rel_path: str) -> None:
        path = REPO_ROOT / rel_path
        if path.exists():
            line1 = path.read_text(encoding="utf-8").splitlines()[0]
            assert "Copyright" not in line1

    @pytest.mark.parametrize(
        "rel_path",
        [
            "README.md",
            "TEMPLATE-GUIDE.md",
            "AZURE-DEVOPS-GUIDE.md",
            "pipelines/azdo/README.md",
        ],
    )
    def test_md_files_have_no_copyright_header(self, rel_path: str) -> None:
        path = REPO_ROOT / rel_path
        if path.exists():
            line1 = path.read_text(encoding="utf-8").splitlines()[0]
            assert "Copyright" not in line1


# ─── Module: Agent/Instruction/Prompt frontmatter integrity ──────────────────


class TestFrontmatterIntegrity:
    """Validate frontmatter files still have --- at line 1."""

    @pytest.mark.parametrize(
        "rel_path",
        [
            ".github/agents/architect.agent.md",
            ".github/agents/backend-lead.agent.md",
            ".github/agents/code-reviewer.agent.md",
            ".github/agents/developer.agent.md",
            ".github/agents/docs-writer.agent.md",
            ".github/agents/frontend-lead.agent.md",
            ".github/agents/infra-lead.agent.md",
            ".github/agents/test-lead.agent.md",
            ".github/agents/tester.agent.md",
            ".github/instructions/python-style.instructions.md",
            ".github/instructions/testing.instructions.md",
            ".github/instructions/typescript-style.instructions.md",
            ".github/prompts/implement-feature.prompt.md",
            ".github/prompts/design-architecture.prompt.md",
            ".github/prompts/plan-sprint.prompt.md",
            ".github/prompts/review-and-merge.prompt.md",
            ".github/prompts/run-tests.prompt.md",
        ],
    )
    def test_frontmatter_intact(self, rel_path: str) -> None:
        path = REPO_ROOT / rel_path
        if path.exists():
            line1 = path.read_text(encoding="utf-8").splitlines()[0]
            assert line1 == "---"


# ─── Integration Tests: Full-repo license consistency ────────────────────────


class TestIntegrationFullRepo:
    """End-to-end integration tests validating repo-wide license consistency."""

    def test_all_py_files_have_headers(self) -> None:
        py_files = list(REPO_ROOT.rglob("*.py"))
        # Exclude test file itself and any in .venv/node_modules
        py_files = [f for f in py_files if ".venv" not in str(f) and "node_modules" not in str(f)]
        assert len(py_files) > 0, "Expected at least one .py file"
        for f in py_files:
            lines = f.read_text(encoding="utf-8").splitlines()
            assert lines[0] == COPYRIGHT_LINE, f"{f.relative_to(REPO_ROOT)} missing copyright at line 1"

    def test_all_ps1_files_have_headers(self) -> None:
        ps1_files = list(REPO_ROOT.rglob("*.ps1"))
        assert len(ps1_files) > 0, "Expected at least one .ps1 file"
        for f in ps1_files:
            lines = f.read_text(encoding="utf-8").splitlines()
            assert lines[0] == COPYRIGHT_LINE, f"{f.relative_to(REPO_ROOT)} missing copyright at line 1"

    def test_all_sh_files_have_headers_after_shebang(self) -> None:
        sh_files = list(REPO_ROOT.rglob("*.sh"))
        assert len(sh_files) > 0, "Expected at least one .sh file"
        for f in sh_files:
            lines = f.read_text(encoding="utf-8").splitlines()
            assert lines[0] == "#!/usr/bin/env bash", f"{f.relative_to(REPO_ROOT)} shebang not at line 1"
            assert lines[1] == COPYRIGHT_LINE, f"{f.relative_to(REPO_ROOT)} missing copyright at line 2"

    def test_all_yml_files_have_headers(self) -> None:
        yml_files = list(REPO_ROOT.rglob("*.yml"))
        # Exclude any in .github/agents or similar non-source locations
        yml_files = [
            f
            for f in yml_files
            if ".venv" not in str(f) and "node_modules" not in str(f)
        ]
        assert len(yml_files) > 0, "Expected at least one .yml file"
        for f in yml_files:
            lines = f.read_text(encoding="utf-8").splitlines()
            assert lines[0] == COPYRIGHT_LINE, f"{f.relative_to(REPO_ROOT)} missing copyright at line 1"

    def test_no_json_file_has_copyright_header(self) -> None:
        json_files = list(REPO_ROOT.rglob("*.json"))
        json_files = [f for f in json_files if ".venv" not in str(f) and "node_modules" not in str(f)]
        for f in json_files:
            content = f.read_text(encoding="utf-8")
            first_lines = "\n".join(content.splitlines()[:3])
            assert "Copyright" not in first_lines, f"{f.relative_to(REPO_ROOT)} should not have copyright"

    def test_no_md_documentation_has_copyright_header(self) -> None:
        md_files = [
            f
            for f in REPO_ROOT.rglob("*.md")
            if not f.name.endswith((".agent.md", ".instructions.md", ".prompt.md"))
            and ".venv" not in str(f)
            and "node_modules" not in str(f)
            and ".plans" not in str(f)
            and ".test-specs" not in str(f)
            and ".agent-logs" not in str(f)
        ]
        for f in md_files:
            content = f.read_text(encoding="utf-8")
            first_lines = "\n".join(content.splitlines()[:3])
            assert "Copyright" not in first_lines, f"{f.relative_to(REPO_ROOT)} should not have copyright header"

    def test_no_frontmatter_file_has_license_header(self) -> None:
        frontmatter_patterns = ["*.agent.md", "*.instructions.md", "*.prompt.md"]
        frontmatter_files: list[Path] = []
        for pattern in frontmatter_patterns:
            frontmatter_files.extend(REPO_ROOT.rglob(pattern))
        for f in frontmatter_files:
            lines = f.read_text(encoding="utf-8").splitlines()
            assert lines[0] == "---", f"{f.relative_to(REPO_ROOT)} frontmatter broken"


# ─── Edge Cases ──────────────────────────────────────────────────────────────


class TestEdgeCases:
    """Edge case validation from test spec."""

    def test_shell_shebang_not_displaced(self) -> None:
        for sh_file in REPO_ROOT.rglob("*.sh"):
            lines = sh_file.read_text(encoding="utf-8").splitlines()
            assert lines[0] == "#!/usr/bin/env bash"
            assert lines[1] == COPYRIGHT_LINE

    def test_python_file_has_no_shebang(self) -> None:
        lines = (REPO_ROOT / "_edit_script.py").read_text(encoding="utf-8").splitlines()
        assert lines[0] == COPYRIGHT_LINE  # Copyright at absolute line 1

    def test_existing_content_preserved_py(self) -> None:
        lines = (REPO_ROOT / "_edit_script.py").read_text(encoding="utf-8").splitlines()
        # After header (2 lines) + blank line, original content starts
        assert lines[2] == ""
        assert lines[3] == "import sys"

    def test_existing_content_preserved_ps1(self) -> None:
        lines = (REPO_ROOT / "scripts" / "init-project.ps1").read_text(encoding="utf-8").splitlines()
        # After header (2 lines), original content starts with the ─── line
        assert "────" in lines[2]

    def test_no_trailing_whitespace_in_headers(self) -> None:
        files_to_check = [
            REPO_ROOT / "_edit_script.py",
            REPO_ROOT / "scripts" / "init-project.ps1",
            REPO_ROOT / "scripts" / "sync-template.ps1",
            REPO_ROOT / "scripts" / "init-project.sh",
            REPO_ROOT / "scripts" / "sync-template.sh",
            REPO_ROOT / ".github" / "workflows" / "mirror-to-azdo.yml",
            REPO_ROOT / ".github" / "workflows" / "sync-template.yml",
            REPO_ROOT / "pipelines" / "azdo" / "sync-template.yml",
        ]
        for f in files_to_check:
            lines = f.read_text(encoding="utf-8").splitlines()
            # Check first 2 lines (or line 1-2 for .sh after shebang)
            start = 1 if lines[0].startswith("#!") else 0
            assert lines[start] == lines[start].rstrip(), f"{f.name} line {start+1} has trailing whitespace"
            assert lines[start + 1] == lines[start + 1].rstrip(), f"{f.name} line {start+2} has trailing whitespace"

    def test_header_is_exactly_two_lines(self) -> None:
        # For non-shebang files, lines 1-2 are the header, line 3 is original content
        lines = (REPO_ROOT / "scripts" / "init-project.ps1").read_text(encoding="utf-8").splitlines()
        assert lines[0] == COPYRIGHT_LINE
        assert lines[1] == CONFIDENTIAL_LINE
        assert lines[2].startswith("# ───")  # Original content immediately follows

    def test_copilot_instructions_md_not_modified(self) -> None:
        path = REPO_ROOT / ".github" / "copilot-instructions.md"
        if path.exists():
            line1 = path.read_text(encoding="utf-8").splitlines()[0]
            assert "Copyright" not in line1
