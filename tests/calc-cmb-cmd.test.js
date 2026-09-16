// Run with: node --test tests/calc-cmb-cmd.test.js
// Coverage for calc/index.html's CMB/CMD results and the Size field (added next to
// Race, with the same auto-follow/lock "padlock" pattern already used for Sources):
// CMB = BAB + Strength modifier + special size modifier (Dexterity instead of Strength
// for Tiny or smaller). CMD = 10 + BAB + Strength modifier + Dexterity modifier + special
// size modifier. Enlarge Person / Animal Growth (actual size increases) temporarily shift
// the effective size used for the size modifier up one category.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');

function extractConst(name) {
  const start = html.indexOf('const ' + name + '=');
  assert.ok(start >= 0, `const ${name} must exist in calc/index.html`);
  const end = html.indexOf(';', start) + 1; // just ';' -- robust to CRLF vs LF line endings
  // vm.runInContext with a top-level `const` does NOT attach it as a property on the
  // context object (a documented Node vm quirk) -- rewritten to `var` so later
  // runInContext calls against the same context (e.g. computeCMBCMD's own body) can see it.
  return 'var ' + html.slice(start, end).slice('const '.length);
}

function extractFn(name) {
  const fnStart = html.indexOf('function ' + name + '(');
  assert.ok(fnStart >= 0, `function ${name} must exist in calc/index.html`);
  const fnEnd = html.indexOf('\n}', fnStart) + 2;
  return html.slice(fnStart, fnEnd);
}

// vm.createContext runs code in a separate V8 realm, so plain objects it creates have a
// different Object.prototype than this file's -- deepEqual treats that as "not
// reference-equal" even with identical content. A JSON round-trip normalizes both.
function plain(v) { return JSON.parse(JSON.stringify(v)); }

function buildContext() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(extractConst('SIZE_ORDER'), context);
  vm.runInContext(extractConst('SIZE_MOD'), context);
  vm.runInContext(extractConst('RACE_DEFAULT_SIZE'), context);
  vm.runInContext(extractFn('computeCMBCMD'), context);
  vm.runInContext(extractFn('applyRaceSizeDefault'), context);
  return context;
}

function ctx(overrides) {
  return Object.assign({ bab: 10, str: 5, dex: 1, _finalAbilityMods: {} }, overrides);
}
function profile(overrides) {
  return Object.assign({ size: 'Medium', sizeCustomized: false, race: '', active: [] }, overrides);
}

test('SIZE_MOD matches the reference table exactly (opposite sign from the normal attack/AC size modifier)', () => {
  const context = buildContext();
  assert.deepEqual(plain(context.SIZE_MOD), { Fine: -8, Diminutive: -4, Tiny: -2, Small: -1, Medium: 0, Large: 1, Huge: 2, Gargantuan: 4, Colossal: 8 });
});

test('CMB/CMD base formula: BAB + Strength modifier (+Dex modifier for CMD) + size modifier, Medium size', () => {
  const context = buildContext();
  const result = context.computeCMBCMD(ctx({ bab: 10, str: 5, dex: 1 }), profile({ size: 'Medium' }));
  assert.equal(result.cmb, 15, 'BAB 10 + Str mod 5 + size mod 0 = 15');
  assert.equal(result.cmd, 26, '10 + BAB 10 + Str mod 5 + Dex mod 1 + size mod 0 = 26');
});

test('a Large character gets a POSITIVE size modifier to CMB/CMD (opposite of the normal attack-roll size penalty)', () => {
  const context = buildContext();
  const result = context.computeCMBCMD(ctx({ bab: 10, str: 5, dex: 1 }), profile({ size: 'Large' }));
  assert.equal(result.cmb, 16, 'BAB 10 + Str mod 5 + size mod +1 = 16');
  assert.equal(result.cmd, 27);
});

test('Tiny or smaller: CMB uses the Dexterity modifier instead of Strength; CMD is unaffected (already uses both)', () => {
  const context = buildContext();
  const result = context.computeCMBCMD(ctx({ bab: 10, str: 5, dex: 1 }), profile({ size: 'Tiny' }));
  assert.equal(result.usedDexForCmb, true);
  assert.equal(result.cmb, 9, 'BAB 10 + Dex mod 1 + size mod -2 = 9 (Str mod is NOT used)');
  assert.equal(result.cmd, 24, '10 + BAB 10 + Str mod 5 + Dex mod 1 + size mod -2 = 24 (CMD always uses both)');
});

test('Small size (not Tiny) still uses Strength for CMB -- the Dex swap only applies at Tiny or smaller', () => {
  const context = buildContext();
  const result = context.computeCMBCMD(ctx({ bab: 10, str: 5, dex: 1 }), profile({ size: 'Small' }));
  assert.equal(result.usedDexForCmb, false);
  assert.equal(result.cmb, 14, 'BAB 10 + Str mod 5 + size mod -1 = 14');
});

test('Enlarge Person active shifts the effective size up one category for CMB/CMD (on top of whatever base size is set)', () => {
  const context = buildContext();
  const result = context.computeCMBCMD(
    ctx({ bab: 10, str: 5, dex: 1 }),
    profile({ size: 'Medium', active: [{ id: 'enlarge-person', on: true }] })
  );
  assert.equal(result.effSize, 'Large');
  assert.equal(result.sizeUpActive, true);
  assert.equal(result.cmb, 16, 'size mod now +1 (Large) instead of 0 (Medium)');
});

test('Enlarge Person ALSO feeds its Strength/Dexterity score changes into CMB/CMD via ctx._finalAbilityMods, regardless of the selected atk/dmg ability', () => {
  const context = buildContext();
  // Enlarge Person: +2 size bonus to Str (modifier +1), -2 size penalty to Dex (modifier -1) --
  // this is what resolveAbilityComposites would have already computed into _finalAbilityMods
  // by the time computeCMBCMD runs, independent of the character's chosen atkStat/dmgStat.
  const result = context.computeCMBCMD(
    ctx({ bab: 10, str: 5, dex: 1, _finalAbilityMods: { str: 6, dex: 0 } }),
    profile({ size: 'Medium', active: [{ id: 'enlarge-person', on: true }] })
  );
  assert.equal(result.cmb, 17, 'BAB 10 + FINAL Str mod 6 (not base 5) + size mod +1 (Large) = 17');
  assert.equal(result.cmd, 27, '10 + BAB 10 + final Str 6 + final Dex 0 + size mod +1 = 27');
});

test('Animal Growth also shifts the effective size up one category (an actual size increase, same as Enlarge Person)', () => {
  const context = buildContext();
  const result = context.computeCMBCMD(ctx({}), profile({ size: 'Medium', active: [{ id: 'animal-growth', on: true }] }));
  assert.equal(result.effSize, 'Large');
});

test('an INACTIVE Enlarge Person (on:false) does not shift size -- only a currently-active effect counts', () => {
  const context = buildContext();
  const result = context.computeCMBCMD(ctx({}), profile({ size: 'Medium', active: [{ id: 'enlarge-person', on: false }] }));
  assert.equal(result.effSize, 'Medium');
  assert.equal(result.sizeUpActive, false);
});

test('Strong Jaw (an "effective", not actual, size increase) must NOT shift CMB/CMD -- only enlarge-person/animal-growth do', () => {
  const context = buildContext();
  const result = context.computeCMBCMD(ctx({}), profile({ size: 'Medium', active: [{ id: 'strong-jaw', on: true }] }));
  assert.equal(result.effSize, 'Medium');
});

test('applyRaceSizeDefault: follows the race\'s default size while not customized', () => {
  const context = buildContext();
  const p = profile({ race: 'Gnome' });
  context.applyRaceSizeDefault(p);
  assert.equal(p.size, 'Small');
});

test('applyRaceSizeDefault: defaults to Medium for a race not in the curated map', () => {
  const context = buildContext();
  const p = profile({ race: 'Human' });
  context.applyRaceSizeDefault(p);
  assert.equal(p.size, 'Medium');
});

test('applyRaceSizeDefault: the padlock -- once sizeCustomized is true, race changes never override a manual size choice', () => {
  const context = buildContext();
  const p = profile({ race: 'Gnome', size: 'Tiny', sizeCustomized: true });
  context.applyRaceSizeDefault(p);
  assert.equal(p.size, 'Tiny', 'a manually-set size must survive even though Gnome would otherwise default to Small');
});

test('RACE_DEFAULT_SIZE is a curated, deliberately non-exhaustive map -- every value is a real SIZE_ORDER category', () => {
  const context = buildContext();
  for (const [race, size] of Object.entries(context.RACE_DEFAULT_SIZE)) {
    assert.ok(context.SIZE_ORDER.includes(size), `${race} -> ${size} must be a real size category`);
  }
});
