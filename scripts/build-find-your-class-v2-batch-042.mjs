import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(repo, 'assets/find-your-class/v2');
const detailDir = path.join(repo, 'assets/find-your-class/aon-catalog/class-details');
const classes = ['summoner', 'swashbuckler'];
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

// ---- Summoner (22) ----
set('summoner', 'blood-god-disciple', { c: { 'support-buffing': 'core' }, f: { 'has-rage': true } });
set('summoner', 'blood-summoner', { c: { 'debuffing-enemies': 'core' } });
set('summoner', 'broodmaster', { c: { 'tactical-leadership': 'core' } });
set('summoner', 'counter-summoner', { c: { 'anti-magic-disruption': 'core' } });
// evolutionist: a genuine flavor/resource-flexibility archetype (rebuild the eidolon's evolutions and base form on demand)
// whose defining mechanic falls inside capabilities the Summoner baseline already covers at the same level (versatility
// already high) -- left with no capability override, matching the established convention for such archetypes.
set('summoner', 'first-worlder', { c: { 'wilderness-affinity': 'available' }, a: { spiritualThemes: ['nature'] } });
set('summoner', 'god-caller', { c: { 'social-influence': 'core' }, a: { spiritualThemes: ['deity'] } });
set('summoner', 'leshy-caller', { a: { spiritualThemes: ['nature'], elementThemes: ['wood'] } });
set('summoner', 'morphic-savant', { constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A morphic savant’s eidolon (and all creatures it summons) must be chaotically aligned.', evidenceSection: 'Alignment' }] });
set('summoner', 'naturalist', { c: { 'wilderness-affinity': 'available', 'transformation-shapeshifting': 'core' }, a: { spiritualThemes: ['nature'] } });
set('summoner', 'pyroclast', { c: { 'area-multi-target-damage': 'core' }, a: { elementThemes: ['fire'] } });
set('summoner', 'shadow-caller', { c: { 'stealth-subterfuge': 'available' }, a: { elementThemes: ['void'] } });
set('summoner', 'shaitan-binder', { c: { 'utility-magic': 'core' }, a: { elementThemes: ['earth'], environmentThemes: ['underground'] } });
set('summoner', 'spirit-summoner', { c: { 'utility-magic': 'core' }, a: { spiritualThemes: ['spirits'] } });
set('summoner', 'storm-caller', { c: { 'area-multi-target-damage': 'core' }, a: { elementThemes: ['air'] } });
// story-summoner: a genuine flavor/narrative archetype (alignment-shifting harrow-deck theming for the eidolon and its
// summons) whose defining mechanic doesn't map onto a positive capability shift -- left with no capability override.
set('summoner', 'twinned-summoner', { c: { 'tactical-leadership': 'core' } });
set('summoner', 'unwavering-conduit', { constraints: [{ type: 'alignment', kind: 'requirement', summary: 'An unwavering conduit’s eidolon (and all creatures it summons) must be lawfully aligned.', evidenceSection: 'Alignment' }] });
set('summoner', 'wild-caller-arg', { c: { 'wilderness-affinity': 'available' }, a: { spiritualThemes: ['nature'] } });
set('summoner', 'wild-caller-hotw', { a: { spiritualThemes: ['nature'], elementThemes: ['wood'] } });
// master-summoner and synthesist: preserved verbatim from prior hand-reviewed pilot data.
set('summoner', 'master-summoner', { c: { 'tactical-leadership': 'core' } });
set('summoner', 'synthesist', { c: { 'summoning-companions': 'available', 'transformation-shapeshifting': 'core', 'personal-durability': 'core' }, f: { 'has-shapeshifting': true, 'controls-additional-entity': false }, a: { primaryDelivery: ['natural attacks'] }, r: { primaryDelivery: ['companion'] } });

// ---- Swashbuckler (20) ----
set('swashbuckler', 'arrow-champion', { c: { 'ranged-combat': 'core' } });
set('swashbuckler', 'azatariel', { c: { 'combat-manoeuvres': 'core' }, a: { spiritualThemes: ['outsiders'] }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'An azatariel must be chaotic good and loses all archetype abilities if her alignment changes, until it returns to chaotic good.', evidenceSection: 'Alignment' }] });
// courser: a genuine flavor/mobility-reflavor archetype (bonus feats and speed increases) whose defining mechanic falls
// inside capabilities the Swashbuckler baseline already covers at the same level (combat-mobility already core) -- left
// with no capability override.
set('swashbuckler', 'daring-infiltrator', { c: { 'stealth-subterfuge': 'core' }, a: { professionIdentity: ['infiltrator'] } });
set('swashbuckler', 'dashing-thief', { c: { 'combat-manoeuvres': 'core' }, a: { professionIdentity: ['thief'] } });
set('swashbuckler', 'guiding-blade', { c: { 'protecting-allies': 'core', 'tactical-leadership': 'core' } });
set('swashbuckler', 'inspired-blade', { a: { primaryDelivery: ['rapier'] } });
set('swashbuckler', 'mouser', { c: { 'combat-manoeuvres': 'core' } });
set('swashbuckler', 'musketeer', { c: { 'ranged-combat': 'core' }, f: { 'has-firearms': true }, a: { primaryDelivery: ['firearm'] } });
set('swashbuckler', 'mysterious-avenger', { c: { 'personal-durability': 'core', 'knowledge-investigation': 'available' }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A mysterious avenger must be of a good alignment and loses her secret-identity and greater charmed life abilities if she ceases to be good or betrays those she protects.', evidenceSection: 'Alignment' }] });
set('swashbuckler', 'noble-fencer', { a: { professionIdentity: ['noble duelist'] } });
set('swashbuckler', 'okayo-corsair', { a: { primaryDelivery: ['monk weapon'] } });
set('swashbuckler', 'rondelero-swashbuckler', { c: { 'combat-manoeuvres': 'core' }, a: { primaryDelivery: ['shield'] } });
set('swashbuckler', 'rostland-bravo', { c: { 'debuffing-enemies': 'core' }, a: { primaryDelivery: ['single chosen weapon'] } });
set('swashbuckler', 'shackles-corsair', { a: { environmentThemes: ['maritime'], professionIdentity: ['pirate'] } });
set('swashbuckler', 'veiled-blade', { c: { 'stealth-subterfuge': 'core' } });
set('swashbuckler', 'whirling-dervish', { c: { 'area-multi-target-damage': 'available' }, a: { spiritualThemes: ['deity'] } });
set('swashbuckler', 'wildstrider', { c: { 'wilderness-affinity': 'available' }, a: { environmentThemes: ['wilderness'] }, r: { environmentThemes: ['urban'] } });
// flying-blade and picaroon: preserved verbatim from prior hand-reviewed pilot data.
set('swashbuckler', 'flying-blade', { c: { 'melee-combat': 'available', 'ranged-combat': 'core' }, a: { primaryDelivery: ['ranged weapon'] }, constraints: [{ type: 'weapon-or-armour-restriction', kind: 'commitment', summary: 'Most defining features require daggers or starknives.', evidenceSection: 'Panache / Flying Blade Training' }] });
set('swashbuckler', 'picaroon', { c: { 'ranged-combat': 'core' }, f: { 'has-firearms': true }, a: { primaryDelivery: ['firearm'] }, constraints: [{ type: 'weapon-or-armour-restriction', kind: 'commitment', summary: 'The intended style pairs a one-handed firearm with a light or one-handed piercing weapon.', evidenceSection: 'Two-Weapon Finesse' }] });

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
