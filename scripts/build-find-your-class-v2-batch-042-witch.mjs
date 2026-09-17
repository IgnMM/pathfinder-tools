import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(repo, 'assets/find-your-class/v2');
const detailDir = path.join(repo, 'assets/find-your-class/aon-catalog/class-details');
const classes = ['witch'];
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

// ---- Witch (42) ----
set('witch', 'alley-witch', { c: { 'support-buffing': 'core' }, a: { environmentThemes: ['urban'], professionIdentity: ['information broker'] } });
set('witch', 'ashiftah', { c: { 'combat-mobility': 'core', 'battlefield-control': 'core' }, f: { 'has-familiar': false, 'depends-on-specific-equipment': true } });
set('witch', 'beast-bonded', { c: { 'summoning-companions': 'core', 'transformation-shapeshifting': 'core' } });
// bonded-witch: half-elf-only per the AoN summary tag -- captured automatically by the race-constraint fallback.
set('witch', 'bonded-witch', { f: { 'has-familiar': false, 'depends-on-specific-equipment': true } });
set('witch', 'bouda', { c: { 'transformation-shapeshifting': 'core' }, f: { 'has-shapeshifting': true, 'has-familiar': false, 'depends-on-specific-equipment': true }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A bouda must be evil, or she loses access to all archetype alternate class features until she atones.', evidenceSection: 'Alignment' }] });
set('witch', 'cartomancer', { f: { 'has-familiar': false, 'depends-on-specific-equipment': true } });
set('witch', 'coral-witch', { c: { 'wilderness-affinity': 'core' }, a: { environmentThemes: ['maritime'] } });
set('witch', 'demon-sworn', { a: { spiritualThemes: ['outsiders'] } });
set('witch', 'dimensional-occultist', { c: { 'combat-mobility': 'core' }, a: { environmentThemes: ['planar'] } });
// dreamweaver: changeling-only per the AoN summary tag -- captured automatically by the race-constraint fallback.
set('witch', 'dreamweaver', { c: { 'battlefield-control': 'core' } });
set('witch', 'flood-walker', { c: { 'battlefield-control': 'core', 'combat-mobility': 'core' }, a: { environmentThemes: ['maritime'] }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A flood walker must be evil, and loses access to all archetype abilities (without regaining replaced abilities) if he becomes nonevil.', evidenceSection: 'Alignment' }] });
set('witch', 'gingerbread-witch', { c: { 'melee-combat': 'available' } });
set('witch', 'gravewalker', { c: { 'summoning-companions': 'core', 'tactical-leadership': 'core' }, f: { 'has-familiar': false, 'depends-on-specific-equipment': true }, a: { spiritualThemes: ['undead'] } });
set('witch', 'hag-of-gyronna', { c: { 'anti-magic-disruption': 'core' } });
set('witch', 'hagbound', { c: { 'melee-combat': 'available', 'personal-durability': 'core' }, f: { 'has-shapeshifting': true }, constraints: [{ type: 'patron-oath-order', kind: 'commitment', summary: 'A hagbound must take this archetype at 1st level, select one of nine specific patrons, can’t take levels in any class other than witch, and her alignment can never become good until she removes the hag’s hold on her soul.', evidenceSection: 'Hagbound' }] });
set('witch', 'hedge-witch', { c: { 'healing-recovery': 'core' } });
set('witch', 'herb-witch', { c: { 'healing-recovery': 'core' } });
set('witch', 'hex-channeler', { c: { 'healing-recovery': 'core' } });
set('witch', 'invoker', { c: { 'practical-expertise': 'core' } });
set('witch', 'jinx-witch', { c: { 'anti-magic-disruption': 'core' } });
set('witch', 'ley-line-guardian', { a: { castingMethod: ['spontaneous'] }, r: { castingMethod: ['prepared'] } });
set('witch', 'medium', { a: { spiritualThemes: ['undead'] } });
set('witch', 'mirror-witch', { f: { 'has-familiar': false, 'depends-on-specific-equipment': true } });
set('witch', 'mountain-witch', { c: { 'wilderness-affinity': 'core' }, a: { environmentThemes: ['mountains'] } });
set('witch', 'nexian-spellspy', { c: { 'stealth-subterfuge': 'core' }, a: { professionIdentity: ['spy'] } });
set('witch', 'pact-witch', { f: { 'requires-alignment': true }, a: { spiritualThemes: ['outsiders'], environmentThemes: ['planar'] }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A pact witch’s alignment must match that of his chosen Outer Plane, or he becomes an ex-pact witch and loses the archetype’s benefits until he atones.', evidenceSection: 'Alignment' }] });
set('witch', 'putrefactor', { c: { 'personal-durability': 'core' }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A putrefactor must be chaotic.', evidenceSection: 'Infestation of Entropy' }] });
set('witch', 'rhetorician', { c: { 'social-influence': 'core' } });
// scarred-witch-doctor: orc-only per the AoN summary tag -- captured automatically by the race-constraint fallback.
set('witch', 'scarred-witch-doctor', { f: { 'has-familiar': false, 'depends-on-specific-equipment': true } });
set('witch', 'sea-witch', { c: { 'wilderness-affinity': 'core' }, a: { environmentThemes: ['maritime'] } });
// season-witch: a genuine flavor/theming archetype (a seasonal element flavor for spell DCs and a bonus hex choice)
// whose defining mechanic doesn't map onto a positive capability shift -- left with no capability override.
set('witch', 'seducer', { c: { 'social-influence': 'core' } });
set('witch', 'synergist', { c: { 'transformation-shapeshifting': 'core' }, f: { 'has-shapeshifting': true } });
set('witch', 'tatterdemalion', { c: { 'battlefield-control': 'core', 'combat-mobility': 'core' } });
set('witch', 'vellemancer', { c: { 'support-buffing': 'core' }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A vellemancer must not be evil, or she loses access to all the unique abilities provided by this archetype.', evidenceSection: 'Keen Counselor' }] });
set('witch', 'veneficus-witch', { c: { 'practical-expertise': 'core' }, a: { professionIdentity: ['poisoner'] } });
// venom-siphoner: a genuine flavor/utility archetype (a poison delivery tweak for the familiar and self) whose
// defining mechanic falls inside capabilities the Witch baseline already covers at the same level (debuffing-enemies
// already core) -- left with no capability override.
set('witch', 'winter-witch', { c: { 'personal-durability': 'available' }, a: { elementThemes: ['cold'] } });
set('witch', 'witch-watcher', { c: { 'protecting-allies': 'core' } });
set('witch', 'wyrm-witch', { f: { 'has-familiar': false, 'depends-on-specific-equipment': true }, a: { spiritualThemes: ['dragons'] } });
// havocker and white-haired-witch: preserved verbatim from prior hand-reviewed pilot data.
set('witch', 'havocker', { c: { 'single-target-damage': 'core', 'debuffing-enemies': 'available' }, a: { primaryDelivery: ['supernatural attack'] }, constraints: [{ type: 'element-choice', kind: 'commitment', summary: 'One kineticist element replaces the normal patron and determines blast and infusion access.', evidenceSection: 'Patron Element' }] });
set('witch', 'white-haired-witch', { c: { 'melee-combat': 'core', 'combat-manoeuvres': 'core' }, a: { primaryDelivery: ['natural attacks'] } });

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
