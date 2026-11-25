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
  fields: { schemaVersion: { value: '3.1.0' } },
  createDatasetRecord: () => ({}),
  createFileGroup: () => ({}),
  normalizeDatasetTerms: () => [],
  fileGroupFromSchema: group => group,
  suggestDatetimeColumn: () => '',
  getDatasetVariableTerms: () => [{ term: 'other' }],
  buildDatasetFile: group => group,
});
['isBlank', 'normalizeBuilderSchemaVersion', 'datasetRecordFromSchema', 'buildDatasetRecordDraft'].forEach(name => {
  vm.runInContext(declaration(name), context);
});
const evaluate = code => JSON.parse(JSON.stringify(vm.runInContext(code, context)));
const metadata = {
  schema_version: '3.1.0', dataset_internal_id: 'seasonal',
  dataset_recording_duration: 4,
  dataset_recording_duration_unit: 'week',
  dataset_recording_contiguity: 'noncontiguous',
};
context.metadata = metadata;
const exported = evaluate('buildDatasetRecordDraft(datasetRecordFromSchema(metadata))');
for (const [key, value] of Object.entries(metadata)) assert.equal(exported[key], value);
const omitted = evaluate("buildDatasetRecordDraft(datasetRecordFromSchema({schema_version: '3.0.2'}))");
assert.equal(omitted.schema_version, '3.1.0');
for (const key of Object.keys(metadata).filter(key => key.startsWith('dataset_recording_'))) {
  assert(!Object.hasOwn(omitted, key), `${key} should remain omitted`);
}
for (const version of ['2.0.0', '3.0.0', '3.0.1', '3.0.2', '3.1.0']) {
  context.version = version;
  assert.equal(evaluate('normalizeBuilderSchemaVersion(version)'), '3.1.0');
}
console.log('Recording metadata round trip and schema upgrade checks passed.');
