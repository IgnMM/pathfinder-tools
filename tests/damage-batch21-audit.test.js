// Damage Calculator batch project -- Batch 21: AUDIT spells FIXED/CONDITIONAL (2 of 2),
// closing the fixed/conditional spell series (following batch 20). Regression coverage
// for the 3 audited spell entries and the bug this batch found.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_21_IDS = ['vengeful-outrage', 'vigor', 'weapon-of-awe'];

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

test('Batch 21: all 3 entries are present exactly once', () => {
  for (const id of BATCH_21_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 21 fix: Weapon of Awe cannot target a natural weapon per its own rules text, but applied its damage bonus unconditionally -- now gated off when Attack Category is natural', () => {
  const b = block('weapon-of-awe');
  assert.match(b, /compute:\(ctx,cfg\)=>\{if\(ctx\.weaponCategory==='natural'\)return\{attack:0,damage:0,note:'no effect/);
});

test('Batch 21: already-correct entries stay unchanged (spot checks)', () => {
  assert.match(block('vengeful-outrage'), /compute:\(ctx\)=>\{let r1=abilityBuffBonus\(ctx,'str',6\),r2=abilityBuffBonus\(ctx,'con',6\);/);
  assert.match(block('vigor'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:1\);return \{attack:0,damage:v/);
});

test('Batch 21: no entry in this batch is mirrored into companion/index.html', () => {
  for (const id of BATCH_21_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
