const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('app.js', 'utf8');
function declaration(name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `Missing ${name}`);
  return source.slice(start, source.indexOf('\nfunction ', start + 1));
}
const context = vm.createContext({
  fields: {schemaVersion: {value: '3.2.0'}},
  state: {activeStep: 'export', datasets: []},
  createDatasetRecord: () => ({}), createFileGroup: () => ({}),
  normalizeDatasetTerms: () => [], fileGroupFromSchema: group => group,
  suggestDatetimeColumn: () => '', getDatasetVariableTerms: () => [{term: 'other'}],
  buildDatasetFile: group => group,
  datasetHasUserContent: () => true, getParticipantIds: () => [], getDeviceIds: () => [],
  getStudyId: () => 'study', validationIssue: (section, message) => ({section, message}),
  isRecognizedTimeZone: () => true, isFiniteNumberValue: value => Number.isFinite(Number(value)),
});
['isBlank', 'normalizeBuilderSchemaVersion', 'datasetRecordFromSchema', 'buildDatasetRecordDraft', 'validateDatasetsForExport'].forEach(name => vm.runInContext(declaration(name), context));
context.metadata = {
  schema_version: '3.2.0', dataset_internal_id: 'metadata-only',
  dataset_participant_associated: false,
  dataset_crossref: {dataset_crossref_study_id: 'study'},
  dataset_timezone: 'UTC', dataset_location: [1, 2],
};
const result = JSON.parse(vm.runInContext('JSON.stringify(buildDatasetRecordDraft(datasetRecordFromSchema(metadata)))', context));
assert(!Object.hasOwn(result, 'dataset_file'));
assert(!Object.hasOwn(result, 'dataset_variable_terms'));
assert(!Object.hasOwn(result, 'includeRecordings'));
assert(!Object.hasOwn(result, 'validation_scope'));
context.emptyFiles = {...context.metadata, dataset_file: []};
assert(!vm.runInContext('Object.hasOwn(buildDatasetRecordDraft(datasetRecordFromSchema(emptyFiles)), "dataset_file")', context));
vm.runInContext('state.datasets = [datasetRecordFromSchema(metadata)]', context);
assert.equal(vm.runInContext('validateDatasetsForExport().length', context), 0);
vm.runInContext('state.datasets.push({...datasetRecordFromSchema(metadata), datasetId: "with-recordings", includeRecordings: true, fileGroups: []})', context);
assert(!vm.runInContext('validateDatasetsForExport().some(issue => issue.message.includes("All-or-nothing"))', context));
context.withFiles = {...context.metadata, dataset_file: [{dataset_file_names: ['data/light.csv']}]};
assert(vm.runInContext('Object.hasOwn(buildDatasetRecordDraft(datasetRecordFromSchema(withFiles)), "dataset_file")', context));
console.log('Metadata-only import/export and dataset recording-list checks passed.');
