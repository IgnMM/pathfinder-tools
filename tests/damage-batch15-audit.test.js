// Damage Calculator batch project -- Batch 15: AUDIT feats DYNAMIC (2 of 3).
// Regression coverage for the 25 audited feat entries and the bugs/clarity fixes this
// batch found. Static-source assertions (grep-style on the HTML text), same pattern as
// the other feat/trait audit test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_15_IDS = [
  'eagle-s-resolve-p4', 'earth-child-style-p4', 'efreeti-style-p4', 'energy-channel', 'esoteric-transmutation',
  'ferocious-horde', 'focused-fey-expertise', 'glorious-blaze', 'glorious-heat', 'gray-maiden-initiate',
  'greater-weapon-shift', 'grudge-fighter', 'gruesome-butcher-p4', 'feat-guided-star', 'hands-of-valor',
  'hard-headed', 'feat-impaling-critical', 'improved-devastating-strike', 'innocent-blood', 'feat-janni-rush',
  'katheer-scholar', 'feat-linnorm-hunter-coordination', 'mantis-wisdom-p4', 'marid-style-p4', 'measure-foe',
];
// hard-headed is also mirrored into companion/index.html (pre-existing, untouched)
const NOT_MIRRORED = BATCH_15_IDS.filter(id => id !== 'hard-headed');

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

test('Batch 15: all 25 entries are present exactly once', () => {
  for (const id of BATCH_15_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 15 clarity fix: Earth Child Style and Efreeti Style notes now state their live WIS bonus is scoped (giant subtype only / fire damage via Elemental Fist only)', () => {
  assert.match(block('earth-child-style-p4'), /vs giant subtype only/);
  assert.match(block('efreeti-style-p4'), /fire damage via Elemental Fist only/);
});

test('Batch 15 fix: Glorious Blaze buffs ALLIES who can see you, not your own attack/damage -- was implemented as a flat +1 self attack bonus', () => {
  const b = block('glorious-blaze');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat self-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Buffs allies who can see you/);
});

test('Batch 15 fix: Glorious Heat buffs a chosen ALLY, not your own attack -- was implemented with a note correctly saying "ally only" but a compute() that still returned a nonzero self attack value (note/value mismatch)', () => {
  const b = block('glorious-heat');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat self-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Buffs a chosen ally/);
});

test('Batch 15 clarity fix: Gray Maiden Initiate note now states the damage bonus only applies if the Avenging Knight benefit was chosen (one of several possible benefit picks)', () => {
  const b = block('gray-maiden-initiate');
  assert.match(b, /only if you chose the Avenging Knight benefit/);
});

test('Batch 15 fix: Gruesome Butcher is actually a DRAWBACK (enemies get a bonus against you once your identity is known), not a bonus for your own attack/damage -- was implemented as a flat +2/+2 self bonus', () => {
  const b = block('gruesome-butcher-p4');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat self-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'A DRAWBACK, not a bonus/);
});

test('Batch 15 fix: Guided Star now reads live ctx.wis for its starknife-only damage bonus instead of being incorrectly deferred as too complex, matching the identical shape of its siblings (Earth Child/Efreeti/Marid Style)', () => {
  const b = block('feat-guided-star');
  assert.match(b, /appliesTo:\['damage'\]/);
  assert.match(b, /compute:\(ctx\)=>\{let v=\(ctx\.wis\|\|0\);/);
});

test('Batch 15 fix: Katheer Scholar buffs allies within 30 ft, not your own damage -- was implemented as a flat +1 self damage bonus', () => {
  const b = block('katheer-scholar');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat self-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Buffs allies within 30 ft/);
});

test('Batch 15 clarity fix: Mantis Wisdom and Marid Style notes now state their bonuses are scoped (Stunning Fist attempts only / cold damage via Elemental Fist only)', () => {
  assert.match(block('mantis-wisdom-p4'), /unarmed Stunning Fist attempts only/);
  assert.match(block('marid-style-p4'), /cold damage via Elemental Fist only/);
});

test('Batch 15: already-correct entries stay unchanged (spot checks)', () => {
  assert.match(block('eagle-s-resolve-p4'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:2\);return \{attack:v,damage:v/);
  assert.match(block('innocent-blood'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:1\);return \{attack:v,damage:0/);
  assert.match(block('hands-of-valor'), /compute:\(ctx,cfg\)=>\{let v=Math\.max\(1,cfg\.chaMod\|\|0\);/);
});

test('Batch 15: the already-correct ENGINE-gap note-only entries stay note-only (no baseline primitive to represent them)', () => {
  for (const id of ['feat-impaling-critical', 'feat-janni-rush', 'feat-linnorm-hunter-coordination']) {
    const b = block(id);
    assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:/, `${id} must stay note-only`);
  }
});

test('Batch 15: no feat in this batch (except the pre-existing hard-headed companion mirror) is mirrored into companion/index.html', () => {
  for (const id of NOT_MIRRORED) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
