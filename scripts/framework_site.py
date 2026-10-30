"""Assemble one Pages site without changing the legacy hosting builds."""
import argparse
import html
import json
import re
import shutil
from pathlib import Path
from urllib.parse import urlsplit

import yaml

DOC_ROUTES = ("profile", "schemas", "example-package", "tools", "validate")


def site_address(base_url):
    parts = urlsplit(base_url)
    if parts.scheme not in ("https", "http") or not parts.netloc or parts.query or parts.fragment:
        raise ValueError("Expected an absolute site URL without a query or fragment")
    path = parts.path.rstrip("/")
    if any(part in (".", "..") for part in path.split("/")):
        raise ValueError("Invalid site base path")
    return f"{parts.scheme}://{parts.netloc}", path


def local_links(text, base_path):
    replacements = {
        "https://docs.globallightcommons.org/registry/": base_path + "/registry/",
        "https://docs.globallightcommons.org/assets/": base_path + "/assets/",
        "https://docs.globallightcommons.org/example/": base_path + "/example/",
        "https://docs.globallightcommons.org/": base_path + "/docs/",
        "https://builder.globallightcommons.org/": base_path + "/builder/",
        "https://globallightcommons.github.io/glc-metadata-builder/": base_path + "/builder/",
        "https://registry.globallightcommons.org/": base_path + "/registry/",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def documentation_links(text):
    for route in DOC_ROUTES:
        # Rewrite navigation and Liquid routes, never schema identities or GitHub URLs.
        text = re.sub(r"(['\"])/" + route + r"/(?=[#'\"])", r"\1/docs/" + route + "/", text)
        text = text.replace("{{ site.baseurl }}/" + route + "/", "{{ site.baseurl }}/docs/" + route + "/")
        text = re.sub(r"(?m)^(\s*(?:permalink|href):\s*)/" + route + r"/$", r"\1/docs/" + route + "/", text)
    return text


def prepare(source, staging, base_url):
    origin, base_path = site_address(base_url)
    if staging.exists():
        raise ValueError(f"Staging directory already exists: {staging}")
    shutil.copytree(source, staging, ignore=shutil.ignore_patterns(
        "_site", "vendor", ".bundle", ".jekyll-cache", ".sass-cache", "tests", "CNAME", "__pycache__"
    ))
    # These unused inherited camera-trap example pages are not the GLC viewer.
    obsolete = staging / "pages/example"
    if obsolete.exists():
        shutil.rmtree(obsolete)
    for path in staging.rglob("*"):
        if path.is_file() and path.suffix in (".md", ".html", ".yml", ".yaml"):
            path.write_text(local_links(documentation_links(path.read_text()), base_path))
    home = staging / "pages/home.md"
    home.write_text(home.read_text().replace("permalink: /\n", "permalink: /docs/\n", 1)
                    .replace("title: Global Light Commons\n", "title: Documentation\n", 1))
    config_path = staging / "_config.yml"
    config = yaml.safe_load(config_path.read_text())
    config.update(url=origin, baseurl=base_path)
    config_path.write_text(yaml.safe_dump(config, sort_keys=False))
    (staging / "pages/framework-home.html").write_text("""---
layout: default
title: GLC Framework
permalink: /
description: Tools and documentation for Global Light Commons data packages
---
<p class="tools-intro">Create, explore, and discover standardized light-exposure data packages.</p>
<div class="tools-grid">
  <article class="tool-card"><h2>Documentation</h2><p>Understand the GLC standard, resource schemas, and validation workflow.</p><a class="tool-card-link" href="{{ '/docs/' | relative_url }}">Read the documentation →</a></article>
  <article class="tool-card"><h2>Dataset viewer</h2><p>Explore a populated example package and its linked metadata and measurements.</p><a class="tool-card-link" href="{{ '/viewer/' | relative_url }}">Explore the example →</a></article>
  <article class="tool-card"><h2>Metadata builder</h2><p>Create a GLC metadata package through an interactive form.</p><a class="tool-card-link" href="{{ '/builder/' | relative_url }}">Open the builder →</a></article>
  <article class="tool-card"><h2>Dataset registry</h2><p>Find datasets and inspect their signed validation results.</p><a class="tool-card-link" href="{{ '/registry/' | relative_url }}">Browse the registry →</a></article>
</div>
""")
    (staging / "pages/framework-viewer.md").write_text("""---
layout: default
title: Dataset viewer
permalink: /viewer/
---

Explore the metadata and measurements in a compact, populated GLC 3.0.2 example
derived from MeLiDos IZTECH. Select a resource below to inspect its contents.

See the [example package documentation]({{ '/docs/example-package/' | relative_url }})
to learn how the files fit together and download the complete example.

{% include example_viewer.html %}
""")
    nav = staging / "_includes/navbar.html"
    text = nav.read_text().replace('href="https://globallightcommons.org/"', 'href="{{ \'/\' | relative_url }}"', 1)
    text = text.replace("            Overview\n          </a>", """            Framework
          </a>
          <a class="glc-ecosystem-link" href="{{ '/docs/' | relative_url }}">Documentation</a>
          <a class="glc-ecosystem-link" href="{{ '/viewer/' | relative_url }}">Viewer</a>""", 1)
    nav.write_text(text)


def redirect_page(destination):
    target = html.escape(destination, quote=True)
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width, initial-scale=1"><title>Page moved</title>'
            f'<meta http-equiv="refresh" content="0;url={target}"><link rel="canonical" href="{target}">'
            '</head><body><p>This page has moved. '
            f'<a href="{target}">Continue to the page</a>.</p>'
            f'<script>location.replace({json.dumps(destination)} + location.search + location.hash);</script>'
            '</body></html>')


def assemble(builder, registry, output, base_url):
    _, base_path = site_address(base_url)
    destination = output / "builder"
    destination.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "app.js", "datetime-metadata.js", "styles.css", "navbar.css"):
        source = builder / name
        (destination / name).write_text(local_links(source.read_text(), base_path))
    for name in ("assets", "schemas"):
        shutil.copytree(builder / name, destination / name)
    registry_destination = output / "registry/registry.json"
    registry_destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(registry, registry_destination)
    # Support old documentation paths and old-host redirects with preserved paths.
    aliases = {route + "/": "/docs/" + route + "/" for route in DOC_ROUTES}
    aliases.update({"docs/registry/": "/registry/", "docs/viewer/": "/viewer/"})
    for old, new in aliases.items():
        path = output / old / "index.html"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(redirect_page(base_path + new))
    (output / ".nojekyll").touch()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("prepare")
    p.add_argument("--source", type=Path, default=Path("viewer"))
    p.add_argument("--staging", type=Path, default=Path(".framework-source"))
    a = sub.add_parser("assemble")
    a.add_argument("--builder", type=Path, default=Path("builder"))
    a.add_argument("--registry", type=Path, required=True)
    a.add_argument("--output", type=Path, default=Path("framework_out"))
    for command in (p, a):
        command.add_argument("--base-url", required=True)
    args = vars(parser.parse_args())
    command = args.pop("command")
    (prepare if command == "prepare" else assemble)(**args)


if __name__ == "__main__":
    main()
