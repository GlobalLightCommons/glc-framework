# Monorepo migration record

Current status (2026-10-30): all three sites publish monorepo source through their existing hosting repositories, and all nine registered dataset validation workflows now use the pinned monorepo release. See the [dataset migration record](dataset-validation-migration.md). The staged rollout below records the original plan; old hosting endpoints still need a separate migration.

Prepared on 22 October 2026 for `GlobalLightCommons/glc-framework`.

## Scope and original sources

The viewer and its documentation move together. The `GlobalLightCommons/globallightcommons` website repository and all dataset repositories stay separate. All original repositories remain available with their source, history, tags, and settings preserved until an explicit deployment cutover.

| Original repository | Imported commit | Destination |
| --- | --- | --- |
| `GlobalLightCommons/glc-dp-viewer` | `fc2d36b81fe87d2c1021d342f75aa0bd76cd208c` | `viewer/` |
| `GlobalLightCommons/glc-metadata-builder` | `76ace87f67ccfe48b43a150ab2e42da82408b133` | `builder/` |
| `tscnlab/glc-metadata-validator` | `19360dce2b2d5967809cbc68e45774c1725d39b7` | `validator/` |
| `GlobalLightCommons/glc-registry` | `0c86a30f0cf69e10afe88a0a7c4137b3f60fc4ba` | `registry/` |

The registry import is the tip merged by PR #25. GitHub main at `c77281c12075c475f62cb0b90863cebcc6698275` has identical files; the additional merge commit contains no source changes. The other three imports match GitHub main at preparation time.

Each source was fetched locally and merged with an unrelated-history merge, then its tree was placed under the destination directory. Original commits remain reachable from the monorepo's history. Old tags remain in the original repositories; this migration does not reuse their potentially colliding names.

## Changes in the draft

- Move active workflows to `.github/workflows/`, add reusable hosting workflows and small legacy-repository callers, and set component working directories and Docker build context.
- Add builder checks, validator tests, registry tests, and documentation builds.
- Preserve the trusted validator workflow's root filename and its digest-pinned image during transition.
- Add monorepo signer policies while retaining both original validator signer policies.
- Export validation reports, manifests, and independently verifiable attestation bundles to an append-only branch in this repository.
- Fall back to reverified archived reports when an Actions artifact is no longer available.
- Fix registry PR comparisons to use paths from the monorepo root.
- Count missing evidence in the registry's error count.
- Update source links without rewriting historical schema identities or changing public site URLs.

The previous builder CI checked historical 3.0.0 naming only. The new consistency check compares the active 3.0.2 schemas against the validator and parses historical JSON. Older builder 3.0.0 copies already differ from validator 3.0.0; those published files are preserved, not silently consolidated.

## Hosting design

The old repositories retain their original application source and commit histories. Their hosting workflows become small callers of reusable workflows in this monorepo:

| Old repository | Caller file | Reusable workflow |
| --- | --- | --- |
| `GlobalLightCommons/glc-registry` | `.github/workflows/update-registry.yml` | `host-registry.yml` |
| `GlobalLightCommons/glc-dp-viewer` | `.github/workflows/jekyll.yml` | `host-viewer.yml` |
| `GlobalLightCommons/glc-metadata-builder` | `.github/workflows/publish-framework.yml` | `host-builder.yml` |

All application code and deployment logic are read from `GlobalLightCommons/glc-framework/main`. The small caller templates are in `templates/github-actions/`. Public domains stay with their existing repositories. Each hosting repository publishes with its own GitHub token; no cross-repository deployment credential is needed.

Pull requests produce previews without publishing. Both the caller and the reusable workflow require a reviewed `main` context before publication. After merge, staggered 15-minute schedules pull source changes from the monorepo. GitHub may delay scheduled runs; manual dispatch is available.

The registry publisher reads the monorepo's `validation-archive` branch in read-only mode. The separate monorepo collector archives new signed reports, so the publisher does not need write permission in the monorepo. The collector also owns proposed canonical repository-name updates in the monorepo dataset list.

## Staged rollout

1. Review the monorepo and the three caller-workflow PRs. Their previews must pass. No original application source is removed or replaced by those PRs.
2. Merge the registry caller PR first. Its existing workflow path triggers a refresh on merge. Confirm all nine entries have verified evidence, with UCR accurately showing a failed validation. The publisher now uses archived evidence when an Actions artifact is missing.
3. Merge the documentation caller PR. It builds `viewer/` from the monorepo and publishes through the existing Pages environment. The documentation domain and Pages settings stay in place.
4. Merge the builder caller PR and let it generate its first `gh-pages` branch. Switch that repository's Pages source from `main:/` to `gh-pages:/` only after the branch is ready. Confirm the existing builder domain and package export still work.
5. Confirm subsequent changes in the monorepo reach all three hosting entry points. Keep the original repositories available; do not archive or delete them.
6. Publish a reviewed `framework-v0.1.0` tag or use a reviewed SHA for the new trusted validator workflow. Switch one dataset caller as a pilot, verify its monorepo signer, and migrate remaining callers after that passes. Existing original tagged caller references remain valid throughout.

The archive branch is initialized and scheduled collection is enabled with `FRAMEWORK_ARCHIVE_ENABLED=true`. The production callers remain staged until their reviewed PRs are merged. The main `globallightcommons.org` website stays separate and unchanged.

## Rollback

Revert the caller-workflow PR in the affected hosting repository to restore its original workflow. For the builder, also restore the Pages source to `main:/` and disable the new publication workflow. The original application source remains in those repositories, so rollback does not need to reconstruct it from the monorepo. No DNS change or custom-domain reassignment is involved.

Existing dataset callers can continue to use the original tagged validator workflow. The monorepo archive branch remains available as validation history. Evidence remains associated with the original dataset repository and commit identity.

## Validation status

Verification results are recorded in `verification.txt`. GitHub-hosted CI, the documentation build, and the builder preview passed. The evidence archive contains nine regenerated reports and 18 attestation bundles. Archive-only checks verified all nine real signed reports without fetching Actions artifacts. The reusable hosting workflows and caller templates pass actionlint; their cutover PRs exercise preview builds in each existing hosting repository before merge.

The dataset results are eight passes and one verified failure: UCR reports 47 participant-reference errors involving `UCR_S001`. The dataset commits and original validator image were unchanged; this migration did not modify dataset source.

The original registry's artifact-only publisher can still show missing evidence until its caller PR is merged. The new archive-aware publisher has verified evidence for all nine current commits. Public hosting cutover, the monorepo signer pilot, and new image publication remain rollout steps. Docker image publishing requires a running Docker daemon or the GitHub build workflow.
