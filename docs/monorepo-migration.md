# Monorepo migration record

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

- Move active workflows to `.github/workflows/` and set component working directories and Docker build context.
- Add builder checks, validator tests, registry tests, and documentation builds.
- Preserve the trusted validator workflow's root filename and its digest-pinned image during transition.
- Add monorepo signer policies while retaining both original validator signer policies.
- Export validation reports, manifests, and independently verifiable attestation bundles to an append-only branch in this repository.
- Fall back to reverified archived reports when an Actions artifact is no longer available.
- Fix registry PR comparisons to use paths from the monorepo root.
- Count missing evidence in the registry's error count.
- Update source links without rewriting historical schema identities or changing public site URLs.

The previous builder CI checked historical 3.0.0 naming only. The new consistency check compares the active 3.0.2 schemas against the validator and parses historical JSON. Older builder 3.0.0 copies already differ from validator 3.0.0; those published files are preserved, not silently consolidated.

## Staged rollout

1. Publish the reviewed monorepo with `FRAMEWORK_LIVE` unset. CI runs, but production deployments remain disabled. Review the build artifacts.
2. Run **Initialize validation archive branch** once. Run **Update registry and preserve evidence** manually. This writes evidence to the monorepo archive branch and uploads a preview; it does not publish a site while `FRAMEWORK_LIVE` is unset.
3. Rerun the nine dataset validations using their existing callers, then refresh the registry. Confirm all signed reports are archived and the preview verifies their exact current commits. The existing registry can also recover from the fresh Actions artifacts before cutover.
4. Publish a reviewed `framework-v0.1.0` tag for the new reusable workflow, or use a reviewed commit SHA. Switch one dataset caller as a pilot and confirm the registry verifies the monorepo signer. Migrate remaining callers after that passes. Old caller references remain valid throughout.
5. Configure a narrowly scoped `FRAMEWORK_DEPLOY_TOKEN` with permission to write generated deployment branches in `GlobalLightCommons/glc-metadata-builder` and `GlobalLightCommons/glc-registry`.
6. Prepare the builder `gh-pages` branch, then switch that repository's Pages source from `main:/` to `gh-pages:/`. This affects hosting settings, not source history.
7. Configure Pages in `glc-framework` with workflow builds. Move `docs.globallightcommons.org` from the old viewer Pages settings to the monorepo's Pages settings. Coordinate this domain reassignment to avoid competing deployments; it may require a DNS update.
8. Disable the original registry update schedule immediately before enabling monorepo publication, so the old fetcher cannot overwrite new output without archive fallback. Preserve the old workflow file and repository. Record how to re-enable it for rollback.
9. Set `FRAMEWORK_LIVE=true`. Dispatch the builder, documentation, and registry workflows. Verify all three public domains and the nine dataset entries.

Do not archive or delete the original repositories as part of this rollout. Their existing hosting and reusable workflow references remain useful during transition.

## Rollback

Set `FRAMEWORK_LIVE=false` to stop new production publications. Re-enable the original registry schedule, restore the builder Pages source to `main:/`, and move the documentation domain back to the old viewer repository if it was moved. Existing dataset callers can continue to use the original tagged validator workflow. The monorepo archive branch remains available as validation history.

This migration has not changed the dataset repositories' identities or commits. Their original signed evidence must remain associated with those original identities.

## Validation status

Local verification results are recorded in `verification.txt`. Full real-signature verification and cross-repository publication must be exercised during the staged rollout; unit tests do not substitute for that integration check. Docker image publishing requires a running Docker daemon or the GitHub build workflow.
