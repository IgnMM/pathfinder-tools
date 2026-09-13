// Run with: node --test tests/character-ui.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../character/index.html'), 'utf8');
const hub = fs.readFileSync(path.join(__dirname, '../hub.html'), 'utf8');

test('My Characters uses links as links without nested buttons', () => {
  assert.doesNotMatch(html, /<a\b[^>]*>\s*<button\b/i);
  assert.match(html, /class="actionLink"/);
});

test('profile names are escaped before entering generated card markup', () => {
  assert.match(html, /function escapeHtml\(value\)/);
  assert.match(html, /class="name">\$\{escapeHtml\(c\.name\)\}/);
  assert.match(html, /class="name">\$\{escapeHtml\(entry\.name\)\}/);
  assert.match(html, /value="\$\{escapeHtml\(dmg\)\}"/);
  assert.match(html, /value="\$\{escapeHtml\(spells\)\}"/);
});

test('creation and profile-link fields have explicit labels', () => {
  for (const id of ['newName','newClass','newDmgProfile','newSpellsProfile']) {
    assert.match(html, new RegExp(`<label[^>]*for="${id}"`));
  }
});

test('hub scripts and scene content remain inside the document body', () => {
  assert.equal((hub.match(/<body\b/g)||[]).length, 1);
  assert.equal((hub.match(/<\/body>/g)||[]).length, 1);
  assert.ok(hub.lastIndexOf('</script>') < hub.lastIndexOf('</body>'));
  assert.ok(hub.lastIndexOf('</body>') < hub.lastIndexOf('</html>'));
});
