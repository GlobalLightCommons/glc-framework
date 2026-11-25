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
