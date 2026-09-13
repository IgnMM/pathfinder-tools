// Run with: node --test tests/companion-familiar.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/familiar-presets-core.json'), 'utf8'));
const abilityMod = score => Math.floor((score - 10) / 2);

test('familiar presets reproduce their printed Strength damage dynamically', () => {
  for (const familiar of data.familiars) {
    for (const attack of familiar.attacks || []) {
      assert.equal(attack.baseDamageBonus, 0, `${familiar.name} ${attack.name} fixed bonus`);
      assert.equal(attack.damageAbility, 'str', `${familiar.name} ${attack.name} damage ability`);
      assert.equal(attack.strengthMultiplier, 1, `${familiar.name} ${attack.name} Strength multiplier`);
      assert.equal(
        attack.baseDamageBonus + Math.floor(abilityMod(familiar.abilities.str) * attack.strengthMultiplier),
        abilityMod(familiar.abilities.str),
        `${familiar.name} ${attack.name} unbuffed damage`
      );
    }
  }
});

test("Bull's Strength improves every familiar natural attack's damage by 2", () => {
  for (const familiar of data.familiars) {
    const before = abilityMod(familiar.abilities.str);
    const after = abilityMod(familiar.abilities.str + 4);
    assert.equal(after - before, 2, familiar.name);
  }
});

test('familiar attack rolls continue to use the better of Strength and Dexterity', () => {
  for (const familiar of data.familiars) {
    for (const attack of familiar.attacks || []) {
      assert.equal(attack.hitAbility, 'bestStrDex', `${familiar.name} ${attack.name}`);
    }
  }
});
