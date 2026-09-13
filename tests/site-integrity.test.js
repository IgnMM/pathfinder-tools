// Run with: node --test tests/site-integrity.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const sharedUi = fs.readFileSync(path.join(root, 'assets/valid-sources.js'), 'utf8');
const htmlFiles = [];
function collect(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(file);
    else if (entry.name.endsWith('.html')) htmlFiles.push(file);
  }
}
collect(root);

test('all inline application scripts are syntactically valid', () => {
  assert.ok(htmlFiles.length > 50, 'expected the complete multi-tool application');
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
    scripts.forEach((match, index) => {
      if (match[1].trim()) new vm.Script(match[1], {filename: `${file}:inline-${index}`});
    });
  }
});

test('all literal local links and resources resolve', () => {
  const missing = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/(?:href|src)=["']([^"'#?]+)(?:[?#][^"']*)?["']/g)) {
      const ref = match[1];
      if (/[${}]/.test(ref) || /^(?:https?:|data:|mailto:|javascript:)/.test(ref)) continue;
      const target = path.resolve(path.dirname(file), ref);
      if (!fs.existsSync(target) && !fs.existsSync(path.join(target, 'index.html'))) {
        missing.push(`${path.relative(root, file)} -> ${ref}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});

test('core tools do not reference missing static controls', () => {
  for (const relative of ['hub.html', 'character/index.html', 'calc/index.html', 'companion/index.html']) {
    const html = fs.readFileSync(path.join(root, relative), 'utf8');
    const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]));
    const refs = new Set([...html.matchAll(/\$\(["']([^"']+)["']\)/g)].map(match => match[1]));
    assert.deepEqual([...refs].filter(id => !ids.has(id)), [], relative);
  }
});

test('shared UI baseline covers generated account screens and mobile navigation', () => {
  assert.match(sharedUi, /function applyGlobalUiBaseline\(\)/);
  assert.match(sharedUi, /gateUser\.setAttribute\('aria-label', 'Username'\)/);
  assert.match(sharedUi, /gatePin\.setAttribute\('aria-label', 'PIN'\)/);
  assert.match(sharedUi, /querySelectorAll\('#syncStatus'\)/);
  assert.match(sharedUi, /header\{padding-top:60px!important\}header,main\{padding-left:7px!important\}/);
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    if (html.includes('id="gateUser"') || html.includes('id="syncStatus"')) {
      const inlineBaseline = (!html.includes('id="gateUser"') || /id="gateUser"[^>]*aria-label="Username"/.test(html)) &&
        (!html.includes('id="syncStatus"') || /id="syncStatus"[^>]*role="status"|role="status"[^>]*id="syncStatus"/.test(html));
      assert.ok(inlineBaseline || /assets\/valid-sources\.js/.test(html), file);
    }
  }
});
