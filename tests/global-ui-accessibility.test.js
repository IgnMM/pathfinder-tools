// Run with: node --test tests/global-ui-accessibility.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const pages = {
  sanctum: read('index.html'),
  hub: read('hub.html'),
  characters: read('character/index.html'),
  calculator: read('calc/index.html'),
  companion: read('companion/index.html')
};

test('every account gate exposes stable accessible names and disables text correction', () => {
  for (const [name, html] of Object.entries(pages)) {
    assert.match(html, /id="gateUser"[^>]*aria-label="Username"[^>]*spellcheck="false"[^>]*autocorrect="off"/, name);
    assert.match(html, /id="gatePin"[^>]*aria-label="PIN"[^>]*spellcheck="false"[^>]*autocorrect="off"/, name);
  }
});

test('calculator synchronization messages are announced without stealing focus', () => {
  for (const file of ['characters', 'calculator', 'companion']) {
    assert.match(pages[file], /id="syncStatus"[^>]*role="status"|role="status"[^>]*id="syncStatus"/, file);
  }
});

test('user-controlled character data is escaped before entering generated markup', () => {
  const html = pages.characters;
  assert.match(html, /function escapeHtml\(value\)/);
  assert.match(html, /\$\{escapeHtml\(c\.name\)\}/);
  assert.match(html, /\$\{escapeHtml\(entry\.name\)\}/);
  assert.match(html, /href="\$\{escapeHtml\(openUrl\(/);
});

test('character actions do not nest interactive buttons inside links', () => {
  assert.doesNotMatch(pages.characters, /<a\b[^>]*>\s*<button\b/i);
  assert.match(pages.characters, /class="actionLink"/);
});

test('character cards and editors collapse without horizontal mobile overflow', () => {
  assert.match(pages.characters, /@media\(max-width:560px\)/);
  assert.match(pages.characters, /\.charCard \.actions\{width:100%;flex-wrap:wrap\}/);
  assert.match(pages.characters, /\.newForm input,[^}]+width:100%!important/);
});

test('hub scripts remain inside the document body', () => {
  assert.ok(pages.hub.lastIndexOf('</script>') < pages.hub.lastIndexOf('</body>'));
});

test('custom effect names, notes, and breakdown values are escaped before rendering', () => {
  assert.match(pages.calculator, /isCustom\?esc\(defOrCustom\.name\)/);
  assert.match(pages.calculator, /\$\{esc\(b\.note\|\|''\)\}/);
  assert.match(pages.companion, /function esc\(value\)/);
  assert.match(pages.companion, /isCustom\?esc\(defOrCustom\.name\)/);
  assert.match(pages.companion, /\$\{esc\(b\.note\|\|''\)\}/);
});

test('dynamic remove and toggle controls expose names to assistive technology', () => {
  for (const file of ['calculator', 'companion']) {
    assert.match(pages[file], /aria-label="Include this in the calculation"/);
    assert.match(pages[file], /aria-label="Remove effect"/);
  }
  assert.match(pages.companion, /aria-label="Remove evolution"/);
});
