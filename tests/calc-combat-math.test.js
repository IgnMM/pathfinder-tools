// Run with: node --test tests/calc-combat-math.test.js
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'../calc/index.html'),'utf8');

test('Multiweapon Fighting is distinct from Multiweapon Specialist and drives displayed TWF penalties',()=>{
  assert.match(html,/id:"multiweapon-fighting",name:"Multiweapon Fighting"/);
  assert.match(html,/a\.id==='two-weapon-fighting' \|\| a\.id==='multiweapon-fighting'/);
  assert.match(html,/resolve every additional off hand manually/);
});

function extractFunction(name,nextName){
  const start=html.indexOf('function '+name+'(');
  const end=html.indexOf('function '+nextName+'(',start);
  assert.ok(start>=0&&end>start,`could not extract ${name}`);
  return html.slice(start,end);
}

function setupPowerAttack(roundUp=false){
  const context={roundFrac:n=>roundUp?Math.ceil(n):Math.floor(n)};
  vm.createContext(context);
  vm.runInContext(extractFunction('powerAttackDamage','resolveAbilityComposites'),context);
  return context.powerAttackDamage;
}

test('Power Attack uses full, two-handed, and off-hand damage rates',()=>{
  const damage=setupPowerAttack();
  assert.equal(damage({bab:10,style:'oneHanded',mythicPowerAttackOn:false}),6);
  assert.equal(damage({bab:10,style:'twoHanded',mythicPowerAttackOn:false}),9);
  assert.equal(damage({bab:10,style:'twf',mythicPowerAttackOn:false},'main'),6);
  assert.equal(damage({bab:10,style:'twf',mythicPowerAttackOn:false},'off'),3);
});

test('Mythic Power Attack rounds once after applying the complete multiplier',()=>{
  const damage=setupPowerAttack();
  assert.equal(damage({bab:12,style:'twoHanded',mythicPowerAttackOn:true}),18);
  assert.equal(damage({bab:12,style:'twf',mythicPowerAttackOn:true},'off'),6);
});

test('the off-hand critical path handles both Mythic Power Attack and the no-multiply house rule',()=>{
  assert.match(html,/if\(paNoCritMult && offPowerAttackDmg\)/);
  assert.match(html,/else if\(ctx\.mythicPowerAttackOn && offPowerAttackDmg\)/);
});

test('the off-hand context inherits derived mythic state from the completed main pass',()=>{
  const collectAt=html.indexOf('=collectContributions(ctx);');
  const offContextAt=html.indexOf('let ctxOff = Object.assign({}, ctx',collectAt);
  assert.ok(collectAt>=0&&offContextAt>collectAt);
});

test('Flurry counts enhancement once and receives magical full-BAB extra attacks afterward',()=>{
  assert.match(html,/let nonBabPart = atkAbilityMod \+ atkFromMods;/);
  assert.doesNotMatch(html,/let nonBabPart = atkAbilityMod \+ enh \+ atkFromMods;/);
  const flurryAt=html.indexOf('if(flurryOfBlowsOn){');
  const extraAt=html.indexOf('if(hasExtraAttack){',flurryAt);
  assert.ok(flurryAt>=0&&extraAt>flurryAt);
  assert.match(html.slice(extraAt,extraAt+120),/iteratives\.push\(iteratives\[0\]\)/);
});

test('Rapid Shot extra attacks are not inserted into a Flurry sequence',()=>{
  assert.match(html,/if\(!flurryOfBlowsOn\)\{\s*for\(let i=0;i<rapidShotExtraCount;i\+\+\)/);
});

test('natural attack lines resolve their own final attack and damage abilities',()=>{
  assert.match(html,/let atkOnShared = atkOn && ctx\.weaponCategory!==\'natural\'/);
  assert.match(html,/ctx\._finalAbilityMods\[atkAbility\].*baseAtkAbilityMod/);
  assert.match(html,/ctx\._finalAbilityMods\[dmgAbility\].*baseDmgMod/);
});

test('Mythic Vital Strike scales the doubled first-hit Smite bonus',()=>{
  const context={};
  vm.createContext(context);
  vm.runInContext(extractFunction('vitalStrikeFlatMultiplier','resolveAbilityComposites'),context);
  assert.equal(context.vitalStrikeFlatMultiplier(2,2,true,false),2);
  assert.equal(context.vitalStrikeFlatMultiplier(2,2,true,true),3);
  assert.equal(context.vitalStrikeFlatMultiplier(3,3,true,true),5);
  assert.equal(context.vitalStrikeFlatMultiplier(2,3,false,true),3);
  assert.match(html,/smiteDmgVal\*vitalStrikeFlatMultiplier\(vsMult,critMult,mythicVitalStrikeOn,false\)/);
  assert.match(html,/smiteDmgVal\*vitalStrikeFlatMultiplier\(vsMult,critMult,mythicVitalStrikeOn,true\)/);
});

test('Mythic Power Attack critical extra is not scaled by Mythic Vital Strike twice',()=>{
  assert.match(html,/critDmgVS \+= powerAttackDmgVal\*critMult;/);
  assert.doesNotMatch(html,/critDmgVS \+= powerAttackDmgValVS\*critMult;/);
  assert.match(html,/critDmgVS \+= paDmg\*critMult;/);
  assert.doesNotMatch(html,/critDmgVS \+= paDmgVS\*critMult;/);

  // PA 9 with Mythic VS x2 and a x2 critical: ordinary combined multiplier x3,
  // plus Mythic Power Attack's exceptional critical copy x2 = five copies, not seven.
  const powerAttack=9;
  const combinedVitalAndCrit=2+2-1;
  assert.equal(powerAttack*combinedVitalAndCrit + powerAttack*2,45);
});

test('natural attacks render catalog and custom extra dice through the shared pipeline',()=>{
  assert.match(html,/renderNaturalAttackResults\(p, ctx, atkFromMods, dmgFromMods, extraDiceMain,/);
  const start=html.indexOf('function renderNaturalAttackResults(');
  const end=html.indexOf('function esc(',start);
  const naturalRenderer=html.slice(start,end);
  assert.match(naturalRenderer,/\(extraDice\|\|\[\]\)\.filter\(e=>e\.normal\)/);
  assert.match(naturalRenderer,/\(extraDice\|\|\[\]\)\.filter\(e=>e\.crit\)/);
  assert.doesNotMatch(naturalRenderer,/let customDice=/);
});

test('Vital Strike suppresses Two-Weapon Fighting off-hand results',()=>{
  assert.match(html,/else if\(style==='twf' && vsMult\)/);
  assert.match(html,/Vital Strike uses a single attack action/);
  const hideAt=html.indexOf("$('offAtkBox').style.display='none'");
  const vsGuardAt=html.indexOf("else if(style==='twf' && vsMult)",hideAt);
  const showAt=html.indexOf("$('offAtkBox').style.display='block'",vsGuardAt);
  assert.ok(hideAt>=0 && vsGuardAt>hideAt && showAt>vsGuardAt);
});
