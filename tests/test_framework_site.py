import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from framework_site import documentation_links, local_links, redirect_page, site_address


class FrameworkSitePathsTests(unittest.TestCase):
    def test_root_and_project_addresses(self):
        self.assertEqual(site_address("https://framework.globallightcommons.org/"),
                         ("https://framework.globallightcommons.org", ""))
        self.assertEqual(site_address("https://globallightcommons.github.io/glc-framework/"),
                         ("https://globallightcommons.github.io", "/glc-framework"))

    def test_documentation_routes_do_not_rewrite_schema_or_repository_identities(self):
        text = "{{ '/schemas/' | relative_url }} https://github.com/owner/repo/schemas/3.0.2/schema.json"
        converted = documentation_links(text)
        self.assertIn("'/docs/schemas/'", converted)
        self.assertIn("https://github.com/owner/repo/schemas/3.0.2/schema.json", converted)
        self.assertEqual(documentation_links('"schemas/3.0.2/schema.json"'), '"schemas/3.0.2/schema.json"')

    def test_registry_and_assets_are_not_nested_under_docs(self):
        for prefix in ("", "/glc-framework"):
            text = local_links("https://docs.globallightcommons.org/registry/ https://docs.globallightcommons.org/assets/logo.png https://builder.globallightcommons.org/ https://docs.globallightcommons.org/profile/", prefix)
            self.assertEqual(text, f"{prefix}/registry/ {prefix}/assets/logo.png {prefix}/builder/ {prefix}/docs/profile/")

    def test_redirects_keep_query_and_fragment(self):
        redirect = redirect_page("/glc-framework/docs/schemas/")
        self.assertIn("location.search + location.hash", redirect)
        self.assertIn('href="/glc-framework/docs/schemas/"', redirect)


if __name__ == "__main__":
    unittest.main()
