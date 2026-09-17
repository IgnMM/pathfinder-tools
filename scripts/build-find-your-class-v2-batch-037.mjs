import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(repo, 'assets/find-your-class/v2');
const detailDir = path.join(repo, 'assets/find-your-class/aon-catalog/class-details');
const classes = ['sorcerer', 'spiritualist'];
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

// ---- Sorcerer (13) ----
set('sorcerer', 'dragon-drinker', { c: { 'personal-durability': 'available' }, a: { spiritualThemes: ['dragons'] }, constraints: [{ type: 'bloodline-choice', kind: 'requirement', summary: 'A dragon drinker must belong to the draconic bloodline.', evidenceSection: 'Bloodline' }] });
set('sorcerer', 'mongrel-mage', { p: { versatility: 'high' } });
set('sorcerer', 'nine-tailed-heir', { constraints: [{ type: 'race', kind: 'requirement', summary: 'This archetype is available only to kitsune characters.', evidenceSection: 'Archetype requirement' }] });
set('sorcerer', 'sorcerer-of-sleep', { a: { professionIdentity: ['drug adept'] } });
set('sorcerer', 'stone-warder', { a: { elementThemes: ['earth'], environmentThemes: ['underground', 'mountains'] }, constraints: [{ type: 'bloodline-choice', kind: 'requirement', summary: 'A stone warder must select an earth-themed bloodline (deep earth, copper dragon, earth elemental, orc, or shaitan).', evidenceSection: 'Blood of the Earth' }] });
set('sorcerer', 'umbral-scion', { c: { 'stealth-subterfuge': 'core' }, a: { elementThemes: ['void'] }, constraints: [{ type: 'bloodline-choice', kind: 'requirement', summary: 'An umbral scion must have the shadow bloodline.', evidenceSection: 'Bloodline' }] });
// wildblooded: a meta-archetype (a mutated variant applied on top of an existing bloodline, chosen at character creation) with
// no fixed thematic identity of its own -- left with no capability or identity override, since its actual effect depends
// entirely on which base bloodline it modifies.
set('sorcerer', 'wishcrafter', { c: { 'social-influence': 'core' } });
// crossblooded, razmiran-priest, eldritch-scrapper, seeker, tattooed-sorcerer: preserved verbatim from prior hand-reviewed pilot data.
set('sorcerer', 'crossblooded', { p: { versatility: 'medium' }, constraints: [{ type: 'bloodline-choice', kind: 'commitment', summary: 'Two bloodlines are chosen; their arcana combine but powers and spells must be selected between them.', evidenceSection: 'Bloodline Powers / Drawbacks' }] });
set('sorcerer', 'razmiran-priest', { c: { 'healing-recovery': 'core' }, f: { 'has-profession-identity': true }, professionIdentity: [{ value: 'false priest', evidenceSection: 'False Piety / Lay Healer', evidenceText: 'The archetype explicitly impersonates divine authority and performs a priestly role through arcane deception.' }], constraints: [{ type: 'organization', kind: 'theme', summary: 'Razmiran priesthood is a narrative identity, not a hard deity or institutional gate imposed by the engine.', evidenceSection: 'False Piety' }] });
set('sorcerer', 'eldritch-scrapper', { c: { 'melee-combat': 'available' }, a: { primaryDelivery: ['melee weapon'] } });
set('sorcerer', 'seeker', { c: { 'practical-expertise': 'available' }, f: { 'has-profession-identity': true }, professionIdentity: [{ value: 'seeker', evidenceSection: 'Tinkering / Seeker Lore', evidenceText: 'The archetype explicitly searches out magical secrets, disables devices and studies hidden lore.' }] });
set('sorcerer', 'tattooed-sorcerer', { a: { primaryDelivery: ['companion'] }, constraints: [{ type: 'bonded-entity', kind: 'commitment', summary: 'A familiar is embodied in a magical tattoo and replaces the normal 1st-level bloodline power.', evidenceSection: 'Familiar Tattoo' }] });

// ---- Spiritualist (24) ----
set('spiritualist', 'drowned-channeler', { a: { environmentThemes: ['maritime'], elementThemes: ['water'] } });
set('spiritualist', 'ectoplasmatist', { c: { 'melee-combat': 'core' }, a: { primaryDelivery: ['ectoplasmic weapon'] } });
set('spiritualist', 'exciter', { c: { 'personal-durability': 'core' }, f: { 'controls-additional-entity': false } });
set('spiritualist', 'fated-guide', { c: { 'anti-magic-disruption': 'core' }, enemy: { undead: 'core' }, a: { spiritualThemes: ['deity'] } });
// fractured-mind and haunted: genuine flavor/resource-shape archetypes whose defining mechanics fall inside capabilities the
// Spiritualist baseline already covers at the same level -- left with no capability override, matching the established
// convention for such archetypes.
set('spiritualist', 'geist-channeler', { c: { 'anti-magic-disruption': 'core' } });
set('spiritualist', 'grim-apostle', { c: { 'personal-durability': 'core' }, a: { spiritualThemes: ['outsiders'] } });
set('spiritualist', 'hag-haunted', { c: { 'debuffing-enemies': 'core' }, a: { magicIdentity: ['arcane'] } });
set('spiritualist', 'involutionist', { c: { 'utility-magic': 'core' }, a: { magicIdentity: ['divine'] } });
set('spiritualist', 'necrologist', { c: { 'debuffing-enemies': 'core' }, a: { spiritualThemes: ['undead'] }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'Only an evil character can contact a malevolent undead phantom and take the necrologist archetype; the phantom stops granting benefits if the necrologist becomes nonevil.', evidenceSection: 'Alignment' }] });
set('spiritualist', 'onmyoji', { c: { 'personal-durability': 'core' }, a: { magicIdentity: ['divine'] } });
set('spiritualist', 'plague-eater', { c: { 'healing-recovery': 'core' } });
set('spiritualist', 'scourge', { c: { 'debuffing-enemies': 'core' }, a: { elementThemes: ['void'] } });
set('spiritualist', 'seeker-of-enlightenment', { c: { 'knowledge-investigation': 'core' } });
set('spiritualist', 'shadow-caller', { c: { 'stealth-subterfuge': 'core' }, a: { elementThemes: ['void'] } });
set('spiritualist', 'soul-warden', { f: { 'has-familiar': true }, a: { spiritualThemes: ['deity'] } });
set('spiritualist', 'totem-spiritualist', { c: { 'wilderness-affinity': 'available' }, a: { spiritualThemes: ['nature'] } });
set('spiritualist', 'usher-of-lost-souls', { c: { 'anti-magic-disruption': 'core' }, enemy: { undead: 'core' }, a: { spiritualThemes: ['undead'] } });
set('spiritualist', 'ward-spiritualist', { c: { 'utility-magic': 'core' }, a: { spiritualThemes: ['nature'] } });
set('spiritualist', 'zeitgeist-binder', { c: { 'social-influence': 'core' }, a: { environmentThemes: ['urban'] } });
// quintessentialist: a genuine flavor/high-risk-resource archetype (self-damage, ability penalties while its exemplar is
// manifested) whose defining mechanic doesn't map onto a positive capability shift -- left with no capability override.
// phantom-blade and priest-of-the-fallen: preserved verbatim from prior hand-reviewed pilot data.
set('spiritualist', 'phantom-blade', { c: { 'melee-combat': 'core', 'summoning-companions': 'absent' }, f: { 'controls-additional-entity': false }, a: { primaryDelivery: ['melee weapon'] }, r: { primaryDelivery: ['companion'] }, constraints: [{ type: 'bonded-entity', kind: 'commitment', summary: 'The phantom manifests as one bonded weapon rather than an independent companion.', evidenceSection: 'Phantom Weapon' }] });
set('spiritualist', 'priest-of-the-fallen', { c: { 'tactical-leadership': 'core', 'healing-recovery': 'core' }, f: { 'has-profession-identity': true }, enemy: { undead: 'available' }, professionIdentity: [{ value: 'priest of fallen heroes', evidenceSection: 'Mythmaker / Channel Energy', evidenceText: 'The source explicitly presents a priest who invokes fallen hero-gods and channels their divine energy.' }] });

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
