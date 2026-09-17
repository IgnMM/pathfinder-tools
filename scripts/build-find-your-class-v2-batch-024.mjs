import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(repo, 'assets/find-your-class/v2');
const detailDir = path.join(repo, 'assets/find-your-class/aon-catalog/class-details');
const classes = ['samurai', 'shaman'];
const parents = ['01', '02', '03'].flatMap(n => JSON.parse(fs.readFileSync(path.join(dir, `class-profiles-batch-${n}.json`))).profiles);
const parentById = new Map(parents.map(x => [x.id, x]));
const details = new Map(classes.map(c => [c, JSON.parse(fs.readFileSync(path.join(detailDir, `${c}.json`))).profiles]));

const review = {};
for (const c of classes) { review[c] = {}; for (const x of details.get(c)) review[c][x.id.split(':')[1]] = { c: {}, p: {}, f: {}, a: {}, r: {}, enemy: {}, constraints: [], professionIdentity: [] }; }
function set(cls, names, d) {
  for (const name of names.split(' ')) {
    const e = review[cls][name];
    if (!e) throw new Error(`Unknown ${cls}:${name}`);
    for (const k of ['c', 'p', 'f', 'enemy']) if (d[k]) Object.assign(e[k], d[k]);
    for (const k of ['a', 'r']) for (const [field, v] of Object.entries(d[k] || {})) e[k][field] = [...new Set([...(e[k][field] || []), ...v])];
    if (d.constraints) e.constraints = e.constraints.concat(d.constraints);
    if (d.professionIdentity) e.professionIdentity = e.professionIdentity.concat(d.professionIdentity);
  }
}

// ---- Samurai (7) ----
set('samurai', 'brawling-blademaster', { f: { 'has-mount': false, 'controls-additional-entity': false }, a: { primaryDelivery: ['unarmed'] }, r: { primaryDelivery: ['companion'] } });
set('samurai', 'ironbound-sword', { c: { 'combat-manoeuvres': 'core' } });
set('samurai', 'sovereign-blade', { c: { 'area-multi-target-damage': 'available' }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A sovereign blade’s alignment must be at least partially neutral.', evidenceSection: 'Alignment' }] });
set('samurai', 'sword-saint', { c: { 'area-multi-target-damage': 'available', 'debuffing-enemies': 'core' }, f: { 'has-mount': false, 'controls-additional-entity': false }, r: { primaryDelivery: ['companion'] } });
set('samurai', 'ward-speaker', { c: { 'support-buffing': 'core', 'healing-recovery': 'available', 'utility-magic': 'available' }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A ward speaker must be of a nonevil alignment.', evidenceSection: 'Alignment' }] });
// warrior-poet and yojimbo: preserved verbatim from prior hand-reviewed pilot data.
set('samurai', 'warrior-poet', { c: { 'personal-durability': 'available', 'summoning-companions': 'absent' }, p: { 'equipment-dependence': 'medium' }, f: { 'has-mount': false, 'controls-additional-entity': false }, r: { primaryDelivery: ['companion'] } });
set('samurai', 'yojimbo', { c: { 'protecting-allies': 'core' }, f: { 'has-profession-identity': true }, professionIdentity: [{ value: 'bodyguard', evidenceSection: 'Resolute Defense / Intercept', evidenceText: 'The archetype explicitly guards a chosen ward and intercepts attacks aimed at that person.' }] });

// ---- Shaman (17) ----
set('shaman', 'crystal-tender', { a: { elementThemes: ['earth'] } });
set('shaman', 'deep-shaman', { a: { environmentThemes: ['maritime'], elementThemes: ['water'] } });
set('shaman', 'draconic-shaman', { c: { 'summoning-companions': 'core' }, a: { spiritualThemes: ['dragons'] } });
set('shaman', 'grasping-vine', { c: { 'transformation-shapeshifting': 'core' }, a: { elementThemes: ['wood'] } });
set('shaman', 'name-keeper', { f: { 'has-familiar': false, 'controls-additional-entity': false }, a: { professionIdentity: ['pathfinder agent'] } });
set('shaman', 'possessed-shaman', { c: { 'practical-expertise': 'core' } });
set('shaman', 'serendipity-shaman', { constraints: [{ type: 'race', kind: 'requirement', summary: 'This archetype requires a racial trait with “luck” in its name (such as cat’s luck or halfling luck), or the Defiant Luck feat.', evidenceSection: 'Limited Calling' }] });
set('shaman', 'spirit-warden', { c: { 'anti-magic-disruption': 'core' }, enemy: { undead: 'core' } });
set('shaman', 'true-silvered-throne', { a: { magicIdentity: ['occult'], professionIdentity: ['occultist'] } });
set('shaman', 'visionary', { a: { professionIdentity: ['seer'] } });
// speaker-for-the-past and witch-doctor: preserved verbatim from prior hand-reviewed pilot data (witch-doctor also gains an
// alignment constraint the pilot data omitted -- the source text explicitly states "A witch doctor cannot be of evil alignment").
set('shaman', 'speaker-for-the-past', { a: { spiritualThemes: ['ancestors'] } });
set('shaman', 'witch-doctor', { c: { 'anti-magic-disruption': 'core' }, f: { 'has-profession-identity': true }, enemy: { undead: 'available' }, professionIdentity: [{ value: 'witch doctor', evidenceSection: 'Channel Energy / Counter Curse / Countering Hex', evidenceText: 'The named vocation centres on healing energy and countering curses, hexes and hostile magic.' }], constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A witch doctor cannot be of evil alignment.', evidenceSection: 'Alignment' }] });
// animist, benefactor, overseer, primal-warden, unsworn-shaman: genuine flavor/resource-shape archetypes whose defining
// mechanics fall inside capabilities the Shaman baseline already covers at the same level (healing-recovery/support-buffing/
// offensive-magic/debuffing-enemies already core, versatility already high) -- left with no capability override, matching
// the established convention for such archetypes.

function heading(t) { return [...new Set([...t.matchAll(/(?:^|\n)([A-Z][A-Za-z’' -]{2,45})(?: \([^\n)]*\))?:/g)].map(m => m[1]))].slice(0, 4).join(' / ') || 'Archetype Features'; }
function raceConstraint(s) { const m = s.match(/^\(([^)]+?)(?: Only)?\)/i); return m && !/archetype/i.test(m[1]) ? [{ type: 'race', kind: 'requirement', summary: `This archetype is restricted to ${m[1]} characters.`, evidenceSection: 'Archetype requirement' }] : []; }
function build(cls, x) {
  const p = parentById.get(cls), e = review[cls][x.id.split(':')[1]];
  if (!e) throw new Error(`Missing review mapping: ${x.id}`);
  const clean = (o, b) => Object.fromEntries(Object.entries(o).filter(([k, v]) => b[k] !== v));
  const caps = clean(e.c, p.capabilities), practical = clean(e.p, p.practical), facts = clean(e.f, p.facts);
  const adds = {}, removes = {};
  for (const [k, v] of Object.entries(e.a)) { const z = v.filter(q => !p.identity[k].includes(q)); if (z.length) adds[k] = z; }
  for (const [k, v] of Object.entries(e.r)) { const z = v.filter(q => p.identity[k].includes(q)); if (z.length) removes[k] = z; }
  for (const k of ['magicIdentity', 'castingMethod', 'castingExtent', 'spiritualThemes', 'elementThemes'])
    if (adds[k]?.length && p.identity[k].includes('none')) removes[k] = [...new Set([...(removes[k] || []), 'none'])];
  const sec = heading(x.sourceText);
  const evidence = Object.keys(caps).map(id => ({ field: `capabilityOverrides.${id}`, section: sec, reason: `The archetype’s ${sec} package materially changes ${id.replaceAll('-', ' ')} from the ${p.name} baseline.` }));
  for (const target of Object.keys(e.enemy)) evidence.push({ field: `enemySpecializationOverrides.${target}`, section: sec, reason: `The archetype’s ${sec} package grants explicit advantages against ${target}.` });
  if (!evidence.length) evidence.push({ field: 'playerSummary', section: sec, reason: `${sec} defines the material change from the ${p.name} baseline.` });
  const constraints = e.constraints.length ? e.constraints : raceConstraint(x.aonSummary);
  return {
    id: x.id, name: x.name, parentClassId: cls, sourceCitationText: x.sourceCitationText, sourceUrl: x.aonUrl,
    capabilityOverrides: caps, practicalOverrides: practical, factOverrides: facts,
    ...(Object.keys(e.enemy).length ? { enemySpecializationOverrides: e.enemy } : {}),
    identityAdds: adds, identityRemoves: removes, constraints, professionIdentity: e.professionIdentity, evidence,
    playerSummary: x.aonSummary.replace(/^\([^)]*\)\s*/i, ''),
    tradeoff: x.replaces ? `It replaces or alters ${x.replaces}; those base-class tools are exchanged for the archetype’s more specialised package.` : 'Its specialised features narrow or redirect part of the base class toolkit.',
    reviewStatus: 'reviewed'
  };
}
for (const cls of classes) {
  const profiles = details.get(cls).map(x => build(cls, x));
  if (profiles.length !== details.get(cls).length) throw new Error(`Count mismatch for ${cls}`);
  fs.writeFileSync(path.join(dir, `archetype-profiles-${cls}.json`), `${JSON.stringify({ schemaVersion: 2, status: 'reviewed', inheritanceRule: `Every omitted field inherits the resolved ${parentById.get(cls).name} parent value.`, profiles }, null, 2)}\n`);
}
console.log('done');
