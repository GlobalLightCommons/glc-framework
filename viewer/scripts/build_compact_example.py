#!/usr/bin/env python3
"""Build a compact, valid GLC 3.0.2 example from the MeLiDos IZTECH package."""

from __future__ import annotations

import argparse
import csv
import json
import shutil
from pathlib import Path


PARTICIPANT_ID = "IZTECH_S004"
DATASET_ID = "MELIDOS_IZTECH_S004"
EXAMPLE_FILES = {
    "data/files/questionnaires/IZTECH_S004_acceptability.csv",
    "data/files/longitudinal-reports/IZTECH_S004_experiencelog_AL03.csv",
    "data/files/longitudinal-reports/IZTECH_S004_experiencelog_AL04.csv",
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def filter_csv(source: Path, target: Path, id_column: str) -> None:
    with source.open(newline="", encoding="utf-8-sig") as stream:
        reader = csv.DictReader(stream)
        rows = [row for row in reader if row[id_column] == PARTICIPANT_ID]
        fieldnames = reader.fieldnames
    if not rows or not fieldnames:
        raise ValueError(f"No {PARTICIPANT_ID} row found in {source}")
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build(source: Path, target: Path) -> None:
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)

    descriptor = read_json(source / "datapackage.json")
    descriptor["name"] = "melidos-iztech-glc-compact-example"
    descriptor["title"] = "Compact MeLiDos IZTECH GLC 3.0.2 example"
    write_json(target / "datapackage.json", descriptor)

    study = read_json(source / "data/study.json")
    study[0]["study_sample"] = (
        "One-participant subset of the MeLiDos IZTECH package for viewer and "
        "validation testing."
    )
    study[0]["study_groups"][0]["study_group_size"] = 1
    study[0]["study_groups"][0]["study_group_datasets"] = [DATASET_ID]
    study[0]["study_datasets"] = [DATASET_ID]
    write_json(target / "data/study.json", study)

    datasets = [
        dataset
        for dataset in read_json(source / "data/datasets.json")
        if dataset["dataset_internal_id"] == DATASET_ID
    ]
    if len(datasets) != 1:
        raise ValueError(f"Expected exactly one {DATASET_ID} dataset")
    datasets[0]["dataset_file"] = [
        group
        for group in datasets[0]["dataset_file"]
        if set(group["dataset_file_names"]) & EXAMPLE_FILES
    ]
    write_json(target / "data/datasets.json", datasets)

    linked_devices = {
        group["dataset_file_crossref_device_id"]
        for group in datasets[0]["dataset_file"]
        if "dataset_file_crossref_device_id" in group
    }
    devices = [
        device
        for device in read_json(source / "data/devices.json")
        if device["device_internal_id"] in linked_devices
    ]
    write_json(target / "data/devices.json", devices)
    write_json(
        target / "data/device_datasheets.json",
        read_json(source / "data/device_datasheets.json"),
    )

    filter_csv(
        source / "data/participants.csv",
        target / "data/participants.csv",
        "participant_internal_id",
    )
    filter_csv(
        source / "data/participant_characteristics.csv",
        target / "data/participant_characteristics.csv",
        "participant_internal_id",
    )

    for relative_path in EXAMPLE_FILES:
        destination = target / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source / relative_path, destination)

    shutil.copytree(source / "schemas", target / "schemas")
    shutil.copy2(
        source / "json-entity-resource.json",
        target / "json-entity-resource.json",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Complete IZTECH package")
    parser.add_argument(
        "--target",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "example",
    )
    args = parser.parse_args()
    build(args.source.resolve(), args.target.resolve())


if __name__ == "__main__":
    main()
