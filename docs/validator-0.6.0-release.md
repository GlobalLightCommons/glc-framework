# Validator 0.6.0

Validator 0.6.0 supports schema 3.1.0 alongside the existing supported schema
versions, including 3.0.2. Schema and validator version numbers are independent.

- Approved source: `0d105ce4395c7ec0e93aa306c93cf70d23cf6426`, merged in
  [PR #10](https://github.com/GlobalLightCommons/glc-framework/pull/10).
- [Publication workflow](https://github.com/GlobalLightCommons/glc-framework/actions/runs/45660075735).
- Image: `ghcr.io/globallightcommons/glc-validator@sha256:e7072f4793029f97b38011e55c3979b951a9a431af8f3992b16b06017e613c00`.
- [Public AMD64 and ARM64 release verification](https://github.com/GlobalLightCommons/glc-framework/actions/runs/45660845111): passed, including the expected 0.6.0 version and normal container entrypoint.

Proposed-image checks passed before merging: the validator test suite and full
3.0.2, full 3.1.0 and metadata-only 3.1.0 packages passed on both architectures.
Release verification is separate from source testing and does not run newer
development tests against an older published image.

The copyable dataset workflow uses the `validator-v0.6.0` release tag, which
must point to the approved commit containing this image pin. Existing datasets
using `framework-v0.1.0` remain on validator 0.5.2 until their workflow reference
is updated. Their original reports and archived evidence remain unchanged.
Rerunning an old workflow reference does not select the new release or upgrade
metadata to a newer schema.

Metadata-only acceptance uses no submitted access-tier or mode flag. The
validator derives coverage; registry inclusion additionally requires a
maintainer-reviewed justification for ethical, consent-related or legal
constraints on public recording release. See the
[schema release notes](../validator/docs/schema-3.1.0-release.md) and
[registry inclusion policy](../registry/INCLUSION.md).
