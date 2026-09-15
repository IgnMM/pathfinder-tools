// Run with: node --test tests/find-your-class-concept-parser.test.js
// Regression coverage for assets/find-your-class/concept-parser.js and
// concept-lexicon.json, implementing Find_Your_Class_UI_and_Onboarding_
// Handoff_v1.md's "MVP concept interpretation" section (implementation order
// step 1). Covers required tests 5-8.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets', 'find-your-class');
const FYC = require(path.join(dir, 'loader.js'));
const P = require(path.join(dir, 'concept-parser.js'));

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')); }

const criteriaDoc = readJson('criteria.json');
const criteriaIndex = FYC.indexCriteria(criteriaDoc);
const lexicon = readJson('concept-lexicon.json');

function parse(text) {
  const normalised = P.normaliseConceptText(text);
  const raw = P.findConceptSuggestions(normalised, lexicon);
  const merged = P.mergeConceptSuggestions(raw);
  return P.detectSuggestionConflicts(merged);
}

test('every lexicon entry references a real criterion, with the correct kind, and (for categorical) real closed values', () => {
  for (const entry of lexicon.entries) {
    for (const s of entry.suggestions) {
      const crit = criteriaIndex.get(s.criterionId);
      assert.ok(crit, `lexicon phrase "${entry.phrase}" references unknown criterion "${s.criterionId}"`);
      assert.equal(s.kind, crit.kind, `lexicon phrase "${entry.phrase}": kind mismatch for "${s.criterionId}"`);
      if (s.kind === 'categorical') {
        for (const v of s.values) assert.ok(crit.values.includes(v), `lexicon phrase "${entry.phrase}": unknown value "${v}" for "${s.criterionId}"`);
      }
      if (s.kind === 'capability') assert.ok(!('desiredPosition' in s), `lexicon phrase "${entry.phrase}": capability entries must not carry desiredPosition`);
      if (s.kind === 'directional') assert.ok('desiredPosition' in s, `lexicon phrase "${entry.phrase}": directional entries must carry desiredPosition`);
    }
  }
});

test('the lexicon covers every word/phrase the handoff explicitly requires', () => {
  const required = [
    'melee', 'ranged', 'archer', 'armour', 'shield', 'durable', 'protector',
    'weapon-user', 'martial', 'spellcaster', 'arcane', 'divine', 'nature magic',
    'offensive spells', 'area damage', 'single target', 'control', 'curses', 'buffs', 'healing', 'protection',
    'stealth', 'traps', 'social', 'charming', 'deceptive', 'intimidating', 'investigation', 'wilderness',
    'companion', 'animal companion', 'familiar', 'summons', 'no companion',
    'simple', 'beginner', 'tactical', 'complex', 'low bookkeeping',
    'spontaneous', 'prepared', 'no preparation',
    'oath', 'code', 'order', 'faith', 'deity', 'independent',
    'shapeshifter', 'natural weapons', 'mounted',
    'specialist', 'versatile', 'safe', 'risky', 'sustained', 'burst',
  ];
  const phrases = new Set(lexicon.entries.map(e => e.phrase));
  for (const phrase of required) assert.ok(phrases.has(phrase), `required phrase "${phrase}" missing from concept-lexicon.json`);
});

// ---------------------------------------------------------------------
// 5. Multi-word phrases win over conflicting single tokens
// ---------------------------------------------------------------------
test('5. parser prefers multi-word phrases over conflicting single tokens', () => {
  const raw = P.findConceptSuggestions(P.normaliseConceptText('I want an animal companion'), lexicon);
  const phrases = raw.map(s => s.sourcePhrase);
  assert.ok(phrases.every(p => p === 'animal companion'), `bare "companion" must not also fire once "animal companion" consumed the span, got: ${JSON.stringify(phrases)}`);
});

// ---------------------------------------------------------------------
// 6. Source phrase retained, origin inferred-unconfirmed
// ---------------------------------------------------------------------
test('6. parser records the triggering phrase and uses inferred-unconfirmed', () => {
  const raw = P.findConceptSuggestions(P.normaliseConceptText('a durable protector'), lexicon);
  assert.ok(raw.length >= 2);
  for (const s of raw) {
    assert.equal(s.origin, 'inferred-unconfirmed');
    assert.ok(typeof s.sourcePhrase === 'string' && s.sourcePhrase.length > 0);
  }
  const merged = P.mergeConceptSuggestions(raw);
  for (const s of merged) assert.ok(Array.isArray(s.sourcePhrase) && s.sourcePhrase.length > 0, 'merged suggestions must retain every triggering phrase');
});

// ---------------------------------------------------------------------
// 7. Never silently infers alignment, race, deity or conduct acceptance
// ---------------------------------------------------------------------
test('7. parser never silently infers alignment, race, deity requirement or conduct acceptance', () => {
  for (const entry of lexicon.entries) {
    for (const s of entry.suggestions) {
      assert.notEqual(s.criterionId, 'alignment');
      assert.notEqual(s.criterionId, 'race');
      assert.ok(!('deityRequired' in s), `phrase "${entry.phrase}" must not set a deity requirement`);
      assert.ok(!('conductPreferences' in s) && !('stance' in s), `phrase "${entry.phrase}" must not set a conduct stance`);
    }
  }
  // Run every required word through the pipeline too, end to end.
  const text = 'oath code order faith deity independent';
  const result = parse(text);
  const allText = JSON.stringify(result);
  assert.ok(!/"stance"|"deityRequired"|alignment|"race"/i.test(allText));
});

// ---------------------------------------------------------------------
// 8. Conflicting suggestions reach the confirmation UI (i.e. are returned as
// conflicts, not silently resolved)
// ---------------------------------------------------------------------
test('8. conflicting suggestions are surfaced, not silently resolved', () => {
  const result = parse('a melee ranged fighter who is simple but complex');
  const conflictIds = result.conflicts.map(c => c.criterionId).sort();
  assert.deepEqual(conflictIds, ['build-complexity', 'melee-ranged']);
  for (const c of result.conflicts) {
    assert.ok(c.options.length >= 2);
    const positions = c.options.map(o => o.desiredPosition);
    assert.equal(new Set(positions).size, positions.length, 'each conflicting option must propose a genuinely different value');
  }
  // A conflicting criterion must never also appear in `clean`.
  const cleanIds = result.clean.map(s => s.criterionId);
  for (const c of result.conflicts) assert.ok(!cleanIds.includes(c.criterionId));
});

test('non-conflicting suggestions from different phrases are combined into one entry per criterion', () => {
  const result = parse('a durable protector who is also durable in melee');
  const durability = result.clean.filter(s => s.criterionId === 'personal-durability');
  assert.equal(durability.length, 1, 'repeated non-conflicting mentions of the same criterion must combine into one suggestion');
});

test('normaliseConceptText lowercases, strips punctuation (keeping internal hyphens) and collapses whitespace', () => {
  assert.equal(P.normaliseConceptText('  A "Clever"   Weapon-User!!  '), 'a clever weapon-user');
});

test('an empty or whitespace-only concept produces no suggestions at all', () => {
  const result = parse('   ');
  assert.deepEqual(result.clean, []);
  assert.deepEqual(result.conflicts, []);
});
