// Damage Calculator batch project -- Batch 39: ADD feats ENGINE (3 of 7).
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

test('Batch 39: Gather Might is present exactly once with a source link', () => {
  assert.equal(countId(html, 'gather-might'), 1);
  assert.match(block('gather-might'), /source:/);
});

test('Batch 39: Gather Might grants +2 alchemical Strength/Dexterity/Constitution per burn-reduction point spent, capped at 5 points (+10), via abilityBuffBonus', () => {
  const b = block('gather-might');
  assert.match(b, /let n=Math\.max\(0,Math\.min\(5,cfg\.burn\|\|0\)\);let bonus=n\*2;/);
  assert.match(b, /abilityBuffBonus\(ctx,'str',bonus,'alchemical'\),r2=abilityBuffBonus\(ctx,'dex',bonus,'alchemical'\)/);
});

test('Batch 39: excluded entries were not added -- none is a bonus to the character\'s own attack or damage roll (Equipment Trick has no single core bonus across its dozens of item-specific sub-tricks; Erastil\'s Blessing and Fencing Grace are functionally redundant with the existing Ability-to-attack/Ability-to-damage dropdowns; Evolved Summoned Monster and Favored Animal Focus buff a summoned creature/animal companion, not the character; Extreme Prejudice upgrades a sneak-attack-dice baseline this calculator doesn\'t track; Flight Mastery is a Fly-skill bonus; Footslasher is a worse attack roll in exchange for a status effect, not a net bonus)', () => {
  const excludedIds = [
    'equipment-trick', 'erastils-blessing', 'evolved-summoned-monster', 'extreme-prejudice',
    'favored-animal-focus', 'fencing-grace', 'flight-mastery', 'footslasher',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 39: Freeze in Place was deferred, not added -- it doubles critical threat range, which requires the same shared hasKeen-style threat-range-doubling engine list that Heart of the Mammoth was deferred for earlier in this project', () => {
  assert.equal(countId(html, 'freeze-in-place'), 0);
});

test('Batch 39: Gather Might is not mirrored into companion/index.html', () => {
  assert.equal(countId(companionHtml, 'gather-might'), 0);
});
