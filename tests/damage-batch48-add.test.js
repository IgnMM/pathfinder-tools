// Damage Calculator batch project -- Batch 48: ADD spells DYNAMIC (2 of 3).
// Regression coverage for the 6 newly added spell entries, plus guards on the
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
  return html.slice(start, nextEntry > 0 ? nextEntry : start + 1800);
}

const implemented = [
  'halfling-vengeance', 'iron-body', 'magic-siege-engine-greater', 'pesh-vigor',
  'resurgent-transformation', 'sense-vitals',
];

test('Batch 48: all 6 implemented spells are present exactly once with a source link', () => {
  for (const id of implemented) {
    assert.equal(countId(html, id), 1, `${id} should be present exactly once`);
    assert.match(block(id), /source:/, `${id} should have a source`);
  }
});

test('Batch 48: Halfling Vengeance adds nd6 precision damage via extraDice, n = 1 + floor((CL-3)/4), capped at 5', () => {
  const b = block('halfling-vengeance');
  assert.match(b, /Math\.min\(5,1\+Math\.floor\(Math\.max\(0,\(cfg\.cl\|\|3\)-3\)\/4\)\)/);
  assert.match(b, /extraDice:\{normal:n\+'d6'\}/);
});

test('Batch 48: Iron Body applies +6 enhancement Strength and -6 enhancement Dexterity via abilityBuffBonus, summed', () => {
  const b = block('iron-body');
  assert.match(b, /abilityBuffBonus\(ctx,'str',6,'enhancement'\)/);
  assert.match(b, /abilityBuffBonus\(ctx,'dex',-6,'enhancement'\)/);
});

test('Batch 48: Magic Siege Engine, Greater grants +1 atk/dmg per 4 CL, capped at +5', () => {
  assert.match(block('magic-siege-engine-greater'), /Math\.min\(5,Math\.floor\(\(cfg\.cl\|\|1\)\/4\)\)/);
});

test('Batch 48: Pesh Vigor caps the selectable Strength enhancement bonus at +8 below CL 15, exactly +10 at CL 15+ (matching the spell text\'s own anchor), min +2', () => {
  const b = block('pesh-vigor');
  assert.match(b, /let max=cl>=15\?10:Math\.min\(8,2\+2\*Math\.floor\(cl\/5\)\)/);
  assert.match(b, /Math\.max\(2,Math\.min\(max,cfg\.bonus\|\|2\)\)/);
});

test('Batch 48: Resurgent Transformation applies a flat +4 enhancement Strength via abilityBuffBonus', () => {
  assert.match(block('resurgent-transformation'), /abilityBuffBonus\(ctx,'str',4,'enhancement'\)/);
});

test('Batch 48: Sense Vitals adds nd6 precision damage via extraDice, n = 1 + floor((CL-1)/3), capped at 5, manufactured weapons only', () => {
  const b = block('sense-vitals');
  assert.match(b, /Math\.max\(1,Math\.min\(5,1\+Math\.floor\(\(\(cfg\.cl\|\|1\)-1\)\/3\)\)\)/);
  assert.match(b, /ctx\.weaponCategory!=='manufactured'/);
});

test('Batch 48: excluded entries were not added -- Golden Guise, Hollow Heroism (both), Howling Agony, Judgment Light, Lost Locale/Passage, Phantasmal Affliction, Resounding Clang and Sacred Space are debuffs the character casts on an enemy or an unwitting target\'s equipment; Holy Javelin and Shocking Grasp are one-off spell attack actions, not persistent modifiers; Ironskin, Liberating Command and Protective Spirit have no attack/damage channel (pure AC/skill/defensive effects); Ironwood is a crafting-only benefit; Shadow Projection has no clean attack/damage number (a Strength-drain touch attack, not modeled)', () => {
  const excludedIds = [
    'golden-guise', 'hollow-heroism', 'hollow-heroism-greater', 'holy-javelin',
    'howling-agony', 'ironskin', 'ironwood', 'judgment-light', 'liberating-command',
    'lost-locale', 'lost-passage', 'phantasmal-affliction', 'protective-spirit',
    'resounding-clang', 'sacred-space', 'shadow-projection', 'shocking-grasp',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 48: deferred entries were not added -- Mirror Strike needs a roll-behavior primitive (comparing one attack roll against two different ACs, halving damage on a double-hit) this engine lacks; Savage Maw grants an entirely new bite natural attack, matching the Monstrous Extremities precedent deferred in batch 45', () => {
  assert.equal(countId(html, 'mirror-strike'), 0);
  assert.equal(countId(html, 'savage-maw'), 0);
});

test('Batch 48: none of the 6 implemented spells are mirrored into companion/index.html', () => {
  for (const id of implemented) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion`);
  }
});
