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

The trusted reusable workflow remains at `.github/workflows/validate.yml` because GitHub requires reusable workflows at the repository root. It still checks out the **calling dataset repository**, not this monorepo, and uses the existing digest-pinned validator image during transition.

Existing dataset callers keep working against the original validator repository. The updated template in `validator/templates/github-actions/` targets `GlobalLightCommons/glc-framework` and requires the reviewed `framework-v0.1.0` tag to be published before callers switch. Pin callers to a reviewed commit SHA for production use.

## Durable validation evidence

The `validation-archive` branch of this same repository stores reports, validated-file manifests, and attestation bundles under `evidence/<owner>/<dataset>/<commit>/<content-digest>/`. Each validation is appended; revalidating a commit does not replace its earlier evidence.

The registry exports and verifies both bundles before archiving. When an Actions artifact expires, the registry retrieves its archive and rechecks the signature, trusted workflow, source commit, repository, and report contents. An archive entry is never trusted simply because it is in Git.

Run **Initialize validation archive branch** once, then **Update registry and preserve evidence** to populate it. `VALIDATION_ARCHIVE_DIR` selects the archive directory locally. Deleted Actions artifacts cannot be recovered from signatures alone; the initial nine dataset validations must be rerun to seed the archive.

## Deployment

Set `FRAMEWORK_ARCHIVE_ENABLED=true` to collect signed evidence on the existing 15-minute schedule independently of production publication.

Production remains disabled until the repository variable `FRAMEWORK_LIVE` is set to `true`. CI and preview builds can run before that switch. Registry refresh can also be run manually to test verification and populate the archive without publishing.

The documentation deploys through this repository's GitHub Pages site. The builder and registry retain their current domains by publishing generated output to the existing repositories' `gh-pages` branches with `FRAMEWORK_DEPLOY_TOKEN`. These repositories retain their original source and history. See the migration record before enabling publication: Pages settings and the old registry schedule need coordinated changes.

Each component retains its existing license and attribution files; the migration does not introduce a new blanket license.
