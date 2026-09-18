// Damage Calculator batch project -- Batch 43: ADD feats ENGINE (7 of 7, final ENGINE batch).
// Regression coverage for the 1 newly added feat entry, plus guards on the
// excluded/deferred entries this batch reports.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

function countId(source, id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (source.match(re) || []).length;
}

function block(id) {
  const start = html.indexOf(`id:'${id}'`) >= 0 ? html.indexOf(`id:'${id}'`) : html.indexOf(`id:"${id}"`);
  assert.ok(start >= 0, `${id} must exist`);
  const nextEntry = html.indexOf('\n{id:', start + 5);
  return html.slice(start, nextEntry > 0 ? nextEntry : start + 1400);
}

test('Batch 43: Whispered Knowledge is present exactly once with a source link', () => {
  assert.equal(countId(html, 'whispered-knowledge'), 1);
  assert.match(block('whispered-knowledge'), /source:/);
});

test('Batch 43: Whispered Knowledge grants a +2 enhancement bonus to Strength or Intelligence via abilityBuffBonus, per the chosen secret', () => {
  const b = block('whispered-knowledge');
  assert.match(b, /configFields:\[\{key:'secret'/);
  assert.match(b, /let ability=cfg\.secret==='brains'\?'int':'str';/);
  assert.match(b, /abilityBuffBonus\(ctx,ability,2,'enhancement'\)/);
});

test('Batch 43: excluded entries were not added -- Weapon Finesse is functionally redundant with the calculator\'s existing Attack/Damage ability dropdowns (which cite Weapon Finesse itself as the worked example); Weapon Material Mastery and Weapon Trick are sprawling multi-branch feats with no single core attack/damage bonus (matching the Equipment Trick precedent); Whip Mastery only removes restrictions (AoO, armor bypass) with no bonus number; Wilding Strike is a weapon-die override the user can already set directly in the weapon UI (matching Improved/Greater Wilding Strike, excluded in prior batches); Wingclipper and Witty Feint have no attack/damage number of their own (anti-flight condition; AC dodge bonus tied to an untracked weapon-training baseline); Wounded Paw Gambit grants an ALLY an attack, not the character', () => {
  const excludedIds = [
    'weapon-finesse', 'weapon-material-mastery', 'weapon-trick', 'whip-mastery',
    'wilding-strike', 'wingclipper', 'witty-feint', 'wounded-paw-gambit',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 43: Whirlwind Attack was deferred, not added -- it replaces a full-attack action with one attack per adjacent foe, the same standard-action-replacement action-economy blocker as the Cleave family deferred in batch 37', () => {
  assert.equal(countId(html, 'whirlwind-attack'), 0);
});

test('Batch 43: Whispered Knowledge is not mirrored into companion/index.html', () => {
  assert.equal(countId(companionHtml, 'whispered-knowledge'), 0);
});
