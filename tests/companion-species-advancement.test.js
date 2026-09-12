// Run with: node --test tests/companion-species-advancement.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/animal-companion-species-core.json'), 'utf8'));
function segment(start, end){
  const a=html.indexOf(start), b=html.indexOf(end,a);
  assert.ok(a>=0 && b>a, `source segment ${start}`);
  return html.slice(a,b);
}
function setup(){
  const ui = new Map();
  const $ = id => {if(!ui.has(id)) ui.set(id,{value:'',style:{},textContent:''});return ui.get(id)};
  let profile;
  const context = {
    $, COMPANION_SPECIES:catalog.species, currentProfile:()=>profile,
    effectiveCompanionLevel:(_source,level)=>level,
    speciesOriginPrefix:id=>'preset:species:'+id+':',
    attackLineFromSpecies:(a,bab,size)=>({lineId:'fresh-'+a.name,name:a.name,qty:a.count||1,die:a.damage,atkBonus:bab+(size==='Large'?-1:0)}),
    syncUIIntoProfile:()=>{for(const stat of ['str','dex','con','int','wis','cha']) profile[stat]=Number($(stat).value)},
    recomputeMultiattack:()=>{},saveStore:()=>{},renderAttackLines:()=>{},compute:()=>{},renderAnimalAdvancementChoice:()=>{}
  };
  vm.createContext(context);
  vm.runInContext(segment('function speciesAdvancedAt(', '// ANIMAL-MERGE-001'),context);
  vm.runInContext(segment('const SPECIES_ATTACK_PRESERVED_FIELDS=', '// ANIMAL-APPLY-DISTINCT-001'),context);
  profile={entityType:'animal-companion',sourceClass:'druid',animalSpeciesApplied:'',animalAdvancementChoice:'listed',attackLines:[],removedSpeciesAttackOrigins:[]};
  $('sourceClass').value='druid';$('bab').value='2';$('ownerLevel').value='3';$('speciesPreset').value='ape';
  return {context,profile,$};
}

test('new sheets have consistent druid level-7 progression and no phantom sample attacks',()=>{
  const context={newLineId:()=> 'new-line'};vm.createContext(context);
  vm.runInContext(segment('function defaultProfile(name){', '// Entity types this calculator'),context);
  const p=context.defaultProfile('Test Companion');
  assert.equal(p.ownerLevel,7);assert.equal(p.characterLevel,6);assert.equal(p.bab,4);
  assert.equal(p.attackLines.length,0);assert.equal(p.animalAdvancementChoice,'listed');
});

test('listed vs alternative species advancement affects stats, size and attacks without erasing manual deltas',()=>{
  const {context,profile,$}=setup();
  const apply=explicit=>context.applyAnimalCompanionPresetCore('ape',explicit);
  apply(true);
  assert.equal(Number($('str').value),13);assert.equal(profile.creatureSize,'Medium');
  $('str').value=16; // player added +3 on top of the species baseline
  $('ownerLevel').value='4';$('bab').value='3';apply(false);
  assert.equal(Number($('str').value),24);assert.equal(profile.creatureSize,'Large');
  assert.equal(profile.attackLines.find(l=>l.name==='Bite').die,'1d6');
  const biteId=profile.attackLines.find(l=>l.name==='Bite').lineId;
  profile.animalAdvancementChoice='alternative';apply(false);
  assert.equal(Number($('str').value),16);assert.equal(Number($('dex').value),19);
  assert.equal(Number($('con').value),12);assert.equal(profile.creatureSize,'Medium');
  assert.equal(profile.attackLines.find(l=>l.name==='Bite').die,'1d4');
  assert.equal(profile.attackLines.find(l=>l.name==='Bite').lineId,biteId);
  $('ownerLevel').value='3';apply(false);
  assert.equal(Number($('dex').value),17);assert.equal(profile.creatureSize,'Medium');
  $('ownerLevel').value='4';apply(false);
  assert.equal(Number($('dex').value),19);assert.equal(Number($('str').value),16);
});

test('species conditional attacks are displayed but excluded from Multiattack qualification',()=>{
  const context={};
  vm.createContext(context);
  vm.runInContext(segment('function speciesAttackRulesFor(', '// ANIMAL-MERGE-001'),context);
  const cat=catalog.species.find(s=>s.id==='cat_big');
  const start=context.speciesAttackRulesFor(cat,false);
  const advanced=context.speciesAttackRulesFor(cat,true);
  assert.equal(start.find(a=>a.name==='Rake')._conditional,true);
  assert.equal(start.find(a=>a.name==='Rake').damage,'1d4');
  assert.equal(advanced.find(a=>a.name==='Rake').damage,'1d6');
});

test('progression ability increases unlock at each entity table milestone',()=>{
  const context={};
  vm.createContext(context);
  vm.runInContext(segment('function progressionAbilityIncreaseCount(', 'function renderProgressionAbilityChoices'),context);
  assert.equal(context.progressionAbilityIncreaseCount('animal-companion',3,20),0);
  assert.equal(context.progressionAbilityIncreaseCount('animal-companion',4,20),1);
  assert.equal(context.progressionAbilityIncreaseCount('mount',20,1),4);
  assert.equal(context.progressionAbilityIncreaseCount('eidolon-chained',null,4),0);
  assert.equal(context.progressionAbilityIncreaseCount('eidolon-chained',null,15),3);
  assert.equal(context.progressionAbilityIncreaseCount('phantom',null,20),3);
  assert.equal(context.progressionAbilityIncreaseCount('familiar',null,20),0);
});
