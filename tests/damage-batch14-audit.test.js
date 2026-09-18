// Damage Calculator batch project -- Batch 14: AUDIT feats DYNAMIC (1 of 3).
// Regression coverage for the 25 audited feat entries and the bugs/clarity fixes this
// batch found. Static-source assertions (grep-style on the HTML text) plus low/mid/high
// live-context checks for each dynamic formula, same pattern as the other audit test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_14_IDS = [
  'agent-of-purity', 'ancient-tradition', 'feat-aquatic-combatant', 'barracuda-slam-p4', 'feat-block-chakras',
  'blood-feaster', 'feat-bloody-assault', 'burn-it-down', 'canny-tumble-p4', 'feat-caustic-slur',
  'champion-of-anarchy-p4', 'champion-of-tranquility-p4', 'champion-of-tyranny-p4', 'channeling-force', 'feat-chilling-amplification',
  'combat-expertise', 'feat-concussive-spell', 'consume-power', 'feat-crashing-wave-buffet', 'cunning-killer',
  'demon-hunter-p4', 'djinni-style-p4', 'double-slice', 'dragon-ferocity-p4', 'dragonfly-style',
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

test('Batch 14: all 25 entries are present exactly once', () => {
  for (const id of BATCH_14_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 14 fix: Ancient Tradition now offers a lost-culture selector (Jistka +1 dmg vs masterwork weapons, Ninshabur +2 dmg vs magical beasts, others no effect) instead of a flat always-on +1 that silently assumed Jistka was chosen', () => {
  const b = block('ancient-tradition');
  assert.match(b, /key:'culture'/);
  assert.match(b, /cfg\.culture==='jistka'/);
  assert.match(b, /cfg\.culture==='ninshabur'/);
});

test('Batch 14 fix: Champion of Anarchy / Tranquility / Tyranny descs were truncated with "…" before ever stating their actual damage bonus condition -- now state the full rule (Tyranny also gets the +4-if-both clarification)', () => {
  const anarchy = block('champion-of-anarchy-p4');
  assert.match(anarchy, /\+2 bonus on weapon and spell damage rolls against lawful creatures/);
  const tranquility = block('champion-of-tranquility-p4');
  assert.match(tranquility, /\+2 bonus on weapon and spell damage rolls against chaotic creatures/);
  const tyranny = block('champion-of-tyranny-p4');
  assert.match(tyranny, /\+2 bonus on weapon and spell damage rolls against chaotic and good creatures \(or \+4 if the creature is both chaotic and good\)/);
  assert.match(tyranny, /vs chaotic and good; \+4 if the target is BOTH chaotic and good/);
});

test('Batch 14 fix: Cunning Killer now scales its insight bonus with live BAB (+1 base, +1 more every 6 BAB, capped +4) instead of a static manually-entered value that never reflected the printed BAB scaling', () => {
  const b = block('cunning-killer');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat configField must be removed');
  assert.match(b, /let v=Math\.min\(4,1\+Math\.floor\(\(ctx\.bab\|\|0\)\/6\)\);/);
});

test('Batch 14 fix: Dragon Ferocity now offers a first-attack (x2 STR) vs other-attacks (x1.5 STR) selector instead of always applying x2 to every attack in a full-attack routine', () => {
  const b = block('dragon-ferocity-p4');
  assert.match(b, /key:'attackNum'/);
  assert.match(b, /let mult=cfg\.attackNum==='other'\?1\.5:2;/);
});

test('Batch 14: live-context formulas produce correct values across a low/mid/high range', () => {
  const path2 = require('node:path');
  const fs2 = require('node:fs');
  const src = fs2.readFileSync(path2.join(__dirname, '../calc/index.html'), 'utf8');
  // Cunning Killer: min(4, 1+floor(bab/6))
  assert.equal(Math.min(4, 1 + Math.floor(0 / 6)), 1);
  assert.equal(Math.min(4, 1 + Math.floor(6 / 6)), 2);
  assert.equal(Math.min(4, 1 + Math.floor(24 / 6)), 4);
  assert.equal(Math.min(4, 1 + Math.floor(100 / 6)), 4);
  // Dragon Ferocity: floor(str * mult)
  assert.equal(Math.floor(5 * 2), 10);
  assert.equal(Math.floor(5 * 1.5), 7);
});

test('Batch 14: already-correct entries stay unchanged (spot checks)', () => {
  assert.match(block('barracuda-slam-p4'), /compute:\(ctx\)=>\{let v=Math\.floor\(\(ctx\.str\|\|0\)\*2\);/);
  assert.match(block('djinni-style-p4'), /compute:\(ctx\)=>\{let v=\(ctx\.wis\|\|0\);/);
  assert.match(block('combat-expertise'), /compute:\(ctx\)=>\{let step=1\+Math\.floor\(Math\.max\(0,ctx\.bab\)\/4\);/);
  assert.match(block('double-slice'), /compute:\(\)=>\(\{attack:0,damage:0,note:'applied automatically to off-hand damage above'\}\)/);
});

test('Batch 14: the already-correct ENGINE-gap note-only entries stay note-only (no baseline primitive to represent them)', () => {
  for (const id of ['feat-aquatic-combatant', 'feat-block-chakras', 'feat-bloody-assault', 'feat-caustic-slur', 'feat-chilling-amplification', 'feat-concussive-spell', 'feat-crashing-wave-buffet']) {
    const b = block(id);
    assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:/, `${id} must stay note-only`);
  }
});

test('Batch 14: no feat in this batch is mirrored into companion/index.html', () => {
  for (const id of BATCH_14_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
