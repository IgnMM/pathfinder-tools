// Damage Calculator batch project -- Batch 08: AUDIT feats FIXED/CONDITIONAL (1 of 6).
// Regression coverage for the 25 audited feat entries and the bugs/clarity fixes this
// batch found. Static-source assertions (grep-style on the HTML text), same pattern as
// the trait audit test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_08_IDS = [
  'aldori-style', 'all-gnolls-must-die', 'ancestral-enmity', 'anticipate-dodge', 'bear-hug',
  'beastmaster-ire', 'bewildering-koan-p4', 'big-game-hunter', 'big-game-hunter-2', 'blood-feast',
  'blood-for-the-empire', 'feat-blooded-arcane-strike', 'bloodstone-manhunter-p4', 'broken-wing-gambit',
  'caster-s-champion-p4', 'feat-chainbreaker', 'feat-chairbreaker', 'champion', 'champion-of-balance-p4',
  'champion-of-destruction-p4', 'champion-of-freedom-p4', 'champion-of-grace-p4', 'champion-of-malevolence-p4',
  'champion-of-righteousness-p4', 'feat-choir-of-blades', 'cold-celerity',
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

test('Batch 08: all 25 entries are present exactly once', () => {
  for (const id of BATCH_08_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 08 fix: All Gnolls Must Die now applies its +2 competence bonus to BOTH attack and damage (was attack-only, silently dropping the printed weapon damage bonus)', () => {
  const b = block('all-gnolls-must-die');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /attack:v,damage:v/);
});

test('Batch 08 fix: Beastmaster Ire now models both tiers (base +2 atk/+4 dmg, or +4 atk/+8 dmg if the enemy damaged your animal companion) instead of a flat +2-attack-only bonus that dropped the printed damage component entirely', () => {
  const b = block('beastmaster-ire');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat single-value configField must be removed');
  assert.match(b, /key:'tier'/);
  assert.match(b, /a=dmgd\?4:2,d=dmgd\?8:4/);
});

test('Batch 08 fix: Broken Wing Gambit grants the bonus to the OPPONENT against you, not to your own attack/damage -- was implemented backwards as a flat +2/+2 self bonus', () => {
  const b = block('broken-wing-gambit');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat +2/+2 self-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Grants your opponent/);
});

test("Batch 08 fix: Caster's Champion now scales its damage bonus with live BAB (+1 base, +1 every 4 BAB, capped at +5) instead of a static manually-entered value that never reflected the printed BAB scaling", () => {
  const b = block('caster-s-champion-p4');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat configField must be removed');
  assert.match(b, /compute:\(ctx\)=>\{let v=Math\.min\(5,1\+Math\.floor\(\(ctx\.bab\|\|0\)\/4\)\);/);
});

test('Batch 08 fix: Champion of Destruction/Freedom/Righteousness descs were truncated with "…" before ever stating their actual damage bonus -- now state the full +2 (or +4 if both alignment axes match) rule', () => {
  const destruction = block('champion-of-destruction-p4');
  assert.match(destruction, /\+2 bonus on weapon and spell damage rolls against lawful and good creatures \(or \+4 if the creature is both lawful and good\)/);
  const freedom = block('champion-of-freedom-p4');
  assert.match(freedom, /\+2 bonus on weapon and spell damage rolls against evil and lawful creatures \(or \+4 if the creature is both evil and lawful\)/);
  const righteousness = block('champion-of-righteousness-p4');
  assert.match(righteousness, /\+2 bonus on weapon and spell damage rolls against chaotic and evil creatures \(or \+4 if the creature is both chaotic and evil\)/);
});

test('Batch 08 fix: Champion of Grace/Malevolence descs were truncated with "…" before ever stating their actual damage bonus -- now state the full +2 rule (single alignment condition, no doubling)', () => {
  const grace = block('champion-of-grace-p4');
  assert.match(grace, /\+2 bonus on weapon and spell damage rolls against evil creatures/);
  const malevolence = block('champion-of-malevolence-p4');
  assert.match(malevolence, /\+2 bonus on weapon and spell damage rolls against good creatures/);
});

test('Batch 08 fix: Champion of Balance desc now notes the up-to-+4 stacking case (creature non-neutral on both alignment axes)', () => {
  const b = block('champion-of-balance-p4');
  assert.match(b, /up to \+4 total/);
});

test('Batch 08 fix: Cold Celerity attack bonus default corrected from +2 (the initiative-check value) to +1 (the actual attack-roll value) -- a value-conflation bug matching the recurring pattern from earlier batches', () => {
  const b = block('cold-celerity');
  assert.match(b, /configFields:\[\{key:'value',label:'Bonus value',type:'number',default:1\}\]/);
  assert.match(b, /cfg\.value:1\)/);
});

test('Batch 08: already-correct entries stay unchanged (spot checks)', () => {
  assert.match(block('aldori-style'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:2\);return \{attack:0,damage:v/);
  assert.match(block('champion'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:1\);return \{attack:v,damage:0/);
  assert.match(block('blood-feast'), /attack:v,damage:v,note:'\+'\+v\+' atk'/);
});

test('Batch 08: the 4 already-correct ENGINE-gap note-only entries stay note-only (no baseline primitive to represent them)', () => {
  for (const id of ['feat-blooded-arcane-strike', 'feat-chainbreaker', 'feat-chairbreaker', 'feat-choir-of-blades']) {
    const b = block(id);
    assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:/, `${id} must stay note-only`);
  }
});

test('Batch 08: no feat in this batch is mirrored into companion/index.html (companion has no per-feat catalogue entries yet)', () => {
  for (const id of BATCH_08_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
