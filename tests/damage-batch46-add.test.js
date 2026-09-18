// Damage Calculator batch project -- Batch 46: ADD spells FIXED/CONDITIONAL (3 of 3, final).
// This closes out the ADD spells FIXED/CONDITIONAL tier (batches 44-46).
// Regression coverage for the 3 newly added spell entries, plus guards on the
// excluded entries.
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
  return html.slice(start, nextEntry > 0 ? nextEntry : start + 1600);
}

const implemented = ['sensory-amplifier', 'sun-metal', 'threefold-aspect'];

test('Batch 46: all 3 implemented spells are present exactly once with a source link', () => {
  for (const id of implemented) {
    assert.equal(countId(html, id), 1, `${id} should be present exactly once`);
    assert.match(block(id), /source:/, `${id} should have a source`);
  }
});

test('Batch 46: Sensory Amplifier adds +2d6 damage via extraDice (not a flat multiplied number)', () => {
  assert.match(block('sensory-amplifier'), /extraDice:\{normal:'2d6'\}/);
});

test("Batch 46: Sun Metal adds +1d4 fire damage via extraDice (not a flat multiplied number)", () => {
  assert.match(block('sun-metal'), /extraDice:\{normal:'1d4'\}/);
});

test('Batch 46: Threefold Aspect applies the correct Str/Dex enhancement bonus/penalty per chosen aspect (young: +2 Dex only; adult: -2 Dex only; elderly: -2 Str and -2 Dex)', () => {
  const b = block('threefold-aspect');
  assert.match(b, /configFields:\[\{key:'aspect'/);
  assert.match(b, /if\(aspect==='young'\)\{rDex=abilityBuffBonus\(ctx,'dex',2,'enhancement'\);\}/);
  assert.match(b, /else if\(aspect==='adult'\)\{rDex=abilityBuffBonus\(ctx,'dex',-2,'enhancement'\);\}/);
  assert.match(b, /else if\(aspect==='elderly'\)\{rStr=abilityBuffBonus\(ctx,'str',-2,'enhancement'\);rDex=abilityBuffBonus\(ctx,'dex',-2,'enhancement'\);\}/);
});

test('Batch 46: excluded entries were not added -- Solidify Earth doubles an untracked "earth mastery" bonus (a multiplier on an unknown baseline, not a flat number); Stay the Hand and Weaken Powder are compulsion/sabotage debuffs the character casts on an enemy or an enemy\'s ammunition; Urgathoa\'s Beacon buffs UNDEAD attacking a marked creature, not the character\'s own attack', () => {
  const excludedIds = ['solidify-earth', 'stay-the-hand', 'weaken-powder', 'urgathoas-beacon'];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 46: none of the 3 implemented spells are mirrored into companion/index.html', () => {
  for (const id of implemented) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion`);
  }
});
