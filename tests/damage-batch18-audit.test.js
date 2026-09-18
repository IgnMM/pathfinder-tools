// Damage Calculator batch project -- Batch 18: AUDIT feats ENGINE (2 of 3).
// Regression coverage for the 25 audited feat entries and the bugs/clarity fixes this
// batch found. Static-source assertions (grep-style on the HTML text), same pattern as
// the other feat/trait audit test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_18_IDS = [
  'giant-killer', 'gnome-weapon-focus', 'goblin-cleaver', 'feat-grand-duchy-familiarity', 'feat-greater-balor-whip',
  'feat-greater-vital-strike', 'feat-hellknight-obsession', 'improved-called-shot', 'feat-improved-low-blow', 'feat-improved-vital-strike',
  'knockout-artist-p4', 'large-target', 'feat-lucky-strike', 'manyshot', 'multiweapon-fighting',
  'feat-one-inch-punch', 'orc-hewer', 'mythic-perfect-strike', 'feat-pommel-strike-deed', 'power-attack',
  'feat-pushing-assault', 'rapid-shot', 'robot-s-bane', 'savage-display', 'skyseeker-thrash',
];
// multiweapon-fighting and power-attack are also mirrored into companion/index.html (pre-existing, untouched)
const NOT_MIRRORED = BATCH_18_IDS.filter(id => id !== 'multiweapon-fighting' && id !== 'power-attack');

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

test('Batch 18: all 25 entries are present exactly once', () => {
  for (const id of BATCH_18_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 18 fix: Greater/Improved Vital Strike duplicate placeholders now redirect to the real, already-correctly-wired vital-strike-greater/vital-strike-improved entries instead of silently doing nothing', () => {
  const greater = block('feat-greater-vital-strike');
  assert.match(greater, /DUPLICATE (ENTRY|PLACEHOLDER)/);
  assert.match(greater, /vital-strike-greater/);
  const improved = block('feat-improved-vital-strike');
  assert.match(improved, /DUPLICATE (ENTRY|PLACEHOLDER)/);
  assert.match(improved, /vital-strike-improved/);
});

test("Batch 18 DEFERRED: Perfect Strike (mythic-perfect-strike) still holds the genuine 6th-tier Champion mythic path ability, not the base Advanced Player's Guide Perfect Strike feat this batch described -- id collision, correctly left untouched", () => {
  const b = block('mythic-perfect-strike');
  assert.match(b, /category:'mythic'/, 'must still be the mythic path ability entry');
  assert.doesNotMatch(b, /monk weapon|roll your attack roll twice/i, 'must not have been overwritten with the base Perfect Strike feat content');
});

test('Batch 18 clarity fix: Robot\'s Bane note now states the printed rank-based escalation (+2 at 11 ranks, +3 at 17 ranks) is not automatically applied since Knowledge (engineering) ranks are not tracked here', () => {
  const b = block('robot-s-bane');
  assert.match(b, /\+2 with 11\+ ranks, \+3 with 17\+ ranks/);
});

test('Batch 18 fix: Savage Display now labels its value field as a 1d6 (or 2d6) roll to enter by hand, with a default reflecting a rolled value, instead of a flat +2 that silently misrepresented a dice-based bonus (checked in both the configFields default AND compute()\'s own inline fallback, since a prior batch found these can drift independently)', () => {
  const b = block('savage-display');
  assert.match(b, /1d6 damage rolled by hand/);
  assert.match(b, /default:3/);
  assert.match(b, /cfg\.value:3\)/);
  assert.match(b, /not a flat \+2/);
});

test('Batch 18: already-correct entries stay unchanged (spot checks)', () => {
  assert.match(block('power-attack'), /compute:\(ctx\)=>\{let step=1\+Math\.floor\(Math\.max\(1,ctx\.bab\)\/4\);/);
  assert.match(block('rapid-shot'), /compute:\(ctx\)=>\{let waived=ctx\.mythicRapidShotOn/);
  assert.match(block('multiweapon-fighting'), /compute:\(\)=>\(\{attack:0,damage:0,note:'applied automatically to the displayed primary\/off-hand penalties/);
  assert.match(block('giant-killer'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:2\);return \{attack:v,damage:0/);
});

test('Batch 18: the already-correct ENGINE-gap note-only entries stay note-only (no baseline primitive to represent them)', () => {
  for (const id of ['feat-grand-duchy-familiarity', 'feat-greater-balor-whip', 'feat-hellknight-obsession', 'feat-improved-low-blow', 'feat-lucky-strike', 'manyshot', 'feat-one-inch-punch', 'feat-pommel-strike-deed', 'feat-pushing-assault']) {
    const b = block(id);
    assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:/, `${id} must stay note-only`);
  }
});

test('Batch 18: no feat in this batch (except the pre-existing multiweapon-fighting/power-attack companion mirrors) is mirrored into companion/index.html', () => {
  for (const id of NOT_MIRRORED) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
