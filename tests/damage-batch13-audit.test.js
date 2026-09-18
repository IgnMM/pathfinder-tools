// Damage Calculator batch project -- Batch 13: AUDIT feats FIXED/CONDITIONAL (6 of 6, final
// of the feat FIXED/CONDITIONAL series). Regression coverage for the 9 audited feat entries
// and the bugs/clarity fixes this batch found. Static-source assertions (grep-style on the
// HTML text), same pattern as the other feat/trait audit test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_13_IDS = [
  'touvette-defender', 'trapper-s-setup', 'twin-thunders-flurry', 'feat-unimpeachable-honor', 'feat-upsetting-strike',
  'vengeance-p4', 'volley-fire', 'we-are-the-wall', 'feat-wild-flanking',
];

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

test('Batch 13: all 9 entries are present exactly once', () => {
  for (const id of BATCH_13_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 13 clarity fix: Touvette Defender note now states the printed 1-dmg-per-level bonus is not tracked here (this calculator has no character-level field)', () => {
  const b = block('touvette-defender');
  assert.match(b, /plus 1 dmg\/level not tracked here/);
});

test("Batch 13 fix: Trapper's Setup buffs a triggered TRAP's attack roll or save DC, not the character's own attack/damage -- was implemented as a flat +2 self attack bonus", () => {
  const b = block('trapper-s-setup');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat self-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Buffs a triggered trap/);
});

test('Batch 13 fix: Vengeance now applies its +1 bonus to weapon damage as well as attack (was attack-only, silently dropping the printed damage bonus)', () => {
  const b = block('vengeance-p4');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /attack:v,damage:v/);
});

test('Batch 13: already-correct entries stay unchanged (spot checks)', () => {
  assert.match(block('twin-thunders-flurry'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:2\);return \{attack:0,damage:v/);
  assert.match(block('feat-unimpeachable-honor'), /compute:\(\)=>\(\{attack:-4,damage:-4,/);
  assert.match(block('volley-fire'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:1\);return \{attack:v,damage:0/);
  assert.match(block('we-are-the-wall'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:1\);return \{attack:v,damage:0/);
});

test('Batch 13: the already-correct ENGINE-gap note-only entries stay note-only (no baseline primitive to represent them)', () => {
  for (const id of ['feat-upsetting-strike', 'feat-wild-flanking']) {
    const b = block(id);
    assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:/, `${id} must stay note-only`);
  }
});

test('Batch 13: no feat in this batch is mirrored into companion/index.html', () => {
  for (const id of BATCH_13_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
