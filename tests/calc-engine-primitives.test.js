// Batch 00 (Damage Calculator batch project prep) — tests for scaledByLevel(), the one
// new shared primitive added to assets/calc-engine.js. See docs/damage-engine-capability-matrix.md
// for the full capability audit this batch performed.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../assets/calc-engine.js'),'utf8');
const context={};
vm.createContext(context);
vm.runInContext(source,context);

test('scaledByLevel: base value below the first step boundary',()=>{
  assert.equal(context.scaledByLevel(3,{per:4,base:1,step:1}),1);
});

test('scaledByLevel: BAB-style "1 + 1 per 4 BAB" (no floorAt, no cap)',()=>{
  assert.equal(context.scaledByLevel(0,{per:4,base:1,step:1}),1);
  assert.equal(context.scaledByLevel(4,{per:4,base:1,step:1}),2);
  assert.equal(context.scaledByLevel(7,{per:4,base:1,step:1}),2);
  assert.equal(context.scaledByLevel(8,{per:4,base:1,step:1}),3);
});

test('scaledByLevel: "+2, plus 1 per 4 caster levels beyond 1st, maximum +7"',()=>{
  assert.equal(context.scaledByLevel(1,{floorAt:1,per:4,base:2,step:1,cap:7}),2);
  assert.equal(context.scaledByLevel(4,{floorAt:1,per:4,base:2,step:1,cap:7}),2);
  assert.equal(context.scaledByLevel(5,{floorAt:1,per:4,base:2,step:1,cap:7}),3);
  assert.equal(context.scaledByLevel(21,{floorAt:1,per:4,base:2,step:1,cap:7}),7);
  assert.equal(context.scaledByLevel(25,{floorAt:1,per:4,base:2,step:1,cap:7}),7,'capped, does not exceed the printed maximum');
});

test('scaledByLevel: a level below floorAt never goes negative or below base',()=>{
  assert.equal(context.scaledByLevel(0,{floorAt:1,per:4,base:2,step:1,cap:7}),2);
  assert.equal(context.scaledByLevel(-5,{floorAt:1,per:4,base:2,step:1,cap:7}),2);
});

test('scaledByLevel: missing/non-numeric level treated as 0',()=>{
  assert.equal(context.scaledByLevel(undefined,{per:4,base:1,step:1}),1);
  assert.equal(context.scaledByLevel(null,{per:4,base:1,step:1}),1);
});

test('scaledByLevel: step can be a value other than 1 (e.g. +2 per 5 levels)',()=>{
  assert.equal(context.scaledByLevel(4,{per:5,base:0,step:2}),0);
  assert.equal(context.scaledByLevel(9,{per:5,base:0,step:2}),2);
  assert.equal(context.scaledByLevel(10,{per:5,base:0,step:2}),4);
  assert.equal(context.scaledByLevel(15,{per:5,base:0,step:2}),6);
});
