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

function spellbookDirectory(libraryName) {
  if (libraryName === 'wizard-sorcerer') return null;
  return libraryName;
}

function compareSibling(libraryName, base, migrated) {
  const sibling = spellbookDirectory(libraryName);
  if (!sibling) return [];
  const siblingPath = path.join(ROOT, sibling, 'index.html');
  if (!fs.existsSync(siblingPath)) return [];
  const source = fs.readFileSync(siblingPath, 'utf8');
  let siblingBase, siblingArchetypes;
  try {
    siblingBase = extractJsonConst(source, 'SPELLS').value;
    siblingArchetypes = extractJsonConst(source, 'ARCHETYPES').value;
  } catch (error) {
    return [{type: 'sibling-parse-error', detail: error.message}];
  }
  const issues = [];
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
    if (apply && migratedCount) fs.writeFileSync(file, source);
    report.files.push({
      name,
      archetypes: Object.keys(archetypes).length,
      migratedCount,
      beforeBytes,
      afterBytes,
      reductionBytes: beforeBytes - afterBytes,
      stats,
      siblingIssues
    });
  }
  const reportPath = path.join(ROOT, 'scripts', apply ? 'library-delta-migration-report.json' : 'library-delta-dry-run-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  for (const file of report.files) {
    console.log(`${file.name}: ${file.migratedCount}/${file.archetypes} migrated, ${file.beforeBytes} -> ${file.afterBytes}, sibling issues=${file.siblingIssues.length}`);
  }
  console.log(`Report: ${path.relative(ROOT, reportPath)}`);
}

run();
