import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(repo, 'assets/find-your-class/v2');
const detailDir = path.join(repo, 'assets/find-your-class/aon-catalog/class-details');
const classes = ['psychic', 'ranger'];
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

// ---- Psychic (8) ----
set('psychic', 'formless-adept', { c: { 'transformation-shapeshifting': 'core', 'personal-durability': 'available' }, f: { 'has-shapeshifting': true }, a: { primaryDelivery: ['incorporeal form'] } });
set('psychic', 'magaambyan-telepath', { c: { 'wilderness-affinity': 'available' }, a: { spiritualThemes: ['nature'], magicIdentity: ['nature'] } });
set('psychic', 'psychic-marauder', { c: { 'personal-durability': 'available' }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A psychic marauder must be of nonlawful alignment.', evidenceSection: 'Alignment' }] });
set('psychic', 'terror-weaver', { c: { 'debuffing-enemies': 'core' }, constraints: [{ type: 'race', kind: 'requirement', summary: 'This archetype is restricted to half-orc characters.', evidenceSection: 'Archetype requirement' }] });
// amnesiac and esoteric-starseeker: genuine flavor/resource-management shifts with no material capability delta beyond the psychic baseline (build/resource-management/versatility already high). Left with no capability override -- evidence falls back to the playerSummary entry, same as similar flavor-only archetypes in prior batches.
// mutation-mind and psychic-duelist: preserved verbatim from prior hand-reviewed pilot data (archetype-profiles-pilot-06.json).
set('psychic', 'mutation-mind', { c: { 'melee-combat': 'available', 'transformation-shapeshifting': 'core' }, f: { 'has-shapeshifting': true }, a: { primaryDelivery: ['natural attacks'] } });
set('psychic', 'psychic-duelist', { c: { 'single-target-damage': 'core' } });

// ---- Ranger (62) ----
set('ranger', 'abendego-diver', { c: { 'combat-mobility': 'available' }, a: { environmentThemes: ['maritime'], elementThemes: ['water'] } });
set('ranger', 'battle-scout', { c: { 'tactical-leadership': 'core' }, f: { 'has-animal-companion': false, 'controls-additional-entity': false }, r: { primaryDelivery: ['companion'] } });
set('ranger', 'beast-master', { c: { 'summoning-companions': 'core' } });
set('ranger', 'blightwarden', { c: { 'debuffing-enemies': 'core' }, a: { spiritualThemes: ['decay'] } });
set('ranger', 'bow-nomad', { a: { primaryDelivery: ['dual ranged weapons'] }, constraints: [{ type: 'race', kind: 'requirement', summary: 'This archetype is available to kasathas and other races with four or more arms.', evidenceSection: 'Archetype requirement' }] });
set('ranger', 'cinderwalker', { c: { 'personal-durability': 'available' }, a: { elementThemes: ['fire'], environmentThemes: ['mountains'] } });
set('ranger', 'code-runner', { c: { 'knowledge-investigation': 'available', 'anti-magic-disruption': 'available' }, a: { professionIdentity: ['courier'] } });
set('ranger', 'corpse-hunter', { c: { 'anti-magic-disruption': 'core' }, a: { spiritualThemes: ['undead'], professionIdentity: ['undead hunter'] } });
set('ranger', 'dandy', { c: { 'social-influence': 'core' }, a: { environmentThemes: ['urban'], professionIdentity: ['courtier'] } });
set('ranger', 'darklands-sailor', { c: { 'personal-durability': 'available' }, a: { environmentThemes: ['underground', 'maritime'] } });
set('ranger', 'deep-walker', { a: { environmentThemes: ['underground'] } });
set('ranger', 'divine-tracker', { c: { 'support-buffing': 'available' }, f: { 'requires-deity': true }, a: { spiritualThemes: ['deity'], magicIdentity: ['divine'] } });
set('ranger', 'dragon-hunter', { c: { 'personal-durability': 'available' }, a: { spiritualThemes: ['dragons'], professionIdentity: ['dragon hunter'] } });
set('ranger', 'drake-warden', { c: { 'summoning-companions': 'core' }, a: { spiritualThemes: ['dragons'] } });
set('ranger', 'dungeon-rover', { a: { environmentThemes: ['underground'] } });
set('ranger', 'dusk-stalker', { c: { 'debuffing-enemies': 'available' }, a: { elementThemes: ['void'], environmentThemes: ['planar'] } });
set('ranger', 'elemental-envoy', { a: { environmentThemes: ['planar'], elementThemes: ['mixed'] } });
set('ranger', 'flamewarden', { c: { 'healing-recovery': 'core', 'personal-durability': 'available' }, a: { elementThemes: ['fire'] } });
set('ranger', 'freebooter', { c: { 'tactical-leadership': 'core' }, a: { environmentThemes: ['maritime'], professionIdentity: ['pirate'] } });
set('ranger', 'galvanic-saboteur', { c: { 'battlefield-control': 'available', 'practical-expertise': 'available' }, a: { professionIdentity: ['saboteur'] } });
set('ranger', 'groom', { c: { 'practical-expertise': 'available' }, a: { professionIdentity: ['groom'] } });
set('ranger', 'guide', { c: { 'tactical-leadership': 'core', 'support-buffing': 'available' } });
set('ranger', 'guildbreaker', { c: { 'social-influence': 'core', 'stealth-subterfuge': 'available' }, a: { environmentThemes: ['urban'], professionIdentity: ['infiltrator'] } });
set('ranger', 'hooded-champion', { c: { 'combat-mobility': 'available' } });
set('ranger', 'horse-lord', { c: { 'summoning-companions': 'core', 'combat-mobility': 'available' }, f: { 'has-mount': true } });
set('ranger', 'ilsurian-archer', { c: { 'offensive-magic': 'absent', 'utility-magic': 'absent' }, f: { 'has-spellcasting': false }, p: { versatility: 'low' }, r: { magicIdentity: ['nature', 'divine'], castingMethod: ['prepared'], castingExtent: ['partial'], primaryDelivery: ['spellcasting'] } });
set('ranger', 'infiltrator', { c: { 'personal-durability': 'available' } });
set('ranger', 'jungle-lord', { c: { 'summoning-companions': 'core' }, a: { environmentThemes: ['jungle'] } });
set('ranger', 'lantern-lighter', { c: { 'personal-durability': 'available' }, a: { environmentThemes: ['underground'] } });
set('ranger', 'nirmathi-irregular', { p: { versatility: 'low' }, a: { magicIdentity: ['nature'] } });
set('ranger', 'planar-scout', { c: { 'combat-mobility': 'available' }, a: { environmentThemes: ['planar'], spiritualThemes: ['outsiders'] } });
set('ranger', 'poison-darter', { c: { 'debuffing-enemies': 'core' }, f: { 'has-sneak-attack': true }, a: { professionIdentity: ['poisoner'] } });
set('ranger', 'raven-master', { c: { 'summoning-companions': 'core', 'stealth-subterfuge': 'available' }, a: { professionIdentity: ['spy'] } });
set('ranger', 'realm-wanderer', { c: { 'social-influence': 'available' }, a: { spiritualThemes: ['outsiders'] } });
set('ranger', 'sable-company-marine', { c: { 'summoning-companions': 'core' }, f: { 'has-mount': true }, a: { environmentThemes: ['sky'] } });
set('ranger', 'sentinel', { c: { 'knowledge-investigation': 'available', 'personal-durability': 'available' }, a: { professionIdentity: ['investigator'] } });
set('ranger', 'skirmisher', { f: { 'has-spellcasting': false }, c: { 'combat-mobility': 'core', 'offensive-magic': 'absent', 'utility-magic': 'absent' }, r: { magicIdentity: ['nature', 'divine'], castingMethod: ['prepared'], castingExtent: ['partial'], primaryDelivery: ['spellcasting'] } });
set('ranger', 'spirit-ranger', { c: { 'utility-magic': 'available' }, f: { 'has-animal-companion': false, 'controls-additional-entity': false }, r: { primaryDelivery: ['companion'] } });
set('ranger', 'stormwalker', { c: { 'combat-mobility': 'core' }, a: { elementThemes: ['air'] } });
set('ranger', 'summit-sentinel', { c: { 'personal-durability': 'core', 'area-multi-target-damage': 'available' }, a: { environmentThemes: ['mountains'], elementThemes: ['earth'] } });
set('ranger', 'sword-devil', { f: { 'has-spellcasting': false }, c: { 'tactical-leadership': 'available', 'personal-durability': 'available', 'offensive-magic': 'absent', 'utility-magic': 'absent' }, r: { magicIdentity: ['nature', 'divine'], castingMethod: ['prepared'], castingExtent: ['partial'], primaryDelivery: ['spellcasting'] } });
set('ranger', 'tanglebriar-demonslayer', { c: { 'anti-magic-disruption': 'core' }, a: { spiritualThemes: ['outsiders'], professionIdentity: ['demon hunter'] }, constraints: [{ type: 'faction', kind: 'requirement', summary: 'This archetype is available only to elves sworn to defend Kyonin against the demon lord Treerazer.', evidenceSection: 'Archetype requirement' }] });
set('ranger', 'tidal-hunter', { c: { 'combat-mobility': 'available' }, a: { environmentThemes: ['maritime'], elementThemes: ['water'] } });
set('ranger', 'toxic-herbalist', { c: { 'healing-recovery': 'core', 'debuffing-enemies': 'available' }, a: { professionIdentity: ['herbalist'] } });
set('ranger', 'toxophilite', { c: { 'personal-durability': 'available' } });
set('ranger', 'transporter', { c: { 'stealth-subterfuge': 'available', 'support-buffing': 'available' }, a: { professionIdentity: ['smuggler'] } });
set('ranger', 'trapper', { f: { 'has-spellcasting': false }, c: { 'battlefield-control': 'core', 'offensive-magic': 'absent', 'utility-magic': 'absent' }, a: { primaryDelivery: ['traps'] }, r: { magicIdentity: ['nature', 'divine'], castingMethod: ['prepared'], castingExtent: ['partial'], primaryDelivery: ['spellcasting'] } });
set('ranger', 'trophy-hunter', { f: { 'has-firearms': true }, a: { primaryDelivery: ['firearm'], professionIdentity: ['trophy hunter'] } });
set('ranger', 'urban-ranger', { c: { 'wilderness-affinity': 'absent', 'stealth-subterfuge': 'core', 'knowledge-investigation': 'available' }, a: { environmentThemes: ['urban'] }, r: { environmentThemes: ['wilderness'] } });
set('ranger', 'warden', { c: { 'tactical-leadership': 'core', 'knowledge-investigation': 'available' } });
set('ranger', 'wave-warden', { c: { 'summoning-companions': 'available', 'combat-mobility': 'available' }, a: { environmentThemes: ['maritime'], elementThemes: ['water'] } });
set('ranger', 'wild-hunter', { c: { 'transformation-shapeshifting': 'available' } });
set('ranger', 'wild-shadow', { c: { 'battlefield-control': 'core' }, r: { environmentThemes: ['urban'] } });
set('ranger', 'wild-soul', { c: { 'anti-magic-disruption': 'core' }, constraints: [{ type: 'conduct', kind: 'commitment', summary: 'A wild soul swears never to use or benefit from advanced technology, alchemy, arcane magic or firearms, and loses this archetype’s abilities until atoning if he violates the oath.', evidenceSection: 'Unfettered Soul' }] });
set('ranger', 'wild-stalker', { c: { 'personal-durability': 'core' }, f: { 'has-rage': true } });
set('ranger', 'wilderness-explorer', { c: { 'social-influence': 'available', 'personal-durability': 'available' } });
set('ranger', 'witchguard', { c: { 'protecting-allies': 'core' }, a: { magicIdentity: ['arcane'], professionIdentity: ['bodyguard'] } });
set('ranger', 'yokai-hunter', { c: { 'anti-magic-disruption': 'available', 'knowledge-investigation': 'available' }, a: { spiritualThemes: ['spirits'], professionIdentity: ['yokai hunter'] } });
// wilderness-medic and shapeshifter: preserved verbatim from prior hand-reviewed pilot data.
set('ranger', 'wilderness-medic', { c: { 'healing-recovery': 'core', 'protecting-allies': 'core' }, f: { 'has-profession-identity': true }, professionIdentity: [{ value: 'wilderness medic', evidenceSection: 'Herbalist Training / Herbal Medicine', evidenceText: 'The source explicitly makes field medicine, herbal treatment and ally recovery the archetype’s vocation.' }] });
set('ranger', 'shapeshifter', { c: { 'transformation-shapeshifting': 'core' }, f: { 'has-shapeshifting': true }, a: { primaryDelivery: ['natural attacks'] } });

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
