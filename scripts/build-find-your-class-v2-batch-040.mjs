import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(repo, 'assets/find-your-class/v2');
const detailDir = path.join(repo, 'assets/find-your-class/aon-catalog/class-details');
const classes = ['shifter', 'skald'];
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

// ---- Shifter (14) ----
set('shifter', 'adaptive-shifter', { p: { versatility: 'high' } });
set('shifter', 'dragonblood-shifter', { c: { 'area-multi-target-damage': 'available' }, a: { spiritualThemes: ['dragons'] } });
set('shifter', 'elementalist-shifter', { a: { elementThemes: ['mixed'] } });
set('shifter', 'feyform-shifter', { a: { spiritualThemes: ['fey'] } });
set('shifter', 'fiendflesh-shifter', { a: { spiritualThemes: ['outsiders'] }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A fiendflesh shifter must be evil in alignment and loses all archetype powers if she becomes nonevil.', evidenceSection: 'Alignment' }] });
set('shifter', 'holy-beast', { f: { 'requires-deity': true }, a: { spiritualThemes: ['deity', 'outsiders'] } });
set('shifter', 'leafshifter', { a: { elementThemes: ['wood'] } });
set('shifter', 'rageshaper', { f: { 'has-rage': true }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A rageshaper must be nonlawful; becoming lawful blocks further levels in the archetype (though prior abilities are kept).', evidenceSection: 'Alignment' }] });
set('shifter', 'style-shifter', { a: { primaryDelivery: ['unarmed'] }, p: { versatility: 'high' } });
set('shifter', 'verdant-shifter', { a: { elementThemes: ['wood'] } });
// swarm-shifter and wild-effigy: genuine flavor/defensive-reflavor archetypes whose defining mechanics (swarm-form immunities,
// construct-effigy damage reduction) fall inside capabilities the Shifter baseline already covers at the same level
// (personal-durability/transformation-shapeshifting already core) -- left with no capability override, matching the
// established convention for such archetypes.
// oozemorph and weretouched: preserved verbatim from prior hand-reviewed pilot data.
set('shifter', 'oozemorph', { constraints: [{ type: 'curse-or-drawback', kind: 'commitment', summary: 'The natural form is an amorphous ooze; humanoid form lasts limited hours and restricts equipment use.', evidenceSection: 'Fluidic Body' }] });
set('shifter', 'weretouched', { constraints: [{ type: 'form-choice', kind: 'commitment', summary: 'One lycanthropic animal aspect is selected permanently.', evidenceSection: 'Lycanthrope Aspect' }] });

// ---- Skald (26) ----
set('skald', 'augur', { c: { 'utility-magic': 'core' } });
set('skald', 'bacchanal', { c: { 'healing-recovery': 'core' } });
set('skald', 'battle-scion', { a: { professionIdentity: ['noble champion'] } });
set('skald', 'bekyar-demon-dancer', { c: { 'debuffing-enemies': 'core' }, a: { spiritualThemes: ['outsiders'] } });
set('skald', 'belkzen-war-drummer', { c: { 'battlefield-control': 'core' } });
set('skald', 'boaster', { c: { 'personal-durability': 'core' } });
set('skald', 'bold-schemer', { c: { 'stealth-subterfuge': 'available' } });
set('skald', 'dragon-skald', { a: { environmentThemes: ['maritime'] } });
set('skald', 'elegist', { c: { 'summoning-companions': 'core' }, f: { 'has-rage': false }, a: { spiritualThemes: ['spirits'] } });
set('skald', 'fated-champion', { c: { 'utility-magic': 'core' } });
set('skald', 'herald-of-the-horn', { c: { 'area-multi-target-damage': 'core' } });
set('skald', 'hunt-caller', { c: { 'transformation-shapeshifting': 'core' } });
set('skald', 'instigator', { c: { 'debuffing-enemies': 'core' } });
set('skald', 'red-tongue', { c: { 'stealth-subterfuge': 'available' } });
set('skald', 'serpent-herald', { c: { 'debuffing-enemies': 'core' } });
set('skald', 'sunsinger', { c: { 'healing-recovery': 'core' }, f: { 'requires-deity': true }, a: { spiritualThemes: ['deity'] }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A sunsinger must be lawful good, neutral good, or neutral, and must worship Sarenrae specifically.', evidenceSection: 'Alignment' }] });
set('skald', 'totemic-skald', { c: { 'transformation-shapeshifting': 'core', 'wilderness-affinity': 'core' } });
set('skald', 'twilight-speaker', { f: { 'requires-deity': true }, a: { spiritualThemes: ['deity'] }, constraints: [{ type: 'race', kind: 'requirement', summary: 'This archetype is restricted to elf characters.', evidenceSection: 'Archetype requirement' }] });
set('skald', 'undying-word', { c: { 'personal-durability': 'core' } });
set('skald', 'urban-skald', { c: { 'debuffing-enemies': 'core' }, a: { environmentThemes: ['urban'] } });
set('skald', 'warlord', { c: { 'debuffing-enemies': 'core' } });
set('skald', 'wyrm-singer', { c: { 'area-multi-target-damage': 'core' }, a: { spiritualThemes: ['dragons'] } });
// totem-channeler and war-painter: genuine flavor/resource-shape archetypes whose defining mechanics (simultaneous totem
// rage-power groups, delayed-activation raging-song paint) fall inside capabilities the Skald baseline already covers at the
// same level (support-buffing/utility-magic already core/available) -- left with no capability override, matching the
// established convention for such archetypes.
// court-poet and spell-warrior: preserved verbatim from prior hand-reviewed pilot data.
set('skald', 'court-poet', { c: { 'melee-combat': 'available' }, f: { 'has-rage': false }, a: { environmentThemes: ['urban'] } });
set('skald', 'spell-warrior', { c: { 'anti-magic-disruption': 'core' } });

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
