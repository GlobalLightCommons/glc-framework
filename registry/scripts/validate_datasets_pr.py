import sys
import os
import subprocess
import json
import re
from pathlib import Path
from urllib.parse import urlparse

import yaml

from validation_artifacts import (
    archived_result,
    find_validation_artifact,
    get_commit_sha,
    repo_name_from_slug,
    verify_validation_artifact,
)


def die(msg: str, code: int = 1):
    print(f"\nERROR: {msg}")
    raise SystemExit(code)


def load_cfg(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_base_cfg(path: str):
    base_ref = os.getenv("GITHUB_BASE_REF")
    if not base_ref:
        return None

    candidates = [f"origin/{base_ref}", base_ref]
    for ref in candidates:
        try:
            result = subprocess.run(
                ["git", "show", f"{ref}:{path}"],
                text=True,
                capture_output=True,
                check=True,
            )
            return yaml.safe_load(result.stdout) or {}
        except subprocess.CalledProcessError:
            continue
    return None


def dataset_key(ds):
    if not isinstance(ds, dict):
        return None
    return ds.get("repo")


def dataset_label(ds):
    if not isinstance(ds, dict):
        return "<unknown>"
    return repo_name_from_slug(ds.get("repo"))


def target_fields(ds):
    return {
        "repo": ds.get("repo"),
        "branch": ds.get("branch") or "main",
        "commit": ds.get("commit"),
    }


def trust_logic_changed():
    base_ref = os.getenv("GITHUB_BASE_REF")
    if not base_ref:
        return False
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", f"origin/{base_ref}...HEAD"],
            text=True,
            capture_output=True,
            check=True,
        )
    except subprocess.CalledProcessError:
        return False
    trust_paths = {
        ".github/workflows/validate.yml",
        "registry/scripts/validation_artifacts.py",
        "registry/scripts/fetch_registry.py",
        "scripts/validation_artifacts.py",
        "scripts/fetch_registry.py",
    }
    return bool(trust_paths.intersection(result.stdout.splitlines()))


def dataset_entries_requiring_verification(current_datasets, base_cfg, force_all=False):
    if force_all:
        return [(ds, "registry trust logic changed") for ds in current_datasets]

    if base_cfg is None:
        print("No PR base dataset file found; checking all dataset entries.")
        return [(ds, "base unavailable") for ds in current_datasets]

    base_datasets = base_cfg.get("datasets") or []
    base_by_key = {
        dataset_key(ds): ds
        for ds in base_datasets
        if isinstance(ds, dict) and dataset_key(ds)
    }

    requiring_verification = []
    for ds in current_datasets:
        key = dataset_key(ds)
        if not key:
            continue
        base_ds = base_by_key.get(key)
        if base_ds is None:
            requiring_verification.append((ds, "new dataset entry"))
        elif target_fields(base_ds) != target_fields(ds):
            requiring_verification.append((ds, "validation target changed"))
    return requiring_verification


def is_repo_slug(value: str) -> bool:
    if not isinstance(value, str) or value.count("/") != 1:
        return False
    owner, name = value.split("/")
    return bool(owner) and bool(name) and " " not in value


def is_http_url(s: str) -> bool:
    try:
        u = urlparse(s)
        return u.scheme in ("http", "https") and bool(u.netloc)
    except Exception:
        return False


def pull_request_body():
    """Read event data as data, never interpolate contributor text into a shell."""
    event_path = os.getenv("GITHUB_EVENT_PATH")
    if not event_path:
        return None
    event = json.loads(Path(event_path).read_text(encoding="utf-8"))
    pr = event.get("pull_request")
    return (pr.get("body") or "") if isinstance(pr, dict) else None


def justification_for(body, repo):
    body = re.sub(r"<!--.*?-->", "", body or "", flags=re.S)
    section = re.search(
        r"^## Metadata-only justification\s*\n(.*?)(?=^## |\Z)",
        body, flags=re.M | re.S | re.I,
    )
    if not section:
        return ""
    # Repository headings make multi-dataset requests unambiguous.
    for heading, text in re.findall(
        r"^###\s+([^\n]+)\n(.*?)(?=^### |\Z)",
        section.group(1), flags=re.M | re.S,
    ):
        if heading.strip().casefold() != repo.casefold():
            continue
        text = text.strip()
        if text.casefold() in {"", "…", "...", "tbd", "todo", "n/a", "none",
                               "reason:", "reason: …", "reason: ...", "[explain here]"}:
            return ""
        return text
    return ""


def inclusion_policy_error(report, body, repo):
    scope = report.get("validation_scope")
    if scope not in {"metadata_only", "metadata_and_data"}:
        return (f"{repo}: validation scope is not recorded. Rerun validation with "
                "a validator that records metadata-only versus metadata-and-data coverage.")
    if scope == "metadata_only" and not justification_for(body, repo):
        return (f"{repo}: This submission is metadata-only. Please explain why recordings "
                "cannot be shared publicly in the 'Metadata-only justification' section, "
                f"under a '### {repo}' heading.")
    return None


def main(cfg_path: str):
    cfg = load_cfg(cfg_path)
    # git show needs the path from the monorepo root, even when CI runs in registry/.
    repo_root = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
    git_cfg_path = str(Path(cfg_path).resolve().relative_to(repo_root))
    base_cfg = load_base_cfg(git_cfg_path)
    current_schema_version = cfg.get("current_schema_version")
    datasets = cfg.get("datasets") or []
    if not isinstance(datasets, list) or len(datasets) == 0:
        die("datasets.yml must contain a non-empty top-level 'datasets:' list")

    required_keys = ("name", "repo")

    seen_ids = set()
    seen_repos = set()
    errors = []

    if (
        not isinstance(current_schema_version, str)
        or not current_schema_version
        or len(current_schema_version.split(".")) != 3
        or not all(part.isdigit() for part in current_schema_version.split("."))
    ):
        errors.append(
            "current_schema_version must use semantic version form MAJOR.MINOR.PATCH"
        )

    for ds in datasets:
        if not isinstance(ds, dict):
            errors.append("Each entry under datasets: must be an object/map")
            continue

        missing = [k for k in required_keys if not ds.get(k)]
        if missing:
            errors.append(f"{ds.get('repo') or '<unknown>'}: missing {missing}")
            continue

        repo = ds["repo"]
        ds_id = repo_name_from_slug(repo)
        name = ds["name"]

        if not isinstance(name, str) or not name.strip():
            errors.append(f"{ds_id}: name must be a non-empty string")

        if not is_repo_slug(repo):
            errors.append(f"{ds_id}: repo must be an owner/name GitHub repo slug: {repo}")
        else:
            if ds_id in seen_ids:
                errors.append(f"Duplicate derived id from repo name: {ds_id}")
            seen_ids.add(ds_id)
            if repo in seen_repos:
                errors.append(f"Duplicate repo: {repo}")
            seen_repos.add(repo)

        # Backward-compatible: old URL fields may remain for now, but must be URL-shaped.
        for url_key in ("latest_pass_url", "current_url"):
            if ds.get(url_key) and not is_http_url(ds[url_key]):
                errors.append(f"{ds_id}: {url_key} is not a valid http(s) URL: {ds[url_key]}")

    if errors:
        die("Registry validation failed:\n" + "\n".join(f" - {e}" for e in errors))

    verification_errors = []
    work_dir = Path("_registry_pr_validation")

    datasets_to_verify = dataset_entries_requiring_verification(
        datasets,
        base_cfg,
        force_all=trust_logic_changed(),
    )
    body = pull_request_body()
    # Trust-policy changes may recheck old entries, but do not create new inclusion requests.
    inclusion_repos = {
        ds["repo"] for ds, _ in dataset_entries_requiring_verification(datasets, base_cfg)
    }
    if datasets_to_verify:
        changed_ids = ", ".join(
            f"{dataset_label(ds)} ({reason})"
            for ds, reason in datasets_to_verify
        )
        print(f"Trusted validation will check new or target-changed dataset entries only: {changed_ids}")
    else:
        print("No dataset entries were added or had validation targets changed; skipping trusted artifact checks.")

    for ds, reason in datasets_to_verify:
        repo = ds["repo"]
        ds_id = repo_name_from_slug(repo)
        branch = ds.get("branch") or "main"
        requested_commit = ds.get("commit")

        print(f"Checking trusted validation artifact for {ds_id} ({repo}); reason: {reason}...")
        try:
            expected_sha = get_commit_sha(repo, requested_commit or branch)
            artifact_info = find_validation_artifact(repo, expected_sha)
            result = verify_validation_artifact(
                repo,
                expected_sha,
                artifact_info,
                work_dir / repo.replace("/", "__") / expected_sha,
            ) if artifact_info else archived_result(repo, expected_sha)
            if result is None:
                raise RuntimeError("No live or archived validation report found")
            status = result["validation"].get("status")
            if status != "pass":
                raise RuntimeError(f"current validation status is {status!r}, expected 'pass'")
            if body is not None and repo in inclusion_repos:
                policy_error = inclusion_policy_error(result["validation"], body, repo)
                if policy_error:
                    raise RuntimeError(policy_error)
        except Exception as e:
            verification_errors.append(f"{ds_id}: trusted validation check failed: {e}")

    if verification_errors:
        summary = os.getenv("GITHUB_STEP_SUMMARY")
        if summary:
            with open(summary, "a", encoding="utf-8") as stream:
                stream.write("## Registry inclusion checks failed\n\n")
                for error in verification_errors:
                    stream.write(f"- {error}\n")
        die("Trusted validation checks failed:\n" + "\n".join(f" - {e}" for e in verification_errors))

    print("\nOK: datasets.yml entries have trusted passing validation artifacts.")


if __name__ == "__main__":
    cfg_path = sys.argv[1] if len(sys.argv) > 1 else "datasets.yml"
    main(cfg_path)
