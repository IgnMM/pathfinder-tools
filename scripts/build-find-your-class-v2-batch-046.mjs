import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(repo, 'assets/find-your-class/v2');
const detailDir = path.join(repo, 'assets/find-your-class/aon-catalog/class-details');
const classes = ['vigilante', 'warpriest'];
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

// ---- Vigilante (28) ----
set('vigilante', 'agathiel', { c: { 'transformation-shapeshifting': 'core' }, f: { 'has-shapeshifting': true }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'An agathiel’s social and vigilante identity alignments must both stay within one step of neutral good, or he gains a permanent negative level until they revert.', evidenceSection: 'Immortal Commitment' }] });
set('vigilante', 'anaphexia-thought-killer', { c: { 'knowledge-investigation': 'core' }, a: { spiritualThemes: ['deity'] }, constraints: [{ type: 'weapon-or-armour-restriction', kind: 'commitment', summary: 'Assuming the vigilante identity requires cutting out her own tongue (dealing damage and bleed) and leaves her unable to speak or cast spells until it regenerates.', evidenceSection: 'Tongue Sacrifice' }] });
set('vigilante', 'avenging-beast', { c: { 'wilderness-affinity': 'available' }, f: { 'has-spellcasting': true }, a: { magicIdentity: ['divine'], castingMethod: ['spontaneous'], environmentThemes: ['wilderness'] } });
set('vigilante', 'bellflower-harvester', { c: { 'support-buffing': 'core', 'tactical-leadership': 'core' }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A Bellflower harvester’s vigilante identity must be within one step of chaotic good.', evidenceSection: 'Rebellious Identity' }] });
set('vigilante', 'brute', { c: { 'personal-durability': 'core' }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A brute’s vigilante alignment must be chaotic, and his vigilante and social identities must stay within one step of each other.', evidenceSection: 'Chaotic Vigilante' }, { type: 'weapon-or-armour-restriction', kind: 'commitment', summary: 'Mortal peril can force an involuntary, painful switch to the vigilante identity, and the brute risks attacking allies until he calms down or transforms back.', evidenceSection: 'Brute Form' }] });
set('vigilante', 'cabalist', { f: { 'has-spellcasting': true, 'depends-on-specific-equipment': true }, a: { magicIdentity: ['arcane'], castingMethod: ['prepared'] } });
set('vigilante', 'chu-ye-enforcer', { c: { 'transformation-shapeshifting': 'core' }, f: { 'has-shapeshifting': true, 'depends-on-specific-equipment': true }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A Chu Ye enforcer’s vigilante identity alignment must be non-good.', evidenceSection: 'Yokai Heart' }] });
set('vigilante', 'darklantern', { c: { 'transformation-shapeshifting': 'core', 'utility-magic': 'core' }, f: { 'has-shapeshifting': true }, constraints: [{ type: 'race', kind: 'requirement', summary: 'A darklantern must have the elf subtype.', evidenceSection: 'Elven Ancestry' }, { type: 'alignment', kind: 'requirement', summary: 'A darklantern’s vigilante identity must be chaotic evil.', evidenceSection: 'Dark Identity' }] });
set('vigilante', 'dragonscale-loyalist', { c: { 'practical-expertise': 'core' }, a: { professionIdentity: ['courtier'] } });
set('vigilante', 'experimenter', { c: { 'knowledge-investigation': 'core', 'personal-durability': 'core' } });
set('vigilante', 'faceless-enforcer', { c: { 'personal-durability': 'core' }, f: { 'depends-on-specific-equipment': true } });
set('vigilante', 'ferocious-hunter', { c: { 'personal-durability': 'core' }, constraints: [{ type: 'race', kind: 'requirement', summary: 'A ferocious hunter must present as human for his social identity and as a half-orc for his vigilante identity.', evidenceSection: 'Hidden Heritage' }] });
set('vigilante', 'half-elf-double-scion', { c: { 'single-target-damage': 'core' }, constraints: [{ type: 'race', kind: 'requirement', summary: 'A half-elf double scion must be a half-elf, appearing as an elf in one identity and a human in the other.', evidenceSection: 'Dual Heritage' }] });
set('vigilante', 'hangman', { c: { 'debuffing-enemies': 'core', 'knowledge-investigation': 'core' } });
set('vigilante', 'hidden-current', { c: { 'combat-mobility': 'core' }, a: { environmentThemes: ['maritime'] } });
set('vigilante', 'imperial-agent', { a: { professionIdentity: ['spy'] } });
set('vigilante', 'masked-maiden', { c: { 'personal-durability': 'core' }, f: { 'depends-on-specific-equipment': true }, constraints: [{ type: 'weapon-or-armour-restriction', kind: 'commitment', summary: 'Mortal peril while in the social identity can force an involuntary Will-save-gated switch to the vigilante identity, and a maiden compelled this way cannot switch back that day.', evidenceSection: 'Imperfect Control' }] });
set('vigilante', 'mounted-fury', { c: { 'summoning-companions': 'core' }, f: { 'has-mount': true, 'controls-additional-entity': true }, a: { primaryDelivery: ['mount'] } });
set('vigilante', 'mutated-defender', { c: { 'transformation-shapeshifting': 'core' }, f: { 'has-shapeshifting': true } });
set('vigilante', 'psychometrist', { c: { 'utility-magic': 'core' } });
set('vigilante', 'serial-killer', { c: { 'debuffing-enemies': 'core' }, f: { 'has-sneak-attack': true }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A serial killer’s vigilante identity must be evil.', evidenceSection: 'Alignment' }] });
// splintersoul: a genuine flavor/duality archetype (two disparate alignments and codes of conduct across identities)
// whose defining mechanic is about multiclass compatibility rather than a positive capability shift -- left with no
// capability override, matching the established convention for such archetypes.
// teisatsu: gains a ki pool and unique talents that the scraped source text truncates before listing -- rather than
// guess at unseen talent text, this is left flavor-only (stealth-subterfuge is already core at the Vigilante baseline).
set('vigilante', 'warlock', { f: { 'has-spellcasting': true }, a: { magicIdentity: ['arcane'], castingMethod: ['prepared'] } });
set('vigilante', 'wildsoul', { c: { 'debuffing-enemies': 'core', 'combat-mobility': 'core' } });
set('vigilante', 'zealot', { f: { 'has-spellcasting': true, 'requires-deity': true }, a: { magicIdentity: ['divine'], castingMethod: ['spontaneous'], spiritualThemes: ['deity'] } });
// gunmaster and magical-child: preserved verbatim from prior hand-reviewed pilot data.
set('vigilante', 'gunmaster', { c: { 'ranged-combat': 'core' }, p: { 'equipment-dependence': 'high' }, f: { 'has-firearms': true }, a: { primaryDelivery: ['firearm'] } });
set('vigilante', 'magical-child', { c: { 'summoning-companions': 'core' }, p: { 'resource-management': 'high' }, f: { 'has-spellcasting': true, 'has-familiar': true, 'controls-additional-entity': true }, a: { magicIdentity: ['arcane'], castingMethod: ['spontaneous'], castingExtent: ['partial'], primaryDelivery: ['companion'] } });

// ---- Warpriest (18) ----
set('warpriest', 'calamity-caller', { c: { 'area-multi-target-damage': 'core' }, constraints: [{ type: 'race', kind: 'requirement', summary: 'A calamity caller must be an elf.', evidenceSection: 'Calamity Caller' }, { type: 'element-choice', kind: 'requirement', summary: 'A calamity caller must select the Earthquake, Flood, Tornado, or Wildfire blessing as one of his two blessings.', evidenceSection: 'Catastrophic Blessing' }] });
// champion-of-the-faith: the chosen-alignment smite package strengthens an ability the Warpriest baseline already
// covers at the same tier (single-target-damage already core) -- left with no capability override.
set('warpriest', 'champion-of-the-faith', { constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A champion of the faith must select a chosen alignment (chaos, evil, good, or law) shared with his deity, and gains smite against creatures of the opposing alignment.', evidenceSection: 'Chosen Alignment' }] });
set('warpriest', 'cult-leader', { c: { 'stealth-subterfuge': 'core', 'debuffing-enemies': 'core' }, f: { 'has-sneak-attack': true } });
set('warpriest', 'disenchanter', { c: { 'anti-magic-disruption': 'core' } });
set('warpriest', 'divine-champion', { c: { 'knowledge-investigation': 'core' }, a: { professionIdentity: ['crusader'] } });
set('warpriest', 'divine-commander', { c: { 'summoning-companions': 'core', 'tactical-leadership': 'core' }, f: { 'has-mount': true, 'controls-additional-entity': true }, a: { primaryDelivery: ['mount'] } });
set('warpriest', 'feral-champion', { c: { 'transformation-shapeshifting': 'core' }, f: { 'has-shapeshifting': true }, a: { spiritualThemes: ['nature'] } });
set('warpriest', 'fist-of-the-godclaw', { constraints: [{ type: 'deity', kind: 'requirement', summary: 'A fist of the Godclaw must be lawful and worship Abadar, Asmodeus, Iomedae, Irori, Torag, or the shared pantheon known as the Godclaw.', evidenceSection: 'Deities' }], a: { spiritualThemes: ['law'] } });
set('warpriest', 'forgepriest', { c: { 'practical-expertise': 'core', 'utility-magic': 'core' }, a: { professionIdentity: ['blacksmith'] } });
set('warpriest', 'jistkan-magistrate', { c: { 'summoning-companions': 'core' }, f: { 'controls-additional-entity': true }, constraints: [{ type: 'element-choice', kind: 'requirement', summary: 'A Jistkan magistrate must worship a deity who grants the Air, Earth, Fire, or Water blessing and select that as his only blessing.', evidenceSection: 'Elemental Binder' }] });
set('warpriest', 'liberty-s-blade', { c: { 'debuffing-enemies': 'core' }, constraints: [{ type: 'deity', kind: 'requirement', summary: 'A liberty’s blade must worship a good deity who grants the Liberation blessing, and must select it as her only blessing.', evidenceSection: 'Freedom’s Focus' }], a: { spiritualThemes: ['freedom'] } });
set('warpriest', 'mantis-zealot', { c: { 'stealth-subterfuge': 'core', 'debuffing-enemies': 'core' }, f: { 'has-sneak-attack': true }, constraints: [{ type: 'deity', kind: 'requirement', summary: 'A mantis zealot must worship Achaekek and be lawful evil, or he loses the archetype and becomes a normal warpriest.', evidenceSection: 'Mantis Sworn' }] });
set('warpriest', 'molthuni-arsenal-chaplain', { c: { 'tactical-leadership': 'core' }, a: { spiritualThemes: ['war'] } });
set('warpriest', 'proclaimer', { c: { 'area-multi-target-damage': 'core' }, constraints: [{ type: 'alignment', kind: 'requirement', summary: 'A proclaimer cannot be evil or worship an evil deity, and must choose cure spells for spontaneous casting.', evidenceSection: 'Righteous Oath' }], a: { spiritualThemes: ['outsiders'] } });
set('warpriest', 'proselytizer', { c: { 'debuffing-enemies': 'core', 'social-influence': 'core' } });
set('warpriest', 'sixth-wing-bulwark', { c: { 'protecting-allies': 'core', 'personal-durability': 'core' }, constraints: [{ type: 'deity', kind: 'requirement', summary: 'A Sixth Wing bulwark must worship Ragathiel, or she loses this archetype and cannot regain it.', evidenceSection: 'Sixth Wing Sworn' }] });
// sacred-fist and shieldbearer: preserved verbatim from prior hand-reviewed pilot data.
set('warpriest', 'sacred-fist', { p: { 'equipment-dependence': 'low' }, a: { primaryDelivery: ['unarmed'] }, r: { primaryDelivery: ['melee weapon'] }, constraints: [{ type: 'weapon-or-armour-restriction', kind: 'commitment', summary: 'AC and flurry benefits require remaining unarmoured, unshielded and lightly encumbered.', evidenceSection: 'Weapon and Armor Proficiency / AC Bonus' }] });
set('warpriest', 'shieldbearer', { constraints: [{ type: 'weapon-or-armour-restriction', kind: 'commitment', summary: 'Sacred weapon, sacred shield and altered channel energy all depend on carrying a shield.', evidenceSection: 'Shield Adept / Channel Energy' }] });

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
