# Global Light Commons framework

Tools for creating, validating, exploring, and discovering standardized light-exposure data packages. This repository brings together the GLC metadata builder, validator, dataset viewer, documentation, and registry.

**[Open the framework website](https://globallightcommons.github.io/glc-framework/)**

| Use | Link |
| --- | --- |
| Learn the standard and package structure | [Documentation](https://globallightcommons.github.io/glc-framework/docs/) |
| Create metadata for your data | [Metadata builder](https://globallightcommons.github.io/glc-framework/builder/) |
| Explore a populated example package | [Dataset viewer](https://globallightcommons.github.io/glc-framework/viewer/) |
| Find datasets and their validation results | [Dataset registry](https://globallightcommons.github.io/glc-framework/registry/) |
| Validate your own package | [Validation guide](https://globallightcommons.github.io/glc-framework/docs/validate/) |

The website is published directly from this repository. The planned address is `framework.globallightcommons.org`; the links above use the working GitHub Pages address until DNS is connected.

## What's in this repository

- [`builder/`](builder/) — browser-based metadata entry and package export.
- [`validator/`](validator/) — versioned schemas, Python validator, Docker image, and reusable dataset-validation workflow.
- [`viewer/`](viewer/) — documentation and interactive example viewer.
- [`registry/`](registry/) — dataset catalogue and verification of signed validation reports.

Signed reports and their supporting evidence are preserved on the [`validation-archive` branch](https://github.com/GlobalLightCommons/glc-framework/tree/validation-archive), so registry verification can continue after GitHub Actions artifacts expire.

The [main GLC website](https://globallightcommons.org/) and individual dataset repositories are maintained separately. Original component histories and attribution are preserved; each component retains its own license.

## For maintainers

[Development](docs/development.md) · [Website deployment and DNS handoff](docs/framework-hosting.md) · [Repository migration](docs/monorepo-migration.md) · [Dataset workflow migration](docs/dataset-validation-migration.md)
