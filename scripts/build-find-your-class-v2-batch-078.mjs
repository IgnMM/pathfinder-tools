import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(repo, 'assets/find-your-class/v2');
const detailDir = path.join(repo, 'assets/find-your-class/aon-catalog/class-details');
const classes = ['rogue'];
const parents = ['01', '02', '03'].flatMap(n => JSON.parse(fs.readFileSync(path.join(dir, `class-profiles-batch-${n}.json`))).profiles);
const parentById = new Map(parents.map(x => [x.id, x]));
const details = new Map(classes.map(c => [c, JSON.parse(fs.readFileSync(path.join(detailDir, `${c}.json`))).profiles]));

const review = {};
for (const c of classes) { review[c] = {}; for (const x of details.get(c)) review[c][x.id.split(':')[1]] = { c: {}, p: {}, f: {}, a: {}, r: {}, constraints: [], professionIdentity: [] }; }
function set(cls, names, d) {
  for (const name of names.split(' ')) {
    const e = review[cls][name];
    if (!e) throw new Error(`Unknown ${cls}:${name}`);
    for (const k of ['c', 'p', 'f']) if (d[k]) Object.assign(e[k], d[k]);
    for (const k of ['a', 'r']) for (const [field, v] of Object.entries(d[k] || {})) e[k][field] = [...new Set([...(e[k][field] || []), ...v])];
    if (d.constraints) e.constraints = e.constraints.concat(d.constraints);
    if (d.professionIdentity) e.professionIdentity = e.professionIdentity.concat(d.professionIdentity);
  }
}

// ---- Rogue (78) ----
set('rogue', 'bandit', { c: { 'debuffing-enemies': 'core' }, a: { professionIdentity: ['bandit'] } });
set('rogue', 'bekyar-kidnapper', { c: { 'combat-manoeuvres': 'core' } });
set('rogue', 'bellflower-irrigator', { c: { 'tactical-leadership': 'core', 'debuffing-enemies': 'core' }, a: { professionIdentity: ['abolitionist'] } });
set('rogue', 'carnivalist', { c: { 'summoning-companions': 'core', 'support-buffing': 'available' }, f: { 'has-familiar': true, 'controls-additional-entity': true }, a: { primaryDelivery: ['companion'] } });
set('rogue', 'chameleon', { c: { 'wilderness-affinity': 'core' } });
set('rogue', 'consigliere', { c: { 'tactical-leadership': 'available', 'support-buffing': 'available' }, a: { professionIdentity: ['consigliere'] } });
set('rogue', 'construct-saboteur', { c: { 'anti-magic-disruption': 'core', 'debuffing-enemies': 'core' }, a: { professionIdentity: ['construct hunter'] } });
set('rogue', 'counterfeit-mage', { c: { 'utility-magic': 'available' }, a: { professionIdentity: ['charlatan mage'] } });
set('rogue', 'dark-lurker', { c: { 'personal-durability': 'core' }, a: { elementThemes: ['void'] } });
set('rogue', 'deadly-courtesan', { c: { 'support-buffing': 'core' }, a: { professionIdentity: ['courtesan'] } });
set('rogue', 'desert-raider', { c: { 'wilderness-affinity': 'core' }, a: { environmentThemes: ['desert'] } });
set('rogue', 'discretion-specialist', { c: { 'debuffing-enemies': 'core', 'utility-magic': 'available' }, a: { professionIdentity: ['fixer'] } });
set('rogue', 'dreamthief', { c: { 'offensive-magic': 'available', 'personal-durability': 'core' }, f: { 'has-sneak-attack': false }, a: { spiritualThemes: ['dreams'], professionIdentity: ['dreamthief'] } });
set('rogue', 'earthshadow', { c: { 'utility-magic': 'core' }, a: { elementThemes: ['earth'] } });
set('rogue', 'eldritch-raider', { c: { 'utility-magic': 'available' }, a: { magicIdentity: ['arcane'], professionIdentity: ['relic hunter'] } });
set('rogue', 'escapologist', { c: { 'anti-magic-disruption': 'available', 'personal-durability': 'core' }, a: { professionIdentity: ['escape artist'] } });
set('rogue', 'false-medium', { c: { 'utility-magic': 'available' }, a: { professionIdentity: ['false medium'] } });
set('rogue', 'fey-prankster', { c: { 'battlefield-control': 'core' }, a: { spiritualThemes: ['nature'] } });
set('rogue', 'filcher', { c: { 'combat-manoeuvres': 'core' }, a: { professionIdentity: ['thief'] } });
set('rogue', 'galtan-agitator', { c: { 'battlefield-control': 'core' }, a: { professionIdentity: ['agitator'] } });
set('rogue', 'guerrilla', { a: { professionIdentity: ['guerrilla fighter'] } });
set('rogue', 'guild-agent', { c: { 'tactical-leadership': 'core' }, a: { professionIdentity: ['guild agent'] }, constraints: [{ type: 'organization', kind: 'commitment', summary: 'A guild agent must remain a member in good standing of a thieves’ guild or loses all abilities granted by this archetype until rejoining one.', evidenceSection: 'Honor Among Thieves' }] });
set('rogue', 'gun-smuggler', { f: { 'has-firearms': true }, a: { primaryDelivery: ['firearm'], professionIdentity: ['smuggler'] } });
set('rogue', 'heister', { a: { professionIdentity: ['heister'] } });
set('rogue', 'kintargo-rebel', { c: { 'utility-magic': 'available' }, a: { professionIdentity: ['rebel'] } });
set('rogue', 'kitsune-trickster', { c: { 'offensive-magic': 'available' }, a: { magicIdentity: ['arcane'] }, constraints: [{ type: 'race', kind: 'requirement', summary: 'This archetype is restricted to kitsune characters.', evidenceSection: 'Archetype requirement' }] });
set('rogue', 'knife-master', { c: { 'personal-durability': 'core' }, a: { primaryDelivery: ['light blade'] } });
set('rogue', 'makeshift-scrapper', { a: { primaryDelivery: ['improvised weapon'] } });
set('rogue', 'master-of-disguise', { a: { professionIdentity: ['master of disguise'] } });
set('rogue', 'nameless-shadow', { a: { professionIdentity: ['vigilante'] } });
set('rogue', 'needler', { c: { 'debuffing-enemies': 'core' }, a: { professionIdentity: ['poisoner'] } });
set('rogue', 'numerian-scavenger', { a: { professionIdentity: ['scavenger'] } });
set('rogue', 'okeno-liberator', { c: { 'support-buffing': 'available' }, a: { professionIdentity: ['liberator'] } });
set('rogue', 'phantom-thief', { a: { professionIdentity: ['gentleman thief'] } });
set('rogue', 'pirate', { a: { environmentThemes: ['maritime'], professionIdentity: ['pirate'] } });
set('rogue', 'planar-sneak', { c: { 'anti-magic-disruption': 'available' }, a: { spiritualThemes: ['outsiders'] } });
set('rogue', 'poisoner', { c: { 'debuffing-enemies': 'core' }, a: { professionIdentity: ['poisoner'] } });
set('rogue', 'rake', { c: { 'debuffing-enemies': 'core' }, a: { professionIdentity: ['rake'] } });
set('rogue', 'relic-raider', { c: { 'anti-magic-disruption': 'core' }, a: { professionIdentity: ['relic hunter'] } });
set('rogue', 'river-rat', { a: { environmentThemes: ['swamp'] } });
set('rogue', 'rotdrinker', { c: { 'personal-durability': 'core' }, a: { professionIdentity: ['rotdrinker'] } });
set('rogue', 'sanctified-rogue', { c: { 'utility-magic': 'available' }, f: { 'requires-deity': true }, a: { magicIdentity: ['divine'], spiritualThemes: ['deity'] } });
set('rogue', 'sapper', { c: { 'battlefield-control': 'core' }, a: { professionIdentity: ['sapper'] } });
set('rogue', 'scroll-scoundrel', { c: { 'personal-durability': 'core' }, a: { professionIdentity: ['duelist'] } });
set('rogue', 'sczarni-swindler', { a: { professionIdentity: ['gambler'] } });
set('rogue', 'seeker-of-the-lost', { a: { environmentThemes: ['maritime'], professionIdentity: ['ruin explorer'] } });
set('rogue', 'shadow-scion', { a: { elementThemes: ['void'] } });
set('rogue', 'shadow-walker', { c: { 'utility-magic': 'available' }, a: { elementThemes: ['void'] } });
set('rogue', 'sharper', { c: { 'personal-durability': 'core' }, a: { professionIdentity: ['con artist'] } });
set('rogue', 'skulking-slayer', { c: { 'combat-manoeuvres': 'core' }, constraints: [{ type: 'race', kind: 'requirement', summary: 'This archetype is restricted to half-orc characters.', evidenceSection: 'Archetype requirement' }] });
set('rogue', 'sly-saboteur', { c: { 'battlefield-control': 'core', 'anti-magic-disruption': 'available' } });
set('rogue', 'smuggler', { a: { professionIdentity: ['smuggler'] } });
set('rogue', 'snare-setter', { c: { 'battlefield-control': 'core' }, a: { primaryDelivery: ['traps'] } });
set('rogue', 'sniper', { c: { 'ranged-combat': 'core' } });
set('rogue', 'snoop', { a: { professionIdentity: ['detective'] } });
set('rogue', 'spy', { c: { 'debuffing-enemies': 'core' }, a: { professionIdentity: ['spy'] } });
set('rogue', 'survivalist', { c: { 'personal-durability': 'core', 'wilderness-affinity': 'core' } });
set('rogue', 'swamp-poisoner', { c: { 'debuffing-enemies': 'core' }, a: { environmentThemes: ['swamp'] }, constraints: [{ type: 'race', kind: 'requirement', summary: 'This archetype requires the grippli toxic skin alternate racial trait.', evidenceSection: 'Prerequisites' }] });
set('rogue', 'swashbuckler', { a: { professionIdentity: ['duelist'] } });
set('rogue', 'swordmaster', { a: { professionIdentity: ['martial artist'] } });
set('rogue', 'sylvan-trickster', { c: { 'utility-magic': 'available', 'wilderness-affinity': 'core' }, a: { spiritualThemes: ['nature'] } });
set('rogue', 'tidal-trickster', { a: { environmentThemes: ['maritime'], elementThemes: ['water'] } });
set('rogue', 'toxic-talon', { c: { 'debuffing-enemies': 'core', 'personal-durability': 'core' }, a: { professionIdentity: ['poisoner'] } });
set('rogue', 'trapsmith', { c: { 'battlefield-control': 'core' } });
set('rogue', 'underground-chemist', { c: { 'area-multi-target-damage': 'available', 'debuffing-enemies': 'core' }, a: { professionIdentity: ['alchemist'] } });
set('rogue', 'vexing-dodger', { c: { 'combat-manoeuvres': 'core' }, a: { professionIdentity: ['giant hunter'] } });
set('rogue', 'waylayer', { c: { 'personal-durability': 'core' } });
// acrobat, cat-burglar, cutpurse, driver, guerrilla (capability-wise), heister, investigator, makeshift-scrapper (capability-wise),
// master-of-disguise (capability-wise), nameless-shadow (capability-wise), numerian-scavenger (capability-wise), phantom-thief
// (capability-wise), roof-runner, sczarni-swindler (capability-wise), smuggler (capability-wise), snoop (capability-wise),
// swashbuckler (capability-wise), swordmaster (capability-wise): genuine flavor/skill-breadth archetypes whose defining
// mechanics fall inside capabilities the Rogue baseline already covers at the same level (stealth-subterfuge/social-influence/
// practical-expertise/knowledge-investigation already core, or combat-mobility/personal-durability already available without
// the archetype making them central) -- left with no capability override where that's genuinely true, matching the
// established convention for such archetypes; several still carry an identity/professionIdentity delta above.
// burglar, charlatan, eldritch-scoundrel, scout, thug: preserved verbatim from prior hand-reviewed pilot data.
set('rogue', 'eldritch-scoundrel', { c: { 'offensive-magic': 'core', 'area-multi-target-damage': 'available', 'defensive-protective-magic': 'available', 'utility-magic': 'core' }, p: { 'build-complexity': 'high', 'play-complexity': 'high', 'resource-management': 'high' }, f: { 'has-spellcasting': true }, a: { magicIdentity: ['arcane'], castingMethod: ['prepared'], castingExtent: ['partial'], primaryDelivery: ['spellcasting'] } });
set('rogue', 'charlatan', { f: { 'has-profession-identity': true }, professionIdentity: [{ value: 'charlatan', evidenceSection: 'Natural Born Liar / Grand Hoax', evidenceText: 'The archetype explicitly operates through lies, false identities and elaborate hoaxes.' }] });
set('rogue', 'burglar', { f: { 'has-profession-identity': true }, professionIdentity: [{ value: 'burglar', evidenceSection: 'Careful Disarm / Distraction', evidenceText: 'The archetype explicitly specialises in breaking in, bypassing traps and diverting attention.' }] });
set('rogue', 'scout', { f: { 'has-profession-identity': true }, professionIdentity: [{ value: 'scout', evidenceSection: '’s Charge / Skirmisher', evidenceText: 'The archetype explicitly fights through movement, charging and mobile reconnaissance-style attacks.' }] });
set('rogue', 'thug', { c: { 'debuffing-enemies': 'core' } });

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
  if (!evidence.length) evidence.push({ field: 'playerSummary', section: sec, reason: `${sec} defines the material change from the ${p.name} baseline.` });
  const constraints = e.constraints.length ? e.constraints : raceConstraint(x.aonSummary);
  return {
    id: x.id, name: x.name, parentClassId: cls, sourceCitationText: x.sourceCitationText, sourceUrl: x.aonUrl,
    capabilityOverrides: caps, practicalOverrides: practical, factOverrides: facts,
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
