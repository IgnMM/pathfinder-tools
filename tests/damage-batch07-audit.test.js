// Damage Calculator batch project -- Batch 07: AUDIT traits ENGINE (1 of 1).
// Regression coverage for the 3 audited ENGINE-tier trait entries. Static-source
// assertions (grep-style on the HTML text), same pattern as the batch01-06 audit test
// files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_07_IDS = ['trait-arms-master', 'just-like-new', 'planetars-visions'];

function countId(source, id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (source.match(re) || []).length;
}

function block(id) {
  const start = html.indexOf(`id:'${id}'`) >= 0 ? html.indexOf(`id:'${id}'`) : html.indexOf(`id:"${id}"`);
  assert.ok(start >= 0, `${id} must exist`);
  const end = html.indexOf('companionCompatibility:', start);
  return html.slice(start, end > 0 ? end : start + 1200);
}

test('Batch 07: all 3 entries are present exactly once', () => {
  for (const id of BATCH_07_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 07 fix: Just Like New is note-only (reduces the broken-firearm -2 attack penalty to -1) instead of a flat +1 stacking attack bonus on every attack -- the engine has no baseline broken-weapon penalty to replace', () => {
  const b = block('just-like-new');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat +1 configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Reduces the broken-firearm attack penalty from -2 to -1/);
});

test('Batch 07: Arms Master was already correctly note-only -- the engine has no baseline nonproficient-weapon (-4) penalty to replace with -2, unchanged', () => {
  const b = block('trait-arms-master');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Reduces the nonproficient-weapon attack penalty/);
});

test("Batch 07: Planetar's Visions was already correctly note-only -- this calculator does not model damage reduction at all, unchanged", () => {
  const b = block('planetars-visions');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'DR-bypass effect on a confirmed crit vs evil outsiders/);
});

test('Batch 07: no trait in this batch is mirrored into companion/index.html', () => {
  for (const id of BATCH_07_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
