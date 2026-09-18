// Damage Calculator batch project -- Batch 09: AUDIT feats FIXED/CONDITIONAL (2 of 6).
// Regression coverage for the 25 audited feat entries and the bugs/clarity fixes this
// batch found. Static-source assertions (grep-style on the HTML text), same pattern as
// the other feat/trait audit test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_09_IDS = [
  'feat-covering-fire-vc', 'cruelty-zon-kuthon', 'crushing-impact', 'damned-soldier', 'dazing-assault',
  'feat-deadly-stroke', 'feat-deadly-trap', 'death-or-glory-p4', 'deathless-initiate-p4', 'demonic-momentum',
  'demonic-nemesis', 'demonic-style', 'desperate-battler-p4', 'feat-desperate-swing', 'feat-devastating-strike',
  'disorienting-maneuver', 'dog-killer-horse-hunter-p4', 'dog-sniff-hate', 'dog-sniff-hate-2', 'dolphin-style',
  'draconian-law-p4', 'dragon-style-p4', 'dragon-touched', 'dramatic-display-p4', 'dwarven-hatred-style-p4',
  'embrace-of-the-dark-fey',
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

test('Batch 09: all 26 entries are present exactly once', () => {
  for (const id of BATCH_09_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 09 DEFERRED: Cruelty (cruelty-zon-kuthon) still holds the Quests & Campaigns drawback trait, not the Inner Sea Gods Zon-Kuthon obedience feat this batch asked to audit -- id collision, correctly left untouched (same pattern as Weapon Training in batch05)', () => {
  const b = block('cruelty-zon-kuthon');
  assert.match(b, /category:'trait'/, 'must still be the drawback trait entry');
  assert.match(b, /source:'Quests & Campaigns pg. 22'/);
  assert.doesNotMatch(b, /Zon-Kuthon|bleed damage to an opponent/, 'must not have been overwritten with the Inner Sea Gods feat content');
});

test('Batch 09 fix: Deathless Initiate now applies its +2 bonus to BOTH melee attack and damage rolls (was damage-only, silently dropping the printed melee attack bonus)', () => {
  const b = block('deathless-initiate-p4');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /attack:v,damage:v/);
});

test("Batch 09 fix: Death or Glory now scales its bonus with live BAB (+4 base, +1 more at BAB 11/16/20, capped +7) instead of a static manually-entered value that never reflected the feat's own printed BAB scaling", () => {
  const b = block('death-or-glory-p4');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat configField must be removed');
  assert.match(b, /let bab=ctx\.bab\|\|0;let v=4\+\(bab>=11\?1:0\)\+\(bab>=16\?1:0\)\+\(bab>=20\?1:0\)/);
});

test('Batch 09 fix: Draconian Law now applies its +1 circumstance bonus to damage rolls as well as attack (was attack-only, silently dropping the printed "all damage rolls" bonus)', () => {
  const b = block('draconian-law-p4');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /attack:v,damage:v/);
});

test('Batch 09 fix: Dragon-Touched attack bonus default corrected from +2 (the Reflex-save value) to +1 (the actual attack-roll value) -- a value-conflation bug matching the recurring pattern from earlier batches', () => {
  const b = block('dragon-touched');
  assert.match(b, /configFields:\[\{key:'value',label:'Bonus value',type:'number',default:1\}\]/);
  assert.match(b, /cfg\.value:1\)/);
});

test('Batch 09 fix: Embrace of the Dark Fey is a crit-confirmation-only bonus, not a flat attack bonus -- inconsistent with its own already-correct criticalContext companion metadata', () => {
  const b = block('embrace-of-the-dark-fey');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat attack-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'A crit-confirmation bonus/);
});

test('Batch 09 clarity fix: Demonic Nemesis and Dog Killer/Horse Hunter now note that their crit-confirmation-roll component is not modeled (their tracked damage/attack values are unaffected)', () => {
  assert.match(block('demonic-nemesis'), /crit-confirmation portion isn't modeled here/);
  assert.match(block('dog-killer-horse-hunter-p4'), /crit-confirmation portion not modeled here/);
});

test('Batch 09 clarity fix: Demonic Momentum note now states the bonus is per 5 ft the bull rush moved the target, not a flat one-time value', () => {
  const b = block('demonic-momentum');
  assert.match(b, /dmg per 5 ft the bull rush moved the target/);
});

test('Batch 09: already-correct entries stay unchanged (spot checks)', () => {
  assert.match(block('crushing-impact'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:2\);return \{attack:0,damage:v/);
  assert.match(block('dragon-style-p4'), /compute:\(ctx\)=>\{let v=Math\.floor\(\(ctx\.str\|\|0\)\*1\.5\);/);
  assert.match(block('demonic-style'), /compute:\(\)=>\(\{attack:1,damage:2,/);
});

test('Batch 09: the already-correct ENGINE-gap note-only entries stay note-only (no baseline primitive to represent them)', () => {
  for (const id of ['feat-covering-fire-vc', 'feat-deadly-stroke', 'feat-deadly-trap', 'feat-desperate-swing', 'feat-devastating-strike']) {
    const b = block(id);
    assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:/, `${id} must stay note-only`);
  }
});

test('Batch 09: no feat/trait in this batch is mirrored into companion/index.html', () => {
  for (const id of BATCH_09_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
