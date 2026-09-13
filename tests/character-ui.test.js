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

test('every account gate is an accessible modal and masks its PIN', () => {
  const root = path.join(__dirname, '..');
  const pages = [];
  for (const entry of fs.readdirSync(root, {withFileTypes:true})) {
    if (entry.isFile() && entry.name.endsWith('.html')) pages.push(path.join(root, entry.name));
    if (entry.isDirectory()) {
      const index = path.join(root, entry.name, 'index.html');
      if (fs.existsSync(index)) pages.push(index);
      for (const fixed of ['damage.html','spells.html']) {
        const page = path.join(root, entry.name, fixed);
        if (fs.existsSync(page)) pages.push(page);
      }
    }
  }
  const gated = pages.filter(page => fs.readFileSync(page, 'utf8').includes('id="syncGate"'));
  assert.equal(gated.length, 34);
  for (const page of gated) {
    const source = fs.readFileSync(page, 'utf8');
    assert.match(source, /id="syncGate" role="dialog" aria-modal="true" aria-label="Account access"/, page);
    assert.match(source, /id="gateUser" type="text" aria-label="Username" autocomplete="username"/, page);
    assert.match(source, /id="gatePin" type="password" aria-label="PIN" autocomplete="current-password"/, page);
    assert.match(source, /id="gateNew" type="button"/, page);
    assert.match(source, /id="gateLogin" type="button"/, page);
  }
});
