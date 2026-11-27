const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('app.js', 'utf8');
const build = source.slice(source.indexOf('function buildSummaryStatistics()'), source.indexOf('function renderSummaryStatistics()'));
const state = { summaryStatistics: [
  { variable: 'count', statistic: 'count', value: 0, unit: '1', population: 'study' },
  { variable: 'age', statistic: 'mean', value: '12.5', unit: 'years', population: 'study_group', study_group_name: 'main' },
] };
const context = vm.createContext({ state });
vm.runInContext(build, context);
const exported = JSON.parse(JSON.stringify(vm.runInContext('buildSummaryStatistics()', context)));
assert.equal(exported[0].value, 0);
assert.equal(exported[1].value, 12.5);
assert.equal(exported[1].study_group_name, 'main');
assert.equal(state.summaryStatistics[1].value, '12.5');
const savedSource = source.slice(source.indexOf('function buildBuilderProject()'), source.indexOf('function downloadBuilderProjectBackup()'));
Object.assign(context, {
  fields: { schemaVersion: { value: '3.2.0' } }, PROJECT_FIELD_KEYS: [],
  cloneJson: value => value === undefined ? undefined : JSON.parse(JSON.stringify(value)),
  normalizeBuilderSchemaVersion: value => value,
  renderAllMetadataSections() {}, syncControlsFromActiveDataset() {}, updateCrossrefOptions() {},
  loadSchemaHelp() {}, setStep() {}, updatePreview() {},
});
state.datasets = [{ fileGroups: [{}] }];
state.datasetTemplates = [];
state.participants = [];
state.devices = [];
state.datasheets = [];
vm.runInContext(savedSource, context);
const project = JSON.parse(JSON.stringify(vm.runInContext('buildBuilderProject()', context)));
state.summaryStatistics = [];
context.project = project;
vm.runInContext('restoreBuilderProject(project)', context);
assert.deepEqual(JSON.parse(JSON.stringify(state.summaryStatistics)), project.summary_statistics);
assert.equal(vm.runInContext('buildSummaryStatistics()[0].value', context), 0);
state.summaryStatistics = [];
assert.equal(vm.runInContext('buildSummaryStatistics().length', context), 0);
console.log('Summary statistic numeric export checks passed.');
