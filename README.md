# Global Light Commons framework

The GLC metadata builder, validator, data-package viewer and documentation, and dataset registry in one repository. Dataset repositories and the main `globallightcommons.org` website remain separate.

| Directory | Purpose |
| --- | --- |
| `builder/` | Static metadata builder, published at `builder.globallightcommons.org` |
| `validator/` | Canonical versioned schemas, Python validator, and container |
| `viewer/` | Data-package viewer and documentation at `docs.globallightcommons.org` |
| `registry/` | Dataset list, signed-evidence verification, and registry generator |
| `.github/workflows/` | Shared CI, trusted dataset validation, and deployment workflows |
| `scripts/` | Cross-component consistency checks |

Original Git histories are preserved through merge commits. No original repository is deleted, archived, or rewritten by this migration. See [the migration record](docs/monorepo-migration.md) for provenance, deployment setup, and rollback.

## Development

Run commands from the component that owns the code:

```sh
cd builder
node tests/datetime-metadata.test.js
node tests/schema-ui-consistency.test.js
```

```sh
cd validator
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
```

```sh
cd registry
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
```

Build the viewer and documentation:

```sh
cd viewer
bundle install
bundle exec jekyll serve --baseurl ""
```

From the monorepo root, build the validator container with:

```sh
docker build -t glc-validator validator
```

The published schema files retain their existing identities and historical contents. `validator/schemas/` is canonical. `python scripts/check_schema_copies.py` checks that the active builder bundle matches it. Historical builder bundles remain unchanged during migration.

## Dataset validation

The trusted reusable workflow remains at `.github/workflows/validate.yml` because GitHub requires reusable workflows at the repository root. It checks out the **calling dataset repository**, not this monorepo, and uses the public `ghcr.io/globallightcommons/glc-validator` image pinned by digest. Validator version 0.5.2 and the existing schema versions are unchanged.

Existing dataset callers keep working against the original validator repository until individually migrated. The template in `validator/templates/github-actions/` targets `GlobalLightCommons/glc-framework` at `framework-v0.1.0`. Pin callers to that release's reviewed commit SHA for production use. The `Verify released validator image` workflow pulls the pinned image without credentials and tests both AMD64 and ARM64, including validation of a schema 3.0.2 fixture. A real dataset signer/archive pilot is a separate rollout step.

## Durable validation evidence

The `validation-archive` branch of this same repository stores reports, validated-file manifests, and attestation bundles under `evidence/<owner>/<dataset>/<commit>/<content-digest>/`. Each validation is appended; revalidating a commit does not replace its earlier evidence.

The registry exports and verifies both bundles before archiving. When an Actions artifact expires, the registry retrieves its archive and rechecks the signature, trusted workflow, source commit, repository, and report contents. An archive entry is never trusted simply because it is in Git.

Run **Initialize validation archive branch** once, then **Update registry and preserve evidence** to populate it. `VALIDATION_ARCHIVE_DIR` selects the archive directory locally. Deleted Actions artifacts cannot be recovered from signatures alone; the initial nine dataset validations must be rerun to seed the archive.

## Deployment

The monorepo owns the application source, CI, archive collection, and reusable hosting workflows. The existing repositories keep their domains and serve as hosting entry points, while retaining their original source trees and histories for rollback.

| Hosting repository | Monorepo workflow | Existing domain |
| --- | --- | --- |
| `glc-registry` | `.github/workflows/host-registry.yml` | `registry.globallightcommons.org` |
| `glc-dp-viewer` | `.github/workflows/host-viewer.yml` | `docs.globallightcommons.org` |
| `glc-metadata-builder` | `.github/workflows/host-builder.yml` | `builder.globallightcommons.org` |

The small caller workflows in `templates/github-actions/` belong in those existing hosting repositories. They call this repository's reusable workflows on `main`, so source and deployment logic remain centralized. Each caller grants its own GitHub token the permissions needed to publish its own site. No shared deployment credential or domain transfer is required.

Cutover PRs build previews on pull requests; production publication is disabled for PR events and for refs other than the hosting repository's `main`. After review and merge, the hosting callers publish on a 15-minute schedule and on manual dispatch. The builder additionally needs its Pages source switched from `main:/` to `gh-pages:/` after its first generated branch is ready. Registry and documentation retain their existing Pages settings.

`FRAMEWORK_ARCHIVE_ENABLED=true` enables scheduled evidence collection in the monorepo independently of hosting cutover. This is already enabled; all nine current reports and their 18 attestation bundles have been archived and verified.

See [the migration record](docs/monorepo-migration.md) for the review order and rollback steps. Original dataset callers remain valid against their existing tagged validator workflows.

Each component retains its existing license and attribution files; the migration does not introduce a new blanket license.
