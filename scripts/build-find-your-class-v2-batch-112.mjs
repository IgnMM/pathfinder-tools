import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(repo,'assets/find-your-class/v2');
const detailDir=path.join(repo,'assets/find-your-class/aon-catalog/class-details');
const classes=['monk-unchained','ninja','occultist','oracle','paladin'];
const parents=['01','02','03'].flatMap(n=>JSON.parse(fs.readFileSync(path.join(dir,`class-profiles-batch-${n}.json`))).profiles);
const parentById=new Map(parents.map(x=>[x.id,x]));
const details=new Map(classes.map(c=>[c,JSON.parse(fs.readFileSync(path.join(detailDir,`${c}.json`))).profiles]));
const review={};
for(const c of classes){review[c]={};for(const x of details.get(c))review[c][x.id.split(':')[1]]={c:{},p:{},f:{},a:{},r:{}};}
function set(cls,names,d){for(const name of names.split(' ')){const e=review[cls][name];if(!e)throw new Error(`Unknown ${cls}:${name}`);for(const k of['c','p','f','a','r'])if(d[k])Object.assign(e[k],d[k]);}}

// Monk (Unchained): only changes that materially redirect the core martial chassis.
set('monk-unchained','black-asp',{c:{'stealth-subterfuge':'core','debuffing-enemies':'core'},f:{'has-sneak-attack':true},a:{professionIdentity:['assassin']}});
set('monk-unchained','brazen-disciple',{c:{'debuffing-enemies':'core'},a:{elementThemes:['fire']}});
set('monk-unchained','disciple-of-wholeness',{c:{'healing-recovery':'core'},f:{'has-healing':true},a:{professionIdentity:['healer']}});
set('monk-unchained','elemental-monk',{c:{'offensive-magic':'available','area-multi-target-damage':'available'},a:{elementThemes:['mixed']}});
set('monk-unchained','invested-regent',{c:{'social-influence':'core','defensive-protective-magic':'available'},a:{spiritualThemes:['divine spark']}});
set('monk-unchained','lifting-hand',{c:{'battlefield-control':'core'}});
set('monk-unchained','monk-of-the-mantis',{c:{'debuffing-enemies':'core'}});
set('monk-unchained','perfect-scholar',{c:{'knowledge-investigation':'core'},a:{professionIdentity:['scholar']}});
set('monk-unchained','sage-counselor',{c:{'social-influence':'core','support-buffing':'core'},a:{professionIdentity:['teacher']}});
set('monk-unchained','scaled-fist',{c:{'area-multi-target-damage':'available','social-influence':'core'},a:{elementThemes:['mixed'],spiritualThemes:['dragons']}});
set('monk-unchained','serpent-fire-adept',{c:{'support-buffing':'core','healing-recovery':'available'},a:{spiritualThemes:['chakras']}});
set('monk-unchained','softstrike-monk',{c:{'debuffing-enemies':'core'},a:{professionIdentity:['nonlethal combatant']}});
set('monk-unchained','soul-shepherd',{c:{'anti-magic-disruption':'core'},a:{spiritualThemes:['undead','spirits']}});
set('monk-unchained','windstep-master',{c:{'combat-mobility':'core'},a:{elementThemes:['air']}});

// Ninja.
set('ninja','frozen-shadow',{c:{'personal-durability':'core','combat-mobility':'core'},a:{elementThemes:['cold'],environmentThemes:['arctic']}});
set('ninja','gunpowder-bombardier',{c:{'area-multi-target-damage':'core','battlefield-control':'core'},f:{'has-bombs':true},a:{primaryDelivery:['supernatural attack']}});
set('ninja','hunting-serpent',{c:{'wilderness-affinity':'core','single-target-damage':'core'},a:{professionIdentity:['hunter']}});
set('ninja','mask-of-the-living-god',{c:{'social-influence':'core','debuffing-enemies':'core'},a:{professionIdentity:['cult infiltrator']}});
set('ninja','petal-ninja',{c:{'area-multi-target-damage':'available','battlefield-control':'core'},a:{environmentThemes:['wilderness'],spiritualThemes:['nature']}});

// Occultist.
set('occultist','ancestral-aspirant',{c:{'social-influence':'core','knowledge-investigation':'core'},a:{spiritualThemes:['ancestors'],professionIdentity:['courtier']}});
set('occultist','battle-host',{c:{'melee-combat':'core','personal-durability':'core'},p:{'equipment-dependence':'high'},a:{primaryDelivery:['melee weapon'],professionIdentity:['soldier']}});
set('occultist','construct-collector',{c:{'summoning-companions':'core','practical-expertise':'core'},f:{'controls-additional-entity':true},a:{professionIdentity:['construct specialist'],primaryDelivery:['companion']}});
set('occultist','curator',{c:{'knowledge-investigation':'core','anti-magic-disruption':'core'},a:{professionIdentity:['curator']}});
set('occultist','esoteric-initiate',{c:{'support-buffing':'core'},p:{versatility:'medium'},a:{professionIdentity:['occult initiate']}});
set('occultist','extemporaneous-channeler',{c:{'melee-combat':'core','practical-expertise':'core'},p:{'equipment-dependence':'medium'},a:{primaryDelivery:['improvised weapon']}});
set('occultist','geomancer',{c:{'wilderness-affinity':'core','battlefield-control':'core'},a:{spiritualThemes:['nature'],elementThemes:['earth']}});
set('occultist','haunt-collector',{c:{'anti-magic-disruption':'core','summoning-companions':'core'},f:{'controls-additional-entity':true},a:{spiritualThemes:['spirits','haunts'],primaryDelivery:['companion']}});
set('occultist','naturalist',{c:{'wilderness-affinity':'core','transformation-shapeshifting':'core'},f:{'has-shapeshifting':true},a:{spiritualThemes:['nature'],environmentThemes:['wilderness']}});
set('occultist','necroccultist',{c:{'summoning-companions':'core','debuffing-enemies':'core'},f:{'controls-additional-entity':true},a:{spiritualThemes:['undead'],primaryDelivery:['companion']}});
set('occultist','occult-historian',{c:{'knowledge-investigation':'core','practical-expertise':'core'},a:{professionIdentity:['historian']}});
set('occultist','panoply-savant',{c:{'support-buffing':'core'},p:{versatility:'medium'},a:{professionIdentity:['panoply specialist']}});
set('occultist','planar-harmonizer',{c:{'anti-magic-disruption':'core','support-buffing':'core'},a:{spiritualThemes:['outsiders','planes']}});
set('occultist','psychodermist',{c:{'single-target-damage':'core','knowledge-investigation':'core'},a:{professionIdentity:['trophy hunter']}});
set('occultist','reliquarian',{c:{'healing-recovery':'core','defensive-protective-magic':'core'},f:{'requires-deity':true},a:{magicIdentity:['divine'],castingMethod:['spontaneous'],spiritualThemes:['deity']},r:{magicIdentity:['psychic','occult']}});
set('occultist','secret-broker',{c:{'social-influence':'core','knowledge-investigation':'core','stealth-subterfuge':'core'},a:{professionIdentity:['information broker']}});
set('occultist','sha-ir',{c:{'summoning-companions':'core','utility-magic':'core'},f:{'controls-additional-entity':true},a:{spiritualThemes:['genies','outsiders'],primaryDelivery:['companion']}});
set('occultist','silksworn',{c:{'melee-combat':'absent','social-influence':'core'},p:{'equipment-dependence':'high'},a:{environmentThemes:['urban'],professionIdentity:['courtier']}});
set('occultist','talisman-crafter',{c:{'defensive-protective-magic':'core','practical-expertise':'core'},a:{professionIdentity:['talisman crafter']}});
set('occultist','tome-eater',{c:{'offensive-magic':'core','utility-magic':'core'},p:{'resource-management':'high'},a:{primaryDelivery:['spellcasting'],professionIdentity:['forbidden scholar']}});

// Oracle.
set('oracle','ancient-lorekeeper',{c:{'knowledge-investigation':'core'},a:{spiritualThemes:['ancestors'],professionIdentity:['lorekeeper']}});
set('oracle','black-blooded-oracle',{c:{'debuffing-enemies':'core','personal-durability':'core'},a:{elementThemes:['cold'],spiritualThemes:['darkness']}});
set('oracle','community-guardian',{c:{'protecting-allies':'core','support-buffing':'core','social-influence':'core'},a:{professionIdentity:['community guardian']}});
set('oracle','cyclopean-seer',{c:{'knowledge-investigation':'core','debuffing-enemies':'core'},a:{spiritualThemes:['fate'],professionIdentity:['seer']}});
set('oracle','divine-numerologist',{c:{'knowledge-investigation':'core','anti-magic-disruption':'core'},a:{professionIdentity:['numerologist']}});
set('oracle','dual-cursed-oracle',{c:{'debuffing-enemies':'core'},p:{versatility:'medium'},a:{spiritualThemes:['fate']}});
set('oracle','elementalist-oracle',{c:{'area-multi-target-damage':'core','battlefield-control':'core'},a:{elementThemes:['mixed']}});
set('oracle','enlightened-philosopher',{c:{'knowledge-investigation':'core'},a:{professionIdentity:['philosopher']}});
set('oracle','hermit',{c:{'anti-magic-disruption':'core','knowledge-investigation':'core'},a:{professionIdentity:['hermit']}});
set('oracle','inerrant-voice',{c:{'social-influence':'core','support-buffing':'core'},a:{primaryDelivery:['voice']}});
set('oracle','keleshite-prophet',{c:{'social-influence':'core','knowledge-investigation':'core'},a:{professionIdentity:['prophet']}});
set('oracle','ocean-s-echo',{c:{'support-buffing':'core','wilderness-affinity':'core'},a:{environmentThemes:['maritime'],elementThemes:['water'],primaryDelivery:['voice']}});
set('oracle','pei-zin-practitioner',{f:{'has-profession-identity':true},a:{professionIdentity:['herbal healer']}});
set('oracle','planar-oracle',{c:{'anti-magic-disruption':'core','utility-magic':'core'},a:{spiritualThemes:['planes','outsiders']}});
set('oracle','possessed-oracle',{c:{'debuffing-enemies':'core'},a:{spiritualThemes:['spirits']}});
set('oracle','psychic-searcher',{c:{'knowledge-investigation':'core','practical-expertise':'core'},a:{magicIdentity:['psychic'],professionIdentity:['investigator']}});
set('oracle','purifier',{c:{'anti-magic-disruption':'core','area-multi-target-damage':'core'},a:{spiritualThemes:['purification']}});
set('oracle','reincarnated-oracle',{c:{'personal-durability':'core'},a:{spiritualThemes:['reincarnation']}});
set('oracle','river-soul',{c:{'wilderness-affinity':'core','combat-mobility':'core'},a:{environmentThemes:['river'],elementThemes:['water']}});
set('oracle','seeker',{c:{'knowledge-investigation':'core','anti-magic-disruption':'core'},a:{professionIdentity:['seeker']}});
set('oracle','seer',{c:{'knowledge-investigation':'core'},a:{spiritualThemes:['fate'],professionIdentity:['seer']}});
set('oracle','shigenjo',{c:{'melee-combat':'core','personal-durability':'core'},a:{professionIdentity:['warrior priest']}});
set('oracle','spirit-guide',{c:{'summoning-companions':'core','support-buffing':'core'},f:{'controls-additional-entity':true},a:{spiritualThemes:['spirits'],primaryDelivery:['companion']}});
set('oracle','stargazer',{c:{'knowledge-investigation':'core'},a:{spiritualThemes:['stars','fate'],professionIdentity:['astrologer']}});
set('oracle','tree-soul',{c:{'wilderness-affinity':'core','personal-durability':'core'},a:{spiritualThemes:['nature'],environmentThemes:['forest'],elementThemes:['earth']}});
set('oracle','warsighted',{c:{'melee-combat':'core','ranged-combat':'core'},p:{'play-complexity':'high'}});

// Paladin.
set('paladin','banishing-warden',{c:{'anti-magic-disruption':'core'},a:{spiritualThemes:['outsiders'],professionIdentity:['banisher']}});
set('paladin','champion-of-the-cascade',{c:{'combat-mobility':'core','wilderness-affinity':'core'},a:{elementThemes:['water'],environmentThemes:['river']}});
set('paladin','chaos-knight',{c:{'debuffing-enemies':'core','combat-mobility':'core'},a:{spiritualThemes:['chaos']}});
set('paladin','chosen-one',{c:{'summoning-companions':'core'},f:{'has-familiar':true,'has-mount':false,'controls-additional-entity':true},a:{primaryDelivery:['companion']}});
set('paladin','combat-healer-squire',{c:{'healing-recovery':'core','protecting-allies':'core'},a:{professionIdentity:['combat medic']}});
set('paladin','divine-defender',{c:{'protecting-allies':'core','defensive-protective-magic':'core'},a:{professionIdentity:['guardian']}});
set('paladin','divine-guardian',{c:{'protecting-allies':'core'},f:{'has-spellcasting':false},p:{versatility:'low'},a:{professionIdentity:['bodyguard']},r:{castingMethod:['prepared'],castingExtent:['partial']}});
set('paladin','divine-hunter',{c:{'melee-combat':'available','ranged-combat':'core'},a:{primaryDelivery:['ranged weapon']},r:{primaryDelivery:['melee weapon']}});
set('paladin','dusk-knight',{c:{'stealth-subterfuge':'core'},a:{spiritualThemes:['darkness']}});
set('paladin','empyreal-knight',{c:{'summoning-companions':'core','transformation-shapeshifting':'core'},f:{'controls-additional-entity':true,'has-shapeshifting':true},a:{spiritualThemes:['celestials'],primaryDelivery:['companion']}});
set('paladin','faithful-wanderer',{c:{'wilderness-affinity':'core','combat-mobility':'core'},f:{'has-mount':false},a:{professionIdentity:['wanderer']}});
set('paladin','forest-preserver',{c:{'wilderness-affinity':'core','protecting-allies':'core'},a:{environmentThemes:['forest'],spiritualThemes:['nature']}});
set('paladin','forgefather-s-seeker',{c:{'practical-expertise':'core','anti-magic-disruption':'core'},f:{'requires-deity':true},a:{professionIdentity:['smith'],spiritualThemes:['deity']}});
set('paladin','ghost-hunter',{c:{'anti-magic-disruption':'core'},a:{spiritualThemes:['undead','spirits'],professionIdentity:['ghost hunter']}});
set('paladin','gray-paladin',{c:{'social-influence':'core'},f:{'requires-alignment':false},a:{professionIdentity:['pragmatist']}});
set('paladin','holy-guide',{c:{'wilderness-affinity':'core'},a:{professionIdentity:['guide'],environmentThemes:['wilderness']}});
set('paladin','holy-gun',{c:{'melee-combat':'available','ranged-combat':'core'},f:{'has-firearms':true},a:{primaryDelivery:['firearm']},r:{primaryDelivery:['melee weapon']}});
set('paladin','holy-tactician',{c:{'tactical-leadership':'core','support-buffing':'core'},a:{professionIdentity:['tactician']}});
set('paladin','hospitaler',{c:{'single-target-damage':'available'},a:{professionIdentity:['healer']}});
set('paladin','hunting-paladin',{c:{'wilderness-affinity':'core','single-target-damage':'core'},a:{professionIdentity:['hunter'],environmentThemes:['wilderness']}});
set('paladin','invigorator',{c:{'support-buffing':'core','healing-recovery':'core'},a:{professionIdentity:['inspirer']}});
set('paladin','iomedaen-enforcer',{c:{'social-influence':'core','single-target-damage':'core'},f:{'requires-deity':true},a:{professionIdentity:['enforcer'],spiritualThemes:['Iomedae']}});
set('paladin','iroran-paladin',{c:{'combat-manoeuvres':'core','practical-expertise':'core'},f:{'requires-deity':true,'has-mount':false},a:{primaryDelivery:['unarmed'],spiritualThemes:['Irori']},r:{primaryDelivery:['melee weapon']}});
set('paladin','knight-of-coins',{c:{'practical-expertise':'core','social-influence':'core'},a:{professionIdentity:['merchant knight']}});
set('paladin','kraken-slayer',{c:{'wilderness-affinity':'core','combat-mobility':'core'},a:{environmentThemes:['maritime'],professionIdentity:['monster hunter']}});
set('paladin','legate',{c:{'social-influence':'core','anti-magic-disruption':'core'},a:{professionIdentity:['diplomat']}});
set('paladin','martyr',{c:{'support-buffing':'core','protecting-allies':'core'},a:{professionIdentity:['martyr']}});
set('paladin','mind-sword',{c:{'offensive-magic':'available','debuffing-enemies':'core'},a:{magicIdentity:['psychic'],spiritualThemes:['mind']}});
set('paladin','pearl-seeker',{c:{'wilderness-affinity':'core','combat-mobility':'core'},a:{environmentThemes:['maritime'],elementThemes:['water']}});
set('paladin','redeemer',{c:{'social-influence':'core','debuffing-enemies':'core'},a:{professionIdentity:['redeemer']}});
set('paladin','sacred-servant',{c:{'utility-magic':'core','support-buffing':'core'},f:{'requires-deity':true},a:{professionIdentity:['divine servant']}});
set('paladin','sacred-shield',{c:{'single-target-damage':'available','protecting-allies':'core','defensive-protective-magic':'core'},a:{professionIdentity:['shield guardian']}});
set('paladin','scion-of-talmandor',{c:{'summoning-companions':'core','tactical-leadership':'core'},f:{'controls-additional-entity':true},a:{spiritualThemes:['celestials'],primaryDelivery:['companion']}});
set('paladin','shining-knight',{c:{'combat-mobility':'core','tactical-leadership':'core'},f:{'has-mount':true},a:{primaryDelivery:['mounted combat']}});
set('paladin','silver-champion',{c:{'summoning-companions':'core','anti-magic-disruption':'core'},f:{'controls-additional-entity':true},a:{spiritualThemes:['dragons'],primaryDelivery:['companion']}});
set('paladin','soul-sentinel',{c:{'anti-magic-disruption':'core','personal-durability':'core'},a:{spiritualThemes:['souls']}});
set('paladin','stonelord',{c:{'personal-durability':'core','battlefield-control':'core'},f:{'has-spellcasting':false,'has-mount':false},a:{elementThemes:['earth'],professionIdentity:['stone guardian']}});
set('paladin','sword-of-valor',{c:{'tactical-leadership':'core','single-target-damage':'core'},a:{professionIdentity:['duelist']}});
set('paladin','tempered-champion',{c:{'melee-combat':'core','single-target-damage':'core'},f:{'has-spellcasting':false},p:{versatility:'low'},a:{professionIdentity:['weapon champion']}});
set('paladin','temple-champion',{c:{'melee-combat':'core','support-buffing':'core'},f:{'has-spellcasting':false,'has-mount':false},a:{professionIdentity:['temple champion']}});
set('paladin','tortured-crusader',{c:{'social-influence':'available','personal-durability':'core'},p:{'attribute-demands':'medium'},a:{professionIdentity:['solitary crusader']}});
set('paladin','tranquil-guardian',{c:{'debuffing-enemies':'core','protecting-allies':'core'},a:{professionIdentity:['peacekeeper']}});
set('paladin','undead-scourge',{c:{'anti-magic-disruption':'core','single-target-damage':'core'},a:{spiritualThemes:['undead'],professionIdentity:['undead hunter']}});
set('paladin','vindictive-bastard',{c:{'support-buffing':'core','debuffing-enemies':'core'},f:{'has-code-of-conduct':false,'requires-alignment':false,'has-spellcasting':false,'has-mount':false},a:{professionIdentity:['fallen avenger']}});
set('paladin','virtuous-bravo',{c:{'combat-mobility':'core','melee-combat':'core'},f:{'has-spellcasting':false,'has-mount':false},a:{professionIdentity:['swashbuckler']}});
set('paladin','warrior-of-the-holy-light',{c:{'support-buffing':'core','area-multi-target-damage':'available'},f:{'has-spellcasting':false},a:{spiritualThemes:['light']}});
set('paladin','wilderness-warden',{c:{'wilderness-affinity':'core','protecting-allies':'core'},a:{environmentThemes:['wilderness'],professionIdentity:['warden']}});

// Preserve every decision in the hand-reviewed pilots before normalising deltas.
for(let i=1;i<=10;i++)for(const pilot of JSON.parse(fs.readFileSync(path.join(dir,`archetype-profiles-pilot-${String(i).padStart(2,'0')}.json`))).profiles){if(!classes.includes(pilot.parentClassId))continue;const e=review[pilot.parentClassId][pilot.id.split(':')[1]];Object.assign(e.c,pilot.capabilityOverrides||{});Object.assign(e.p,pilot.practicalOverrides||{});Object.assign(e.f,pilot.factOverrides||{});for(const[k,v]of Object.entries(pilot.identityAdds||{}))e.a[k]=[...v];for(const[k,v]of Object.entries(pilot.identityRemoves||{}))e.r[k]=[...v];}

function heading(t){return[...new Set([...t.matchAll(/(?:^|\n)([A-Z][A-Za-z’' -]{2,45})(?: \([^\n)]*\))?:/g)].map(m=>m[1]))].slice(0,4).join(' / ')||'Archetype Features';}
function constraints(s){const m=s.match(/^\(([^)]+?)(?: Only)?\)/i);return m&&!/archetype/i.test(m[1])?[{type:'race',kind:'requirement',summary:`This archetype is restricted to ${m[1]} characters.`,evidenceSection:'Archetype requirement'}]:[];}
function build(cls,x){const p=parentById.get(cls),e=review[cls][x.id.split(':')[1]],clean=(o,b)=>Object.fromEntries(Object.entries(o).filter(([k,v])=>b[k]!==v)),caps=clean(e.c,p.capabilities),practical=clean(e.p,p.practical),facts=clean(e.f,p.facts),adds={},removes={};for(const[k,v]of Object.entries(e.a)){const z=v.filter(q=>!p.identity[k].includes(q));if(z.length)adds[k]=z;}for(const[k,v]of Object.entries(e.r)){const z=v.filter(q=>p.identity[k].includes(q));if(z.length)removes[k]=z;}for(const k of['magicIdentity','castingMethod','castingExtent','spiritualThemes','elementThemes'])if(adds[k]?.length&&p.identity[k].includes('none'))removes[k]=[...new Set([...(removes[k]||[]),'none'])];const sec=heading(x.sourceText),evidence=Object.keys(caps).map(id=>({field:`capabilityOverrides.${id}`,section:sec,reason:`The archetype’s ${sec} package materially changes ${id.replaceAll('-',' ')} from the ${p.name} baseline.`}));if(!evidence.length)evidence.push({field:'playerSummary',section:sec,reason:`${sec} defines the material change from the ${p.name} baseline.`});return{id:x.id,name:x.name,parentClassId:cls,sourceCitationText:x.sourceCitationText,sourceUrl:x.aonUrl,capabilityOverrides:caps,practicalOverrides:practical,factOverrides:facts,identityAdds:adds,identityRemoves:removes,constraints:constraints(x.aonSummary),professionIdentity:[],evidence,playerSummary:x.aonSummary.replace(/^\([^)]*\)\s*/i,''),tradeoff:x.replaces?`It replaces or alters ${x.replaces}; those base-class tools are exchanged for the archetype’s more specialised package.`:'Its specialised features narrow or redirect part of the base class toolkit.',reviewStatus:'reviewed'};}
for(const cls of classes){const profiles=details.get(cls).map(x=>build(cls,x));fs.writeFileSync(path.join(dir,`archetype-profiles-${cls}.json`),`${JSON.stringify({schemaVersion:2,status:'reviewed',inheritanceRule:`Every omitted field inherits the resolved ${parentById.get(cls).name} parent value.`,profiles},null,2)}\n`);}
