// Damage Calculator batch project -- Batch 01: AUDIT trait FIXED/CONDITIONAL (1 of 5).
// Regression coverage for the 25 audited trait entries and the 4 real bugs this batch
// found and fixed. Static-source assertions (grep-style on the HTML text), matching the
// pattern already used elsewhere in this suite for MODIFIERS entries -- calc/index.html's
// own engine has too many DOM dependencies to load standalone via vm, so live browser
// verification of the actual compute() arithmetic was done separately per this project's
// established protocol (see conversation/commit history), not re-encoded here.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');

const BATCH_01_IDS = [
  'abolitionist-hunter','absalom-bouncer','adaptable-flatterer-p4','agent-of-the-sultana',
  'trait-alkenstar-defender','ambush-training','trait-anatomist','ancestors-blade',
  'ancestral-weapon','andoren-freedom-fighter',"angradd-s-valor-p4",'back-for-more',
  'trait-backstabber','trait-bellis-axe-master','big-game-hunter','big-game-hunter-2',
  'trait-bitter-heart','black-as-night','blade-of-the-society','trait-blights-bane',
  'blooded','bloodthirsty','bloody-vengeance','trait-border-guard','born-under-the-cradle',
  'briar-bandit',
];

function countId(id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (html.match(re) || []).length;
}

test('Batch 01: all 25 entries + the pre-existing Big Game Hunter feat are present exactly once', () => {
  for (const id of BATCH_01_IDS) {
    assert.equal(countId(id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 01 fix: Agent of the Sultana is a crit-confirmation-only bonus, not a flat attack bonus', () => {
  const start = html.indexOf("id:'agent-of-the-sultana'");
  assert.ok(start >= 0);
  const block = html.slice(start, html.indexOf('companionCompatibility:', start));
  assert.match(block, /compute:\(\)=>\(\{attack:0,damage:0,note:'A crit-confirmation bonus/, 'must be note-only (vs the fire subtype), matching the sibling crit-confirmation entries -- the printed rule is "on attack rolls to confirm critical hits", not a general attack-roll bonus');
  assert.doesNotMatch(block, /return \{attack:v,damage:0/, 'must not return the old flat-attack-bonus shape');
});

test('Batch 01 fix: Back for More is a morale bonus, not a trait bonus (bonus TYPE matters for stacking)', () => {
  const start = html.indexOf('id:"back-for-more"');
  assert.ok(start >= 0);
  const block = html.slice(start, html.indexOf('companionCompatibility:', start));
  assert.match(block, /type:"morale"/, 'the printed rule grants a morale bonus, even though it comes from a trait -- the bonus TYPE (for stacking purposes) must be morale, not trait');
});

test('Batch 01 fix: Big Game Hunter (feat) applies both its attack AND damage bonus', () => {
  const start = html.indexOf("id:'big-game-hunter'");
  assert.ok(start >= 0);
  const block = html.slice(start, html.indexOf('companionCompatibility:', start));
  assert.match(block, /appliesTo:\['attack','damage'\]/, 'must apply to both channels -- the feat grants both an attack AND a damage bonus');
  assert.match(block, /damage:d/, 'compute() must return a non-zero damage value (was hardcoded to 0 -- the desc already said +2 damage but the arithmetic silently dropped it)');
});

test('Batch 01 fix: Briar Bandit\'s sneak-attack damage bonus defaults to +1, not +2 (the +2 is a Stealth skill bonus, not modeled here)', () => {
  const start = html.indexOf("id:'briar-bandit'");
  assert.ok(start >= 0);
  const block = html.slice(start, html.indexOf('companionCompatibility:', start));
  assert.match(block, /default:1\}\]/, 'the printed damage bonus is "+1 trait bonus on damage rolls with sneak attacks" -- the old default:2 was double-counting the trait\'s separate +2 Stealth bonus');
});

test('Batch 01: the 6 already-correct crit-confirmation-only traits stay note-only (no flat number)', () => {
  for (const id of ['trait-alkenstar-defender', 'trait-anatomist', 'trait-bellis-axe-master', 'trait-bitter-heart', 'trait-blights-bane', 'trait-border-guard']) {
    const start = html.indexOf(`id:'${id}'`);
    assert.ok(start >= 0, `${id} must exist`);
    const block = html.slice(start, start + 500);
    assert.match(block, /note:'A crit-confirmation bonus/, `${id} must stay a note-only crit-confirmation entry`);
  }
});

test('Batch 01: no trait in this batch is mirrored into companion/index.html (traits stay Character-only, no GM-approved-traits UI exists there)', () => {
  const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');
  const traitIds = BATCH_01_IDS.filter(id => id !== 'big-game-hunter'); // the feat is companion-eligible in principle, but out of scope for this audit batch
  for (const id of traitIds) {
    assert.equal(countIdIn(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
  function countIdIn(source, id) {
    const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
    return (source.match(re) || []).length;
  }
});
