# Development

Run component commands from their respective directories. The root README links to the live tools and user documentation.

## Metadata builder

```sh
cd builder
node tests/datetime-metadata.test.js
node tests/schema-ui-consistency.test.js
```

See the [builder README](../builder/README.md) for implementation details.

## Validator and registry

From either `validator/` or `registry/`, install dependencies into a Python virtual environment and run:

```sh
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
```

Build the validator container from the monorepo root:

```sh
docker build -t glc-validator validator
```

Pull requests run **Test proposed validator image** on AMD64 and ARM64. It
builds the proposed code into a temporary local image without publishing,
runs the image's bundled tests, and checks the normal entrypoint with complete
3.0.2 and 3.1.0 packages and a metadata-only 3.1.0 package.

**Verify released validator image** is separate. It checks the reusable
workflow's exact published digest with the tests and fixtures bundled in that
release, rather than injecting a newer branch's tests. It runs when the pin or
release-check workflow changes and can be dispatched with a candidate release
digest and expected version before updating the workflow pin.

Release sequence:

1. Review and merge proposed code after its checks pass.
2. Dispatch **Build & publish validator image** on `main`. Its version must
   match `validator/VERSION`; the `validator-release` artifact records the
   approved commit and multi-architecture image digest.
3. Dispatch **Verify released validator image** with that digest and version.
4. After verification passes, update `VALIDATOR_IMAGE_TAG` in the reusable
   validation workflow to the exact digest through a separate reviewed PR.

Schema versions describe package requirements; validator versions describe
the checking software. A validator release may support multiple schema versions.

`validator/schemas/` is canonical. Run `python scripts/check_schema_copies.py` from the root to check the active builder schema bundle against it. Historical schemas retain their published identities and contents.

## Documentation and viewer

```sh
cd viewer
bundle install
bundle exec ruby -r ./_plugins/sass_number_equality -S jekyll serve --baseurl ""
```

The explicit Sass compatibility preload is required with the GitHub Pages gem's safe mode. This command serves the component's original route layout. The combined site is assembled by `.github/workflows/framework-pages.yml`; see [framework hosting](framework-hosting.md) for the combined routes, deployment, and rollback.

From the root, run the combined site's path tests with registry dependencies installed:

```sh
python -m unittest discover -s tests -p test_framework_site.py -v
```

## Signed validation and evidence

Dataset repositories call `.github/workflows/validate.yml` at a reviewed release commit. It checks out the calling dataset and uses the public validator container pinned by digest. See the [dataset workflow migration](dataset-validation-migration.md) for the current release and verified callers.

The separate archive workflow appends reports, validated-file manifests, and attestation bundles to the `validation-archive` branch. The registry rechecks archived evidence rather than trusting its presence in Git. `VALIDATION_ARCHIVE_DIR` selects a local evidence directory; `VALIDATION_ARCHIVE_READ_ONLY=true` prevents writes during verification.
