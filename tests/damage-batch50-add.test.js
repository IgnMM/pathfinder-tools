// Damage Calculator batch project -- Batch 50: ADD spells ENGINE (1 of 4).
// This is the first batch of the new "spell" ENGINE tier. Regression coverage for the
// 5 newly added spell entries, plus guards on the excluded/deferred entries.
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

const implemented = ['alter-self', 'aspect-of-the-falcon', 'decapitate', 'desecrate', 'divine-power'];

test('Batch 50: all 5 implemented spells are present exactly once with a source link', () => {
  for (const id of implemented) {
    assert.equal(countId(html, id), 1, `${id} should be present exactly once`);
    assert.match(block(id), /source:/, `${id} should have a source`);
  }
});

test('Batch 50: Alter Self applies +2 size Dexterity (Small form) or +2 size Strength (Medium form) via abilityBuffBonus, per the chosen form', () => {
  const b = block('alter-self');
  assert.match(b, /configFields:\[\{key:'form'/);
  assert.match(b, /let ability=cfg\.form==='medium'\?'str':'dex';/);
  assert.match(b, /abilityBuffBonus\(ctx,ability,2,'size'\)/);
});

test('Batch 50: Aspect of the Falcon is a flat +1 competence ranged-attack bonus', () => {
  assert.match(block('aspect-of-the-falcon'), /compute:\(\)=>\(\{attack:1,damage:0/);
});

test('Batch 50: Decapitate adds +4d6 damage via extraDice (not a flat multiplied number)', () => {
  assert.match(block('decapitate'), /extraDice:\{normal:'4d6'\}/);
});

test("Batch 50: Desecrate is a +1/+2 profane toggle (doubled with the fixture checkbox), undead only", () => {
  const b = block('desecrate');
  assert.match(b, /configFields:\[\{key:'doubled'/);
  assert.match(b, /let v=cfg\.doubled\?2:1;/);
});

test('Batch 50: Divine Power grants +1 luck atk/dmg per 3 CL (min +1, cap +6) and hooks the shared extra-attack primitive via grantsExtraAttack', () => {
  const b = block('divine-power');
  assert.match(b, /Math\.min\(6,1\+Math\.floor\(Math\.max\(0,\(cfg\.cl\|\|1\)-1\)\/3\)\)/);
  assert.match(b, /grantsExtraAttack:true/);
});

test('Batch 50: excluded entries were not added -- Accursed Glare and Curse of Befouled Fortune impose a roll-twice-take-worse penalty on an ENEMY\'s roll; Baphomet\'s Blessing and Fleshcurdle are polymorph/debuff curses inflicted on an enemy; Coin Shot and Enemy Hammer are one-off spell attack actions, not persistent modifiers', () => {
  const excludedIds = [
    'accursed-glare', 'curse-of-befouled-fortune', 'baphomets-blessing',
    'fleshcurdle', 'coin-shot', 'enemy-hammer',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 50: deferred entries were not added -- Aspect of the Stag grants an entirely new AoO-triggered antler attack (matching the Monstrous Extremities precedent); Beast Shape I-IV, Elemental Body I and IV, and Fey Form I-III are full polymorphs with new natural attacks/ability changes, matching the Form of the Exotic Dragon precedent already deferred', () => {
  const deferredIds = [
    'aspect-of-the-stag',
    'beast-shape-i', 'beast-shape-ii', 'beast-shape-iii', 'beast-shape-iv',
    'elemental-body-i', 'elemental-body-iv',
    'fey-form-i', 'fey-form-ii', 'fey-form-iii',
  ];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 50: none of the 5 implemented spells are mirrored into companion/index.html', () => {
  for (const id of implemented) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion`);
  }
});
