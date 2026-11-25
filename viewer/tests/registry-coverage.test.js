const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('pages/registry.html', 'utf8');
function declaration(name) {
  const start = source.indexOf(`  function ${name}(`);
  const end = source.indexOf('\n  function ', start + 1);
  assert(start >= 0 && end > start);
  return source.slice(start, end);
}
const context = vm.createContext({});
['escapeText', 'scopePill', 'groupWarnings', 'warningDetails'].forEach(name => vm.runInContext(declaration(name), context));
const render = (name, value) => {
  context.value = value;
  return vm.runInContext(`${name}(value)`, context);
};
assert(render('scopePill', {validation_scope: 'metadata_only'}).includes('Metadata only'));
assert(render('scopePill', {validation_scope: 'metadata_and_data', coverage: {recordings: 'pass'}}).includes('Metadata + data'));
assert(!render('scopePill', {validation_scope: 'metadata_and_data', coverage: {recordings: 'not_assessed'}}).includes('Metadata + data'));
assert(render('scopePill', {status: 'pass'}).includes('Scope not recorded'));
assert.equal(render('warningDetails', {warning_count: 0}), '0');
assert(render('warningDetails', null).includes('Unavailable'));
const malicious = render('warningDetails', {warning_count: 1, warnings: [{message: '<script>alert(1)</script>'}]});
assert(!malicious.includes('<script>'));
assert(malicious.includes('&lt;script&gt;'));
assert(malicious.includes('<details'));
const legacy = render('warningDetails', {warning_count: 2175, run_url: 'https://github.com/tscnlab/example/actions/runs/123'});
assert(!legacy.includes('<details'));
assert(legacy.includes('href="https://github.com/tscnlab/example/actions/runs/123"'));
assert(!legacy.includes('Messages are available in the validation artifact'));
const many = render('warningDetails', {warning_count: 1000, warnings: Array.from({length: 1000}, () => ({message: 'empty values'}))});
assert.equal((many.match(/<li>/g) || []).length, 20);
assert(many.includes('Empty values: 1000 instances'));
const grouped = render('warningDetails', {warning_count: 3, warnings: [
  {message: "column a contains 1/1 empty values"},
  {message: "column b contains 1/1 empty values"},
  {message: "File has undeclared extra columns: x"}
]});
assert(grouped.includes('Empty values: 2 instances'));
assert(grouped.includes('Columns not described in metadata: 1 instance'));
console.log('Registry scope, warnings, historical evidence and escaping checks passed.');
