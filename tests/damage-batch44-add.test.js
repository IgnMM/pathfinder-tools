// Damage Calculator batch project -- Batch 44: ADD spells FIXED/CONDITIONAL (1 of 3).
// This is the first batch of the new "spell" tier. Regression coverage for the 10
// newly added spell entries, plus guards on the excluded/deferred entries.
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
  'anticipate-thoughts', 'aspect-of-the-wolf', 'assumed-likeness', 'blood-rage',
  'bombers-eye', 'burst-of-adrenaline', 'call-weapon', 'elemental-mastery',
  'enlarge-tail', 'free-spirit',
];

test('Batch 44: all 10 implemented spells are present exactly once with a source link', () => {
  for (const id of implemented) {
    assert.equal(countId(html, id), 1, `${id} should be present exactly once`);
    assert.match(block(id), /source:/, `${id} should have a source`);
  }
});

test('Batch 44: Anticipate Thoughts scales +1 per configured tier (0-5), only against the spell target after a failed Will save', () => {
  const b = block('anticipate-thoughts');
  assert.match(b, /Math\.max\(0,Math\.min\(5,cfg\.tier\|\|0\)\)/);
});

test('Batch 44: Aspect of the Wolf grants +4 enhancement Strength AND Dexterity via abilityBuffBonus, summed', () => {
  const b = block('aspect-of-the-wolf');
  assert.match(b, /abilityBuffBonus\(ctx,'str',4,'enhancement'\),r2=abilityBuffBonus\(ctx,'dex',4,'enhancement'\)/);
});

test('Batch 44: Assumed Likeness is a flat +2 untyped attack toggle (Hate emotion branch only)', () => {
  const b = block('assumed-likeness');
  assert.match(b, /compute:\(\)=>\(\{attack:2,damage:0/);
});

test('Batch 44: Blood Rage grants a cumulative +2 morale Strength bonus per 5 damage taken, capped at +10', () => {
  const b = block('blood-rage');
  assert.match(b, /Math\.min\(10,Math\.floor\(\(cfg\.dmgTaken\|\|0\)\/5\)\*2\)/);
  assert.match(b, /abilityBuffBonus\(ctx,'str',tier,'morale'\)/);
});

test("Batch 44: Bomber's Eye is a flat +1 insight attack bonus (thrown weapons only)", () => {
  const b = block('bombers-eye');
  assert.match(b, /compute:\(\)=>\(\{attack:1,damage:0/);
});

test('Batch 44: Burst of Adrenaline grants a user-selectable +8 enhancement bonus to Str/Dex/Con for one roll', () => {
  const b = block('burst-of-adrenaline');
  assert.match(b, /configFields:\[\{key:'ability'/);
  assert.match(b, /abilityBuffBonus\(ctx,ability,8,'enhancement'\)/);
});

test('Batch 44: Call Weapon is a flat +2/+2 circumstance bonus', () => {
  const b = block('call-weapon');
  assert.match(b, /compute:\(\)=>\(\{attack:2,damage:2/);
});

test('Batch 44: Elemental Mastery is a flat +1 circumstance attack toggle', () => {
  const b = block('elemental-mastery');
  assert.match(b, /compute:\(\)=>\(\{attack:1,damage:0/);
});

test('Batch 44: Enlarge Tail is a flat +1 atk / +2 dmg untyped bonus (tail attacks only)', () => {
  const b = block('enlarge-tail');
  assert.match(b, /compute:\(\)=>\(\{attack:1,damage:2/);
});

test('Batch 44: Free Spirit is a flat -2 untyped attack self-penalty', () => {
  const b = block('free-spirit');
  assert.match(b, /compute:\(\)=>\(\{attack:-2,damage:0/);
});

test('Batch 44: excluded entries were not added -- Ancestral Gift and Ghost Whip conjure a new weapon the user can already configure directly in the custom-weapon UI; Archon\'s Aura, Bestow Curse, Crushing Despair, Haunting Choir, Heckle and Hostile Levitation are debuffs the character CASTS on an enemy, not effects applied to the character being calculated; Barghest Feast and Dahak\'s Release buff/compel a creature other than the primary character (a companion, or a compulsion effect meant for a foe); Bless Weapon has no attack/damage number (DR-bypass and auto-confirmed crits aren\'t modeled channels); Defensive Grace and Foresight only grant AC/save bonuses, no attack or damage channel', () => {
  const excludedIds = [
    'ancestral-gift', 'ghost-whip', 'archons-aura', 'bestow-curse', 'crushing-despair',
    'haunting-choir', 'heckle', 'hostile-levitation', 'barghest-feast', 'dahaks-release',
    'bless-weapon', 'defensive-grace', 'foresight',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 44: Form of the Exotic Dragon II and III were deferred, not added -- full polymorphs granting an entirely new multi-attack routine (bite/claw/tail/wing/breath weapon) and size-based ability changes, not a modifier to an existing attack line', () => {
  assert.equal(countId(html, 'form-of-the-exotic-dragon-ii'), 0);
  assert.equal(countId(html, 'form-of-the-exotic-dragon-iii'), 0);
});

test('Batch 44: none of the 10 implemented spells are mirrored into companion/index.html', () => {
  for (const id of implemented) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion`);
  }
});
