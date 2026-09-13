// Run with: node --test tests/companion-ability-lines.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

function functionSource(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists in companion calculator`);
  const open = html.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    else if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

function productionMath(profile) {
  const context = {
    currentProfile: () => profile,
    MODIFIERS: [{id: 'animal-growth'}],
    modifierAppliesToCurrentEntity: () => true
  };
  vm.createContext(context);
  vm.runInContext(
    `${functionSource('finalAbilityMods')}\n${functionSource('abilityModForAttackLine')}`,
    context
  );
  return context;
}

test("Cat's Grace follows each attack line, not the global attack selector", () => {
  const math = productionMath({
    active: [{ id: 'cats-grace', on: true, cfg: { value: 4 } }]
  });
  const finalMods = math.finalAbilityMods({
    str: 3, dex: 3, con: 0, int: 0, wis: 0, cha: 0,
    // These deliberately stay Strength: they are bulk UI defaults, not calculation gates.
    atkStat: 'str', dmgStat: 'str'
  });

  assert.equal(math.abilityModForAttackLine(finalMods, 'str'), 3);
  assert.equal(math.abilityModForAttackLine(finalMods, 'dex'), 5);
  assert.equal(math.abilityModForAttackLine(finalMods, 'none'), 0);
});

test('ability buffs are applied once before an individual damage multiplier', () => {
  const math = productionMath({
    active: [{ id: 'bulls-strength', on: true, cfg: { value: 4 } }]
  });
  const finalMods = math.finalAbilityMods({str: 4, dex: 2, con: 0, int: 0, wis: 0, cha: 0});

  assert.equal(math.abilityModForAttackLine(finalMods, 'str'), 6);
  assert.equal(Math.floor(math.abilityModForAttackLine(finalMods, 'str') * 1.5), 9);
  assert.equal(math.abilityModForAttackLine(finalMods, 'best-str-dex'), 6);
});
