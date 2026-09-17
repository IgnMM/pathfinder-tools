import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(repo, 'assets/find-your-class/v2');
const detailDir = path.join(repo, 'assets/find-your-class/aon-catalog/class-details');
const classes = ['wizard'];
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

// ---- Wizard (35) ----
set('wizard', 'absalom-arcanamirium-crafter', { c: { 'practical-expertise': 'core' }, a: { professionIdentity: ['item crafter'] } });
set('wizard', 'arcane-bomber', { c: { 'ranged-combat': 'core' }, f: { 'has-bombs': true } });
set('wizard', 'arcane-warden', { c: { 'protecting-allies': 'core', 'wilderness-affinity': 'available' } });
set('wizard', 'bonded-wizard', { c: { 'personal-durability': 'available' } });
set('wizard', 'cheliax-egorian-academy-infernal-binder', { a: { spiritualThemes: ['outsiders'] }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'An infernal binder must be lawful evil, lawful neutral, neutral evil, or neutral.', evidenceSection: 'Alignment' }] });
set('wizard', 'chronomancer', { c: { 'protecting-allies': 'core' } });
set('wizard', 'clocksmith', { c: { 'practical-expertise': 'core' }, a: { professionIdentity: ['constructor'] } });
// cruoromancer: dhampir-only per the AoN summary tag -- captured automatically by the race-constraint fallback.
set('wizard', 'cruoromancer', { a: { spiritualThemes: ['undead'] } });
set('wizard', 'elder-mythos-scholar', { a: { spiritualThemes: ['outsiders'] }, professionIdentity: [{ value: 'occult investigator', evidenceSection: 'Talisman of Revealing', evidenceText: 'The archetype explicitly hunts and identifies Elder Mythos creatures and their effects.' }] });
set('wizard', 'exploiter-wizard', { c: { 'practical-expertise': 'core' } });
// familiar-adept: a genuine flavor/reflavor archetype (spells stored in the familiar instead of a spellbook, plus a
// deepened school/familiar bond) whose defining mechanic falls inside capabilities the Wizard baseline already covers
// at the same level -- left with no capability override.
set('wizard', 'first-world-caller', { a: { spiritualThemes: ['fey'] } });
set('wizard', 'hallowed-necromancer', { c: { 'healing-recovery': 'available' }, constraints: [{ type: 'code-of-conduct', kind: 'commitment', summary: 'A hallowed necromancer must specialize in necromancy and swears never to create undead.', evidenceSection: 'Arcane School' }] });
set('wizard', 'instructor', { c: { 'tactical-leadership': 'core' }, a: { professionIdentity: ['teacher'] } });
set('wizard', 'pact-wizard-ff', { a: { spiritualThemes: ['patron', 'outsiders'] }, constraints: [{ type: 'patron-oath-order', kind: 'commitment', summary: 'A pact wizard enters a bargain with an extraplanar patron of one outsider subtype; grossly abusing the familiar or acting against the patron’s alignment costs all archetype benefits until atonement.', evidenceSection: 'Pact' }] });
set('wizard', 'pact-wizard-hhh', { a: { spiritualThemes: ['patron'] }, constraints: [{ type: 'patron-oath-order', kind: 'commitment', summary: 'A pact wizard forges a bargain with an otherworldly patron and gains an oracle curse at 5th level as the price of the patron’s power.', evidenceSection: 'Great Power, Greater Expense' }] });
set('wizard', 'poleiheira-adherent', { c: { 'practical-expertise': 'core' }, a: { professionIdentity: ['explorer'] } });
set('wizard', 'primalist', { c: { 'practical-expertise': 'core' } });
set('wizard', 'qadira-mage-of-the-veil', { c: { 'stealth-subterfuge': 'core' }, a: { professionIdentity: ['spy'] } });
set('wizard', 'runesage', { c: { 'practical-expertise': 'core' } });
set('wizard', 'scrollmaster', { c: { 'melee-combat': 'core' }, a: { primaryDelivery: ['improvised weapon'] } });
set('wizard', 'shadowcaster', { a: { elementThemes: ['void'] } });
set('wizard', 'siege-mage', { c: { 'ranged-combat': 'core' } });
set('wizard', 'spell-sage', { c: { 'practical-expertise': 'core' } });
// spellbinder: elf-only per the AoN summary tag -- captured automatically by the race-constraint fallback. Its
// bonded-spell swap is an action-economy trick that falls inside capabilities the Wizard baseline already covers.
set('wizard', 'spirit-binder', { a: { spiritualThemes: ['ancestors'] } });
set('wizard', 'spirit-whisperer', { a: { spiritualThemes: ['spirits'] } });
set('wizard', 'sword-binder', { c: { 'melee-combat': 'core', 'ranged-combat': 'available' } });
set('wizard', 'thassilonian-specialist', { constraints: [{ type: 'domain-choice', kind: 'requirement', summary: 'A Thassilonian specialist must choose one Thassilonian school (tied to a Sin) at 1st level, which cannot be changed and carries two fixed prohibited schools.', evidenceSection: 'Thassilonian Magic' }] });
set('wizard', 'undead-master', { c: { 'summoning-companions': 'core' }, f: { 'has-familiar': false }, a: { spiritualThemes: ['undead'] }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'An undead master must be evil, or he can still use his powers but can’t progress any further as a wizard.', evidenceSection: 'Necromantic Focus' }] });
// wind-listener: sylph-only per the AoN summary tag -- captured automatically by the race-constraint fallback.
set('wizard', 'wind-listener', { c: { 'stealth-subterfuge': 'core' } });
set('wizard', 'worldseeker', { a: { environmentThemes: ['planar'], spiritualThemes: ['outsiders'] } });
// arcane-physician, scroll-scholar and spellslinger: preserved verbatim from prior hand-reviewed pilot data.
set('wizard', 'arcane-physician', { c: { 'healing-recovery': 'available' }, f: { 'has-profession-identity': true }, professionIdentity: [{ value: 'physician', evidenceSection: 'Medicinal Alchemy / Brew Potion', evidenceText: 'The named archetype explicitly practises medicine through alchemical healing items and potion construction.' }] });
set('wizard', 'scroll-scholar', { f: { 'has-profession-identity': true }, professionIdentity: [{ value: 'scholar', evidenceSection: 'Diligent Student / Secrets Revealed', evidenceText: 'The archetype explicitly develops multiple fields of scholarship and language and identification expertise.' }] });
set('wizard', 'spellslinger', { c: { 'ranged-combat': 'core' }, p: { 'equipment-dependence': 'high', versatility: 'medium' }, f: { 'has-firearms': true }, a: { primaryDelivery: ['firearm'] }, constraints: [{ type: 'bonded-entity', kind: 'commitment', summary: 'One or two firearms become arcane guns used to deliver and enhance spells.', evidenceSection: 'Arcane Gun' }] });

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
  if (e.professionIdentity.length) evidence.push({ field: 'professionIdentity', section: sec, reason: `${sec} supports the explicit professional identity without changing the Wizard’s already-core knowledge role.` });
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
