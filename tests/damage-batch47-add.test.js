// Damage Calculator batch project -- Batch 47: ADD spells DYNAMIC (1 of 3).
// This is the first batch of the new "spell" DYNAMIC tier (formulas that scale with
// caster level, with a stated cap). Regression coverage for the 10 newly added spell
// entries, plus guards on the excluded/deferred entries.
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
  return html.slice(start, nextEntry > 0 ? nextEntry : start + 1800);
}

const implemented = [
  'arodens-magic-army', 'blink', 'bristle', 'dance-of-a-hundred-cuts', 'elemental-touch',
  'empower-holy-water', 'fiery-body', 'forceful-strike', 'frightful-aspect',
  'glimpse-of-the-akashic',
];

test('Batch 47: all 10 implemented spells are present exactly once with a source link', () => {
  for (const id of implemented) {
    assert.equal(countId(html, id), 1, `${id} should be present exactly once`);
    assert.match(block(id), /source:/, `${id} should have a source`);
  }
});

test("Batch 47: Aroden's Magic Army grants +1 atk/dmg per 5 CL, capped at +4", () => {
  assert.match(block('arodens-magic-army'), /Math\.min\(4,Math\.floor\(\(cfg\.cl\|\|1\)\/5\)\)/);
});

test('Batch 47: Blink is a flat +2 untyped attack toggle', () => {
  assert.match(block('blink'), /compute:\(\)=>\(\{attack:2,damage:0/);
});

test('Batch 47: Bristle grants +1 damage per 3 CL (cap +5), natural attacks only, no-ops on a manufactured weapon', () => {
  const b = block('bristle');
  assert.match(b, /Math\.max\(0,Math\.min\(5,Math\.floor\(\(cfg\.cl\|\|1\)\/3\)\)\)/);
  assert.match(b, /ctx\.weaponCategory!=='natural'/);
});

test('Batch 47: Dance of a Hundred Cuts grants +1 atk/dmg per 3 CL (cap +5), melee only', () => {
  const b = block('dance-of-a-hundred-cuts');
  assert.match(b, /Math\.min\(5,Math\.floor\(\(cfg\.cl\|\|1\)\/3\)\)/);
  assert.match(b, /if\(ctx\.weaponRanged\)/);
});

test('Batch 47: Elemental Touch adds +1d6 damage via extraDice, unarmed/natural attacks only', () => {
  const b = block('elemental-touch');
  assert.match(b, /extraDice:\{normal:'1d6'\}/);
  assert.match(b, /ctx\.weaponCategory!=='unarmed'&&ctx\.weaponCategory!=='natural'/);
});

test('Batch 47: Empower Holy Water grants +1 dmg per CL (cap +10), undead target only', () => {
  const b = block('empower-holy-water');
  assert.match(b, /Math\.min\(10,cfg\.cl\|\|1\)/);
  assert.match(b, /ctx\.currentTarget==='undead'/);
});

test('Batch 47: Fiery Body grants +6 enhancement Dexterity via abilityBuffBonus, plus +3d6 fire dmg on unarmed attacks only', () => {
  const b = block('fiery-body');
  assert.match(b, /abilityBuffBonus\(ctx,'dex',6,'enhancement'\)/);
  assert.match(b, /ctx\.weaponCategory==='unarmed'\?\{normal:'3d6'\}/);
});

test('Batch 47: Forceful Strike adds nD4 force damage via extraDice, n = CL capped at 10 (min 1)', () => {
  const b = block('forceful-strike');
  assert.match(b, /Math\.max\(1,Math\.min\(10,cfg\.cl\|\|1\)\)/);
  assert.match(b, /extraDice:\{normal:n\+'d4'\}/);
});

test('Batch 47: Frightful Aspect grants +6 size Strength via abilityBuffBonus', () => {
  assert.match(block('frightful-aspect'), /abilityBuffBonus\(ctx,'str',6,'size'\)/);
});

test('Batch 47: Glimpse of the Akashic grants +1 circumstance atk/dmg per CL, uncapped per the spell text', () => {
  assert.match(block('glimpse-of-the-akashic'), /let v=Math\.max\(0,cfg\.cl\|\|0\)/);
});

test('Batch 47: excluded entries were not added -- Abyssal Vermin templates a vermin companion, not the primary character; Advanced Scurvy and Fleshwarping Swarm (both versions) and Drain Construct are debuffs cast on an enemy/construct, or have no attack channel; Battering Blast is a one-off spell attack action, not a persistent modifier; Bow Spirit and Ectoplasmic Hand summon a separate attacking entity, not a modifier to the character\'s own attack; Brow Gasher is a bleed/attack-penalty debuff cast on an enemy', () => {
  const excludedIds = [
    'abyssal-vermin', 'advanced-scurvy', 'battering-blast', 'bow-spirit', 'brow-gasher',
    'drain-construct', 'ectoplasmic-hand', 'fleshwarping-swarm', 'fleshwarping-swarm-drow',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 47: deferred entries were not added -- Elemental Body II/III and Form of the Dragon I/II/III are full polymorphs with new natural attacks and multi-branch ability-score changes, matching the Form of the Exotic Dragon / Ooze Form precedent deferred in earlier batches', () => {
  const deferredIds = [
    'elemental-body-ii', 'elemental-body-iii',
    'form-of-the-dragon-i', 'form-of-the-dragon-ii', 'form-of-the-dragon-iii',
  ];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 47: none of the 10 implemented spells are mirrored into companion/index.html', () => {
  for (const id of implemented) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion`);
  }
});
