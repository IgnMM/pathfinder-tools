// Find Your Class Compass v2 -- Prestige Class curation.
//
// Unlike an archetype, a prestige class has no single parent to store a delta
// against (it's entered from many different base-class/multiclass
// combinations), so every profile here is a FULL, standalone, hand-authored
// capabilities/practical/facts/identity profile -- the same shape as a base
// class-path (see assets/find-your-class/v2/class-profiles-batch-*.json),
// not a delta. Every rating below is derived from the real scraped AoN
// requirements/level-progression text in
// assets/find-your-class/aon-catalog/aon-prestige-class-details.json, read in
// full, never inferred/pattern-matched -- same standing rule as the
// archetype catalogue.
//
// This file is curated incrementally: PROFILES only lists the prestige
// classes authored so far. Re-run after adding more entries; the script
// throws if an id isn't a real scraped prestige class (typo protection) and
// prints exactly how many of the 119 remain uncurated.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(repo, 'assets/find-your-class/v2');
const detailPath = path.join(repo, 'assets/find-your-class/aon-catalog/aon-prestige-class-details.json');
const details = JSON.parse(fs.readFileSync(detailPath, 'utf8')).profiles;
const detailById = new Map(details.map(x => [x.id, x]));

const CAPABILITY_IDS = ['melee-combat', 'ranged-combat', 'offensive-magic', 'single-target-damage', 'area-multi-target-damage', 'combat-manoeuvres', 'tactical-leadership', 'personal-durability', 'protecting-allies', 'battlefield-control', 'combat-mobility', 'debuffing-enemies', 'anti-magic-disruption', 'support-buffing', 'healing-recovery', 'defensive-protective-magic', 'utility-magic', 'summoning-companions', 'transformation-shapeshifting', 'practical-expertise', 'social-influence', 'knowledge-investigation', 'stealth-subterfuge', 'wilderness-affinity'];
const PRACTICAL_IDS = ['build-complexity', 'play-complexity', 'attribute-demands', 'equipment-dependence', 'resource-management', 'versatility'];
const FACT_IDS = ['has-spellcasting', 'has-animal-companion', 'has-familiar', 'has-mount', 'has-code-of-conduct', 'requires-deity', 'requires-alignment', 'has-shapeshifting', 'has-sneak-attack', 'has-healing', 'has-firearms', 'has-bombs', 'has-rage', 'has-profession-identity', 'depends-on-specific-equipment', 'controls-additional-entity'];
const IDENTITY_KEYS = ['magicIdentity', 'castingMethod', 'castingExtent', 'environmentThemes', 'spiritualThemes', 'elementThemes', 'professionIdentity', 'primaryDelivery'];

function author(key, {c, p, f, identity, constraints = [], professionIdentity = [], playerSummary, tradeoff}) {
  const id = `prestige:${key}`;
  const x = detailById.get(id);
  if (!x) throw new Error(`Unknown prestige class id: ${id}`);
  const capabilities = Object.fromEntries(CAPABILITY_IDS.map(cid => [cid, c[cid] || 'absent']));
  for (const k of Object.keys(c)) if (!CAPABILITY_IDS.includes(k)) throw new Error(`${id}: unknown capability "${k}"`);
  const practical = Object.fromEntries(PRACTICAL_IDS.map(pid => [pid, p[pid]]));
  for (const k of PRACTICAL_IDS) if (!practical[k]) throw new Error(`${id}: missing practical rating "${k}"`);
  const facts = Object.fromEntries(FACT_IDS.map(fid => [fid, !!f[fid]]));
  for (const k of Object.keys(f)) if (!FACT_IDS.includes(k)) throw new Error(`${id}: unknown fact "${k}"`);
  const fullIdentity = {};
  for (const k of IDENTITY_KEYS) fullIdentity[k] = identity[k] || [];
  for (const k of Object.keys(identity)) if (!IDENTITY_KEYS.includes(k)) throw new Error(`${id}: unknown identity key "${k}"`);
  return {
    id, name: x.name, sourceCitationText: x.sourceCitationText, sourceUrl: x.aonUrl,
    requirementsText: x.requirementsText, hitDie: x.hitDie,
    capabilities, practical, facts, identity: fullIdentity, constraints, professionIdentity,
    playerSummary, tradeoff, reviewStatus: 'reviewed',
  };
}

const PROFILES = [
  author('arcane-archer', {
    c: {'ranged-combat': 'core', 'offensive-magic': 'available', 'single-target-damage': 'core', 'area-multi-target-damage': 'available', 'debuffing-enemies': 'available', 'utility-magic': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'high', 'resource-management': 'medium', versatility: 'low'},
    f: {'has-spellcasting': true, 'depends-on-specific-equipment': true},
    identity: {magicIdentity: ['arcane'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['none'], elementThemes: ['mixed'], primaryDelivery: ['ranged weapon']},
    playerSummary: 'A ranged-combat specialist who fuses archery with continued arcane spellcasting, imbuing arrows with magic to strike past cover, deal elemental damage, and eventually deliver a save-or-die shot.',
    tradeoff: 'Entry requires a steep feat chain (Point-Blank Shot, Precise Shot, Weapon Focus with a bow) plus base attack bonus +6 and 1st-level arcane spells, and its own spellcasting only advances at the reduced rate of a prestige class.',
  }),
  author('arcane-trickster', {
    c: {'ranged-combat': 'available', 'offensive-magic': 'available', 'single-target-damage': 'core', 'debuffing-enemies': 'available', 'utility-magic': 'available', 'practical-expertise': 'available', 'stealth-subterfuge': 'core'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'medium', versatility: 'medium'},
    f: {'has-spellcasting': true, 'has-sneak-attack': true},
    identity: {magicIdentity: ['arcane'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['melee weapon', 'ranged weapon', 'spellcasting']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'An arcane trickster must be nonlawful.', evidenceSection: 'Alignment'}],
    playerSummary: 'A rogue-mage hybrid whose magic reinforces its thievery -- delivering Disable Device and Sleight of Hand at range, stacking sneak attack onto damage spells, and turning invisible at will by 9th level.',
    tradeoff: 'Entry demands a nonlawful alignment, Disable Device/Escape Artist/Knowledge (arcana) ranks, an existing arcane spellcasting class and sneak attack +2d6 already in hand, and its own spellcasting only advances at the reduced rate of a prestige class.',
  }),
  author('assassin', {
    c: {'melee-combat': 'core', 'single-target-damage': 'core', 'debuffing-enemies': 'core', 'stealth-subterfuge': 'core'},
    p: {'build-complexity': 'medium', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'low'},
    f: {'has-sneak-attack': true, 'requires-alignment': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['melee weapon']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'An assassin must be evil, and must have killed someone for no other reason than to join the class.', evidenceSection: 'Alignment'}],
    playerSummary: 'A cold, methodical killer built around the death attack -- study a target for 3 rounds, then land a melee sneak attack that can outright kill or paralyze, backed by poison use, uncanny dodge and eventual invisibility-adjacent stealth.',
    tradeoff: 'Entry requires an evil alignment, Disguise/Stealth ranks, and killing someone specifically to join the class, and the class has no ranged options and only light armor proficiency.',
  }),
  author('dragon-disciple', {
    c: {'melee-combat': 'available', 'offensive-magic': 'core', 'single-target-damage': 'available', 'area-multi-target-damage': 'available', 'personal-durability': 'core', 'combat-mobility': 'available', 'utility-magic': 'available', 'transformation-shapeshifting': 'core'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'medium', versatility: 'medium'},
    f: {'has-spellcasting': true, 'has-shapeshifting': true},
    identity: {magicIdentity: ['arcane'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['none'], elementThemes: ['mixed'], primaryDelivery: ['spellcasting', 'natural attacks']},
    constraints: [{type: 'bloodline-choice', kind: 'commitment', summary: 'A dragon disciple must select (or already have) the draconic sorcerer bloodline and a specific dragon type; a sorcerer who gains levels after joining this class must take the draconic bloodline.', evidenceSection: 'Spellcasting / Blood of Dragons'}],
    playerSummary: 'A spellcaster who channels draconic bloodline power into physical toughness and offense -- gaining claws and a bite, a breath weapon, thickening natural armor, and eventually the ability to transform fully into a dragon.',
    tradeoff: 'Entry requires a nondragon race, Knowledge (arcana) 5 ranks, Draconic, and spontaneous 1st-level arcane spells (with a sorcerer’s bloodline locked to draconic), and its own spellcasting only advances at the reduced rate of a prestige class.',
  }),
  author('duelist', {
    c: {'melee-combat': 'core', 'single-target-damage': 'core', 'personal-durability': 'core', 'protecting-allies': 'available', 'combat-mobility': 'core', 'debuffing-enemies': 'available'},
    p: {'build-complexity': 'medium', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'high', 'resource-management': 'low', versatility: 'low'},
    f: {'depends-on-specific-equipment': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['melee weapon']},
    constraints: [{type: 'weapon-or-armour-restriction', kind: 'commitment', summary: 'Canny Defense, Enhanced Mobility, Grace and precise strike all require light or no armor and no shield, and precise strike/crippling critical require a light or one-handed piercing weapon.', evidenceSection: 'Canny Defense / Precise Strike'}],
    playerSummary: 'A light-armored melee duelist who turns Intelligence and swift footwork into a wall of defense, parrying and riposting incoming blows while striking precisely with a piercing weapon.',
    tradeoff: 'Entry requires base attack bonus +6, Acrobatics/Perform ranks, and Dodge/Mobility/Weapon Finesse already in hand, and nearly every signature ability only functions in light or no armor with a light or one-handed piercing weapon.',
  }),
  author('eldritch-knight', {
    c: {'melee-combat': 'core', 'offensive-magic': 'core', 'single-target-damage': 'core', 'area-multi-target-damage': 'available', 'battlefield-control': 'available', 'debuffing-enemies': 'available', 'defensive-protective-magic': 'available', 'utility-magic': 'available', 'practical-expertise': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'medium', 'resource-management': 'medium', versatility: 'high'},
    f: {'has-spellcasting': true},
    identity: {magicIdentity: ['arcane'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['melee weapon', 'spellcasting']},
    playerSummary: 'A martial-arcane hybrid who wades into melee in full armor and spellcasting alike -- gaining bonus combat feats, sustained spell progression, and eventually a free swift-action spell whenever a critical hit lands.',
    tradeoff: 'Entry requires proficiency with all martial weapons and the ability to cast 3rd-level arcane spells, and its own spellcasting only advances at the reduced rate of a prestige class.',
  }),
  author('horizon-walker', {
    c: {'melee-combat': 'available', 'single-target-damage': 'available', 'tactical-leadership': 'available', 'personal-durability': 'available', 'protecting-allies': 'available', 'combat-mobility': 'core', 'support-buffing': 'available', 'utility-magic': 'available', 'practical-expertise': 'available', 'stealth-subterfuge': 'available', 'wilderness-affinity': 'core'},
    p: {'build-complexity': 'medium', 'play-complexity': 'high', 'attribute-demands': 'medium', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'high'},
    f: {},
    identity: {magicIdentity: ['other'], castingMethod: ['spell-like'], castingExtent: ['limited'], environmentThemes: ['wilderness', 'planar'], spiritualThemes: ['none'], elementThemes: ['mixed'], primaryDelivery: ['melee weapon']},
    playerSummary: 'A wilderness specialist who becomes the master of chosen terrains -- gaining ranger-style favored terrain bonuses, passive elemental resistances and skill bonuses per terrain, and increasingly powerful terrain-specific spell-like abilities.',
    tradeoff: 'Entry only requires Knowledge (geography) 6 ranks and the Endurance feat, but its terrain-by-terrain abilities are numerous to track and largely useless outside a matching or mastered environment until the 10th-level capstone.',
  }),
  author('loremaster', {
    c: {'offensive-magic': 'available', 'utility-magic': 'core', 'practical-expertise': 'core', 'knowledge-investigation': 'core'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'low', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'high'},
    f: {'has-spellcasting': true},
    identity: {magicIdentity: ['other'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    professionIdentity: [{value: 'scholar', evidenceSection: 'Lore / Secret', evidenceText: 'The class is explicitly built around accumulating knowledge, secrets and scholarly mastery.'}],
    playerSummary: 'A scholarly spellcaster who turns broad knowledge into flexible power -- choosing from a menu of secrets (bonus feats, save bonuses, skill mastery, extra spells), identifying magic items at a glance, and eventually casting legend lore or analyze dweomer once per day for free.',
    tradeoff: 'Entry requires 7 ranks each in two Knowledge skills, three metamagic or item-creation feats plus Skill Focus (Knowledge), and the ability to cast seven different divination spells, and its own spellcasting only advances at the reduced rate of a prestige class.',
  }),
];

const seen = new Set(PROFILES.map(p => p.id));
const dup = PROFILES.map(p => p.id).filter((id, i, all) => all.indexOf(id) !== i);
if (dup.length) throw new Error(`Duplicate authored prestige ids: ${dup.join(', ')}`);

fs.writeFileSync(path.join(dir, 'prestige-profiles.json'), `${JSON.stringify({schemaVersion: 1, status: 'reviewed', inheritanceRule: 'Every prestige class is a standalone, fully-authored profile -- no parent class to inherit from.', profiles: PROFILES}, null, 2)}\n`);
console.log(`authored ${PROFILES.length}/${details.length} prestige classes (${details.length - PROFILES.length} remaining)`);
