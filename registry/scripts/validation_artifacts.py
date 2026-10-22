import json
import hashlib
import tempfile
import os
import shutil
import subprocess
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import requests


UA = {"User-Agent": "glc-registry-bot"}
TRUSTED_VALIDATOR_POLICIES = (
    {
        "id": "framework_glc",
        "signer_workflow": "GlobalLightCommons/glc-framework/.github/workflows/validate.yml",
        "signer_digest": None,
        "image_prefix": "ghcr.io/globallightcommons/glc-validator@sha256:",
    },
    {
        "id": "framework_transition",
        "signer_workflow": "GlobalLightCommons/glc-framework/.github/workflows/validate.yml",
        "signer_digest": None,
        "image_prefix": "ghcr.io/tscnlab/glc-validator@sha256:",
    },
    {
        "id": "current_glc",
        "signer_workflow": os.getenv(
            "TRUSTED_VALIDATOR_WORKFLOW",
            "tscnlab/glc-metadata-validator/.github/workflows/validate.yml",
        ),
        "signer_digest": os.getenv("TRUSTED_VALIDATOR_WORKFLOW_DIGEST"),
        "image_prefix": os.getenv(
            "ALLOWED_VALIDATOR_IMAGE_PREFIX",
            "ghcr.io/tscnlab/glc-validator@sha256:",
        ),
    },
    {
        "id": "legacy_glee",
        "signer_workflow": "tscnlab/glee-metadata-validator/.github/workflows/validate.yml",
        "signer_digest": None,
        "image_prefix": "ghcr.io/tscnlab/glee-validator@sha256:",
    },
)


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def repo_name_from_slug(repo):
    if isinstance(repo, str) and "/" in repo:
        return repo.split("/", 1)[1]
    return repo or "unknown"


def github_headers():
    headers = dict(UA)
    token = os.getenv("GH_TOKEN") or os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
        headers["X-GitHub-Api-Version"] = "2022-11-28"
    return headers


def github_get_json(url, timeout=30):
    r = requests.get(url, timeout=timeout, headers=github_headers())
    r.raise_for_status()
    return r.json()


def resolve_repository(repo):
    """Return the canonical owner/name, following GitHub rename redirects."""
    data = github_get_json(f"https://api.github.com/repos/{repo}")
    return data["full_name"]


def github_download(url, dest_path, timeout=60):
    with requests.get(url, timeout=timeout, headers=github_headers(), stream=True) as r:
        r.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)


def get_commit_sha(repo, branch_or_sha):
    if len(branch_or_sha) == 40 and all(c in "0123456789abcdefABCDEF" for c in branch_or_sha):
        return branch_or_sha
    data = github_get_json(f"https://api.github.com/repos/{repo}/commits/{branch_or_sha}")
    return data["sha"]


def list_runs_for_sha(repo, sha):
    url = f"https://api.github.com/repos/{repo}/actions/runs?head_sha={sha}&status=completed&per_page=50"
    return github_get_json(url).get("workflow_runs", [])


def list_artifacts_for_run(repo, run_id):
    url = f"https://api.github.com/repos/{repo}/actions/runs/{run_id}/artifacts?per_page=100"
    return github_get_json(url).get("artifacts", [])


def find_validation_artifact(repo, sha, require_success=False):
    runs = sorted(
        list_runs_for_sha(repo, sha),
        key=lambda r: r.get("created_at") or "",
        reverse=True,
    )
    for run in runs:
        if require_success and run.get("conclusion") != "success":
            continue
        artifacts = list_artifacts_for_run(repo, run["id"])
        for artifact in artifacts:
            if artifact.get("name") != "validation-report" or artifact.get("expired"):
                continue
            return {"run": run, "artifact": artifact}
    return None


def download_validation_artifact(repo, artifact, dest_dir):
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    zip_path = dest_dir / "validation-report.zip"
    github_download(
        f"https://api.github.com/repos/{repo}/actions/artifacts/{artifact['id']}/zip",
        zip_path,
    )
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(dest_dir)
    return dest_dir


def find_report_file(extract_dir, filename):
    extract_dir = Path(extract_dir)
    candidates = [
        extract_dir / "validation_out" / filename,
        extract_dir / filename,
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    matches = list(extract_dir.rglob(filename))
    return matches[0] if matches else None


def policies_for_report(report):
    image = report.get("validator_image") or ""
    return [
        policy
        for policy in TRUSTED_VALIDATOR_POLICIES
        if image.startswith(policy["image_prefix"])
    ]


def verify_attestation(path, repo, expected_sha, policy, bundle_path=None):
    if shutil.which("gh") is None:
        raise RuntimeError("GitHub CLI 'gh' is required to verify artifact attestations")

    cmd = [
        "gh",
        "attestation",
        "verify",
        str(path),
        "--repo",
        repo,
        "--signer-workflow",
        policy["signer_workflow"],
        "--source-digest",
        expected_sha,
        "--deny-self-hosted-runners",
        "--format",
        "json",
    ]
    if bundle_path is not None:
        cmd.extend(["--bundle", str(bundle_path)])
    if policy.get("signer_digest"):
        cmd.extend(["--signer-digest", policy["signer_digest"]])
    result = subprocess.run(cmd, text=True, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "attestation verification failed")
    try:
        return json.loads(result.stdout or "[]")
    except json.JSONDecodeError:
        return {"raw": result.stdout}


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def validate_report_content(report, repo, expected_sha, policy):
    errors = []
    if report.get("repo") != repo:
        errors.append(f"report repo {report.get('repo')!r} does not match {repo!r}")
    if report.get("commit_sha") != expected_sha:
        errors.append(f"report commit_sha {report.get('commit_sha')!r} does not match {expected_sha!r}")
    if report.get("status") not in {"pass", "fail"}:
        errors.append(f"report status {report.get('status')!r} is not pass/fail")
    image = report.get("validator_image") or ""
    image_prefix = policy["image_prefix"]
    if not image.startswith(image_prefix):
        errors.append(f"validator_image {image!r} does not start with {image_prefix!r}")
    return errors


def verify_validation_artifact(repo, expected_sha, artifact_info, work_dir):
    if not artifact_info:
        raise RuntimeError(f"No validation-report artifact found for {repo}@{expected_sha}")

    run = artifact_info["run"]
    artifact = artifact_info["artifact"]
    archived = artifact_info.get("_archive_dir")
    extract_dir = Path(archived) if archived else download_validation_artifact(repo, artifact, work_dir)

    validation_path = find_report_file(extract_dir, "validation.json")
    manifest_path = find_report_file(extract_dir, "validated-files-manifest.json")
    if not validation_path:
        raise RuntimeError("validation-report artifact is missing validation.json")
    if not manifest_path:
        raise RuntimeError("validation-report artifact is missing validated-files-manifest.json")

    report = load_json(validation_path)
    manifest = load_json(manifest_path)
    matching_policies = policies_for_report(report)
    if not matching_policies:
        image = report.get("validator_image")
        allowed_prefixes = [policy["image_prefix"] for policy in TRUSTED_VALIDATOR_POLICIES]
        raise RuntimeError(
            f"validator_image {image!r} does not match a trusted validator policy; "
            f"allowed prefixes: {allowed_prefixes}"
        )

    verification_errors = []
    policy = None
    validation_attestation = None
    manifest_attestation = None
    for candidate in matching_policies:
        try:
            validation_attestation = verify_attestation(
                validation_path, repo, expected_sha, candidate,
                extract_dir / "validation.bundle.jsonl" if archived else None,
            )
            manifest_attestation = verify_attestation(
                manifest_path, repo, expected_sha, candidate,
                extract_dir / "manifest.bundle.jsonl" if archived else None,
            )
            policy = candidate
            break
        except Exception as exc:
            verification_errors.append(f"{candidate['id']}: {exc}")
    if policy is None:
        raise RuntimeError(
            "attestation did not match the trusted policy for its validator image: "
            + "; ".join(verification_errors)
        )

    content_errors = validate_report_content(report, repo, expected_sha, policy)
    if manifest.get("repo") != repo:
        content_errors.append(f"manifest repo {manifest.get('repo')!r} does not match {repo!r}")
    if manifest.get("commit_sha") != expected_sha:
        content_errors.append(
            f"manifest commit_sha {manifest.get('commit_sha')!r} does not match {expected_sha!r}"
        )
    if content_errors:
        raise RuntimeError("; ".join(content_errors))

    result = {
        "run_id": run.get("id"),
        "run_url": run.get("html_url"),
        "run_conclusion": run.get("conclusion"),
        "artifact_id": artifact.get("id"),
        "artifact_url": artifact.get("archive_download_url"),
        "validation": report,
        "manifest": manifest,
        "trust_policy": policy["id"],
        "validation_attestation": validation_attestation,
        "manifest_attestation": manifest_attestation,
        "verification_source": "archive" if archived else "github_artifact",
    }
    if not archived and os.getenv("VALIDATION_ARCHIVE_DIR") and os.getenv("VALIDATION_ARCHIVE_READ_ONLY") != "true":
        archive_verified_result(repo, expected_sha, artifact_info, validation_path, manifest_path, policy)
    return result


def archive_root():
    value = os.getenv("VALIDATION_ARCHIVE_DIR")
    return Path(value) if value else None


def archive_commit_dir(repo, sha):
    # Archive locations come from repository metadata, never from report contents.
    parts = repo.split("/")
    if (len(parts) != 2 or any(not part or part in {".", ".."} or "\\" in part for part in parts)
            or len(sha) != 40 or any(c not in "0123456789abcdefABCDEF" for c in sha)):
        raise RuntimeError("Invalid archive repository or commit identity")
    root = archive_root()
    return root / parts[0] / parts[1] / sha if root else None


def download_attestation_bundle(path, repo, destination):
    with tempfile.TemporaryDirectory() as temporary:
        result = subprocess.run(
            ["gh", "attestation", "download", str(Path(path).resolve()), "--repo", repo],
            cwd=temporary, text=True, capture_output=True,
        )
        bundles = list(Path(temporary).glob("*.jsonl"))
        if result.returncode != 0 or len(bundles) != 1:
            raise RuntimeError(result.stderr.strip() or "Could not export attestation bundle")
        shutil.copyfile(bundles[0], destination)


def archive_verified_result(repo, sha, artifact_info, validation_path, manifest_path, policy):
    parent = archive_commit_dir(repo, sha)
    if parent is None:
        return
    # Preserve separate validation runs of the same commit without overwriting evidence.
    digest = hashlib.sha256(Path(validation_path).read_bytes() + Path(manifest_path).read_bytes()).hexdigest()
    destination = parent / digest
    if destination.exists():
        # An existing archive is reverified by readers; never silently replace its bytes.
        source = load_json(destination / "source.json")
        verify_validation_artifact(repo, sha, dict(source, _archive_dir=str(destination)), destination)
        return
    parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".pending-", dir=parent) as temporary:
        stage = Path(temporary)
        shutil.copyfile(validation_path, stage / "validation.json")
        shutil.copyfile(manifest_path, stage / "validated-files-manifest.json")
        for original, bundle_name in ((validation_path, "validation.bundle.jsonl"), (manifest_path, "manifest.bundle.jsonl")):
            bundle = stage / bundle_name
            download_attestation_bundle(original, repo, bundle)
            # Verify the exported evidence itself before committing it to the archive.
            verify_attestation(original, repo, sha, policy, bundle)
        (stage / "source.json").write_text(json.dumps(artifact_info, indent=2) + "\n", encoding="utf-8")
        shutil.copytree(stage, destination)


def archived_result(repo, sha, require_pass=False):
    parent = archive_commit_dir(repo, sha)
    if parent is None or not parent.exists():
        return None
    candidates = []
    errors = []
    for directory in parent.iterdir():
        if not directory.is_dir() or directory.name.startswith("."):
            continue
        try:
            source = load_json(directory / "source.json")
            result = verify_validation_artifact(repo, sha, dict(source, _archive_dir=str(directory)), directory)
            if not require_pass or result["validation"].get("status") == "pass":
                candidates.append(result)
        except Exception as exc:
            errors.append(str(exc))
    if candidates:
        return max(candidates, key=lambda r: r["validation"].get("timestamp_utc") or "")
    if errors:
        raise RuntimeError("Archived validation evidence could not be verified: " + "; ".join(errors))
    return None


def archived_latest_pass(repo):
    root = archive_root()
    if root is None:
        return None
    repository_dir = root.joinpath(*repo.split("/"))
    if not repository_dir.exists():
        return None
    candidates = []
    for commit_dir in repository_dir.iterdir():
        if not commit_dir.is_dir():
            continue
        result = archived_result(repo, commit_dir.name, require_pass=True)
        if result:
            candidates.append(result)
    return max(candidates, key=lambda r: r["validation"].get("timestamp_utc") or "") if candidates else None


def find_latest_verified_pass(repo, current_sha, current_result, work_root, max_runs=25):
    if current_result and current_result["validation"].get("status") == "pass":
        return current_result

    saved_pass = archived_latest_pass(repo)
    url = f"https://api.github.com/repos/{repo}/actions/runs?status=completed&per_page={max_runs}"
    runs = sorted(
        github_get_json(url).get("workflow_runs", []),
        key=lambda r: r.get("created_at") or "",
        reverse=True,
    )

    for run in runs:
        sha = run.get("head_sha")
        if not sha or sha == current_sha:
            continue
        artifacts = list_artifacts_for_run(repo, run["id"])
        for artifact in artifacts:
            if artifact.get("name") != "validation-report" or artifact.get("expired"):
                continue
            try:
                result = verify_validation_artifact(
                    repo,
                    sha,
                    {"run": run, "artifact": artifact},
                    Path(work_root) / "latest_pass_candidates" / repo.replace("/", "__") / sha,
                )
                if result["validation"].get("status") == "pass":
                    return max([r for r in (result, saved_pass) if r], key=lambda r: r["validation"].get("timestamp_utc") or "")
            except Exception:
                continue
            time.sleep(0.2)
    return saved_pass
