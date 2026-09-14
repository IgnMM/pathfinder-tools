// Run with: node --test tests/razmiran-early-spell-access.test.js
// Regression coverage for docs/claude-brief-razmiran-early-spell-access.md:
// - Razmiran Priest's Aid/Remove Disease are known early but not castable early,
//   and no longer double-grant the replaced bloodline spells.
// - bloodlineOnly spells are only visible/selectable in the Sorcerer spellbook for
//   the currently selected bloodline.
// - Unlettered Arcanist excludes all patron-only Witch spells (not just the ones
//   that happened to be flagged in its addedSpells delta).
// - Harrowed Society Student's invalid fixed 4th-level Divination grant is removed.
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

function reconstruct(base, archetype) {
  const map = new Map(base.map(s => [keyOf(s), s]));
  for (const s of (archetype.addedSpells || [])) map.set(keyOf(s), s);
  for (const k of (archetype.removedKeys || [])) map.delete(k);
  return map;
}

function readHtml(dir) { return fs.readFileSync(path.join(root, dir, 'index.html'), 'utf8'); }

test('Razmiran: Aid/Remove Disease carry explicit, data-driven early-known grant records', () => {
  for (const dir of ['sorcerer', 'wizard-sorcerer-library']) {
    const archetypes = extractJsonConst(readHtml(dir), 'ARCHETYPES');
    const rp = archetypes['Razmiran Priest'];
    assert.ok(rp, `${dir}: Razmiran Priest archetype missing`);
    const byName = new Map(rp.addedSpells.map(s => [s.n, s]));
    const aid = byName.get('Aid');
    const rd = byName.get('Remove Disease');
    assert.ok(aid && rd, `${dir}: Aid/Remove Disease missing from Razmiran addedSpells`);
    assert.equal(aid.l, 2, `${dir}: Aid must stay a 2nd-level spell`);
    assert.equal(aid.grantCharacterLevel, 3, `${dir}: Aid must be known at character level 3`);
    assert.equal(aid.replacesBloodlineSpellLevel, 1, `${dir}: Aid replaces the bloodline's 1st bonus spell`);
    assert.equal(aid.reviewedEarlyKnown, true, `${dir}: Aid must be marked reviewedEarlyKnown`);
    assert.equal(aid.castabilityPolicy, 'normalClassSlots', `${dir}: Aid must use normal class slots to cast`);
    assert.equal(rd.l, 3, `${dir}: Remove Disease must stay a 3rd-level spell`);
    assert.equal(rd.grantCharacterLevel, 5, `${dir}: Remove Disease must be known at character level 5`);
    assert.equal(rd.replacesBloodlineSpellLevel, 2, `${dir}: Remove Disease replaces the bloodline's 2nd bonus spell`);
    assert.equal(rd.reviewedEarlyKnown, true, `${dir}: Remove Disease must be marked reviewedEarlyKnown`);
    assert.equal(rd.castabilityPolicy, 'normalClassSlots', `${dir}: Remove Disease must use normal class slots to cast`);
  }
});

test('Razmiran: sorcerer.html implements early-known-but-not-auto-castable logic (no lower slot, no special counter)', () => {
  const html = readHtml('sorcerer');
  assert.match(html, /function razmiranGrant\(l,name\)\{/, 'razmiranGrant helper missing');
  assert.match(html, /function isRazmiranAutoKnown\(l,name\)\{/, 'isRazmiranAutoKnown helper missing');
  // The replaced bloodline grant (levels 1 and 2, i.e. the 3rd/5th character-level bonus
  // spells) must be suppressed while Razmiran Priest is selected, driven by data
  // (replacesBloodlineSpellLevel), not a hardcoded archetype name check inside the gate.
  assert.match(html, /replacesBloodlineSpellLevel===l/, 'bloodline-spell suppression must be data-driven per replacesBloodlineSpellLevel');
  // Aid/Remove Disease must never be toggle-able as a manual known choice.
  assert.match(html, /if\(bloodGranted\|\|razGrantRec\)return;/, 'Razmiran grants must not be manually togglable / must not consume a manual known-spell choice');
  // knownCount (the manual spells-known allowance) must exclude both bloodline and
  // Razmiran auto-grants so they never count against the normal limit.
  assert.match(html, /function knownCount\(l\)\{return Object\.keys\(state\.known\)\.filter\(k=>\{[^}]*isBloodlineSpell\(kl,name\)\)return false;if\(isRazmiranAutoKnown\(kl,name\)\)return false;/, 'knownCount must exclude bloodline and Razmiran auto-grants');
  // No new special-use counter, decremented lower-level slot, or override UI was added:
  // castability must still flow entirely through the existing generic canCast()/forbidden/
  // allowed mechanism, with only the reason text made explicit for this case.
  assert.match(html, /Known early from Razmiran Priest/, 'reasonsFor must explain the early-known/non-castable state');
});

test('Sorcerer spellbook: bloodlineOnly spells are filtered to the selected bloodline before display', () => {
  const html = readHtml('sorcerer');
  assert.match(
    html,
    /function currentSpells\(\)\{let a=ARCHETYPES\[state\.archetype\];let base=SPELLS\.filter\(s=>!s\.bloodlineOnly\|\|isBloodlineSpell\(s\.l,s\.n\)\);/,
    'currentSpells must exclude bloodlineOnly spells that are not the selected bloodline\'s own grant'
  );
  const spells = extractJsonConst(html, 'SPELLS');
  const bloodlineOnly = spells.filter(s => s.bloodlineOnly === true);
  assert.equal(bloodlineOnly.length, 77, 'unexpected bloodlineOnly pool size in sorcerer/index.html');
});

test('Unlettered Arcanist excludes every patron-only Witch spell (1257 -> 1156)', () => {
  const witchSpells = extractJsonConst(readHtml('witch-library'), 'SPELLS');
  const patronOnlyKeys = new Set(witchSpells.filter(s => s.patronOnly).map(keyOf));
  assert.equal(patronOnlyKeys.size, 101, 'unexpected patronOnly pool size in witch-library');

  for (const dir of ['arcanist', 'arcanist-library']) {
    const spells = extractJsonConst(readHtml(dir), 'SPELLS');
    const archetypes = extractJsonConst(readHtml(dir), 'ARCHETYPES');
    const ua = archetypes['Unlettered Arcanist'];
    assert.ok(ua, `${dir}: Unlettered Arcanist archetype missing`);
    const effective = reconstruct(spells, ua);
    assert.equal(effective.size, 1156, `${dir}: Unlettered Arcanist effective spell count changed`);
    const stillPatron = [...effective.keys()].filter(k => patronOnlyKeys.has(k));
    assert.deepEqual(stillPatron, [], `${dir}: Unlettered Arcanist still contains patron-only spells`);
    const flaggedInDelta = (ua.addedSpells || []).filter(s => s.patronOnly === true);
    assert.deepEqual(flaggedInDelta, [], `${dir}: Unlettered Arcanist addedSpells must not carry patronOnly entries`);
  }
});

test('Harrowed Society Student no longer carries the invalid fixed 4th-level Divination grant', () => {
  for (const dir of ['arcanist', 'arcanist-library']) {
    const archetypes = extractJsonConst(readHtml(dir), 'ARCHETYPES');
    const hss = archetypes['Harrowed Society Student'];
    assert.ok(hss, `${dir}: Harrowed Society Student archetype missing`);
    assert.deepEqual(hss.addedSpells, [], `${dir}: Harrowed Society Student must not have a fixed spell grant`);
  }
});

test('Unlettered Arcanist and Harrowed Society Student stay in sync between Spellbook and Library', () => {
  for (const archName of ['Unlettered Arcanist', 'Harrowed Society Student']) {
    const bookAr = extractJsonConst(readHtml('arcanist'), 'ARCHETYPES')[archName];
    const libAr = extractJsonConst(readHtml('arcanist-library'), 'ARCHETYPES')[archName];
    const bookSpells = extractJsonConst(readHtml('arcanist'), 'SPELLS');
    const libSpells = extractJsonConst(readHtml('arcanist-library'), 'SPELLS');
    const bookKeys = [...reconstruct(bookSpells, bookAr).keys()].sort();
    const libKeys = [...reconstruct(libSpells, libAr).keys()].sort();
    assert.deepEqual(bookKeys, libKeys, `${archName}: Spellbook/Library reconstructed membership diverged`);
  }
});
