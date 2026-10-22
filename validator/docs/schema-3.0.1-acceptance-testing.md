# Schema 3.0.1 acceptance testing

This document records the acceptance checks for the 3.0.1 corrective release.

## Automated checks

- The complete 3.0.1 package fixture passes.
- The published 3.0.0 package fixture continues to pass unchanged.
- The corrected requiredness and omission rules have positive and negative
  tests.
- Short and long tabular rows produce warnings without causing failure.
- Existing 1.0.0 and 2.0.0 behavior remains unchanged.

## Real-package check

The MeLiDos IZTECH package must be migrated to schema 3.0.1 and validated using
the release-candidate container. Record the final status, error count, warning
count, validator version, and image digest here before release.

## Release-system checks

- The dataset workflow produces `validation.log`, `validation.json`,
  `validated-files-manifest.json`, and `exit_code.txt`.
- The validation outputs receive GitHub attestations.
- The registry verifies the attestation for the exact dataset commit.
- The viewer reports schema 3.0.1 as current and preserves 3.0.0 as historical.
- The optional LightLogWeb handoff remains available for the passing package.
