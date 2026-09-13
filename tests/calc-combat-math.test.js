// Run with: node --test tests/calc-combat-math.test.js
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'../calc/index.html'),'utf8');

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
