import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(repo,'assets/find-your-class','v2');
const parents=['01','02','03'].flatMap(n=>JSON.parse(fs.readFileSync(path.join(dir,`class-profiles-batch-${n}.json`),'utf8')).profiles);
const classIds=['bloodrager','brawler','cavalier','cleric'];
const parentById=new Map(parents.map(x=>[x.id,x]));
const details=new Map(classIds.map(id=>[id,JSON.parse(fs.readFileSync(path.join(repo,'assets/find-your-class/aon-catalog/class-details',`${id}.json`),'utf8')).profiles]));
const E=(c={},f={},a={},p={},r={})=>({c,f,a,p,r});
const explicit={
 bloodrager:{
  'ancestral-harbinger':E({'summoning-companions':'core','support-buffing':'core'},{'controls-additional-entity':true},{spiritualThemes:['spirits'],primaryDelivery:['companion']}),
  'blood-conduit':E({'combat-manoeuvres':'core'}),bloodrider:E({'combat-mobility':'core'},{'has-mount':true,'controls-additional-entity':true},{primaryDelivery:['companion']}),
  'bloody-knuckled-rowdy':E({'combat-manoeuvres':'core','offensive-magic':'absent'},{'has-spellcasting':false},{primaryDelivery:['unarmed']}),
  'crossblooded-rager':E({}, {}, {}, {versatility:'high'}),'enlightened-bloodrager':E({'support-buffing':'core','wilderness-affinity':'core'}, {}, {spiritualThemes:['nature']}),
  greenrager:E({'summoning-companions':'available','wilderness-affinity':'core'},{'controls-additional-entity':true},{spiritualThemes:['nature']}),
  'hag-riven':E({'transformation-shapeshifting':'core'},{'has-shapeshifting':true},{primaryDelivery:['natural attacks']}),'id-rager':E({'debuffing-enemies':'core'}, {}, {spiritualThemes:['occult']}),
  'metamagic-rager':E({'offensive-magic':'core'}),primalist:E({}, {}, {}, {versatility:'high'}),'prowler-at-world-s-end':E({'summoning-companions':'available'},{'controls-additional-entity':true},{spiritualThemes:['spirits']}),
  rageshaper:E({'transformation-shapeshifting':'core'},{'has-shapeshifting':true},{primaryDelivery:['natural attacks']}),spelleater:E({'healing-recovery':'core'},{'has-healing':true}),
  steelblood:E({}, {}, {}, {'equipment-dependence':'high'}),'symbol-striker':E({'battlefield-control':'available'}, {}, {professionIdentity:['rune warrior']}),
  'untouchable-rager':E({'offensive-magic':'absent','anti-magic-disruption':'core'},{'has-spellcasting':false}),'urban-bloodrager':E({'wilderness-affinity':'absent'}, {}, {environmentThemes:['urban']}, {}, {environmentThemes:['wilderness']})
 },
 brawler:{
  'battle-dancer':E({'combat-mobility':'core'}),bouncer:E({'social-influence':'core'}, {}, {professionIdentity:['bouncer']}),'constructed-pugilist':E({}, {}, {primaryDelivery:['prosthetic weapon']}),
  exemplar:E({'tactical-leadership':'core','support-buffing':'core'}), 'feral-striker':E({'transformation-shapeshifting':'core','wilderness-affinity':'available'},{'has-shapeshifting':true},{spiritualThemes:['nature'],primaryDelivery:['natural attacks']}),
  hinyasi:E({}, {}, {primaryDelivery:['improvised weapon']}),'living-avalanche':E({'battlefield-control':'core','combat-mobility':'core'}),'mutagenic-mauler':E({'transformation-shapeshifting':'available'}, {}, {professionIdentity:['alchemist']}),
  'shield-champion':E({'ranged-combat':'core','protecting-allies':'core'}, {}, {primaryDelivery:['shield']}),'snakebite-striker':E({'stealth-subterfuge':'core'},{'has-sneak-attack':true}),
  'steel-breaker':E({'combat-manoeuvres':'core','anti-magic-disruption':'available'}),strangler:E({'combat-manoeuvres':'core','stealth-subterfuge':'available'}),'strong-side-boxer':E({'combat-manoeuvres':'core'}, {}, {primaryDelivery:['close weapon']}),
  turfer:E({'wilderness-affinity':'core','battlefield-control':'core'}),'ulfen-beast-wrestler':E({'combat-manoeuvres':'core'}),venomfist:E({'debuffing-enemies':'core'}, {}, {primaryDelivery:['natural attacks']}),
  'verdant-grappler':E({'battlefield-control':'core','wilderness-affinity':'core'}, {}, {spiritualThemes:['nature']}),'wild-child':E({'summoning-companions':'core','wilderness-affinity':'core'},{'has-animal-companion':true,'controls-additional-entity':true},{primaryDelivery:['companion']}),
  'winding-path-renegade':E({}, {}, {}, {versatility:'high'})
 },
 cavalier:{
  'beast-rider':E({}, {}, {primaryDelivery:['exotic mount']}),castellan:E({'protecting-allies':'core','combat-mobility':'available'}, {}, {environmentThemes:['urban']}),charger:E({}, {}, {}, {}, {environmentThemes:['wilderness']}),
  'circuit-judge':E({'knowledge-investigation':'core','social-influence':'core','tactical-leadership':'available'}, {}, {professionIdentity:['judge']}),constable:E({'knowledge-investigation':'core','combat-mobility':'available'}, {}, {environmentThemes:['urban'],professionIdentity:['constable']}),
  'courtly-knight':E({'social-influence':'core'}, {}, {professionIdentity:['courtier']}),'daring-champion':E({'summoning-companions':'absent','combat-mobility':'core'},{'has-mount':false,'controls-additional-entity':false}, {}, {'equipment-dependence':'medium'}, {},),
  'daring-general':E({'tactical-leadership':'core','support-buffing':'core'}),'disciple-of-the-pike':E({'summoning-companions':'absent','combat-manoeuvres':'core'},{'has-mount':false,'controls-additional-entity':false}),'drakerider':E({}, {}, {primaryDelivery:['drake companion']}),
  emissary:E({'combat-mobility':'core','tactical-leadership':'available'}),esquire:E({}, {'has-mount':false}, {primaryDelivery:['follower']}),'fell-rider':E({'debuffing-enemies':'core'}, {}, {primaryDelivery:['monstrous mount']}),
  'first-mother-s-fang':E({'tactical-leadership':'core','social-influence':'core'}, {}, {professionIdentity:['governor']}),gallant:E({'support-buffing':'core','social-influence':'core'}),gendarme:E({'tactical-leadership':'available','single-target-damage':'core'}),
  'ghost-rider':E({'anti-magic-disruption':'core'}, {}, {spiritualThemes:['undead'],primaryDelivery:['phantasmal mount']}),'green-knight':E({'wilderness-affinity':'core','protecting-allies':'core'}, {}, {spiritualThemes:['nature']}),
  'herald-squire':E({'practical-expertise':'core','knowledge-investigation':'core'}, {}, {professionIdentity:['scout']}),'honor-guard':E({'protecting-allies':'core','combat-mobility':'available'}),'hooded-knight':E({'protecting-allies':'core'}, {}, {spiritualThemes:['nature']}),
  huntmaster:E({'wilderness-affinity':'core'}, {'has-mount':false,'has-animal-companion':true}, {primaryDelivery:['animal pack']}),hussar:E({'combat-mobility':'core'}, {}, {}, {'equipment-dependence':'medium'}),
  'knight-of-arnisant':E({'anti-magic-disruption':'core','defensive-protective-magic':'available'}, {}, {spiritualThemes:['deity']}),'luring-cavalier':E({'battlefield-control':'core'}),musketeer:E({'ranged-combat':'core','summoning-companions':'absent'},{'has-mount':false,'has-firearms':true,'controls-additional-entity':false},{primaryDelivery:['firearm']}),
  oceanrider:E({'wilderness-affinity':'core'}, {}, {environmentThemes:['maritime'],primaryDelivery:['aquatic mount']}),'qabarat-outrider':E({'tactical-leadership':'core','support-buffing':'core'}, {}, {spiritualThemes:['psychic']}),'qadiran-horselord':E({'combat-mobility':'core'}),
  'saurian-champion':E({'wilderness-affinity':'core'}, {}, {primaryDelivery:['dinosaur companion']}),'sister-in-arms':E({'tactical-leadership':'core','support-buffing':'core'}),'spellscar-drifter':E({'ranged-combat':'core','tactical-leadership':'available'},{'has-firearms':true},{primaryDelivery:['firearm']}),
  'standard-bearer':E({'support-buffing':'core','combat-mobility':'available'}),strategist:E({'tactical-leadership':'core','support-buffing':'core'}),verdivant:E({'wilderness-affinity':'core','transformation-shapeshifting':'available'}, {}, {spiritualThemes:['nature'],elementThemes:['wood']}),
  'vermin-tamer':E({'wilderness-affinity':'core'}, {}, {environmentThemes:['underground'],primaryDelivery:['vermin mount']}),'wave-rider':E({'wilderness-affinity':'core'}, {}, {environmentThemes:['maritime'],primaryDelivery:['aquatic mount']})
 },
 cleric:{
  'angelfire-apostle':E({'healing-recovery':'core','offensive-magic':'core'}, {}, {elementThemes:['fire']}),appeaser:E({}, {}, {}, {versatility:'medium'}),'asmodean-advocate':E({'social-influence':'core'}, {}, {professionIdentity:['advocate']}),
  'blossoming-light':E({'anti-magic-disruption':'core','offensive-magic':'core'}, {}, {elementThemes:['radiance']}),cardinal:E({'social-influence':'core','practical-expertise':'core'}, {}, {professionIdentity:['politician']}, {'equipment-dependence':'low'}),
  'channeler-of-the-unknown':E({'support-buffing':'available'}, {'requires-deity':false}, {spiritualThemes:['unknown force']}, {}, {spiritualThemes:['deity']}),'cloistered-cleric':E({'melee-combat':'absent','knowledge-investigation':'core'}, {}, {}, {'equipment-dependence':'low'}),
  'crashing-wave':E({}, {}, {elementThemes:['water'],environmentThemes:['maritime']}),crusader:E({'melee-combat':'core'}, {}, {}, {'equipment-dependence':'high'}),'demonic-apostle':E({}, {}, {spiritualThemes:['outsiders']}),
  'divine-paragon':E({}, {}, {}, {versatility:'medium'}),'divine-scourge':E({'debuffing-enemies':'core'}),'divine-strategist':E({'tactical-leadership':'core'}, {}, {professionIdentity:['strategist']}),
  ecclesitheurge:E({'melee-combat':'absent'}, {}, {}, {'equipment-dependence':'low',versatility:'high'}),'elder-mythos-cultist':E({'social-influence':'core'}, {}, {spiritualThemes:['occult']}),evangelist:E({'tactical-leadership':'core','social-influence':'core','support-buffing':'core'}),
  'fiendish-vessel':E({}, {}, {spiritualThemes:['outsiders']}),forgemaster:E({'practical-expertise':'core','support-buffing':'core'}, {}, {professionIdentity:['crafter']}),'foundation-of-faith':E({'personal-durability':'core','defensive-protective-magic':'core'}),
  'herald-caller':E({'summoning-companions':'core'},{'controls-additional-entity':true},{spiritualThemes:['outsiders'],primaryDelivery:['companion']}),'hidden-priest':E({'stealth-subterfuge':'core','social-influence':'core'}),idealist:E({}, {}, {}, {versatility:'medium'}),
  'iron-priest':E({'practical-expertise':'core'}, {}, {professionIdentity:['technologist']}),lawspeaker:E({'social-influence':'core'}, {}, {professionIdentity:['judge']}),'mendevian-priest':E({'tactical-leadership':'core','anti-magic-disruption':'core'}, {}, {spiritualThemes:['outsiders']}),
  'merciful-healer':E({'healing-recovery':'core','offensive-magic':'available'}),'roaming-exorcist':E({'anti-magic-disruption':'core','knowledge-investigation':'core'}, {}, {professionIdentity:['exorcist']}),'sacred-attendant':E({'social-influence':'core','healing-recovery':'core'}),
  'scroll-scholar':E({'knowledge-investigation':'core','practical-expertise':'core'}, {}, {professionIdentity:['scholar']}),separatist:E({}, {}, {}, {versatility:'high'}),'stoic-caregiver':E({'healing-recovery':'core','anti-magic-disruption':'core'}),
  theologian:E({'offensive-magic':'core'}, {}, {}, {versatility:'medium'}),'triadic-priest':E({'tactical-leadership':'core','support-buffing':'core'}),'undead-lord':E({'summoning-companions':'core'},{'controls-additional-entity':true},{spiritualThemes:['undead'],primaryDelivery:['companion']}),
  'varisian-pilgrim':E({'combat-mobility':'core'}, {}, {professionIdentity:['traveller']})
 }
};

function headings(text){return [...new Set([...text.matchAll(/(?:^|\n)([A-Z][A-Za-z’' -]{2,45})(?: \([^\n)]*\))?:/g)].map(m=>m[1]))].slice(0,4).join(' / ')||'Archetype Features';}
function raceConstraint(summary){const m=summary.match(/^\(([^)]+) Only\)/i);return m?[{type:'race',kind:'requirement',summary:`This archetype is available only to ${m[1]} characters.`,evidenceSection:'Archetype requirement'}]:[];}
function build(classId,source){
 const parent=parentById.get(classId),key=source.id.split(':')[1],e=explicit[classId][key];if(e===undefined)throw new Error(`Missing review mapping: ${source.id}`);
 const caps=Object.fromEntries(Object.entries(e.c||{}).filter(([id,v])=>parent.capabilities[id]!==v));const practical=Object.fromEntries(Object.entries(e.p||{}).filter(([id,v])=>parent.practical[id]!==v));const facts=Object.fromEntries(Object.entries(e.f||{}).filter(([id,v])=>parent.facts[id]!==v));
 const adds={};for(const [cat,values]of Object.entries(e.a||{})){const fresh=values.filter(v=>!parent.identity[cat].includes(v));if(fresh.length)adds[cat]=fresh;}const removes={};for(const [cat,values]of Object.entries(e.r||{})){const old=values.filter(v=>parent.identity[cat].includes(v));if(old.length)removes[cat]=old;}if(adds.spiritualThemes?.length&&parent.identity.spiritualThemes.includes('none'))removes.spiritualThemes=[...(removes.spiritualThemes||[]),'none'];
 const section=headings(source.sourceText),evidence=Object.keys(caps).map(id=>({field:`capabilityOverrides.${id}`,section,reason:`The archetype’s ${section} package materially changes ${id.replaceAll('-',' ')} from the ${parent.name} baseline.`}));if(!evidence.length)evidence.push({field:'playerSummary',section,reason:`${section} defines the material change from the ${parent.name} baseline.`});
 return{id:source.id,name:source.name,parentClassId:classId,sourceCitationText:source.sourceCitationText,sourceUrl:source.aonUrl,capabilityOverrides:caps,practicalOverrides:practical,factOverrides:facts,identityAdds:adds,identityRemoves:removes,constraints:raceConstraint(source.aonSummary),professionIdentity:[],evidence,playerSummary:source.aonSummary.replace(/^\([^)]* Only\)\s*/i,''),tradeoff:source.replaces?`It replaces or alters ${source.replaces}; those base-class tools are exchanged for the archetype’s more specialised package.`:'Its specialised features narrow or redirect part of the base class toolkit.',reviewStatus:'reviewed'};
}
for(const classId of classIds){const profiles=details.get(classId).map(source=>build(classId,source));fs.writeFileSync(path.join(dir,`archetype-profiles-${classId}.json`),`${JSON.stringify({schemaVersion:2,status:'reviewed',inheritanceRule:`Every omitted field inherits the resolved ${parentById.get(classId).name} parent value.`,profiles},null,2)}\n`);}
