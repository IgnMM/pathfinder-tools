// Damage Calculator batch project -- Batch 19: AUDIT feats ENGINE (3 of 3, final of the
// feat ENGINE series and of the entire feat AUDIT project, batches 08-19). Regression
// coverage for the 11 audited feat entries and the bugs/clarity fixes this batch found.
// Static-source assertions (grep-style on the HTML text), same pattern as the other
// feat/trait audit test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_19_IDS = [
  'feat-snake-sidewind', 'spirited-charge', 'feat-stabbing-shot', 'steadfast-slayer', 'throw-anything',
  'trample', 'two-handed-thrower', 'two-weapon-fighting', 'feat-two-weapon-grace', 'underfoot-botb-p4', 'vital-strike',
];
// vital-strike is also mirrored into companion/index.html (pre-existing, untouched)
const NOT_MIRRORED = BATCH_19_IDS.filter(id => id !== 'vital-strike');

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

test('Batch 19: all 11 entries are present exactly once', () => {
  for (const id of BATCH_19_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 19 clarity fix: Throw Anything note now states its +1 circumstance bonus is scoped to thrown splash weapons only', () => {
  const b = block('throw-anything');
  assert.match(b, /thrown splash weapons only/);
});

test('Batch 19 fix: Trample lets YOUR MOUNT make a hoof attack (with the universal +4 vs-prone bonus, not unique to this feat), not a bonus for your own attack -- was implemented as a flat +4 self attack bonus', () => {
  const b = block('trample');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat self-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Lets your mount make a hoof attack/);
});

test('Batch 19: already-correct entries stay unchanged (spot checks)', () => {
  assert.match(block('two-handed-thrower'), /compute:\(ctx\)=>\{let v=Math\.floor\(\(ctx\.str\|\|0\)\*1\.5\);/);
  assert.match(block('two-weapon-fighting'), /compute:\(\)=>\(\{attack:0,damage:0,note:'applied automatically to Two-Weapon Fighting penalties above'\}\)/);
  assert.match(block('steadfast-slayer'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:2\);return \{attack:0,damage:v/);
  assert.match(block('vital-strike'), /compute:\(ctx\)=>\{let d=ctx\.weaponDice\|\|'1d8';/);
});

test('Batch 19: the already-correct ENGINE-gap note-only entries stay note-only (no baseline primitive to represent them)', () => {
  for (const id of ['feat-snake-sidewind', 'spirited-charge', 'feat-stabbing-shot', 'feat-two-weapon-grace']) {
    const b = block(id);
    assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:/, `${id} must stay note-only`);
  }
});

test('Batch 19: no feat in this batch (except the pre-existing vital-strike companion mirror) is mirrored into companion/index.html', () => {
  for (const id of NOT_MIRRORED) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
