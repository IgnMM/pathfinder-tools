// Damage Calculator batch project -- Batch 45: ADD spells FIXED/CONDITIONAL (2 of 3).
// Regression coverage for the 8 newly added spell entries, plus guards on the
// excluded/deferred entries.
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

const implemented = [
  'hunters-howl', 'legendary-proportions', 'magic-siege-engine', 'mantle-of-calm',
  'natural-rhythm', 'psychonaut-manifestation', 'redcaps-touch', 'resounding-blow',
];

test('Batch 45: all 8 implemented spells are present exactly once with a source link', () => {
  for (const id of implemented) {
    assert.equal(countId(html, id), 1, `${id} should be present exactly once`);
    assert.match(block(id), /source:/, `${id} should have a source`);
  }
});

test("Batch 45: Hunter's Howl is a flat +2/+2 toggle (vs an affected creature only)", () => {
  assert.match(block('hunters-howl'), /compute:\(\)=>\(\{attack:2,damage:2/);
});

test('Batch 45: Legendary Proportions grants +6 size Strength via abilityBuffBonus', () => {
  assert.match(block('legendary-proportions'), /abilityBuffBonus\(ctx,'str',6,'size'\)/);
});

test('Batch 45: Magic Siege Engine is a flat +1/+1 enhancement bonus (siege weapons only)', () => {
  assert.match(block('magic-siege-engine'), /compute:\(\)=>\(\{attack:1,damage:1/);
});

test('Batch 45: Mantle of Calm is a flat -2 untyped attack self-penalty', () => {
  assert.match(block('mantle-of-calm'), /compute:\(\)=>\(\{attack:-2,damage:0/);
});

test('Batch 45: Natural Rhythm scales +1 damage per consecutive natural-attack hit (cap +5), natural attacks only, and no-ops on a manufactured weapon', () => {
  const b = block('natural-rhythm');
  assert.match(b, /Math\.max\(0,Math\.min\(5,cfg\.hits\|\|0\)\)/);
  assert.match(b, /ctx\.weaponCategory!=='natural'/);
});

test('Batch 45: Psychonaut Manifestation applies a +4/-2 alchemical pair to the selected ability and its fixed opposite (Str/Int, Dex/Wis, Con/Cha)', () => {
  const b = block('psychonaut-manifestation');
  assert.match(b, /pairs=\{str:'int',dex:'wis',con:'cha',int:'str',wis:'dex',cha:'con'\}/);
  assert.match(b, /abilityBuffBonus\(ctx,bonusAbility,4,'alchemical'\)/);
  assert.match(b, /abilityBuffBonus\(ctx,penaltyAbility,-2,'alchemical'\)/);
});

test("Batch 45: Redcap's Touch is a flat +2 damage bonus", () => {
  assert.match(block('redcaps-touch'), /compute:\(\)=>\(\{attack:0,damage:2/);
});

test('Batch 45: Resounding Blow adds +1d6 sonic damage via extraDice (not a flat multiplied number)', () => {
  const b = block('resounding-blow');
  assert.match(b, /extraDice:\{normal:'1d6'\}/);
});

test('Batch 45: excluded entries were not added -- Inflict Pain, Itching Curse, Jitterbugs, Miserable Pity, Nature\'s Exile, Paranoia, Pessimism, Pox Pustules and Retribution are debuffs the character casts on an ENEMY (or, for Nature\'s Exile, penalize an animal companion rather than the character); Ki Arrow is a one-off spell attack action, not a persistent modifier; Quick Change only denies the target\'s Dex bonus to AC, no attack/damage channel of its own', () => {
  const excludedIds = [
    'inflict-pain', 'itching-curse', 'jitterbugs', 'miserable-pity', 'natures-exile',
    'paranoia', 'pessimism', 'pox-pustules', 'retribution', 'ki-arrow', 'quick-change',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 45: deferred entries were not added -- Locate Weakness needs a roll-twice-take-highest crit-damage primitive this engine lacks; Monstrous Extremities and Pouncing Fury grant an entirely new attack (a secondary natural weapon; a post-charge full-attack with claws) needing a primitive this engine lacks; Ooze Form I/II/III are full polymorphs with new natural attacks and ability changes, matching the Form of the Exotic Dragon precedent deferred in batch 44', () => {
  const deferredIds = [
    'locate-weakness', 'monstrous-extremities', 'pouncing-fury',
    'ooze-form-i', 'ooze-form-ii', 'ooze-form-iii',
  ];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 45: none of the 8 implemented spells are mirrored into companion/index.html', () => {
  for (const id of implemented) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion`);
  }
});
