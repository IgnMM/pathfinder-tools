// Damage Calculator batch project -- Batch 03: AUDIT trait FIXED/CONDITIONAL (3 of 5).
// Regression coverage for the 25 audited trait entries and the 5 real bugs this batch
// found and fixed. Static-source assertions (grep-style on the HTML text), same pattern
// as tests/damage-batch01-audit.test.js and tests/damage-batch02-audit.test.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_03_IDS = [
  'fierce-flanker','fight-for-liberty','finish-the-fight','flair-for-destruction',
  'trait-freedom-fighter-shokuro','furious-vengeance-p4','fury-rovagug','goblin-bravery',
  'goblin-foolhardiness','hellknight-initiate','hot-headed','indelible-ire',
  'inspiring-rush','jungle-opportunist','lastwall-defender','trait-lingshens-finest',
  'lion-s-audacity','lost-nobility','trait-martial-manuscript',
  'master-of-the-sudden-strike','mindlessly-cruel','mivoni-duelist',
  'mizu-ki-hikari-rebel','monk-weapon-skill','nexian-corpse-hunter',
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

test('Batch 03: all 25 entries are present exactly once', () => {
  for (const id of BATCH_03_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 03 fix: Fight for Liberty buffs an unarmed ALLY, not the trait-holder -- note-only', () => {
  const b = block('fight-for-liberty');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Buffs unarmed\/improvised-weapon ALLIES/, 'the printed rule buffs "any unarmed ally within 30 feet", conditioned on a successful DC 15 Perform check -- not the trait-holder\'s own attack roll');
});

test('Batch 03 fix: Jungle Opportunist buffs the flanked/aided ALLY, not the trait-holder -- note-only', () => {
  const b = block('jungle-opportunist');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Buffs the ALLY/, 'the printed rule says "that ally gains a +1 trait bonus", not the trait-holder');
});

test('Batch 03 fix: Lion\'s Audacity buffs charging ALLIES only, not the trait-holder -- note-only', () => {
  const b = block('lion-s-audacity');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Buffs charging ALLIES/, 'the printed rule says "they gain an additional +2 trait bonus", never stating the trait-holder gains it too (unlike Inspiring Rush, which explicitly says "you gain... as do allies")');
});

test('Batch 03 fix: Furious Vengeance applies both its attack AND its conditional damage bonus', () => {
  const b = block('furious-vengeance-p4');
  assert.match(b, /appliesTo:\['attack','damage'\]/, 'must apply to both channels -- the trait grants both an attack bonus (always, once/day) and a damage bonus (conditional on the target having damaged you last round)');
  assert.match(b, /dmgValue/, 'compute() must return a non-zero damage value (was hardcoded to 0 -- the desc already described the conditional damage bonus but the arithmetic silently dropped it)');
});

test('Batch 03 fix: Master of the Sudden Strike documents that its bonus is precision damage (not multiplied on a crit)', () => {
  const b = block('master-of-the-sudden-strike');
  assert.match(b, /precision damage/i, 'the printed rule explicitly states "This additional damage is precision damage" -- the calculator has no per-entry way to exclude a flat damage number from Critical Damage multiplication, so this is documented as a known, verified limitation rather than silently misrepresented');
});

test('Batch 03: the 3 already-correct crit-confirmation-only traits stay note-only', () => {
  for (const id of ['fury-rovagug', 'trait-lingshens-finest', 'trait-martial-manuscript']) {
    const b = block(id);
    assert.match(b, /crit-confirmation roll only|A crit-confirmation bonus/, `${id} must stay a note-only crit-confirmation entry`);
  }
});

test('Batch 03: no trait in this batch is mirrored into companion/index.html', () => {
  for (const id of BATCH_03_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
