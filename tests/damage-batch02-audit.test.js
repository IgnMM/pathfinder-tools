// Damage Calculator batch project -- Batch 02: AUDIT trait FIXED/CONDITIONAL (2 of 5).
// Regression coverage for the 25 audited trait entries and the 6 real bugs this batch
// found and fixed. Static-source assertions (grep-style on the HTML text), same pattern
// as tests/damage-batch01-audit.test.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_02_IDS = [
  'call-of-the-longships','candidate-for-perfection-p4','canopy-shooter','carpenden-lobber',
  'chelish-guerrilla','clockwork-engineer','cold-and-calculating','covered-sniper',
  'cruelty-zon-kuthon','crusader','trait-deadly-rush','dedicated-defender','deep-guardian',
  'trait-demon-slayer','dirty-fighter','dispelled-battler','div-hunter','divine-warrior',
  'dog-sniff-hate','dog-sniff-hate-2','dragonslayer-dahak','drake-anatomist',
  'eager-combatant','exhibition-fighter','favored-prey-ketephys','fencer',
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

test('Batch 02: all 25 entries + the pre-existing Dog-Sniff-Hate feat are present exactly once', () => {
  for (const id of BATCH_02_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 02 fix: Chelish Guerrilla damage bonus defaults to +1, not +2 (the +2 is a Knowledge skill bonus) -- both the declared configField default AND compute()\'s own fallback', () => {
  const b = block('chelish-guerrilla');
  assert.match(b, /key:'value'.*?default:1\}/, 'the declared configField default must be 1');
  assert.match(b, /cfg\.value:1\)/, 'compute()\'s own cfg.value!==undefined?cfg.value:N fallback must also be 1 -- a mismatch here was a real bug caught only by live browser testing, not by checking configFields alone');
});

test('Batch 02 fix: Div Hunter damage bonus defaults to +1, not +2 (same class of bug as Chelish Guerrilla) -- both the declared configField default AND compute()\'s own fallback', () => {
  const b = block('div-hunter');
  assert.match(b, /key:'value'.*?default:1\}/);
  assert.match(b, /cfg\.value:1\)/);
});

test('Batch 02 fix: Cruelty is now the Quests & Campaigns trait (a -2 attack PENALTY vs non-dying/non-helpless foes), not the old unrelated Zon-Kuthon effect', () => {
  const b = block('cruelty-zon-kuthon');
  assert.match(b, /category:'trait'/, 'must be a trait, not a feat');
  assert.match(b, /source:'Quests & Campaigns/, 'must cite the correct sourcebook');
  assert.match(b, /default:-2/, 'the printed effect is a -2 penalty');
  assert.doesNotMatch(b, /bleed damage/, 'the old, wrong rules text (a Zon-Kuthon bleed/fear/pain morale bonus) must be gone');
});

test('Batch 02 fix: Deep Guardian buffs a SUMMONED creature, not the trait-holder -- must be note-only', () => {
  const b = block('deep-guardian');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Buffs a SUMMONED creature/, 'must not add to the trait-holder\'s own attack -- the printed effect targets a creature summoned by a summon spell, not the caster');
});

test('Batch 02 fix: Dog-Sniff-Hate (feat) applies both its attack AND damage bonus', () => {
  const b = block('dog-sniff-hate');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /dmgValue/, 'compute() must return a non-zero damage value (was hardcoded to 0 -- the desc already said +2 damage but the arithmetic silently dropped it, same bug class as Big Game Hunter in batch 1)');
});

test('Batch 02: the 2 already-correct crit-confirmation-only traits stay note-only', () => {
  for (const id of ['trait-deadly-rush', 'trait-demon-slayer']) {
    const b = block(id);
    assert.match(b, /note:'A crit-confirmation bonus/, `${id} must stay a note-only crit-confirmation entry`);
  }
});

test('Batch 02: Dragonslayer note no longer claims only Evil Dragon triggers it (targetMatches already covers both evilDragon and goodDragon)', () => {
  const b = block('dragonslayer-dahak');
  assert.doesNotMatch(b, /this tool only has that one dragon-flagged target category/, 'the old note was misleading -- TARGET_FLAG_MAP tags dragon:true for both evilDragon and goodDragon, so the trait already worked against both');
});

test('Batch 02: no trait in this batch is mirrored into companion/index.html', () => {
  const traitIds = BATCH_02_IDS.filter(id => id !== 'dog-sniff-hate'); // the feat pair's non-trait id is companion-eligible in principle, out of scope for this audit batch
  for (const id of traitIds) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
