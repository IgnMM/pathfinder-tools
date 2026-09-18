// Damage Calculator batch project -- Batch 36: ADD feats DYNAMIC (4 of 4), the final
// batch of the DYNAMIC feat ADD series. Regression coverage for the 3 newly added feat
// entries, plus guards on the already-present entries and the excluded/deferred entries
// this batch reports.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_36_ADDED_IDS = ['snipers-lantern', 'sunlit-strike', 'two-weapon-rend'];

function countId(source, id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (source.match(re) || []).length;
}

function block(id) {
  const start = html.indexOf(`id:'${id}'`) >= 0 ? html.indexOf(`id:'${id}'`) : html.indexOf(`id:"${id}"`);
  assert.ok(start >= 0, `${id} must exist`);
  const nextEntry = html.indexOf('\n{id:', start + 5);
  return html.slice(start, nextEntry > 0 ? nextEntry : start + 1200);
}

test('Batch 36: all 3 newly added entries are present exactly once, each with a source link', () => {
  for (const id of BATCH_36_ADDED_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
    assert.match(block(id), /source:/);
  }
});

test('Batch 36: Sniper\'s Lantern grants +2 insight ranged attack bonus, gated by the real ctx.weaponRanged hook', () => {
  const b = block('snipers-lantern');
  assert.match(b, /if\(!ctx\.weaponRanged\)/);
  assert.match(b, /return \{attack:2,damage:0,/);
});

test('Batch 36: Sunlit Strike adds 1d6 damage via extraDice (not multiplied on a crit), vs. light-vulnerable creatures', () => {
  const b = block('sunlit-strike');
  assert.match(b, /extraDice:\{normal:'1d6'\}/);
});

test('Batch 36: Two-Weapon Rend adds 1d10 + 1.5x Strength modifier via extraDice (not multiplied on a crit), once per round, only when both attacks hit', () => {
  const b = block('two-weapon-rend');
  assert.match(b, /let bonus=roundFrac\(str\*1\.5\);/);
  assert.match(b, /extraDice:\{normal:term\}/);
});

test('Batch 36: Surprise Maneuver and Uncanny Defense were already present and correctly implemented (configFields let the user input the variable dice count / dodge bonus the formula depends on) -- left untouched', () => {
  for (const id of ['surprise-maneuver', 'uncanny-defense']) {
    assert.equal(countId(html, id), 1, `${id} should still be present exactly once`);
  }
  assert.match(block('surprise-maneuver'), /configFields:\[\{key:'route'/);
  assert.match(block('uncanny-defense'), /configFields:\[\{key:'dodgeBonus'/);
});

test('Batch 36: excluded entries were not added -- none is a bonus to the character\'s own attack or damage roll (they grant resistance/healing/Stealth/CMD bonuses, are crit-triggered conditions, damage a secondary target, replace the damage formula for a niche non-creature target, or grant an attack option without a bonus of its own)', () => {
  const excludedIds = [
    'secret-of-steel-shattering-spirit', 'shaitan-skin', 'shrapnel-strike', 'sickening-critical',
    'silent-kill', 'skalds-vigor', 'snapping-turtle-shell', 'soulblade', 'soulwrecking-strike',
    'stunning-critical', 'stunning-fist', 'throw-back-arrows', 'twin-thunders-master',
    'voracious-blade', 'whip-slinger',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 36: Tengu Raven Form was deferred, not added -- it is a whole alternate polymorph form (like Wild Shape) that replaces the character\'s natural attacks entirely, not just an ability-score buff', () => {
  assert.equal(countId(html, 'tengu-raven-form'), 0);
});

test('Batch 36: no newly added entry is mirrored into companion/index.html', () => {
  for (const id of BATCH_36_ADDED_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
