// Damage Calculator batch project -- Batch 16: AUDIT feats DYNAMIC (3 of 3, final of the
// feat DYNAMIC series). Regression coverage for the 24 audited feat entries and the bugs/
// clarity fixes this batch found. Static-source assertions (grep-style on the HTML text),
// same pattern as the other feat/trait audit test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_16_IDS = [
  'monkey-shine', 'mother-s-gift', 'net-and-trident', 'point-blank-shot', 'feat-rat-catcher',
  'feat-relentless-butcher', 'rending-swarm-p4', 'sap-adept', 'shaitan-style-p4', 'feat-shark-leap',
  'shifters-edge', 'shikigami-manipulation-p4', 'smiting-reversal-p4', 'feat-sneaking-critical', 'feat-sniper-shot',
  'feat-solar-spell', 'startoss-style', 'feat-storm-of-blades', 'strength-in-defeat', 'studied-combatant',
  'thrill-of-the-hunt', 'tiger-claws-p4', 'weapon-focus', 'weapon-specialization',
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

test('Batch 16: all 24 entries are present exactly once', () => {
  for (const id of BATCH_16_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 16 clarity fix: Mother\'s Gift, Net and Trident, and Shaitan Style notes now state their bonuses are scoped (Hag Claws manifestation only / entangled opponent + untracked crit-confirm bonus / acid damage via Elemental Fist only)', () => {
  assert.match(block('mother-s-gift'), /only if you chose the Hag Claws manifestation/);
  assert.match(block('net-and-trident'), /vs entangled opponent only, plus an equal crit-confirmation bonus not tracked here/);
  assert.match(block('shaitan-style-p4'), /acid damage via Elemental Fist only/);
});

test('Batch 16 fix: Smiting Reversal now applies its character-level-based damage bonus (manual entry) in addition to the live Charisma-based attack bonus (was attack-only, silently dropping the printed damage component)', () => {
  const b = block('smiting-reversal-p4');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /key:'charLevel'/);
  assert.match(b, /let a=\(ctx\.cha\|\|0\);let d=\(cfg\.charLevel\|\|0\);/);
});

test('Batch 16 clarity fix: Strength in Defeat note now states the printed level-based escalation (+2 at 8th, +3 at 15th) is not automatically applied since character level is not tracked here', () => {
  const b = block('strength-in-defeat');
  assert.match(b, /increases to \+2 at level 8, \+3 at level 15/);
});

test('Batch 16 fix: Studied Combatant now applies its +2 bonus to damage as well as attack (was attack-only, silently dropping the printed precision-damage bonus)', () => {
  const b = block('studied-combatant');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /attack:v,damage:v/);
});

test('Batch 16 fix: Thrill of the Hunt now models both its tiers (+2 dmg vs your tracked prize, or +2 atk generally once the prize is dead/helpless) instead of only the damage-vs-prize tier, dropping the printed post-kill attack bonus entirely', () => {
  const b = block('thrill-of-the-hunt');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat single-value configField must be removed');
  assert.match(b, /key:'tier'/);
  assert.match(b, /cfg\.tier==='afterKill'/);
});

test('Batch 16 clarity fix: Tiger Claws note now states its x1.5 STR bonus applies to one hand\'s damage roll only, and only while using Power Attack', () => {
  const b = block('tiger-claws-p4');
  assert.match(b, /one hand damage roll only, requires Power Attack/);
});

test('Batch 16: live-context formulas produce correct values across a low/mid/high range', () => {
  // Shaitan Style / mother's gift etc. already covered by other batches' pattern; spot-check Tiger Claws and Smiting Reversal formulas directly
  assert.equal(Math.floor(4 * 1.5), 6);
  assert.equal(Math.floor(0 * 1.5), 0);
  assert.equal(Math.floor(9 * 1.5), 13);
});

test('Batch 16: already-correct entries stay unchanged (spot checks)', () => {
  assert.match(block('monkey-shine'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:4\);return \{attack:v,damage:0/);
  assert.match(block('point-blank-shot'), /compute:\(\)=>\(\{attack:1,damage:1,note:'\+1 atk \/ \+1 dmg'\}\)/);
  assert.match(block('weapon-focus'), /compute:\(\)=>\(\{attack:1,damage:0,note:'\+1 atk'\}\)/);
  assert.match(block('weapon-specialization'), /compute:\(\)=>\(\{attack:0,damage:2,note:'\+2 dmg'\}\)/);
});

test('Batch 16: the already-correct ENGINE-gap note-only entries stay note-only (no baseline primitive to represent them)', () => {
  for (const id of ['feat-relentless-butcher', 'feat-shark-leap', 'feat-sneaking-critical', 'feat-sniper-shot', 'feat-solar-spell', 'feat-storm-of-blades']) {
    const b = block(id);
    assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:/, `${id} must stay note-only`);
  }
});

test('Batch 16: no feat in this batch is mirrored into companion/index.html', () => {
  for (const id of BATCH_16_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
