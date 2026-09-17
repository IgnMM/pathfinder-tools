import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(repo,'assets/find-your-class','v2');
const parents=['01','02','03'].flatMap(n=>JSON.parse(fs.readFileSync(path.join(dir,`class-profiles-batch-${n}.json`),'utf8')).profiles);
const classIds=['antipaladin','arcanist','barbarian','bard'];
const parentById=new Map(parents.map(x=>[x.id,x]));
const details=new Map(classIds.map(id=>[id,JSON.parse(fs.readFileSync(path.join(repo,'assets/find-your-class/aon-catalog/class-details',`${id}.json`),'utf8')).profiles]));

const explicit={
 antipaladin:{
  'blighted-myrmidon':{c:{'battlefield-control':'core'},a:{spiritualThemes:['nature']}},
  'dread-vanguard':{c:{'tactical-leadership':'core','support-buffing':'core'}},fearmonger:{c:{'debuffing-enemies':'core'}},
  insinuator:{c:{'social-influence':'core'},p:{versatility:'high'}},'iron-tyrant':{c:{'combat-manoeuvres':'core','defensive-protective-magic':'core'}},
  'knight-of-the-sepulcher':{c:{'transformation-shapeshifting':'core'},a:{spiritualThemes:['undead']},f:{'has-shapeshifting':true}},
  'rough-rampager':{c:{'combat-manoeuvres':'core'}},'seal-breaker':{c:{'anti-magic-disruption':'core'}},tyrant:{c:{'tactical-leadership':'core','protecting-allies':'core'}}
 },
 arcanist:{
  aeromancer:{a:{elementThemes:['air']}},'arcane-tinkerer':{c:{'practical-expertise':'available'}},'blade-adept':{c:{'melee-combat':'core'},p:{'equipment-dependence':'high'},a:{primaryDelivery:['melee weapon']}},
  'blood-arcanist':{},'brown-fur-transmuter':{c:{'transformation-shapeshifting':'core','support-buffing':'core'}},'eldritch-font':{},
  'elemental-master':{},'harrowed-society-student':{},'magaambyan-initiate':{c:{'wilderness-affinity':'available'},a:{spiritualThemes:['nature']}},
  occultist:{c:{'summoning-companions':'core'}},'school-savant':{},'spell-specialist':{},'twilight-sage':{a:{spiritualThemes:['undead']}},
  'unlettered-arcanist':{},'white-mage':{c:{'healing-recovery':'core'},f:{'has-healing':true}}
 },
 barbarian:{
  'armored-hulk':{c:{'combat-mobility':'available'}},'beastkin-berserker':{c:{'transformation-shapeshifting':'core'},f:{'has-shapeshifting':true},a:{primaryDelivery:['natural attacks']}},
  breaker:{c:{'combat-manoeuvres':'core'}},'brutal-pugilist':{c:{'combat-manoeuvres':'core'},a:{primaryDelivery:['unarmed']}},'brutish-swamper':{c:{'wilderness-affinity':'core'}},
  'cave-dweller':{a:{environmentThemes:['underground']}},'deepwater-rager':{c:{'combat-mobility':'core'},a:{environmentThemes:['maritime']}},dreadnought:{},
  'drunken-brute':{},'drunken-rager':{},'elemental-kin':{},'fearsome-defender':{c:{'protecting-allies':'core'}},
  'feral-gnasher':{c:{'combat-manoeuvres':'core'},a:{primaryDelivery:['natural attacks']}},flesheater:{c:{'transformation-shapeshifting':'core'},f:{'has-shapeshifting':true}},
  'geminate-invoker':{c:{'summoning-companions':'available'},f:{'controls-additional-entity':true},a:{spiritualThemes:['spirits']}},'giant-stalker':{},'hateful-rager':{c:{'debuffing-enemies':'core'}},
  hurler:{c:{'ranged-combat':'core'},a:{primaryDelivery:['ranged weapon']}},'invulnerable-rager':{},'jungle-rager':{c:{'wilderness-affinity':'core'}},
  'mad-dog':{c:{'summoning-companions':'core'},f:{'has-animal-companion':true,'controls-additional-entity':true},a:{primaryDelivery:['companion']}},
  mooncursed:{c:{'transformation-shapeshifting':'core'},f:{'has-shapeshifting':true},a:{primaryDelivery:['natural attacks']}},
  'mounted-fury':{c:{'combat-mobility':'core'},f:{'has-mount':true,'controls-additional-entity':true},a:{primaryDelivery:['companion']}},
  'numerian-liberator':{},'pack-hunter':{c:{'tactical-leadership':'core'}},'pack-rager':{c:{'tactical-leadership':'core','support-buffing':'available'}},
  'primal-hunter':{c:{'ranged-combat':'core'},a:{primaryDelivery:['ranged weapon']}},'raging-cannibal':{},'savage-barbarian':{},
  'savage-technologist':{c:{'ranged-combat':'core'},f:{'has-firearms':true},a:{primaryDelivery:['firearm']}},'scarred-rager':{},
  'sea-reaver':{a:{environmentThemes:['maritime']}},sharptooth:{a:{primaryDelivery:['natural attacks']}},'shoanti-burn-rider':{c:{'combat-mobility':'core'},f:{'has-mount':true,'controls-additional-entity':true},a:{primaryDelivery:['companion']}},
  superstitious:{c:{'anti-magic-disruption':'core'}},'titan-mauler':{c:{'combat-manoeuvres':'core'}},'totem-warrior':{},'true-primitive':{},'untamed-rager':{c:{'combat-manoeuvres':'core'}},
  'urban-barbarian':{c:{'wilderness-affinity':'absent'},a:{environmentThemes:['urban']},r:{environmentThemes:['wilderness']}},'wild-rager':{},wildborn:{c:{'wilderness-affinity':'core'}}
 },
 bard:{
  'animal-speaker':{c:{'summoning-companions':'core','wilderness-affinity':'core'},f:{'has-animal-companion':true,'controls-additional-entity':true},a:{spiritualThemes:['nature'],primaryDelivery:['companion']}},
  'arcane-duelist':{c:{'melee-combat':'core'},p:{'equipment-dependence':'high'}},'arcane-healer':{},archaeologist:{c:{'tactical-leadership':'absent','support-buffing':'available'},f:{'has-sneak-attack':false}},
  archivist:{},'argent-voice':{},'arrowsong-minstrel':{c:{'ranged-combat':'core'}},'averaka-arbiter':{},'brazen-deceiver':{},buccaneer:{a:{environmentThemes:['maritime']}},
  busker:{},celebrity:{},'chelish-diva':{},'chronicler-of-worlds':{},'court-bard':{},'court-fool':{},cultivator:{a:{spiritualThemes:['nature']}},daredevil:{c:{'melee-combat':'core'}},
  'dawnflower-dervish':{c:{'melee-combat':'core'},a:{spiritualThemes:['deity']}},demagogue:{},dervish:{},'dervish-dancer':{c:{'melee-combat':'core'}},detective:{},'dirge-bard':{a:{spiritualThemes:['undead']}},
  'disciple-of-the-forked-tongue':{a:{spiritualThemes:['outsiders']}},'dragon-herald':{},'dragon-yapper':{},duettist:{c:{'summoning-companions':'core'},f:{'has-familiar':true,'controls-additional-entity':true},a:{primaryDelivery:['companion']}},
  'dwarven-scholar':{},'faith-singer':{a:{spiritualThemes:['deity']}},'fey-courtier':{a:{spiritualThemes:['nature']}},'fey-prankster':{a:{spiritualThemes:['nature']}},filidh:{a:{spiritualThemes:['nature']}},
  'first-world-minstrel':{a:{spiritualThemes:['nature']}},'flame-dancer':{c:{'offensive-magic':'core'},a:{elementThemes:['fire']}},flamesinger:{c:{'offensive-magic':'core'},a:{elementThemes:['fire']}},
  'fortune-teller':{a:{spiritualThemes:['occult']}},geisha:{},'hatharat-agent':{},hoaxer:{},'impervious-messenger':{},juggler:{c:{'ranged-combat':'core'}},'lotus-geisha':{},'luring-piper':{},
  magician:{},'masked-performer':{},'mute-musician':{},negotiator:{},'phrenologist':{a:{spiritualThemes:['occult']}},'pitax-academy-of-grand-arts':{},'plant-speaker':{c:{'wilderness-affinity':'core'},a:{spiritualThemes:['nature'],elementThemes:['wood']}},
  prankster:{},provocateur:{},'ringleader-ag':{},'ringleader-ui':{},sandman:{c:{'tactical-leadership':'absent'},f:{'has-sneak-attack':true}},'savage-skald':{c:{'melee-combat':'core'}},
  'sea-singer':{a:{environmentThemes:['maritime']}},'shadow-puppeteer':{a:{elementThemes:['void']}},'silver-balladeer':{},solacer:{},songhealer:{},sorrowsoul:{},
  'sound-striker':{c:{'offensive-magic':'core','area-multi-target-damage':'available'}},'speaker-of-the-palatine-eye':{a:{spiritualThemes:['occult']}},stonesinger:{a:{elementThemes:['earth'],environmentThemes:['underground']}},
  'street-performer':{},'studious-librarian':{},thundercaller:{c:{'offensive-magic':'core','area-multi-target-damage':'available'},a:{elementThemes:['electricity']}},'voice-of-brigh':{},
  'voice-of-the-wild':{c:{'wilderness-affinity':'core'},a:{spiritualThemes:['nature']}},'wasteland-chronicler':{c:{'wilderness-affinity':'core'}},watersinger:{a:{elementThemes:['water'],environmentThemes:['maritime']}},wit:{}
 }
};

function headings(text){return [...new Set([...text.matchAll(/(?:^|\n)([A-Z][A-Za-z’' -]{2,45})(?: \([^\n)]*\))?:/g)].map(m=>m[1]))].slice(0,4).join(' / ')||'Archetype Features';}
function raceConstraint(summary){const m=summary.match(/^\(([^)]+) Only\)/i);return m?[{type:'race',kind:'requirement',summary:`This archetype is available only to ${m[1]} characters.`,evidenceSection:'Archetype requirement'}]:[];}
function build(classId,source){
 const parent=parentById.get(classId), key=source.id.split(':')[1], e=explicit[classId][key]; if(e===undefined) throw new Error(`Missing review mapping: ${source.id}`);
 const caps=Object.fromEntries(Object.entries(e.c||{}).filter(([id,value])=>parent.capabilities[id]!==value));
 const practical=Object.fromEntries(Object.entries(e.p||{}).filter(([id,value])=>parent.practical[id]!==value));
 const facts=Object.fromEntries(Object.entries(e.f||{}).filter(([id,value])=>parent.facts[id]!==value));
 const adds={}; for(const [cat,values] of Object.entries(e.a||{})){const fresh=values.filter(v=>!parent.identity[cat].includes(v));if(fresh.length)adds[cat]=fresh;}
 const removes={}; for(const [cat,values] of Object.entries(e.r||{})){const old=values.filter(v=>parent.identity[cat].includes(v));if(old.length)removes[cat]=old;}
 if(adds.spiritualThemes?.length && parent.identity.spiritualThemes.includes('none') && !removes.spiritualThemes?.includes('none')) removes.spiritualThemes=[...(removes.spiritualThemes||[]),'none'];
 const section=headings(source.sourceText), evidence=Object.keys(caps).map(id=>({field:`capabilityOverrides.${id}`,section,reason:`The archetype’s ${section} package materially changes ${id.replaceAll('-',' ')} from the ${parent.name} baseline.`}));
 if(!evidence.length)evidence.push({field:'playerSummary',section,reason:`${section} defines the material change from the ${parent.name} baseline.`});
 return {id:source.id,name:source.name,parentClassId:classId,sourceCitationText:source.sourceCitationText,sourceUrl:source.aonUrl,capabilityOverrides:caps,practicalOverrides:practical,factOverrides:facts,identityAdds:adds,identityRemoves:removes,constraints:raceConstraint(source.aonSummary),professionIdentity:[],evidence,playerSummary:source.aonSummary.replace(/^\([^)]* Only\)\s*/i,''),tradeoff:source.replaces?`It replaces or alters ${source.replaces}; those base-class tools are exchanged for the archetype’s more specialised package.`:'Its specialised features narrow or redirect part of the base class toolkit.',reviewStatus:'reviewed'};
}

for(const classId of classIds){const profiles=details.get(classId).map(source=>build(classId,source));if(profiles.length!==details.get(classId).length)throw new Error(classId);fs.writeFileSync(path.join(dir,`archetype-profiles-${classId}.json`),`${JSON.stringify({schemaVersion:2,status:'reviewed',inheritanceRule:`Every omitted field inherits the resolved ${parentById.get(classId).name} parent value.`,profiles},null,2)}\n`);}
