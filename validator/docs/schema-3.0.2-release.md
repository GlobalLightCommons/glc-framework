# GLC schema 3.0.2

GLC schema 3.0.2 is a patch release derived from 3.0.1.

## Change from 3.0.1

- `device_datasheet.schema.json`: `datasheet_channel` now requires at least one
  channel item when the field is present. The field was already required, but
  schema 3.0.1 unintentionally accepted an empty array.

Schema 3.0.1 remains unchanged and supported for reproducibility. New packages
should use schema 3.0.2.

## Validator release

- Validator version: `0.5.2`
- Container: `ghcr.io/tscnlab/glc-validator:0.5.2`
- Multi-platform digest:
  `sha256:d66c9d705e2a59967c5699af55d872b2012d18fb3c9dc611a9837d1c05af6160`
