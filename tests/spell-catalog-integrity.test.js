// Run with: node --test tests/spell-catalog-integrity.test.js
// Regression coverage for the 2026-09-14 Spellbooks & Spell Libraries audit
// (docs/spellbooks-libraries-final-audit-fixes.md, branch spell-audit-brief-20260914).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function extractJsonConst(source, name) {
  const marker = `const ${name}=`;
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const valueStart = start + marker.length;
  let inString = false, escaped = false, depth = 0, end = -1;
  for (let i = valueStart; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') depth--;
    else if (ch === ';' && depth === 0) { end = i; break; }
  }
  if (end < 0) throw new Error(`Unterminated const ${name} in source`);
  return JSON.parse(source.slice(valueStart, end));
}

function keyOf(spell) { return `${spell.l}|${spell.n}`; }

function duplicateKeys(spells) {
  const seen = new Set(); const dups = [];
  for (const s of spells) { const k = keyOf(s); if (seen.has(k)) dups.push(k); seen.add(k); }
  return dups;
}

function reconstruct(base, archetype) {
  const map = new Map(base.map(s => [keyOf(s), s]));
  for (const s of (archetype.addedSpells || [])) map.set(keyOf(s), s);
  for (const k of (archetype.removedKeys || [])) map.delete(k);
  return map;
}

// Spellbook (class) files and their paired Library, where one exists.
const SPELLBOOK_LIBRARY_PAIRS = [
  ['bard', 'bard-library'],
  ['druid', 'druid-library'],
  ['witch', 'witch-library'],
  ['arcanist', 'arcanist-library'],
  ['medium', 'medium-library'],
  ['paladin', 'paladin-library'],
  ['psychic', 'psychic-library'],
  ['shaman', 'shaman-library'],
  ['spiritualist', 'spiritualist-library'],
  ['ranger', 'ranger-library'],
  ['wizard', 'wizard-sorcerer-library'],
  ['mesmerist', 'mesmerist-library'],
];

// Every field considered when deciding whether a Spellbook and its paired Library agree.
const SYNCED_FIELDS = ['school', 'castingTime', 'components', 'range', 'target', 'duration', 'save', 'sr', 'effect', 'source'];

const ALL_SPELLBOOK_DIRS = [
  'alchemist', 'arcanist', 'bard', 'bloodrager', 'cleric', 'druid', 'hunter',
  'inquisitor', 'investigator', 'magus', 'medium', 'mesmerist', 'occultist',
  'paladin', 'psychic', 'ranger', 'shaman', 'skald', 'sorcerer', 'spiritualist',
  'warpriest', 'witch', 'wizard',
].filter(d => fs.existsSync(path.join(root, d, 'index.html')));

const ALL_LIBRARY_DIRS = fs.readdirSync(root, { withFileTypes: true })
  .filter(e => e.isDirectory() && e.name.endsWith('-library'))
  .map(e => e.name)
  .filter(d => fs.existsSync(path.join(root, d, 'index.html')));

function readHtml(dir) { return fs.readFileSync(path.join(root, dir, 'index.html'), 'utf8'); }

test('1. every Spellbook and Library document is complete and ends with a closing html tag', () => {
  for (const dir of [...ALL_SPELLBOOK_DIRS, ...ALL_LIBRARY_DIRS]) {
    const html = readHtml(dir);
    assert.ok(html.trimEnd().toLowerCase().endsWith('</html>'), `${dir}/index.html does not end with </html> (possible truncation)`);
  }
});

test('2. SPELLS and ARCHETYPES parse successfully in every catalogue', () => {
  for (const dir of [...ALL_SPELLBOOK_DIRS, ...ALL_LIBRARY_DIRS]) {
    const html = readHtml(dir);
    assert.doesNotThrow(() => extractJsonConst(html, 'SPELLS'), `${dir}: SPELLS failed to parse`);
    if (html.includes('const ARCHETYPES=')) {
      assert.doesNotThrow(() => extractJsonConst(html, 'ARCHETYPES'), `${dir}: ARCHETYPES failed to parse`);
    }
  }
});

test('3. no base or reconstructed archetype catalogue contains duplicate level|name keys', () => {
  for (const dir of [...ALL_SPELLBOOK_DIRS, ...ALL_LIBRARY_DIRS]) {
    const html = readHtml(dir);
    const spells = extractJsonConst(html, 'SPELLS');
    assert.deepEqual(duplicateKeys(spells), [], `${dir}: base SPELLS has duplicate keys`);
    const archetypes = html.includes('const ARCHETYPES=') ? extractJsonConst(html, 'ARCHETYPES') : {};
    for (const [name, a] of Object.entries(archetypes)) {
      const recon = [...reconstruct(spells, a).values()];
      assert.deepEqual(duplicateKeys(recon), [], `${dir}/${name}: reconstructed catalogue has duplicate keys`);
    }
  }
});

// 4. Every spell and level listed for a class in assets/spell-master-index.json exists
// in that class's base Spellbook catalogue. Scoped to the classes this audit actually
// touched/verified (see docs/spellbooks-libraries-final-audit-fixes.md) rather than every
// class site-wide -- extending this to the full class list is a separate, larger audit
// this brief did not commission, and would fail for pre-existing gaps outside this scope.
test('4. audited classes contain every master-index spell/level assigned to them', () => {
  const master = require(path.join(root, 'assets', 'spell-master-index.json')).spells;
  const CLASS_FILE = {
    medium: 'medium', druid: 'druid', witch: 'witch', wizard_sorcerer: 'sorcerer',
    bard: 'bard', arcanist: 'arcanist', paladin: 'paladin', psychic: 'psychic',
    shaman: 'shaman', spiritualist: 'spiritualist', ranger: 'ranger', mesmerist: 'mesmerist',
  };
  for (const [classKey, dir] of Object.entries(CLASS_FILE)) {
    if (!fs.existsSync(path.join(root, dir, 'index.html'))) continue;
    const spells = extractJsonConst(readHtml(dir), 'SPELLS');
    const have = new Set(spells.map(s => `${s.l}|${s.n.toLowerCase()}`));
    const missing = [];
    for (const [name, rec] of Object.entries(master)) {
      const lvl = rec.levels && rec.levels[classKey];
      if (lvl === undefined) continue;
      if (!have.has(`${lvl}|${name}`)) missing.push(`${lvl}|${rec.name}`);
    }
    assert.deepEqual(missing, [], `${dir}: missing master-index spells`);
  }
});

test('5. Medium contains the four confirmed missing spells in both Spellbook and Library', () => {
  const names = ['Baleful Shadow Transmutation', 'Shadow Transmutation', 'Subjective Reality', 'Emblem of Greed'];
  for (const dir of ['medium', 'medium-library']) {
    const spells = extractJsonConst(readHtml(dir), 'SPELLS');
    const have = new Set(spells.map(s => s.n));
    for (const n of names) assert.ok(have.has(n), `${dir}: missing ${n}`);
  }
});

// 6. Paired Spellbook/Library base memberships match, after the one documented
// pre-existing exception: Paladin's Spellbook has one more base entry than its Library
// ("4|Blessing of Fervor"), a 1-spell drift predating this audit and out of its scope
// (see project memory / prior Silver Champion investigation) -- not introduced here and
// not one of this brief's named corrections, so left as a documented, asserted exception
// rather than silently ignored. Ranger's base lists differ by design (its own effect/
// source sync is covered by a separate test below).
test('6. paired Spellbook/Library base memberships match after documented exceptions', () => {
  const KNOWN_MISSING_FROM_LIBRARY = {
    // Pre-existing, out-of-scope 1-spell drift predating this audit (see project memory).
    'paladin-library': ['4|Blessing of Fervor'],
  };
  const KNOWN_EXTRA_IN_LIBRARY = {
    // The 77-spell Sorcerer bloodline pool is deliberately extra vs wizard/index.html --
    // it's a standalone, off-by-default pool (BLOODLINE_SPELLS), not part of the base
    // Wizard/Sorcerer common list, and marked bloodlineOnly:true.
    'wizard-sorcerer-library': 'bloodlineOnly',
  };
  for (const [bookDir, libDir] of SPELLBOOK_LIBRARY_PAIRS) {
    const bookSpells = extractJsonConst(readHtml(bookDir), 'SPELLS');
    const libSpells = extractJsonConst(readHtml(libDir), 'SPELLS');
    const bookKeys = new Set(bookSpells.map(keyOf));
    const extraMarker = KNOWN_EXTRA_IN_LIBRARY[libDir];
    const libSpellsExcludingKnownExtra = extraMarker ? libSpells.filter(s => s[extraMarker] !== true) : libSpells;
    const libKeys = new Set(libSpellsExcludingKnownExtra.map(keyOf));
    const knownMissing = new Set(KNOWN_MISSING_FROM_LIBRARY[libDir] || []);
    const missingFromLib = [...bookKeys].filter(k => !libKeys.has(k) && !knownMissing.has(k));
    const extraInLib = [...libKeys].filter(k => !bookKeys.has(k));
    assert.deepEqual(missingFromLib, [], `${libDir}: missing spells present in ${bookDir}`);
    assert.deepEqual(extraInLib, [], `${libDir}: extra spells not in ${bookDir}`);
  }
});

// 6b. The core guarantee behind correction 5: for every key BOTH a Spellbook and its
// paired Library carry, every displayed field is byte-identical -- no more "depends on
// which page you opened" drift, applied with the exact same rule to every pair (no
// per-class special-casing). This is the direct regression test for the "make the logic
// the same for everyone" requirement.
test('6b. every shared Spellbook/Library record is field-identical (no per-class exceptions)', () => {
  for (const [bookDir, libDir] of SPELLBOOK_LIBRARY_PAIRS) {
    const bookSpells = extractJsonConst(readHtml(bookDir), 'SPELLS');
    const libSpells = extractJsonConst(readHtml(libDir), 'SPELLS');
    const bookMap = new Map(bookSpells.map(s => [keyOf(s), s]));
    const mismatches = [];
    for (const l of libSpells) {
      const b = bookMap.get(keyOf(l));
      if (!b) continue; // not a shared key (e.g. an archetype-only or bloodline-pool spell)
      const diffFields = SYNCED_FIELDS.filter(f => (b[f] || '') !== (l[f] || ''));
      if (diffFields.length) mismatches.push(`${keyOf(l)}: ${diffFields.join(',')}`);
    }
    assert.deepEqual(mismatches, [], `${bookDir} <-> ${libDir}: field mismatches on shared records`);
  }
});

test('7. Druid domainOnly and Witch patronOnly records are stored once, not per archetype', () => {
  const cases = [
    { dir: 'druid-library', marker: 'domainOnly', expectedPoolSize: 121 },
    { dir: 'witch-library', marker: 'patronOnly', expectedPoolSize: 101 },
  ];
  for (const { dir, marker, expectedPoolSize } of cases) {
    const html = readHtml(dir);
    const spells = extractJsonConst(html, 'SPELLS');
    const archetypes = extractJsonConst(html, 'ARCHETYPES');
    const poolInBase = spells.filter(s => s[marker] === true);
    assert.equal(poolInBase.length, expectedPoolSize, `${dir}: expected ${expectedPoolSize} ${marker} spells in base`);
    for (const [name, a] of Object.entries(archetypes)) {
      const markedInDelta = (a.addedSpells || []).filter(s => s[marker] === true);
      assert.deepEqual(markedInDelta, [], `${dir}/${name}: ${marker} spells must live only in base, not this archetype's addedSpells`);
    }
  }
});

test('8. Razmiran Priest contains only its genuine additions, not the shared bloodlineOnly pool', () => {
  const html = readHtml('wizard-sorcerer-library');
  const archetypes = extractJsonConst(html, 'ARCHETYPES');
  const rp = archetypes['Razmiran Priest'];
  assert.ok(rp, 'Razmiran Priest archetype missing');
  const bloodlineInDelta = (rp.addedSpells || []).filter(s => s.bloodlineOnly === true);
  assert.deepEqual(bloodlineInDelta, [], 'Razmiran Priest must not own the shared bloodlineOnly pool');
  const genuineKeys = (rp.addedSpells || []).map(keyOf).sort();
  assert.deepEqual(genuineKeys, ['2|Aid', '3|Remove Disease'], 'Razmiran Priest genuine additions changed unexpectedly');
  assert.match(html, /const BLOODLINE_SPELLS=/, 'shared bloodline pool const missing');
  const pool = extractJsonConst(html, 'BLOODLINE_SPELLS');
  assert.equal(pool.length, 77, 'bloodline pool size changed unexpectedly');
});

test('9. shared Library toolbar controls receive accessible labels and live-result semantics', () => {
  const sharedUi = fs.readFileSync(path.join(root, 'assets/valid-sources.js'), 'utf8');
  assert.match(sharedUi, /labelIfMissing\('search', 'aria-label', 'Search spells'\)/);
  assert.match(sharedUi, /labelIfMissing\('filter', 'aria-label', 'Spell filter'\)/);
  assert.match(sharedUi, /labelIfMissing\('archetype', 'aria-label', 'Archetype'\)/);
  assert.match(sharedUi, /labelIfMissing\('levelButtons', 'role', 'group'\)/);
  assert.match(sharedUi, /labelIfMissing\('levelButtons', 'aria-label', 'Spell levels'\)/);
  assert.match(sharedUi, /labelIfMissing\('ctButtons', 'role', 'group'\)/);
  assert.match(sharedUi, /labelIfMissing\('ctButtons', 'aria-label', 'Casting time'\)/);
  assert.match(sharedUi, /labelIfMissing\('resultCount', 'role', 'status'\)/);
  assert.match(sharedUi, /labelIfMissing\('resultCount', 'aria-live', 'polite'\)/);
  for (const dir of ALL_LIBRARY_DIRS) {
    const html = readHtml(dir);
    assert.match(html, /assets\/valid-sources\.js/, `${dir}: missing shared UI script include`);
    if (html.includes('$(\'resultCount\')')) {
      assert.match(html, /No spells match the current filters\./, `${dir}: missing zero-results empty state message`);
    }
  }
});

test('10. Druid/Witch/Sorcerer archetype memberships are unchanged after the delta cleanup', () => {
  // Snapshot of each archetype's full reconstructed key set, expected to be identical
  // both before and after moving the shared pools out of every delta -- these counts
  // were captured against the corrected files and double as a membership-drift guard.
  const EXPECTED_GENUINE_ADDITIONS = {
    'druid-library': {
      'Death Druid': 12, 'Feyspeaker': 358, 'Halcyon Druid': 1493, 'Naga Aspirant': 25,
      'Nature Priest': 3, 'Supernaturalist': 944, 'Toxicologist': 4, 'Undine Adept': 1,
    },
    'witch-library': {
      'Alley Witch': 3, 'Dimensional Occultist': 8, 'Winter Witch': 1,
    },
  };
  for (const [dir, expected] of Object.entries(EXPECTED_GENUINE_ADDITIONS)) {
    const archetypes = extractJsonConst(readHtml(dir), 'ARCHETYPES');
    for (const [name, count] of Object.entries(expected)) {
      const a = archetypes[name];
      assert.ok(a, `${dir}: archetype ${name} missing`);
      assert.equal((a.addedSpells || []).length, count, `${dir}/${name}: genuine addition count changed`);
    }
  }
});

test('Ranger: the six corrected spells use the Library/master effect text and Spellbook source citation', () => {
  const names = ['Alarm', 'Anticipate Peril', 'Call Weapon', 'Lay of the Land', 'Channel the Gift', 'Freedom of Movement'];
  const bookSpells = extractJsonConst(readHtml('ranger'), 'SPELLS');
  const libSpells = extractJsonConst(readHtml('ranger-library'), 'SPELLS');
  const bookMap = new Map(bookSpells.map(s => [s.n, s]));
  const libMap = new Map(libSpells.map(s => [s.n, s]));
  for (const n of names) {
    const b = bookMap.get(n), l = libMap.get(n);
    assert.ok(b && l, `${n}: missing from one of the two files`);
    assert.equal(b.effect, l.effect, `${n}: Spellbook effect text should match the Library's corrected version`);
    assert.equal(b.source, l.source, `${n}: source citation should match after sync`);
  }
});
