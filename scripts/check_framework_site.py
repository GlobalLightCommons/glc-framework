"""Check the assembled site's routes and same-site asset/navigation links."""
import argparse
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

from framework_site import site_address


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        attribute = {"a": "href", "link": "href", "img": "src", "script": "src"}.get(tag)
        if attribute:
            value = dict(attrs).get(attribute)
            if value:
                self.links.append(value)


def check_site(output, base_url):
    origin, base_path = site_address(base_url)
    errors = []
    for route in ("", "docs", "viewer", "builder", "registry", "docs/profile", "docs/schemas", "docs/validate", "docs/example-package"):
        if not (output / route / "index.html").is_file():
            errors.append(f"Missing route: /{route}")
    for path in output.rglob("*.html"):
        text = path.read_text()
        for old in ("docs.globallightcommons.org", "builder.globallightcommons.org", "registry.globallightcommons.org"):
            if old in text:
                errors.append(f"Legacy hosting reference in {path.relative_to(output)}: {old}")
        parser = Links()
        parser.feed(text)
        page_url = origin + base_path + "/" + path.relative_to(output).as_posix()
        for link in parser.links:
            if link.startswith("#"):
                continue
            address = urlsplit(urljoin(page_url, link))
            if address.scheme not in ("http", "https") or address.netloc != urlsplit(origin).netloc:
                continue
            target = unquote(address.path)
            if base_path and target != base_path and not target.startswith(base_path + "/"):
                errors.append(f"Link escapes project base path in {path.relative_to(output)}: {link}")
                continue
            relative = target[len(base_path):].lstrip("/")
            destination = output / relative
            if not destination.is_file() and not (destination / "index.html").is_file():
                errors.append(f"Broken local link in {path.relative_to(output)}: {link}")
    registry = json.loads((output / "registry/registry.json").read_text())
    if registry["dataset_count"] != len(registry["datasets"]):
        errors.append("Registry dataset count is inconsistent")
    registry_html = (output / "registry/index.html").read_text()
    if f'const REGISTRY_URL = "{base_path}/registry/registry.json"' not in registry_html:
        errors.append("Registry must fetch same-site data")
    for resource in ("example/datapackage.json", "builder/schemas/3.0.2/dataset.schema.json"):
        json.loads((output / resource).read_text())
    for directory in (output / "tests", output / "builder/tests"):
        if directory.exists():
            errors.append(f"Test sources must not be published: {directory}")
    if errors:
        raise ValueError("\n".join(sorted(set(errors))))
    print(f"Framework routes, registry data, and local links verified at {base_url}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--base-url", required=True)
    args = parser.parse_args()
    check_site(args.output, args.base_url)
