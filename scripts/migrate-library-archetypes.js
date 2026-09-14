#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = [
  'summoner', 'shaman', 'bard', 'ranger', 'druid', 'magus', 'paladin',
  'alchemist', 'arcanist', 'bloodrager', 'inquisitor', 'occultist',
  'psychic', 'skald', 'spiritualist', 'witch', 'wizard-sorcerer',
  'investigator', 'mesmerist', 'warpriest', 'hunter', 'medium'
];

function extractJsonConst(source, name) {
  const marker = `const ${name}=`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${marker}`);
  const valueStart = start + marker.length;
  let inString = false;
  let escaped = false;
  let depth = 0;
  let end = -1;
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
    else if (ch === ';' && depth === 0) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error(`Unterminated ${name}`);
  return {
    start,
    end: end + 1,
    value: JSON.parse(source.slice(valueStart, end))
  };
}

const key = spell => `${spell.l}|${spell.n}`;
const json = value => JSON.stringify(value);

function duplicateKeys(spells) {
  const seen = new Set();
  const duplicates = [];
  for (const spell of spells) {
    const k = key(spell);
    if (seen.has(k)) duplicates.push(k);
    seen.add(k);
  }
  return duplicates;
}

function reconstruct(base, archetype) {
  const removed = new Set(archetype.removedKeys || []);
  const kept = base.filter(spell => !removed.has(key(spell)));
  return archetype.addedSpells ? kept.concat(archetype.addedSpells) : kept;
}

function canonicalSpellMap(spells) {
  return [...spells]
    .sort((a, b) => key(a).localeCompare(key(b)))
    .map(spell => [key(spell), spell]);
}

function migrateArchetypes(base, archetypes) {
  const baseByKey = new Map(base.map(spell => [key(spell), spell]));
  const migrated = {};
  const stats = [];
  for (const [name, archetype] of Object.entries(archetypes)) {
    if (!Array.isArray(archetype.spells)) {
      migrated[name] = archetype;
      stats.push({name, status: 'already-delta'});
      continue;
    }
    const oldSpells = archetype.spells;
    const oldByKey = new Map(oldSpells.map(spell => [key(spell), spell]));
    const removedKeys = base.filter(spell => !oldByKey.has(key(spell))).map(key);
    const addedSpells = oldSpells.filter(spell => !baseByKey.has(key(spell)));
    const staleSharedRecords = oldSpells.filter(spell => {
      const baseSpell = baseByKey.get(key(spell));
      return baseSpell && json(baseSpell) !== json(spell);
    }).length;
    const next = {source: archetype.source, note: archetype.note};
    for (const [field, value] of Object.entries(archetype)) {
      if (!['source', 'note', 'spells'].includes(field)) next[field] = value;
    }
    if (addedSpells.length) next.addedSpells = addedSpells;
    if (removedKeys.length) next.removedKeys = removedKeys;
    const rebuilt = reconstruct(base, next);
    const rebuiltKeys = rebuilt.map(key).sort();
    const oldKeys = oldSpells.map(key).sort();
    if (json(rebuiltKeys) !== json(oldKeys)) {
      throw new Error(`${name}: reconstructed spell membership is not identical to the old catalogue`);
    }
    migrated[name] = next;
    stats.push({
      name,
      status: 'migrated',
      before: oldSpells.length,
      added: addedSpells.length,
      removed: removedKeys.length,
      staleSharedRecords,
      storageOrderChanged: json(rebuilt) !== json(oldSpells)
    });
  }
  return {migrated, stats};
}

// The combined Wizard/Sorcerer Library has no single sibling: Worldseeker and Spell
// Sage are Wizard-only archetypes (compare against wizard/index.html), Razmiran
// Priest is Sorcerer-only (compare against sorcerer/index.html). Handled explicitly
// per-archetype below instead of silently skipping the whole library, as the audit
// brief (docs/spellbooks-libraries-final-audit-fixes.md) required.
const WIZARD_SORCERER_ARCHETYPE_SIBLING = {
  'Worldseeker': 'wizard',
  'Spell Sage': 'wizard',
  'Razmiran Priest': 'sorcerer',
};

function spellbookDirectory(libraryName) {
  if (libraryName === 'wizard-sorcerer') return null; // handled per-archetype, see above
  return libraryName;
}

// Known, documented pre-existing exceptions where a Library's base list legitimately
// differs from its Spellbook sibling's base list -- never silently absorbed, always
// asserted so a NEW, unexplained drift still gets reported.
const KNOWN_BASE_EXCEPTIONS = {
  // Paladin's Spellbook has one more base entry than its Library
  // ("4|Blessing of Fervor") -- a 1-spell drift predating this audit, out of its
  // scope; tracked in project memory rather than fixed here.
  paladin: { onlySpellbook: ['4|Blessing of Fervor'] },
};

function compareBaseMembership(libraryName, base, siblingDir) {
  const siblingPath = path.join(ROOT, siblingDir, 'index.html');
  if (!fs.existsSync(siblingPath)) return [];
  const source = fs.readFileSync(siblingPath, 'utf8');
  let siblingBase;
  try {
    siblingBase = extractJsonConst(source, 'SPELLS').value;
  } catch (error) {
    return [{type: 'sibling-base-parse-error', sibling: siblingDir, detail: error.message}];
  }
  const libKeys = new Set(base.map(key));
  const sibKeys = new Set(siblingBase.map(key));
  const exceptions = KNOWN_BASE_EXCEPTIONS[siblingDir] || {};
  const knownOnlySpellbook = new Set(exceptions.onlySpellbook || []);
  const knownOnlyLibrary = new Set(exceptions.onlyLibrary || []);
  const onlySpellbook = [...sibKeys].filter(k => !libKeys.has(k) && !knownOnlySpellbook.has(k));
  const onlyLibrary = [...libKeys].filter(k => !sibKeys.has(k) && !knownOnlyLibrary.has(k));
  if (!onlySpellbook.length && !onlyLibrary.length) return [];
  return [{type: 'base-membership-mismatch', sibling: siblingDir, onlySpellbook, onlyLibrary}];
}

// Flags a special-only pool (domainOnly/patronOnly/bloodlineOnly) that has leaked back
// into an archetype's own addedSpells instead of living once in the shared base/pool --
// exactly the class of bug corrections 2/3/4 fixed; kept as an ongoing regression check.
const SPECIAL_MARKERS = ['domainOnly', 'patronOnly', 'bloodlineOnly'];
function reportSpecialPoolLeakage(archetypes) {
  const issues = [];
  for (const [name, archetype] of Object.entries(archetypes)) {
    for (const marker of SPECIAL_MARKERS) {
      const leaked = (archetype.addedSpells || []).filter(s => s[marker] === true);
      if (leaked.length) {
        issues.push({type: 'special-pool-leakage', archetype: name, marker, count: leaked.length});
      }
    }
  }
  return issues;
}

function compareSibling(libraryName, base, migrated) {
  const issues = [];

  if (libraryName === 'wizard-sorcerer') {
    // Base membership: Wizard and Sorcerer share an identical common spell list per
    // RAW (verified 2026-09: wizard/index.html's 1885 base spells are byte-identical
    // to sorcerer/index.html's own 1885 non-bloodline spells) -- compare against
    // either; wizard/index.html is used here since it has no bloodlineOnly noise.
    issues.push(...compareBaseMembership(libraryName, base, 'wizard'));
    for (const [name, libraryArchetype] of Object.entries(migrated)) {
      const siblingDir = WIZARD_SORCERER_ARCHETYPE_SIBLING[name];
      if (!siblingDir) { issues.push({type: 'unmapped-archetype-sibling', archetype: name}); continue; }
      const siblingPath = path.join(ROOT, siblingDir, 'index.html');
      if (!fs.existsSync(siblingPath)) continue;
      const source = fs.readFileSync(siblingPath, 'utf8');
      let siblingArchetypes;
      try { siblingArchetypes = extractJsonConst(source, 'ARCHETYPES').value; }
      catch (error) { issues.push({type: 'sibling-parse-error', detail: error.message}); continue; }
      const siblingArchetype = siblingArchetypes[name];
      if (!siblingArchetype) continue;
      const libraryKeys = reconstruct(base, libraryArchetype).filter(s => !s.bloodlineOnly).map(key).sort();
      const siblingBase = extractJsonConst(source, 'SPELLS').value;
      const siblingKeys = reconstruct(siblingBase, siblingArchetype).map(key).sort();
      if (json(libraryKeys) !== json(siblingKeys)) {
        const libSet = new Set(libraryKeys), sibSet = new Set(siblingKeys);
        issues.push({
          type: 'library-spellbook-mismatch', archetype: name,
          onlyLibrary: libraryKeys.filter(k => !sibSet.has(k)),
          onlySpellbook: siblingKeys.filter(k => !libSet.has(k)),
        });
      }
    }
    return issues;
  }

  const sibling = spellbookDirectory(libraryName);
  if (!sibling) return issues;
  const siblingPath = path.join(ROOT, sibling, 'index.html');
  if (!fs.existsSync(siblingPath)) return issues;
  const source = fs.readFileSync(siblingPath, 'utf8');
  let siblingBase, siblingArchetypes;
  try {
    siblingBase = extractJsonConst(source, 'SPELLS').value;
    siblingArchetypes = extractJsonConst(source, 'ARCHETYPES').value;
  } catch (error) {
    return [{type: 'sibling-parse-error', detail: error.message}];
  }

  // Compare BASE Spellbook/Library membership too, not only archetype
  // reconstructions -- this is what would have caught corrections 1 and 5 sooner.
  issues.push(...compareBaseMembership(libraryName, base, sibling));

  for (const [name, libraryArchetype] of Object.entries(migrated)) {
    const siblingArchetype = siblingArchetypes[name];
    if (!siblingArchetype) continue;
    // Oath-only spells are selected through the paladin Spellbook's oath UI and
    // are deliberately absent from the generic Paladin Library catalogue.
    const libraryKeys = reconstruct(base, libraryArchetype).filter(s => !s.oathOnly).map(key).sort();
    const siblingKeys = reconstruct(siblingBase, siblingArchetype).filter(s => !s.oathOnly).map(key).sort();
    // Esoteric Starseeker exposes all constellation options in the Library,
    // while its Spellbook keeps them in a separate daily-attunement selector.
    if (libraryName === 'psychic' && name === 'Esoteric Starseeker') continue;
    if (json(libraryKeys) !== json(siblingKeys)) {
      const libSet = new Set(libraryKeys);
      const sibSet = new Set(siblingKeys);
      issues.push({
        type: 'library-spellbook-mismatch',
        archetype: name,
        onlyLibrary: libraryKeys.filter(k => !sibSet.has(k)),
        onlySpellbook: siblingKeys.filter(k => !libSet.has(k))
      });
    }
  }
  return issues;
}

function replaceCurrentSpells(source) {
  const oldPattern = /function currentSpells\(\)\{[^\n]*\}/;
  if (!oldPattern.test(source)) throw new Error('Missing one-line currentSpells()');
  const replacement = "function currentSpells(){let a=ARCHETYPES[store.archetype];if(!a)return SPELLS;let base=(a.removedKeys&&a.removedKeys.length)?SPELLS.filter(s=>!a.removedKeys.includes(s.l+'|'+s.n)):SPELLS;return a.addedSpells?base.concat(a.addedSpells):base;}";
  return source.replace(oldPattern, replacement);
}

function run() {
  const apply = process.argv.includes('--apply');
  const selectedArg = process.argv.find(arg => arg.startsWith('--only='));
  const selected = selectedArg ? selectedArg.slice(7).split(',') : TARGETS;
  const report = {generatedAt: new Date().toISOString(), apply, files: []};
  for (const name of selected) {
    const file = path.join(ROOT, `${name}-library`, 'index.html');
    const beforeBytes = fs.statSync(file).size;
    let source = fs.readFileSync(file, 'utf8');
    const spellsConst = extractJsonConst(source, 'SPELLS');
    const archetypesConst = extractJsonConst(source, 'ARCHETYPES');
    const base = spellsConst.value;
    const archetypes = archetypesConst.value;
    const baseDuplicates = duplicateKeys(base);
    if (baseDuplicates.length) throw new Error(`${name}: duplicate base keys: ${baseDuplicates.join(', ')}`);
    const {migrated, stats} = migrateArchetypes(base, archetypes);
    const migratedCount = stats.filter(item => item.status === 'migrated').length;
    if (migratedCount) {
      source = source.slice(0, archetypesConst.start) + `const ARCHETYPES=${json(migrated)};` + source.slice(archetypesConst.end);
      source = replaceCurrentSpells(source);
    }
    const afterBytes = Buffer.byteLength(source);
    const siblingIssues = compareSibling(name, base, migrated);
    // migrated is the OLD archetypes object unchanged for files with nothing to
    // migrate (status 'already-delta') -- still worth scanning for special-pool
    // leakage (domainOnly/patronOnly/bloodlineOnly) every run, not just once.
    const poolLeakageIssues = reportSpecialPoolLeakage(migrated);
    if (apply && migratedCount) fs.writeFileSync(file, source);
    report.files.push({
      name,
      archetypes: Object.keys(archetypes).length,
      migratedCount,
      beforeBytes,
      afterBytes,
      reductionBytes: beforeBytes - afterBytes,
      stats,
      siblingIssues,
      poolLeakageIssues
    });
  }
  const reportPath = path.join(ROOT, 'scripts', apply ? 'library-delta-migration-report.json' : 'library-delta-dry-run-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  for (const file of report.files) {
    console.log(`${file.name}: ${file.migratedCount}/${file.archetypes} migrated, ${file.beforeBytes} -> ${file.afterBytes}, sibling issues=${file.siblingIssues.length}, pool leakage=${file.poolLeakageIssues.length}`);
  }
  console.log(`Report: ${path.relative(ROOT, reportPath)}`);
}

run();
