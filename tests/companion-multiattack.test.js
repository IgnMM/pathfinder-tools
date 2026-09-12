// Run with: node --test tests/companion-multiattack.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Exercise the actual browser rule functions without requiring a browser or packages.
const html = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');
const start = html.indexOf('function sizeAttackModifier(size){');
const end = html.indexOf('// ATTACK-LINE-ID-001', start);
assert.ok(start >= 0 && end > start, 'Multiattack rule block exists');
let nextId = 0;
const context = { newAttackLine: () => ({lineId: 'generated-' + (++nextId)}) };
vm.createContext(context);
vm.runInContext(html.slice(start, end), context);

const primary = () => ({lineId:'bite',name:'Bite',qty:1,atkType:'natural',mode:'primary',atkBonus:6,die:'1d6',origin:'preset:bite'});
const secondary = () => ({lineId:'tail',name:'Tail Slap',qty:1,atkType:'natural',mode:'secondary',atkBonus:1,die:'1d4',origin:'preset:tail'});
const apply = (profile, lines, level) => context.applyMultiattackRule(profile, lines, level, 6, 'Medium');

test('level-9 animal companion may select a secondary natural weapon', () => {
  const profile = {multiattackExtraSourceLineId:'tail'};
  const lines = apply(profile, [primary(), secondary()], 9);
  assert.equal(lines.length, 3);
  assert.equal(lines[2].die, '1d4');
  assert.equal(lines[2].mode, 'secondary');
  assert.equal(lines[2].atkBonus, -4); // ordinary +1 secondary, then -5 for the extra attack
});

test('the extra attack keeps its identity and adjustments across recomputations', () => {
  const profile = {multiattackExtraSourceLineId:'bite'};
  const first = apply(profile, [primary()], 9);
  first[1].manualHitAdj = 3;
  const second = apply(profile, [primary(), first[1]], 10);
  assert.equal(second[1].lineId, first[1].lineId);
  assert.equal(second[1].manualHitAdj, 3);
  assert.equal(apply(profile, second, 8).length, 1);
});

test('three natural attacks grant Multiattack, not the extra attack; qty counts', () => {
  const tail = secondary();
  const claws = {...primary(), name:'Claw', qty:2};
  const lines = apply({}, [claws, tail], 9);
  assert.equal(lines.length, 2);
  assert.equal(tail.atkBonus, 4); // BAB 6 - 2
  apply({}, lines, 8);
  assert.equal(tail.atkBonus, 1); // BAB 6 - 5
});

test('mutually exclusive natural weapons count as one, not two', () => {
  const bite = {...primary(), choiceGroup:'crocodile_attack'};
  const tail = {...secondary(), choiceGroup:'crocodile_attack'};
  assert.equal(context.naturalAttackQty([bite,tail]), 1);
  assert.equal(context.naturalAttackQty([bite,tail,primary()]), 2);
  const profile={multiattackExtraSourceLineId:'tail'};
  assert.equal(apply(profile,[bite,tail],9).filter(l=>l.multiattackGranted).length,1);
});

test('eidolon natural-attack maximum ignores weapons and counts Rake as one',()=>{
  const start=html.indexOf('function eidolonNaturalAttackCount(');
  const end=html.indexOf('function applyEidolonPreset(',start);
  vm.runInContext(html.slice(start,end),context);
  const lines=[
    {...primary(),qty:2},
    {...primary(),name:'Rake renamed',qty:2,multiattackConditional:true,naturalAttackMaximumCount:1},
    {...primary(),atkType:'manufactured',qty:3},
    {...primary(),multiattackGranted:true}
  ];
  assert.equal(context.eidolonNaturalAttackCount(lines),3);
});
