import copy
import json
from pathlib import Path
import unittest

from jsonschema import Draft7Validator
from referencing import Registry, Resource
from glc_validator import validate_summary_statistics_groups


ROOT = Path(__file__).resolve().parents[1]


class SummaryStatisticsTests(unittest.TestCase):
    def setUp(self):
        self.study = json.loads((ROOT / 'tests/fixtures/schema-3.1.0/pass/data/study.json').read_text())[0]
        schemas = [json.loads(path.read_text()) for path in (ROOT / 'schemas/3.1.0').glob('*.json')]
        registry = Registry().with_resources(
            (schema['$id'], Resource.from_contents(schema)) for schema in schemas
            if schema.get('$schema') == 'http://json-schema.org/draft-07/schema#'
        )
        self.validator = Draft7Validator(
            json.loads((ROOT / 'schemas/3.1.0/study.schema.json').read_text()), registry=registry
        )
        self.summary = dict(variable='age', statistic='custom statistic', value=0,
                            unit='years', population='study')

    def test_optional_and_repeatable(self):
        self.assertTrue(self.validator.is_valid(self.study))
        self.study['summary_statistics'] = [self.summary, {**self.summary, 'value': 2.5}]
        self.assertTrue(self.validator.is_valid(self.study))

    def test_required_fields_and_types(self):
        for key in self.summary:
            summary = self.summary.copy()
            del summary[key]
            with self.subTest(missing=key):
                self.assertFalse(self.validator.is_valid({**self.study, 'summary_statistics': [summary]}))
        for key, value in [('value', '12'), ('value', None), ('value', True),
                           ('variable', ' '), ('statistic', ''), ('unit', 1),
                           ('population', 'participant'), ('aggregation_method', ' ')]:
            with self.subTest(key=key, value=value):
                self.assertFalse(self.validator.is_valid({**self.study, 'summary_statistics': [{**self.summary, key: value}]}))

    def test_conditional_group_name(self):
        for population, name, valid in [('study', 'main', False), ('study_group', None, False),
                                         ('study_group', 'main', True)]:
            summary = {**self.summary, 'population': population}
            if name is not None:
                summary['study_group_name'] = name
            self.assertEqual(self.validator.is_valid({**self.study, 'summary_statistics': [summary]}), valid)

    def test_resolves_exactly_one_group_in_same_study(self):
        self.study['summary_statistics'] = [{**self.summary, 'population': 'study_group', 'study_group_name': 'main'}]
        self.assertEqual(validate_summary_statistics_groups(self.study), [])
        other = copy.deepcopy(self.study)
        self.study['study_groups'] = []
        errors = validate_summary_statistics_groups([self.study, other])
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]['path'], ['summary_statistics', 0, 'study_group_name'])
        self.study['study_groups'] = other['study_groups'] * 2
        self.assertEqual(len(validate_summary_statistics_groups(self.study)), 1)

    def test_whole_study_needs_no_groups_or_recalculation(self):
        self.study['study_groups'] = []
        self.study['summary_statistics'] = [{**self.summary, 'value': -12345}]
        self.assertEqual(validate_summary_statistics_groups(self.study), [])
        self.assertTrue(self.validator.is_valid(self.study))


if __name__ == '__main__':
    unittest.main()
