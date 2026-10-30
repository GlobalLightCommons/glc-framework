# Dataset validation migration — 2026-10-30

All nine datasets currently listed in `registry/datasets.yml` now call the reusable validation workflow in this monorepo. Dataset repositories remain under `tscnlab`; their data and metadata have not moved or changed. Each migration changes only one workflow reference.

- Workflow release: `framework-v0.1.0`.
- Pinned workflow commit: `dfd412d54091a70abc597925a5e48c6b71404a08`.
- Validator version: `0.5.2` (unchanged).
- Current schema version: `3.0.2` (unchanged).
- Image: `ghcr.io/globallightcommons/glc-validator@sha256:bf5a6f21db106967762afda0f69a0f1dad018253bbbee983cccd82537031d869`.

| Dataset | Migration PR | Main validation | Dataset commit |
| --- | --- | --- | --- |
| IZTECH | [PR](https://github.com/tscnlab/melidos-iztech-glc-dataset/pull/6) | [pass](https://github.com/tscnlab/melidos-iztech-glc-dataset/actions/runs/41043890476) | `3062fa8817c8f8c287e23096a82362a95592d346` |
| KNUST | [PR](https://github.com/tscnlab/melidos-knust-glc-dataset/pull/4) | [pass](https://github.com/tscnlab/melidos-knust-glc-dataset/actions/runs/41046596770) | `e89b658a88edc168b98e3dc798faf548c44cf225` |
| BAUA | [PR](https://github.com/tscnlab/melidos-baua-glc-dataset/pull/1) | [pass](https://github.com/tscnlab/melidos-baua-glc-dataset/actions/runs/41046604876) | `4ba2156d8a8373bb982d9bc01e63e3e9ad85f2c0` |
| UCR | [PR](https://github.com/tscnlab/melidos-ucr-glc-dataset/pull/1) | [fail](https://github.com/tscnlab/melidos-ucr-glc-dataset/actions/runs/41046614098) | `de428c1b50c77c8a60a60a9a58d054107edc5dcd` |
| FUSPCEU | [PR](https://github.com/tscnlab/melidos-fuspceu-glc-dataset/pull/1) | [pass](https://github.com/tscnlab/melidos-fuspceu-glc-dataset/actions/runs/41046622396) | `4aeb3fd0be06eb6899d56f31828150a3d5a15cd7` |
| RISE | [PR](https://github.com/tscnlab/melidos-rise-glc-dataset/pull/1) | [pass](https://github.com/tscnlab/melidos-rise-glc-dataset/actions/runs/41046631466) | `690a501fbff49f78136c2ed4508327f2679705ed` |
| TUM | [PR](https://github.com/tscnlab/melidos-tum-glc-dataset/pull/1) | [pass](https://github.com/tscnlab/melidos-tum-glc-dataset/actions/runs/41046640395) | `c051329453825f6f6d5051d0fb78479f3662491a` |
| THUAS | [PR](https://github.com/tscnlab/melidos-thuas-glc-dataset/pull/1) | [pass](https://github.com/tscnlab/melidos-thuas-glc-dataset/actions/runs/41046648464) | `d078a7a8a1fdfa6c856ddc48c019c1d391693e40` |
| MPI | [PR](https://github.com/tscnlab/melidos-mpi-glc-dataset/pull/1) | [pass](https://github.com/tscnlab/melidos-mpi-glc-dataset/actions/runs/41046657181) | `81c0530371e6581f7c27beb7c7cf00c80a2d905a` |

## Verification

Every new main-commit report and validated-file manifest was cryptographically verified against its exact dataset commit and the pinned monorepo workflow commit. The registry recognizes all nine under `framework_glc`. Their reports, manifests, and signature bundles are preserved on the `validation-archive` branch; archive-only verification succeeds without live Actions artifacts.

The outcome is eight verified passes and one verified failure. UCR retains the exact same 47 participant-reference errors as before migration; no validation requirement was bypassed or dataset content corrected by these workflow changes.

Evidence is stored under `evidence/<owner>/<dataset>/<commit>/<content-digest>/` in the [archive branch](https://github.com/GlobalLightCommons/glc-framework/tree/validation-archive/evidence/tscnlab). Historical reports and their original signer policies remain intact.

## Remaining infrastructure work

Dataset validation no longer executes the old GLC validator workflows or uses the old `tscnlab` image. The documentation/viewer, builder, and registry still publish through their existing hosting repositories using monorepo source. Retiring those publishing endpoints is a separate migration. Original repositories and tags remain available.
