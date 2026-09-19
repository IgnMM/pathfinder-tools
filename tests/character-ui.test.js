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

// Every tool (calc/index.html, and every class's own spellbook page) auto-creates a
// profile literally named "New <Thing>" the instant its page is opened, even if the
// visitor never touches anything, and autosaves it to localStorage on first render.
// Without filtering, "My Characters" listed every one of these as if it were a real
// saved character, cluttering the list with entries like "New Arcanist" / "New Paladin"
// nobody meant to keep (reported live). scanAllCharacters() now treats a profile as a
// "ghost" -- skipped entirely, not listed -- only when its name exactly matches that
// tool's own default name AND it is the SOLE profile in that store (the strongest
// available signal that it was never renamed or added alongside anything real).
test('scanAllCharacters skips a lone, exactly-default-named profile per store (a never-touched auto-created ghost), but still shows one that coexists with any other real profile', () => {
  assert.match(html, /let calcIsGhost = profiles\.length===1 && profiles\[0\]\.name==='New Character';/);
  assert.match(html, /if\(!calcIsGhost\) profiles\.forEach\(p=>\{ ensure\(p\.name\)\.calc=true; \}\);/);
  assert.match(html, /let defaultName='New '\+\(CLASS_LABELS\[cls\]\|\|cls\);/);
  assert.match(html, /let spellIsGhost = names\.length===1 && names\[0\]===defaultName;/);
  assert.match(html, /if\(!spellIsGhost\) names\.forEach\(name=>\{ ensure\(name\)\.spellClasses\.push\(cls\); \}\);/);
});
