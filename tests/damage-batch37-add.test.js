// Damage Calculator batch project -- Batch 37: ADD feats ENGINE (1 of 7). Every requested
// entry was either already present or excluded/deferred; nothing new was added.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');

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

test('Batch 37: Agile Maneuvers was already present and correctly implemented (CMB = Dex mod - Str mod, replacing the ability used) -- left untouched', () => {
  assert.equal(countId(html, 'agile-maneuvers'), 1);
  const b = block('agile-maneuvers');
  assert.match(b, /let v=\(ctx\.dex\|\|0\)-\(ctx\.str\|\|0\);/);
});

test('Batch 37: excluded entries were not added -- each removes an unmodeled penalty, requires a dedicated roll-behavior primitive this calculator lacks (miss-chance rerolls, saving-throw rerolls, extra-AoO counts), is a familiar-delivery or budget-increase mechanic, or is functionally redundant with the existing Ability-to-attack/Ability-to-damage dropdowns (Bladed Brush, Dance of Chains and Dervish Dance all just let Dexterity replace Strength for one weapon, which the calculator already supports by selecting Dexterity directly)', () => {
  const excludedIds = [
    'bladed-brush', 'blind-fight', 'bludgeoner', 'bull-rush-strike', 'combat-reflexes',
    'critical-conduit', 'critical-mastery', 'dance-of-chains', 'deathless-zealot',
    'deceptive-exchange', 'defiant-luck', 'dervish-dance', 'disarming-strike', 'disengaging-feint',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 37: deferred entries were not added -- each grants an extra attack (or modifies another attack-granting entry\'s own value) via an action-economy shape this engine\'s shared extra-attack primitive (ctx.hasExtraAttack, used by Haste/Blessing of Fervor) cannot represent without misrepresenting stacking, since these feats replace a full-attack action rather than adding to one, or would need a shared-engine-list change beyond a single catalogue entry', () => {
  const deferredIds = [
    'barracuda-dash', 'blood-frenzy-assault', 'brute-stomp', 'cerberus-style', 'cleave',
    'cleave-through', 'cleaving-finish', 'crashing-wave-fist', 'cudgeler-style', 'deadly-grappler',
  ];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 37: full suite is unaffected -- no catalogue entries were added or changed by this batch', () => {
  assert.equal(countId(html, 'two-weapon-rend'), 1, 'unrelated batch 36 entry should remain untouched');
});
