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
  author('master-spy', {
    c: {'single-target-damage': 'available', 'defensive-protective-magic': 'available', 'practical-expertise': 'available', 'social-influence': 'core', 'stealth-subterfuge': 'core'},
    p: {'build-complexity': 'medium', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'medium'},
    f: {'has-sneak-attack': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['melee weapon']},
    playerSummary: 'A master of identity and deception who fools truth-detecting magic, mind-reading and alignment-detection alike, backed by scaling sneak attack and an assassin-style death attack, culminating in the ability to fully assume another creature’s identity against divination.',
    tradeoff: 'Entry requires the Deceitful and Iron Will feats plus heavy Bluff/Disguise/Perception/Sense Motive investment, and it has no combat features beyond sneak attack and a late death attack -- it lives or dies by never being caught.',
  }),
  author('mystic-theurge', {
    c: {'offensive-magic': 'core', 'single-target-damage': 'available', 'area-multi-target-damage': 'available', 'healing-recovery': 'available', 'defensive-protective-magic': 'available', 'utility-magic': 'core', 'support-buffing': 'available', 'battlefield-control': 'available', 'debuffing-enemies': 'available', 'anti-magic-disruption': 'available', 'summoning-companions': 'available', 'transformation-shapeshifting': 'available', 'knowledge-investigation': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'high', versatility: 'high'},
    f: {'has-spellcasting': true},
    identity: {magicIdentity: ['arcane', 'divine'], castingMethod: ['mixed'], castingExtent: ['full'], spiritualThemes: ['deity'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    playerSummary: 'The archetypal dual-caster: someone who already juggles a full arcane and a full divine spellcasting class continues advancing BOTH simultaneously, eventually able to borrow spell slots between the two lists and cast one spell from each list as a single action.',
    tradeoff: 'Entry requires already casting 2nd-level spells from both an arcane and a divine class plus Knowledge (arcana) and Knowledge (religion) ranks, and every level advances both spellcasting progressions at only the reduced prestige-class rate rather than a real class level in either.',
  }),
  author('shadowdancer', {
    c: {'melee-combat': 'available', 'offensive-magic': 'available', 'personal-durability': 'available', 'combat-mobility': 'core', 'utility-magic': 'available', 'summoning-companions': 'available', 'stealth-subterfuge': 'core'},
    p: {'build-complexity': 'medium', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'low', 'resource-management': 'medium', versatility: 'medium'},
    f: {'controls-additional-entity': true},
    identity: {magicIdentity: ['other'], castingMethod: ['spell-like'], castingExtent: ['limited'], spiritualThemes: ['undead'], elementThemes: ['none'], primaryDelivery: ['melee weapon']},
    playerSummary: 'A stealth specialist who lives in dim light -- hiding in plain sight, summoning an undead shadow companion, teleporting between shadows, and eventually gaining damage reduction and a blinding critical whenever the fight stays dim.',
    tradeoff: 'Entry requires Combat Reflexes, Dodge and Mobility plus Stealth and Perform (dance) ranks, and its signature abilities (evasion, hide in plain sight, shadow jump, shadow master) only fully function in light or no armor and in dim light.',
  }),
  author('stalwart-defender', {
    c: {'melee-combat': 'core', 'single-target-damage': 'available', 'combat-manoeuvres': 'available', 'personal-durability': 'core', 'protecting-allies': 'available'},
    p: {'build-complexity': 'medium', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'medium', 'resource-management': 'medium', versatility: 'low'},
    f: {},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['melee weapon']},
    constraints: [{type: 'weapon-or-armour-restriction', kind: 'commitment', summary: 'Nearly every signature ability only functions while maintaining the immobile defensive stance, which prevents the defender from voluntarily moving until he ends it (and becomes fatigued afterward).', evidenceSection: 'Defensive Stance'}],
    playerSummary: 'An immovable frontline anchor who enters a defensive stance for scaling AC, damage reduction, and Strength/Constitution boosts -- refusing to yield ground, intercepting attacks meant for allies, and unleashing one last devastating strike even at the brink of death.',
    tradeoff: 'Entry requires base attack bonus +7 plus Dodge, Endurance and Toughness, and nearly every defining ability only works while locked into an immobile defensive stance with limited rounds per day, followed by fatigue when it ends.',
  }),
  author('red-mantis-assassin', {
    c: {'melee-combat': 'core', 'offensive-magic': 'available', 'single-target-damage': 'core', 'personal-durability': 'available', 'battlefield-control': 'available', 'debuffing-enemies': 'core', 'utility-magic': 'available', 'summoning-companions': 'available', 'transformation-shapeshifting': 'core', 'stealth-subterfuge': 'core'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'high', 'resource-management': 'medium', versatility: 'medium'},
    f: {'has-spellcasting': true, 'has-sneak-attack': true, 'requires-alignment': true, 'has-shapeshifting': true, 'depends-on-specific-equipment': true},
    identity: {magicIdentity: ['arcane'], castingMethod: ['spontaneous'], castingExtent: ['limited'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['melee weapon']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A Red Mantis assassin must be lawful evil.', evidenceSection: 'Alignment'}, {type: 'weapon-or-armour-restriction', kind: 'commitment', summary: 'Sabre Fighting and its bonus feats are built entirely around the sawtooth sabre, and Exotic Weapon Proficiency with it is an entry requirement.', evidenceSection: 'Sabre Fighting'}],
    playerSummary: 'A lawful evil order’s elite killer who fights with a signature sawtooth sabre, fascinates victims into a coup de grace with a prayer attack, and eventually transforms into a giant mantis that inflicts negative levels and disease-like bleed.',
    tradeoff: 'Entry requires lawful evil alignment, Exotic Weapon Proficiency with the sawtooth sabre, Two-Weapon Fighting, and heavy Intimidate/Perception/Stealth investment, and nearly every combat feature is built around that one exotic weapon.',
  }),
  author('hellknight', {
    c: {'melee-combat': 'core', 'single-target-damage': 'core', 'personal-durability': 'core', 'debuffing-enemies': 'available', 'social-influence': 'available'},
    p: {'build-complexity': 'medium', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'high', 'resource-management': 'low', versatility: 'low'},
    f: {'requires-alignment': true, 'has-code-of-conduct': true, 'depends-on-specific-equipment': true},
    identity: {magicIdentity: ['other'], castingMethod: ['spell-like'], castingExtent: ['limited'], spiritualThemes: ['other'], elementThemes: ['none'], professionIdentity: ['lawbringer'], primaryDelivery: ['melee weapon']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A Hellknight must be of any lawful alignment.', evidenceSection: 'Alignment'}, {type: 'organization', kind: 'commitment', summary: 'A Hellknight must join a specific order at 1st level, which determines the disciplines available to him, and must have personally slain a devil greater in Hit Dice, witnessed by a Hellknight, to qualify.', evidenceSection: 'Order'}],
    playerSummary: 'A lawful knight-inquisitor clad in signature Hellknight plate, striking down chaos with paladin-like smites and auras, growing resistant to fear and charm magic, and gaining order-specific disciplines against the unlawful.',
    tradeoff: 'Entry requires any lawful alignment, heavy armor proficiency, base attack bonus +5, and personally slaying a devil greater in Hit Dice while witnessed by a Hellknight, and most of its scaling bonuses are tied to wearing Hellknight-specific armor.',
  }),
  author('pathfinder-chronicler', {
    c: {'tactical-leadership': 'available', 'debuffing-enemies': 'available', 'support-buffing': 'core', 'utility-magic': 'available', 'summoning-companions': 'available', 'practical-expertise': 'core', 'social-influence': 'core', 'knowledge-investigation': 'core', 'wilderness-affinity': 'available'},
    p: {'build-complexity': 'medium', 'play-complexity': 'high', 'attribute-demands': 'medium', 'equipment-dependence': 'low', 'resource-management': 'medium', versatility: 'high'},
    f: {'has-profession-identity': true, 'controls-additional-entity': true},
    identity: {magicIdentity: ['other'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    professionIdentity: [{value: 'scholar', evidenceSection: 'Master Scribe / Bardic Knowledge', evidenceText: 'The class is built around scribing, linguistics and knowledge as its entry requirement and central identity.'}, {value: 'chronicler', evidenceSection: 'Epic Tales / Whispering Campaign', evidenceText: 'The class explicitly records and spreads accounts of deeds as its signature performance abilities.'}],
    playerSummary: 'A scholar-adventurer who chronicles legendary deeds while actively creating them -- carrying bardic knowledge and performance, packing a bottomless satchel of mundane gear, spreading rumors that debuff or rally crowds, and eventually summoning spectral barbarian warbands to fight at her side.',
    tradeoff: 'Entry requires Linguistics, Perform (oratory) and Profession (scribe) ranks plus having been professionally paid for written work, and its performance-based support relies on bardic-performance rounds shared with any other bard-like class.',
  }),
  author('holy-vindicator', {
    c: {'melee-combat': 'core', 'offensive-magic': 'available', 'single-target-damage': 'core', 'area-multi-target-damage': 'available', 'personal-durability': 'core', 'debuffing-enemies': 'core', 'healing-recovery': 'core'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'medium', 'resource-management': 'medium', versatility: 'medium'},
    f: {'has-spellcasting': true, 'has-healing': true, 'requires-deity': true},
    identity: {magicIdentity: ['divine'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['deity'], elementThemes: ['none'], primaryDelivery: ['melee weapon', 'spellcasting']},
    playerSummary: 'A battle-cleric who bleeds for their faith -- channeling energy into a shield for AC, opening sacred or profane stigmata for scaling combat bonuses and fast self-healing, and unleashing doom, death knell or bestow curse the instant a critical hit lands.',
    tradeoff: 'Entry requires base attack bonus +5, the channel energy class feature, Knowledge (religion) 5 ranks, Alignment Channel or Elemental Channel, and 1st-level divine spells, and its own spellcasting only advances at the reduced rate of a prestige class.',
  }),
  author('rage-prophet', {
    c: {'melee-combat': 'core', 'offensive-magic': 'available', 'single-target-damage': 'core', 'personal-durability': 'core', 'healing-recovery': 'available', 'utility-magic': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'medium', versatility: 'medium'},
    f: {'has-spellcasting': true, 'has-rage': true, 'requires-alignment': true},
    identity: {magicIdentity: ['divine'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['spirits', 'deity'], elementThemes: ['none'], primaryDelivery: ['melee weapon', 'spellcasting']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A rage prophet must be nonlawful.', evidenceSection: 'Alignment'}],
    playerSummary: 'A barbarian/oracle hybrid who fuses rage with divine magic -- casting cure spells and personal-range spells mid-rage without breaking clarity, drawing on a spirit guide for extra spells and utility, and eventually extending rage by burning spell slots.',
    tradeoff: 'Entry requires base attack bonus +5, the oracle’s curse class feature, the moment of clarity rage power, Knowledge (religion) 5 ranks, and 1st-level divine spells -- meaning it’s only reachable by an existing barbarian/oracle multiclass -- and its own spellcasting only advances at the reduced rate of a prestige class.',
  }),
  author('master-chymist', {
    c: {'melee-combat': 'core', 'ranged-combat': 'available', 'offensive-magic': 'available', 'single-target-damage': 'core', 'area-multi-target-damage': 'available', 'personal-durability': 'core', 'transformation-shapeshifting': 'core', 'utility-magic': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'medium', versatility: 'medium'},
    f: {'has-spellcasting': true, 'has-shapeshifting': true, 'has-bombs': true, 'requires-alignment': true},
    identity: {magicIdentity: ['alchemical'], castingMethod: ['extracts'], castingExtent: ['partial'], spiritualThemes: ['none'], elementThemes: ['mixed'], primaryDelivery: ['melee weapon', 'natural attacks']},
    constraints: [{type: 'curse-or-drawback', kind: 'commitment', summary: 'A master chymist’s mutagenic form has its own distinct alignment (different from her normal form) and can be forced on her involuntarily by a critical hit or a failed Fortitude save.', evidenceSection: 'Mutagenic Form / Mutate'}],
    playerSummary: 'An alchemist who embraces a second, monstrous personality -- transforming into a mutagenic alter ego (with its own alignment) to fight with bombs and brutal melee attacks, customizing that form with mutations like draconic resistances, growth, or evasion.',
    tradeoff: 'Entry requires the ability to create 3rd-level extracts plus the mutagen class feature and the feral or infuse mutagen discovery, and the mutagenic form can be forced on the chymist against her will by a critical hit or a failed Fortitude save.',
  }),
  author('mammoth-rider', {
    c: {'melee-combat': 'core', 'single-target-damage': 'core', 'personal-durability': 'core', 'battlefield-control': 'available', 'debuffing-enemies': 'available', 'summoning-companions': 'core', 'wilderness-affinity': 'available'},
    p: {'build-complexity': 'medium', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'medium', 'resource-management': 'low', versatility: 'low'},
    f: {'has-animal-companion': true, 'has-mount': true, 'controls-additional-entity': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['melee weapon', 'companion']},
    playerSummary: 'A mounted warrior who transforms her already-formidable animal companion into a Huge, battle-hardened juggernaut -- fighting astride it, combining their strength into devastating charges, and eventually becoming immune to fear, fatigue and stunning.',
    tradeoff: 'Entry requires base attack bonus +6, heavy Handle Animal/Ride/Survival investment, and an animal companion (or companion-equivalent mount) with at least 6 Hit Dice already in hand, and nearly every ability requires staying mounted.',
  }),
  author('nature-warden', {
    c: {'personal-durability': 'available', 'combat-mobility': 'available', 'defensive-protective-magic': 'available', 'utility-magic': 'available', 'summoning-companions': 'core', 'practical-expertise': 'available', 'wilderness-affinity': 'core'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'medium', versatility: 'high'},
    f: {'has-spellcasting': true, 'has-animal-companion': true, 'controls-additional-entity': true},
    identity: {magicIdentity: ['divine'], castingMethod: ['mixed'], castingExtent: ['partial'], environmentThemes: ['wilderness'], spiritualThemes: ['nature'], elementThemes: ['none'], primaryDelivery: ['companion', 'spellcasting']},
    playerSummary: 'A wilderness guardian who deepens an already-strong bond with her animal companion into something nearly unbreakable -- sharing terrain mastery and magic resistance with it, granting it silver or cold iron natural weapons, and eventually able to scry on it or ritually revive it from death.',
    tradeoff: 'Entry requires base attack bonus +4, an animal companion, favored terrain, wild empathy and 2nd-level divine spells already in hand, and its own spellcasting only advances at the reduced rate of a prestige class.',
  }),
  author('battle-herald', {
    c: {'tactical-leadership': 'core', 'protecting-allies': 'core', 'support-buffing': 'core', 'healing-recovery': 'available', 'social-influence': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'medium', 'equipment-dependence': 'low', 'resource-management': 'medium', versatility: 'medium'},
    f: {},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], professionIdentity: ['commander'], primaryDelivery: ['melee weapon']},
    playerSummary: 'A battlefield commander who turns inspiring words into hard mechanical bonuses -- issuing one of thirteen different rallying commands to buff allies’ attacks, saves, healing or mobility, layering bardic performance and cavalier banner/tactician tricks into an ever-growing suite of team-wide support.',
    tradeoff: 'Entry requires base attack bonus +4 plus the challenge and inspire courage class features already in hand (meaning a cavalier/bard-adjacent multiclass), Diplomacy/Intimidate/Perform (oratory)/Profession (soldier) ranks, and only one inspiring command can run at a time until 10th level.',
  }),
  author('harrower', {
    c: {'offensive-magic': 'core', 'single-target-damage': 'core', 'healing-recovery': 'available', 'support-buffing': 'core', 'personal-durability': 'available', 'utility-magic': 'core', 'knowledge-investigation': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'high', 'resource-management': 'medium', versatility: 'medium'},
    f: {'has-spellcasting': true, 'requires-alignment': true, 'depends-on-specific-equipment': true},
    identity: {magicIdentity: ['other'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A harrower cannot be true neutral -- she must be chaotic, evil, good, or lawful.', evidenceSection: 'Alignment'}, {type: 'bonded-entity', kind: 'commitment', summary: 'Nearly every signature ability requires owning and drawing from a Harrow deck.', evidenceSection: 'Harrow Casting'}],
    playerSummary: 'A fortune-teller spellcaster who draws cards from a Harrow deck to randomly but powerfully enhance her spells -- boosting damage, DCs, spell resistance penetration or self-healing depending on which suits come up -- and can hurl a spectral deck of force-damage cards at a single enemy.',
    tradeoff: 'Entry requires the Harrowed feat, Knowledge and Perform ranks, 3rd-level spells with at least three divination spells known, a Harrow deck of her own, and a non-true-neutral alignment, and her most powerful abilities depend on the luck of the draw.',
  }),
  author('divine-scion', {
    c: {'offensive-magic': 'core', 'single-target-damage': 'core', 'debuffing-enemies': 'available', 'personal-durability': 'available', 'healing-recovery': 'available', 'utility-magic': 'core'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'medium'},
    f: {'has-spellcasting': true, 'requires-deity': true, 'requires-alignment': true},
    identity: {magicIdentity: ['divine'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['deity'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    constraints: [{type: 'deity', kind: 'requirement', summary: 'A divine scion must have a patron deity, and her alignment must be identical to that deity’s.', evidenceSection: 'Deity / Alignment'}],
    playerSummary: 'A living avatar of her deity’s will who channels one chosen domain ever more purely -- healing herself whenever she casts a domain spell, gaining a domain-specific spell-like ability and skill bonus, and growing increasingly deadly, resistant and terrifying to creatures of an opposing alignment.',
    tradeoff: 'Entry requires Iron Will, Weapon Focus with her deity’s favored weapon, Knowledge (planes)/Knowledge (religion)/Spellcraft ranks, a patron deity whose alignment exactly matches her own, and her own spellcasting only advances at the reduced rate of a prestige class.',
  }),
  author('champion-of-irori', {
    c: {'melee-combat': 'core', 'single-target-damage': 'core', 'area-multi-target-damage': 'available', 'personal-durability': 'available', 'protecting-allies': 'available', 'knowledge-investigation': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'low'},
    f: {'has-code-of-conduct': true, 'requires-deity': true, 'requires-alignment': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['deity'], elementThemes: ['none'], primaryDelivery: ['unarmed']},
    constraints: [{type: 'deity', kind: 'requirement', summary: 'A champion of Irori must be lawful good and worship Irori.', evidenceSection: 'Alignment / Deity'}, {type: 'code-of-conduct', kind: 'commitment', summary: 'A champion of Irori loses all class features if he willingly commits an evil act, and must avoid debts and loans and may not recruit or keep any cohort, follower, animal companion, familiar, or special mount.', evidenceSection: 'Code of Conduct'}],
    playerSummary: 'A lawful-good monk-paladin hybrid devoted to Irori who fights barehanded with escalating smites -- cleaving through chaotic and evil foes with sweeping and eventually whirlwind unarmed strikes, shielding allies from area attacks, and perfecting a single devastating touch attack.',
    tradeoff: 'Entry requires lawful good alignment, worship of Irori, the smite evil and still mind class features already in hand (meaning a paladin/monk-adjacent multiclass), and a strict code of conduct that forbids debts, loans, and any cohort, follower, companion, familiar or mount.',
  }),
  author('evangelist', {
    c: {'personal-durability': 'available', 'practical-expertise': 'core', 'social-influence': 'available', 'combat-mobility': 'available', 'utility-magic': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'high'},
    f: {'requires-deity': true, 'requires-alignment': true},
    identity: {magicIdentity: ['other'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['deity'], elementThemes: ['none'], primaryDelivery: []},
    constraints: [{type: 'deity', kind: 'requirement', summary: 'An evangelist must worship a single specific deity within one step of her own alignment, and must perform a daily obedience to maintain the class’s abilities (including those from her aligned class).', evidenceSection: 'Obedience / Alignment'}],
    playerSummary: 'A remarkably flexible devotee who keeps advancing whatever class she already practiced before answering her deity’s call -- gaining divine boons, an untrained knack for nearly any skill, and eventually a temporary spiritual form with flight, gills, or a natural weapon.',
    tradeoff: 'Entry requires the Deific Obedience feat, a specific patron deity within one step of her own alignment, and one of base attack bonus +5/5 skill ranks/3rd-level spellcasting, and every ability depends on performing a daily obedience ritual to that deity.',
  }),
  author('exalted', {
    c: {'offensive-magic': 'core', 'utility-magic': 'core', 'defensive-protective-magic': 'available', 'personal-durability': 'available', 'social-influence': 'available', 'knowledge-investigation': 'available', 'healing-recovery': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'medium'},
    f: {'has-spellcasting': true, 'requires-deity': true, 'requires-alignment': true},
    identity: {magicIdentity: ['divine'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['deity'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    constraints: [{type: 'deity', kind: 'requirement', summary: 'An exalted must worship a single specific deity and share that deity’s exact alignment, and must perform a daily obedience to maintain the class’s abilities.', evidenceSection: 'Obedience / Alignment'}],
    playerSummary: 'A living embodiment of her faith who deepens her divine spellcasting with deity-specific boons, gains a whole extra domain’s worth of spell-like abilities, permanent protection and at-will detection against her faith’s opposed alignment, and at the pinnacle can duplicate near-miraculous spells or petition her deity directly.',
    tradeoff: 'Entry requires the Deific Obedience and Skill Focus (Knowledge [religion]) feats, Diplomacy/Knowledge (religion) ranks, 3rd-level divine spells, and an alignment identical to her chosen deity’s, and her own spellcasting only advances at the reduced rate of a prestige class.',
  }),
  author('genie-binder', {
    c: {'offensive-magic': 'available', 'debuffing-enemies': 'core', 'defensive-protective-magic': 'available', 'utility-magic': 'core', 'summoning-companions': 'available', 'social-influence': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'medium', versatility: 'medium'},
    f: {'has-spellcasting': true, 'requires-alignment': true, 'controls-additional-entity': true},
    identity: {magicIdentity: ['other'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['outsiders'], elementThemes: ['mixed'], primaryDelivery: ['spellcasting']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A genie binder must be nongood.', evidenceSection: 'Alignment'}, {type: 'bloodline-choice', kind: 'commitment', summary: 'At 1st level a genie binder must permanently choose between binding a genie-subtype eidolon or pursuing continued spellcasting power -- the choice can never be changed.', evidenceSection: 'Genie Mastery'}],
    playerSummary: 'A conjurer specializing in binding and negotiating with genies -- marking creatures and surfaces with elemental seals that charm genies, grant allies elemental resistance, or trap enemies in an elemental blast, while choosing once and forever between commanding a genie-blooded eidolon or deepening her own spellcasting.',
    tradeoff: 'Entry requires a nongood alignment, the Persuasive and Spell Focus (conjuration) feats, heavy Knowledge (planes) investment, and access to planar ally, planar binding, or summon monster VI already, and the class caps out at only 5 levels with a permanent, irreversible choice made at 1st level.',
  }),
  author('technomancer', {
    c: {'offensive-magic': 'core', 'utility-magic': 'core', 'debuffing-enemies': 'available', 'practical-expertise': 'core', 'knowledge-investigation': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'high', 'resource-management': 'medium', versatility: 'medium'},
    f: {'has-spellcasting': true, 'has-firearms': true, 'depends-on-specific-equipment': true},
    identity: {magicIdentity: ['arcane'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['spellcasting', 'firearm']},
    playerSummary: 'A magic-meets-technology tinkerer who repairs and reactivates ancient technological relics, powers gadgets with spent spell slots (and vice versa), commands robots, and blends technomantic countermagic into a normal arcane spell list.',
    tradeoff: 'Entry requires Skill Focus (Knowledge [engineering]), the Technologist feat, heavy Disable Device/Knowledge (engineering)/Spellcraft investment, and 3rd-level arcane spells, and nearly every ability depends on having technological devices to recondition, power or command.',
  }),
  author('halfling-opportunist', {
    c: {'melee-combat': 'available', 'combat-manoeuvres': 'core', 'single-target-damage': 'available', 'personal-durability': 'available', 'social-influence': 'available', 'stealth-subterfuge': 'available'},
    p: {'build-complexity': 'medium', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'medium'},
    f: {'has-sneak-attack': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['melee weapon']},
    constraints: [{type: 'race', kind: 'requirement', summary: 'A halfling opportunist must be a halfling.', evidenceSection: 'Race'}],
    playerSummary: 'A halfling who turns her enemies’ own actions against them -- seizing a combat maneuver check off a giant’s swing or a spellcaster’s blast to grant herself a timely bonus, all while getting luckier and sneakier as she goes.',
    tradeoff: 'Entry requires being a halfling, Perception/Stealth ranks, and the Defensive Combat Training feat, and the class caps out at only 5 levels.',
  }),
  author('aspis-agent', {
    c: {'debuffing-enemies': 'core', 'single-target-damage': 'available', 'practical-expertise': 'core', 'social-influence': 'available', 'knowledge-investigation': 'available', 'stealth-subterfuge': 'available', 'personal-durability': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'medium', 'resource-management': 'low', versatility: 'high'},
    f: {'has-sneak-attack': true, 'depends-on-specific-equipment': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], professionIdentity: ['spy'], primaryDelivery: ['melee weapon']},
    playerSummary: 'A corporate spy-adventurer for the Aspis Consortium who rigs recovered traps to ambush rivals, masks her alignment from detection magic, and picks up an ever-growing menu of agency secrets -- bonus feats, rogue talents, or caster level boosts -- to stay one step ahead.',
    tradeoff: 'Entry requires whip proficiency plus trap sense or detect secret doors, and heavy investment across seven different skills (Appraise/Bluff/Craft [traps]/Disable Device/Intimidate/Knowledge [history]/Perception).',
  }),
  author('chevalier', {
    c: {'melee-combat': 'core', 'single-target-damage': 'available', 'personal-durability': 'available', 'combat-mobility': 'available'},
    p: {'build-complexity': 'low', 'play-complexity': 'low', 'attribute-demands': 'low', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'low'},
    f: {'requires-alignment': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['melee weapon']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A chevalier must be good.', evidenceSection: 'Alignment'}],
    playerSummary: 'A swashbuckling good-aligned adventurer who charges fearlessly into battle -- immune to fear and poison, striking harder in the opening round of a fight, and smiting evil once per day like a paladin.',
    tradeoff: 'Entry requires good alignment, base attack bonus +6, and proof of genuine heroism (surviving a fight well above your level), and the class caps out at just 3 levels.',
  }),
  author('justicar', {
    c: {'social-influence': 'core', 'ranged-combat': 'available', 'debuffing-enemies': 'available', 'knowledge-investigation': 'core'},
    p: {'build-complexity': 'low', 'play-complexity': 'low', 'attribute-demands': 'low', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'medium'},
    f: {'has-code-of-conduct': true, 'requires-alignment': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['ranged weapon']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A justiciar must be lawful and must be formally appointed by a lawful religious or secular authority.', evidenceSection: 'Alignment / Special'}, {type: 'code-of-conduct', kind: 'commitment', summary: 'A justiciar may never violate her code or any oath or contract she willingly agrees to (even in spirit), or she loses all prestige class abilities until she receives an atonement or an official pardon.', evidenceSection: 'Lawkeeper'}],
    playerSummary: 'A lawful magistrate-adventurer with absolute authority to judge and punish -- backing up Diplomacy and Intimidate with the force of law, sniping with a crossbow, and magically sealing oaths so betrayal is always eventually revealed.',
    tradeoff: 'Entry requires lawful alignment, formal appointment by a lawful authority, the Investigator or Negotiator feat, crossbow proficiency, and heavy skill investment, and the class caps out at just 3 levels with a strict code that revokes all abilities if ever broken.',
  }),
  author('knight-of-ozem', {
    c: {'melee-combat': 'core', 'single-target-damage': 'available', 'personal-durability': 'core', 'protecting-allies': 'available', 'anti-magic-disruption': 'core', 'tactical-leadership': 'available'},
    p: {'build-complexity': 'medium', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'high', 'resource-management': 'low', versatility: 'medium'},
    f: {'requires-deity': true, 'depends-on-specific-equipment': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['deity', 'undead'], elementThemes: ['none'], primaryDelivery: ['melee weapon']},
    constraints: [{type: 'deity', kind: 'requirement', summary: 'A Knight of Ozem must worship Iomedae.', evidenceSection: 'Deity'}],
    playerSummary: 'A shield-bearing holy knight of Iomedae sworn to hunt undead and thwart the return of the Whispering Tyrant -- countering undead spellcasters with disruption and dispelling, growing an arsenal of shield and teamwork feats, and transfiguring gear into holy relics for one glorious minute at the peak of her power.',
    tradeoff: 'Entry requires proficiency with heavy armor, shields, and the longsword, worship of Iomedae specifically, and Knowledge (religion) ranks, and most of its scaling bonuses only apply against undead.',
  }),
  author('razmiran-priest', {
    c: {'offensive-magic': 'core', 'healing-recovery': 'core', 'social-influence': 'core', 'utility-magic': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'medium', versatility: 'medium'},
    f: {'has-spellcasting': true, 'has-healing': true, 'requires-alignment': true},
    identity: {magicIdentity: ['arcane'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['deity'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A Razmiran priest must be nongood.', evidenceSection: 'Alignment'}, {type: 'organization', kind: 'commitment', summary: 'A would-be Razmiran priest must travel to Thronestep and undergo a special ritual testing his faith in Razmir.', evidenceSection: 'Special'}],
    playerSummary: 'An arcane spellcaster who poses as a divine priest of the false god Razmir -- bluffing his way through cleric-style healing and channeling (delivered as temporary hit points at first, then real healing at the height of his power), backed by a genuinely unshakeable talent for lying.',
    tradeoff: 'Entry requires a nongood alignment, the False Casting feat, Bluff/Use Magic Device ranks, 3rd-level arcane spells, and a secret ritual of faith undergone at Thronestep, and his own spellcasting only advances at the reduced rate of a prestige class.',
  }),
  author('aldori-swordlord', {
    c: {'melee-combat': 'core', 'single-target-damage': 'available', 'personal-durability': 'core', 'debuffing-enemies': 'available', 'social-influence': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'high', 'resource-management': 'low', versatility: 'low'},
    f: {'depends-on-specific-equipment': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['melee weapon']},
    constraints: [{type: 'weapon-or-armour-restriction', kind: 'commitment', summary: 'Nearly every signature ability only functions while wielding an Aldori dueling sword with nothing in the other hand.', evidenceSection: 'Aldori Swordlord'}],
    playerSummary: 'A master duelist of the Aldori tradition who fights with a signature dueling sword, finessing damage with Dexterity, parrying and shrugging off critical hits, and intimidating foes into losing their courage mid-fight.',
    tradeoff: 'Entry requires Dazzling Display, Exotic Weapon Proficiency, Weapon Finesse and Weapon Focus all with the Aldori dueling sword plus Acrobatics/Intimidate/Knowledge (nobility)/Sense Motive ranks, and nearly every ability only works with that one specific weapon and an empty off-hand.',
  }),
  author('arclord-of-nex', {
    c: {'offensive-magic': 'core', 'utility-magic': 'core', 'practical-expertise': 'core', 'knowledge-investigation': 'available', 'summoning-companions': 'available', 'support-buffing': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'medium', versatility: 'high'},
    f: {'has-spellcasting': true, 'controls-additional-entity': true},
    identity: {magicIdentity: ['arcane'], castingMethod: ['prepared'], castingExtent: ['partial'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    playerSummary: 'A scholar-mage in the tradition of the lost archmage Nex who masters magic across every school at once -- borrowing spell-like powers from schools outside his own specialty, crafting constructs and magic items at astonishing speed, and teleporting bound allies or creatures to his side at will.',
    tradeoff: 'Entry requires Craft Construct, Craft Wondrous Item and the Eye of the Arclord feats, heavy skill investment, arcane sight, at least two spells from every school scribed in his spellbook, and an arcane school power like hand of the apprentice, and his own spellcasting only advances at the reduced rate of a prestige class.',
  }),
  author('bloatmage', {
    c: {'offensive-magic': 'core', 'utility-magic': 'core', 'personal-durability': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'high', versatility: 'medium'},
    f: {'has-spellcasting': true},
    identity: {magicIdentity: ['arcane'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    constraints: [{type: 'curse-or-drawback', kind: 'commitment', summary: 'Pushing the blood pool too far sickens the bloatmage, and pushing it further triggers an uncontrollable murderous rage against friend and foe alike, ending with her dying at 0 blood points.', evidenceSection: 'Blood Pool / Bloat'}],
    playerSummary: 'An arcanist who overloads her own bloodstream to fuel greater magic -- spending blood points to recall spent spells, growing grotesquely corpulent with natural armor, and at the height of her power drinking another sorcerer’s blood to temporarily wield an entire second bloodline’s powers.',
    tradeoff: 'Entry requires the Bloatmage Initiate and Spell Focus feats plus 3rd-level arcane spells, and pushing her blood pool too hard risks sickening herself or flying into an uncontrollable, potentially fatal murderous rage.',
  }),
  author('student-of-war', {
    c: {'melee-combat': 'core', 'combat-manoeuvres': 'available', 'personal-durability': 'available', 'knowledge-investigation': 'core', 'practical-expertise': 'available', 'debuffing-enemies': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'medium', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'high'},
    f: {},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['melee weapon']},
    playerSummary: 'A scholar-warrior who studies a foe with a Knowledge check before a fight, then applies that insight as a defensive, offensive, or maneuver-focused bonus -- eventually finding weak points that bypass damage reduction and even immunity to critical hits.',
    tradeoff: 'Entry requires base attack bonus +5, Combat Expertise, Dodge and Skill Focus (Knowledge) already in hand, proficiency with two martial weapons, and proof of having out-thought five distinct creatures with Knowledge checks before ever defeating them in combat.',
  }),
  author('pit-fighter', {
    c: {'melee-combat': 'core', 'combat-manoeuvres': 'core', 'personal-durability': 'available', 'social-influence': 'core', 'debuffing-enemies': 'available'},
    p: {'build-complexity': 'medium', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'medium', 'resource-management': 'low', versatility: 'low'},
    f: {'has-rage': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['melee weapon']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A pit fighter must be nonlawful.', evidenceSection: 'Alignment'}, {type: 'weapon-or-armour-restriction', kind: 'commitment', summary: 'A pit fighter must already have the orc ferocity racial trait or the rage class feature to qualify, and several of his best abilities depend on wielding a weapon with the performance quality in front of an audience.', evidenceSection: 'Special / Arena Weapon Expertise'}],
    playerSummary: 'A gladiator who turns a live crowd into a weapon -- performing combat for the audience’s reaction, chaining dirty tricks together to cripple foes, and raging harder the louder the crowd cheers for blood.',
    tradeoff: 'Entry requires a nonlawful alignment, the Dazzling Display feat, Intimidate and a Perform skill already ranked up, and either orc ferocity or the rage class feature, and several of his signature abilities depend on having an audience and a weapon with the performance quality.',
  }),
  author('agent-of-the-grave', {
    c: {'offensive-magic': 'core', 'single-target-damage': 'available', 'healing-recovery': 'available', 'summoning-companions': 'core', 'utility-magic': 'available', 'personal-durability': 'available', 'stealth-subterfuge': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'medium'},
    f: {'has-spellcasting': true, 'has-healing': true, 'requires-alignment': true, 'controls-additional-entity': true},
    identity: {magicIdentity: ['other'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['undead'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'An agent of the grave must be evil.', evidenceSection: 'Alignment'}, {type: 'organization', kind: 'requirement', summary: 'An agent of the grave must have been a member of the Whispering Way for 1 year.', evidenceSection: 'Special'}],
    playerSummary: 'A secretive necromancer of the Whispering Way who commands vastly more undead than his spells alone would allow, drains life with a negative-energy touch, and gradually adopts undeath’s own nature -- healed by negative energy, harmed by positive -- on the path to true immortality.',
    tradeoff: 'Entry requires evil alignment, Knowledge (arcana)/Knowledge (religion) ranks, the ability to cast animate dead, and a full year of prior membership in the Whispering Way cult, and the class caps out at just 5 levels.',
  }),
  author('cyphermage', {
    c: {'offensive-magic': 'core', 'utility-magic': 'core', 'knowledge-investigation': 'core', 'practical-expertise': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'medium', 'resource-management': 'low', versatility: 'high'},
    f: {'has-spellcasting': true, 'depends-on-specific-equipment': true},
    identity: {magicIdentity: ['arcane'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    playerSummary: 'A scholar-mage obsessed with Thassilonian runes and lost lore who masters magical writing -- reading scrolls with perfect insight, empowering or extending their spells, detecting and disarming glyph-based traps like a rogue, and eventually activating a signature scroll trick as a free action.',
    tradeoff: 'Entry requires the Cypher Magic and Scribe Scroll feats, two ancient Thassilonian/Varisian languages, heavy Knowledge/Linguistics investment, and existing arcane spellcasting, and many of her best tricks depend specifically on scrolls.',
  }),
  author('diabolist', {
    c: {'offensive-magic': 'core', 'summoning-companions': 'core', 'combat-mobility': 'available', 'social-influence': 'available', 'utility-magic': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'medium'},
    f: {'has-spellcasting': true, 'requires-alignment': true, 'requires-deity': true, 'controls-additional-entity': true},
    identity: {magicIdentity: ['arcane'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['outsiders', 'deity'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A diabolist must be lawful evil.', evidenceSection: 'Alignment'}, {type: 'deity', kind: 'requirement', summary: 'A diabolist must worship an archdevil, infernal duke, or malebranche as her patron, and must perform a daily obedience to maintain her abilities.', evidenceSection: 'Special / Obedience'}],
    playerSummary: 'A lawful evil conjurer who binds and bargains with devils -- bonding with a personal imp familiar, hurling hellfire, teleporting through Hell itself, and drawing escalating boons from an archdevil patron, though death sends her soul straight to Hell unless someone can beat the odds to bring her back.',
    tradeoff: 'Entry requires lawful evil alignment, the Fiendish Obedience feat, heavy Knowledge (planes)/Knowledge (religion)/Spellcraft investment, Infernal, proof of having successfully bound and commanded a devil, and a daily obedience ritual to an infernal patron to maintain her abilities.',
  }),
  author('sentinel', {
    c: {'melee-combat': 'core', 'single-target-damage': 'available', 'personal-durability': 'core', 'tactical-leadership': 'available', 'healing-recovery': 'available'},
    p: {'build-complexity': 'medium', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'high', 'resource-management': 'low', versatility: 'low'},
    f: {'requires-deity': true, 'requires-alignment': true, 'depends-on-specific-equipment': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['deity'], elementThemes: ['none'], primaryDelivery: ['melee weapon']},
    constraints: [{type: 'deity', kind: 'requirement', summary: 'A sentinel must worship a single specific deity within one step of his own alignment, and must perform a daily obedience to maintain his abilities.', evidenceSection: 'Obedience / Alignment'}],
    playerSummary: 'A divine champion-warrior who wields his deity’s favored weapon like a holy symbol -- striking with sacred bonuses, bypassing enemy damage reduction, and eventually shrugging off death itself with damage reduction and the ability to keep fighting at negative hit points.',
    tradeoff: 'Entry requires the Deific Obedience feat, Weapon Focus with his deity’s favored weapon, base attack bonus +5, and an alignment within one step of that deity’s, and nearly every ability only functions while wielding that one specific weapon.',
  }),
  author('soul-warden', {
    c: {'offensive-magic': 'core', 'debuffing-enemies': 'core', 'personal-durability': 'available', 'battlefield-control': 'available', 'utility-magic': 'available', 'summoning-companions': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'medium', versatility: 'medium'},
    f: {'has-spellcasting': true, 'requires-alignment': true},
    identity: {magicIdentity: ['other'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['undead'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A soul warden must be nonevil.', evidenceSection: 'Alignment'}],
    playerSummary: 'A dedicated undead-hunter spellcaster who channels positive energy purely to harm the undead, wards off incursions, briefly commands lesser undead against their will, and grows resistant to the drain and negative levels undead so often inflict.',
    tradeoff: 'Entry requires a nonevil alignment, Knowledge (religion) ranks, and the ability to cast command undead or consecrate, and his own spellcasting only advances at the reduced rate of a prestige class.',
  }),
  author('ritualist', {
    c: {'offensive-magic': 'core', 'utility-magic': 'core', 'knowledge-investigation': 'core', 'practical-expertise': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'high'},
    f: {'has-spellcasting': true},
    identity: {magicIdentity: ['occult'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['occult'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    constraints: [{type: 'organization', kind: 'requirement', summary: 'A ritualist must be a member of a group that regularly deals with the occult and must have successfully cast at least one occult ritual as the primary caster.', evidenceSection: 'Special'}],
    playerSummary: 'A master of occult rituals who makes the dangerous, unpredictable art of ritual magic reliable -- taking 10 on ritual skill checks, casting rituals faster or more safely, and eventually performing them solo without any secondary casters at all.',
    tradeoff: 'Entry requires Knowledge (arcana or history) 8 ranks, 3rd-level spells, membership in an occult-focused organization, and proof of having successfully led an occult ritual, and her own spellcasting only advances at the reduced rate of a prestige class.',
  }),
  author('demoniac', {
    c: {'offensive-magic': 'core', 'personal-durability': 'core', 'transformation-shapeshifting': 'core', 'summoning-companions': 'core', 'utility-magic': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'medium', versatility: 'medium'},
    f: {'has-spellcasting': true, 'has-shapeshifting': true, 'requires-alignment': true, 'requires-deity': true, 'controls-additional-entity': true},
    identity: {magicIdentity: ['other'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['outsiders', 'deity'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A demoniac must be chaotic evil.', evidenceSection: 'Alignment'}, {type: 'deity', kind: 'requirement', summary: 'A demoniac must worship a demon lord or nascent demon lord, and must perform a daily obedience to maintain her abilities.', evidenceSection: 'Special / Obedience'}],
    playerSummary: 'A chaotic evil spellcaster who has already been traumatized by demonkind and now embraces that fate -- channeling a possessing demonic spirit for escalating power (at the cost of confusion once it fades), summoning demons to serve her, and eventually transforming her own body into a unique demon.',
    tradeoff: 'Entry requires chaotic evil alignment, the Fiendish Obedience and Iron Will feats, heavy Intimidate/Knowledge (planes)/Spellcraft investment, Abyssal, proof of prior demonic trauma, and a demon lord patron maintained through daily obedience, and death sends her soul straight to the Abyss.',
  }),
  author('proctor', {
    c: {'offensive-magic': 'available', 'defensive-protective-magic': 'core', 'personal-durability': 'available', 'summoning-companions': 'core', 'utility-magic': 'core', 'social-influence': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'medium'},
    f: {'has-spellcasting': true, 'requires-alignment': true, 'requires-deity': true, 'controls-additional-entity': true},
    identity: {magicIdentity: ['other'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['outsiders', 'deity'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A proctor must be any neutral.', evidenceSection: 'Alignment'}, {type: 'deity', kind: 'requirement', summary: 'A proctor must worship a monitor demigod, and must perform a daily obedience to maintain her abilities.', evidenceSection: 'Special / Obedience'}],
    playerSummary: 'A steadfast devotee of a neutral monitor demigod who binds herself to an improved outsider familiar, summons monitors to her aid, and gains one of four distinct expressions of neutrality -- immunity to mental effects, spirit-sensing, semi-incorporeal defense, or unshakeable freedom of movement.',
    tradeoff: 'Entry requires any-neutral alignment, the Alertness and Monitor Obedience feats, heavy Knowledge (planes)/Knowledge (religion) investment, two abjuration spells, proof of having refused power from a celestial or fiend, and a monitor demigod patron maintained through daily obedience.',
  }),
  author('esoteric-knight', {
    c: {'melee-combat': 'core', 'offensive-magic': 'available', 'personal-durability': 'available', 'combat-mobility': 'available', 'practical-expertise': 'core', 'utility-magic': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'medium', 'resource-management': 'medium', versatility: 'high'},
    f: {'has-spellcasting': true},
    identity: {magicIdentity: ['psychic'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['none'], elementThemes: ['none'], primaryDelivery: ['melee weapon', 'spellcasting']},
    playerSummary: 'A psychic gish who blends martial mastery with occult power -- stacking bonus combat feats, enchanting her own armor and weapons on the fly with her mind, teleporting short distances at will, and even summoning a phantom duplicate of herself to flank an enemy.',
    tradeoff: 'Entry requires base attack bonus +5 and either the kinetic blast class feature or 1st-level psychic spells, and her own spellcasting or kinetic blast progression only advances at the reduced rate of a prestige class.',
  }),
  author('hellknight-signifer', {
    c: {'offensive-magic': 'available', 'utility-magic': 'core', 'knowledge-investigation': 'core', 'social-influence': 'available', 'personal-durability': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'medium', 'resource-management': 'low', versatility: 'medium'},
    f: {'has-spellcasting': true, 'requires-alignment': true},
    identity: {magicIdentity: ['other'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['other'], elementThemes: ['none'], professionIdentity: ['lawbringer'], primaryDelivery: ['spellcasting']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A Hellknight signifer must be any lawful.', evidenceSection: 'Alignment'}, {type: 'organization', kind: 'requirement', summary: 'A Hellknight signifer must slay a devil with more Hit Dice than his own character level, witnessed by a Hellknight, and joins a Hellknight order at 1st level.', evidenceSection: 'Special / Order'}],
    professionIdentity: ['lawbringer'],
    playerSummary: 'A masked spellcasting enforcer of a Hellknight order who radiates a cleric-strength aura of law, gains unnerving gaze powers to read a target\'s spells, alignment, or true nature, and eventually becomes a nigh-unshakeable telepathic harbinger immune to blindness and darkness.',
    tradeoff: 'Entry requires any lawful alignment, medium armor proficiency, Arcane Armor Training or Warrior Priest, Intimidate/Knowledge (planes)/Spellcraft ranks, 3rd-level spells, and proof of having slain a devil witnessed by a Hellknight, and every gaze ability requires wearing his signifer mask.',
  }),
  author('mortal-usher', {
    c: {'melee-combat': 'core', 'single-target-damage': 'core', 'combat-mobility': 'available', 'personal-durability': 'available', 'social-influence': 'available'},
    p: {'build-complexity': 'medium', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'medium', 'resource-management': 'low', versatility: 'medium'},
    f: {'requires-alignment': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['undead'], elementThemes: ['none'], professionIdentity: ['psychopomp agent'], primaryDelivery: ['melee weapon']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A mortal usher must be any neutral.', evidenceSection: 'Alignment'}, {type: 'organization', kind: 'requirement', summary: 'A mortal usher must befriend a psychopomp or perform a deed of great significance in defense of the natural order of life and death; undead can never become mortal ushers.', evidenceSection: 'Special'}],
    professionIdentity: ['psychopomp agent'],
    playerSummary: 'A living agent of the psychopomps who deals bonus reaping damage that is positive energy against the undead or negative energy against the living, keeps advancing an earlier spellcasting class through Mortal Talents, and eventually gains flight, cold resistance, and immunity to death effects.',
    tradeoff: 'Entry requires any neutral alignment, Knowledge (planes)/Knowledge (religion) ranks, and proof of befriending a psychopomp or a deed defending the natural order, and becoming undead strips away all class features except mortal talents.',
  }),
  author('pathfinder-savant', {
    c: {'knowledge-investigation': 'core', 'utility-magic': 'available', 'offensive-magic': 'available', 'practical-expertise': 'core'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'high', 'equipment-dependence': 'medium', 'resource-management': 'low', versatility: 'high'},
    f: {'has-spellcasting': true, 'has-profession-identity': true},
    identity: {magicIdentity: ['arcane'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['none'], elementThemes: ['none'], professionIdentity: ['scholar', 'artificer'], primaryDelivery: ['spellcasting']},
    professionIdentity: ['scholar', 'artificer'],
    playerSummary: 'A magic-item and lore specialist who always takes 10 on Use Magic Device, Knowledge (arcana), and Spellcraft, finds writing-based traps like a rogue, borrows spells from any class list, and eventually attunes permanently to a favored magic item to use his own caster level with it.',
    tradeoff: 'Entry requires Magical Aptitude, any item creation feat, Knowledge (arcana)/Spellcraft/Use Magic Device 5 ranks, and 2nd-level spells, and he is built around identifying and empowering magic items rather than frontline combat.',
  }),
  author('argent-dramaturge', {
    c: {'offensive-magic': 'available', 'debuffing-enemies': 'core', 'support-buffing': 'core', 'social-influence': 'available', 'healing-recovery': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'medium'},
    f: {'has-spellcasting': true},
    identity: {magicIdentity: ['arcane'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['none'], elementThemes: ['none'], professionIdentity: ['performer'], primaryDelivery: ['spellcasting']},
    professionIdentity: ['performer'],
    playerSummary: 'A Kintargan bardic performer who wields the magical "Song of Silver" to treat allies\' weapons as silver, ward off fear and charm, block fiendish teleportation, and eventually revive a dying ally with breath of life or banish an evil outsider through a righteous chord.',
    tradeoff: 'Entry requires Skill Focus (Perform), Knowledge (arcana)/Knowledge (history)/Perform (sing)/Spellcraft ranks, and a sonic or language-dependent 2nd-level spell, and her performance is entirely audible-only, so silence or deafness shuts it down.',
  }),
  author('asavir', {
    c: {'melee-combat': 'core', 'combat-mobility': 'core', 'tactical-leadership': 'available', 'battlefield-control': 'available', 'social-influence': 'available'},
    p: {'build-complexity': 'medium', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'high', 'resource-management': 'low', versatility: 'low'},
    f: {'has-mount': true, 'controls-additional-entity': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], professionIdentity: ['cavalry rider'], primaryDelivery: ['melee weapon']},
    professionIdentity: ['cavalry rider'],
    playerSummary: 'An Al-Zabriti cavalry warrior whose genie-blessed horse companion grows steadily more supernatural -- gaining mind-affecting and fear resistance, extra speed, fire resistance, and a trample attack -- while she knocks down foes with a ground-shaking charge and rallies allies with camaraderie.',
    tradeoff: 'Entry requires base attack bonus +4, the Mounted Combat feat, and Handle Animal/Ride 5 ranks, and nearly every high-level ability only functions while mounted on her bonded horse.',
  }),
  author('ashavic-dancer', {
    c: {'offensive-magic': 'available', 'debuffing-enemies': 'core', 'support-buffing': 'available', 'healing-recovery': 'available', 'social-influence': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'medium'},
    f: {'has-spellcasting': true, 'requires-alignment': true, 'requires-deity': true},
    identity: {magicIdentity: ['divine'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['deity'], elementThemes: ['none'], professionIdentity: ['performer'], primaryDelivery: ['spellcasting']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'An Ashavic dancer must be neutral good or chaotic good.', evidenceSection: 'Alignment'}, {type: 'deity', kind: 'requirement', summary: 'An Ashavic dancer must worship the empyreal lord Ashava.', evidenceSection: 'Deity'}],
    playerSummary: 'A moonlit dancer devoted to Ashava who unravels undead and haunts with a visual-only performance, sickens or staggers undead with dazzling steps, breaks possession and compulsion effects, and eventually lures the dead back into their graves with searing damage.',
    tradeoff: 'Entry requires neutral good or chaotic good alignment, worship of Ashava, the Ghost Whisperer feat, Knowledge (religion)/Perform (dance) ranks, and 2nd-level spells, and her performance is entirely visual-only, so blindness or darkness shuts it down.',
  }),
  author('balanced-scale-of-abadar', {
    c: {'utility-magic': 'core', 'practical-expertise': 'core', 'combat-mobility': 'available', 'social-influence': 'available'},
    p: {'build-complexity': 'medium', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'medium'},
    f: {'has-spellcasting': true, 'requires-deity': true},
    identity: {magicIdentity: ['divine'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['deity'], elementThemes: ['none'], professionIdentity: ['treasure hunter'], primaryDelivery: ['spellcasting']},
    constraints: [{type: 'deity', kind: 'requirement', summary: 'A balanced scale of Abadar must worship Abadar.', evidenceSection: 'Deity'}],
    professionIdentity: ['treasure hunter'],
    playerSummary: 'An Abadaran tomb-raider who bypasses even magically warded locks, appraises treasure at a glance, conjures a temporary bag of holding, and summons a perfect copy of nearly any nonmagical or magical item straight from Abadar\'s First Vault, plus a once-daily emergency escape portal.',
    tradeoff: 'Entry requires worship of Abadar, Appraise/Open Lock ranks, and 3rd-level divine spells, and every Vault-summoned item is obviously supernatural and vanishes again after a short time, making it unsuitable for permanent use or resale.',
  }),
  author('bellflower-tiller', {
    c: {'stealth-subterfuge': 'core', 'tactical-leadership': 'core', 'wilderness-affinity': 'available', 'social-influence': 'available', 'single-target-damage': 'available'},
    p: {'build-complexity': 'medium', 'play-complexity': 'medium', 'attribute-demands': 'medium', 'equipment-dependence': 'low', 'resource-management': 'low', versatility: 'medium'},
    f: {'has-sneak-attack': true, 'requires-alignment': true},
    identity: {magicIdentity: ['none'], castingMethod: ['none'], castingExtent: ['none'], spiritualThemes: ['none'], elementThemes: ['none'], professionIdentity: ['smuggler'], primaryDelivery: ['melee weapon']},
    constraints: [{type: 'alignment', kind: 'requirement', summary: 'A Bellflower tiller must be chaotic good.', evidenceSection: 'Alignment'}],
    professionIdentity: ['smuggler'],
    playerSummary: 'A chaotic good abolitionist who guides a designated "crop" of escaped slaves through Cheliax, granting them faster overland travel, better aid-another bonuses, and a growing arsenal of teamwork feats, while gaining a trusted home community that shelters and heals the whole group.',
    tradeoff: 'Entry requires chaotic good alignment, two teamwork feats, Disguise/Knowledge (local)/Stealth/Survival ranks, and either sneak attack +2d6 or two vigilante talents, and most of her best benefits require actively designating and staying within 30-60 feet of her crop.',
  }),
  author('blackfire-adept', {
    c: {'offensive-magic': 'core', 'summoning-companions': 'core', 'debuffing-enemies': 'available', 'utility-magic': 'available'},
    p: {'build-complexity': 'high', 'play-complexity': 'high', 'attribute-demands': 'high', 'equipment-dependence': 'low', 'resource-management': 'medium', versatility: 'medium'},
    f: {'has-spellcasting': true, 'controls-additional-entity': true},
    identity: {magicIdentity: ['arcane'], castingMethod: ['mixed'], castingExtent: ['partial'], spiritualThemes: ['outsiders'], elementThemes: ['none'], primaryDelivery: ['spellcasting']},
    playerSummary: 'A nihilistic demonologist who taints foes with destructive planar resonance to weaken their saves, strikes a pact with an evil outsider subtype for stronger summons, and eventually breaches planar wards and antimagic fields to call forth and empower evil outsiders even where summoning should be blocked.',
    tradeoff: 'Entry requires any non-good alignment, Augment Summoning, Spell Focus (conjuration), Knowledge (planes)/Spellcraft ranks, summon monster III, and fluency in Abyssal and Infernal, and her signature abilities all revolve around evil outsiders specifically rather than general combat power.',
  }),
];

const seen = new Set(PROFILES.map(p => p.id));
const dup = PROFILES.map(p => p.id).filter((id, i, all) => all.indexOf(id) !== i);
if (dup.length) throw new Error(`Duplicate authored prestige ids: ${dup.join(', ')}`);

fs.writeFileSync(path.join(dir, 'prestige-profiles.json'), `${JSON.stringify({schemaVersion: 1, status: 'reviewed', inheritanceRule: 'Every prestige class is a standalone, fully-authored profile -- no parent class to inherit from.', profiles: PROFILES}, null, 2)}\n`);
console.log(`authored ${PROFILES.length}/${details.length} prestige classes (${details.length - PROFILES.length} remaining)`);
