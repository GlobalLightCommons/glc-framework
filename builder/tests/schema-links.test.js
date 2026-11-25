const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('app.js', 'utf8');
const start = source.indexOf('function syncActiveSchemaPill(');
const code = source.slice(start, source.indexOf('\nfunction ', start + 1));
const pill = { classList: { toggle() {} }, setAttribute() {} };
const context = vm.createContext({
  document: { querySelector: () => pill },
  fields: { schemaVersion: { value: '3.1.0' } },
});
vm.runInContext(code, context);
for (const version of ['3.1.0', '3.0.2', '3.0.1', '3.0.0', '2.0.0']) {
  context.version = version;
  vm.runInContext('syncActiveSchemaPill(version)', context);
  const filename = version.startsWith('3.') ? 'glc-dp-profile.json' : 'gleam-dp-profile.json';
  assert.equal(pill.href, `https://github.com/GlobalLightCommons/glc-framework/blob/main/validator/schemas/${version}/${filename}`);
  assert.equal(pill.textContent, `Schema ${version}`);
}
const html = fs.readFileSync('index.html', 'utf8');
assert(html.includes('https://github.com/GlobalLightCommons/glc-framework/blob/main/validator/schemas/3.1.0/glc-dp-profile.json'));
assert(!source.includes('github.com/tscnlab/glc-metadata-validator/'));
console.log('Schema pill monorepo links passed for current and historical versions.');
