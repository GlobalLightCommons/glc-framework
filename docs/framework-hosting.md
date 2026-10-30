# Framework hosting

The framework uses one GitHub Pages site published by `GlobalLightCommons/glc-framework`. The main initiative website at `globallightcommons.org` and dataset repositories remain separate.

| Route | Content |
| --- | --- |
| `/` | Framework landing page |
| `/docs/` | Standard, schemas, validation guidance, and example documentation |
| `/viewer/` | Existing interactive populated GLC example viewer |
| `/builder/` | Metadata builder and its bundled schemas |
| `/registry/` | Registry interface and freshly verified `registry.json` |

## Build and deployment

`Publish framework site` runs on relevant main-branch changes, every 15 minutes, and manual dispatch. Pull requests build and check the artifact without deploying it. The registry generator verifies current signed evidence using the durable `validation-archive` branch as a read-only fallback; evidence collection remains a separate workflow.

The workflow obtains the site address from `actions/configure-pages`. Before connecting a custom domain, the address is `https://globallightcommons.github.io/glc-framework/`. The intended permanent address is `https://framework.globallightcommons.org/`. Navigation and assets support either base path. Assembly changes a staging copy of documentation; historical schema identities and the legacy hosting builds remain intact.

Jekyll runs with the Sass number-equality compatibility module explicitly preloaded. This is necessary because the GitHub Pages gem enables safe mode, which prevents automatic loading of local plugins.

## Connect the custom domain

1. Verify a successful deployment at the default GitHub Pages address, including the builder, viewer, registry data, and documentation.
2. Set the repository's Pages custom domain to `framework.globallightcommons.org`.
3. In Porkbun DNS for `globallightcommons.org`, add a CNAME with host `framework` and target `globallightcommons.github.io`. Do not change the apex website records or nameservers.
4. Run `Publish framework site` again so it builds with the custom domain's root path.
5. Wait for GitHub's domain check and TLS certificate, enable Enforce HTTPS when available, and verify all routes at the new address.

Keep existing sites and DNS records operational until the new domain and a separate redirect plan are verified. This deployment alone does not retire the legacy hosting repositories. Preserve their original histories and source for rollback. Do not assume that GitHub Pages custom domains provide arbitrary path redirects.

The compatibility pages at `/profile/`, `/schemas/`, `/example-package/`, `/tools/`, and `/validate/` redirect to their `/docs/` equivalents. `/docs/registry/` and `/docs/viewer/` redirect to the corresponding tools. These aliases preserve query strings and fragments in browsers with JavaScript enabled.

## Verification and rollback

`scripts/check_framework_site.py` checks required routes, local navigation and assets, same-site registry data, and example/schema JSON. Unit tests cover both root and project-prefix layouts. Local verification also builds both layouts and checks interactive pages in Safari.

If the combined site fails before redirecting the old addresses, existing sites remain available. Revert the problematic framework-site change and rerun the workflow. If removing the custom domain, rebuild for the default project URL before relying on that address; its `/glc-framework` prefix differs from the custom domain's root path. Any DNS rollback must preserve the main website and the existing tool domains.
