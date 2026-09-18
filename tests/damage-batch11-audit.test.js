// Damage Calculator batch project -- Batch 11: AUDIT feats FIXED/CONDITIONAL (4 of 6).
// Regression coverage for the 25 audited feat entries and the bugs/clarity fixes this
// batch found. Static-source assertions (grep-style on the HTML text), same pattern as
// the other feat/trait audit test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_11_IDS = [
  'feat-mirror-move', 'moonlight-stalker', 'motivating-display', 'multiweapon-specialist', 'mutual-hatred',
  'nature-s-wrath', 'night-stalker', 'nightmare-fist', 'one-mind', 'orc-rampage',
  'orc-weapon-expertise', 'outflank', 'outslug-style', 'feat-outslug-weave', 'feat-overwatch-style',
  'feat-overwatch-vortex', 'pestilent', 'piranha-strike', 'planar-hunter', 'planar-wild-shape-p4',
  'possessed-hand-p4', 'precise-strike', 'punishing-step', 'pure-legion-assault', 'raging-brutality',
];
// outflank and precise-strike are also mirrored into companion/index.html (pre-existing, untouched)
const NOT_MIRRORED = BATCH_11_IDS.filter(id => id !== 'outflank' && id !== 'precise-strike');

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

test('Batch 11: all 25 entries are present exactly once', () => {
  for (const id of BATCH_11_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 11 fix: Motivating Display buffs ALLIES, not your own attack/damage -- was implemented as a flat +1 self attack bonus', () => {
  const b = block('motivating-display');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat self-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Buffs your allies/);
});

test('Batch 11 fix: Mutual Hatred now applies its +1 bonus to damage as well as attack (was attack-only, silently dropping the printed damage bonus)', () => {
  const b = block('mutual-hatred');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /attack:v,damage:v/);
});

test('Batch 11 fix: Nightmare Fist now models both tiers (+2 base, or +4 vs a shaken/frightened/panicked target) instead of a flat +2 that dropped the printed escalation', () => {
  const b = block('nightmare-fist');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat single-value configField must be removed');
  assert.match(b, /let v=cfg\.tier==='fear'\?4:2;/);
});

test("Batch 11 fix: One Mind grants no attack or damage bonus at all in its own rules text (entirely defensive: avoids flat-footed, avoids invisibility/blindness AC penalties) -- was implemented as a flat +2 self attack bonus that doesn't exist in the source", () => {
  const b = block('one-mind');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat +2 self-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Entirely defensive/);
});

test('Batch 11 fix: Orc Rampage now applies its +1 bonus to damage as well as attack vs shaken opponents (was attack-only, silently dropping the printed damage bonus)', () => {
  const b = block('orc-rampage');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /attack:v,damage:v/);
});

test('Batch 11 fix: Orc Weapon Expertise now offers a benefit selector for all 6 printed options instead of a flat always-on +1 damage bonus that assumed the Bully benefit was chosen and applied it universally', () => {
  const b = block('orc-weapon-expertise');
  assert.match(b, /key:'benefit'/);
  assert.match(b, /cfg\.benefit==='bully'/);
  assert.match(b, /cfg\.benefit==='killer'/);
});

test("Batch 11 fix: Outslug Weave's note now clarifies it REPLACES (not stacks with) Outslug Style's own +1, to prevent double-counting if both are toggled on", () => {
  const b = block('feat-outslug-weave');
  assert.match(b, /replaces, not stacks with, Outslug Style/);
});

test('Batch 11 fix: Overwatch Style and Overwatch Vortex are now modeled as a simple -2 attack penalty on the readied ranged attacks, instead of incorrectly deferred as too complex for a single additive modifier', () => {
  for (const id of ['feat-overwatch-style', 'feat-overwatch-vortex']) {
    const b = block(id);
    assert.match(b, /compute:\(\)=>\(\{attack:-2,damage:0,/, `${id} should be a simple -2 attack penalty`);
  }
});

test("Batch 11 clarity fix: Pestilent's note now states the 1d6 negative energy damage is a dice roll not tracked as a flat number", () => {
  const b = block('pestilent');
  assert.match(b, /1d6 negative energy damage not tracked here/);
});

test('Batch 11 fix: Piranha Strike now scales with live BAB (both the -1/step attack penalty and +2/step damage bonus, halved off-hand) instead of a flat damage-only value that dropped the attack penalty and the BAB scaling entirely', () => {
  const b = block('piranha-strike');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat damage-only configField must be removed');
  assert.match(b, /let step=1\+Math\.floor\(Math\.max\(1,ctx\.bab\|\|0\)\/4\);/);
  assert.match(b, /attack:-step,damage:d/);
});

test("Batch 11 fix: Possessed Hand now applies its +1 insight bonus to damage as well as attack (was attack-only, silently dropping the printed damage-roll bonus)", () => {
  const b = block('possessed-hand-p4');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /attack:v,damage:v/);
});

test('Batch 11: already-correct entries stay unchanged (spot checks)', () => {
  assert.match(block('moonlight-stalker'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:2\);return \{attack:v,damage:v/);
  assert.match(block('outflank'), /compute:\(ctx\)=>ctx\.flankingOn\?/);
  assert.match(block('raging-brutality'), /compute:\(ctx\)=>\{let mult=\(ctx\.style==='twoHanded'\)\?1\.5:1;/);
  assert.match(block('planar-wild-shape-p4'), /compute:\(\)=>\(\{attack:0,damage:0,note:'\+2 on the crit-confirmation roll only/);
});

test('Batch 11: the already-correct ENGINE-gap note-only entry stays note-only (no baseline primitive to represent it)', () => {
  const b = block('feat-mirror-move');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:/);
});

test('Batch 11: no feat in this batch (except the pre-existing outflank/precise-strike companion mirrors) is mirrored into companion/index.html', () => {
  for (const id of NOT_MIRRORED) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
