const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../assets/calc-engine.js'),'utf8');
const context={};
vm.createContext(context);
vm.runInContext(source,context);

test('same-type bonuses keep only the highest value',()=>{
  assert.equal(context.stackTotal([
    {value:1,type:'morale'},
    {value:3,type:'morale'},
    {value:2,type:'morale'}
  ]),3);
});

test('different bonus types and untyped bonuses stack',()=>{
  assert.equal(context.stackTotal([
    {value:3,type:'morale'},
    {value:2,type:'luck'},
    {value:1,type:'untyped'},
    {value:4,type:'untyped'}
  ]),10);
});

test('penalties all apply while positive same-type bonuses still suppress',()=>{
  assert.equal(context.stackTotal([
    {value:4,type:'enhancement'},
    {value:2,type:'enhancement'},
    {value:-1,type:'enhancement'},
    {value:-2,type:'morale'}
  ]),1);
});

test('suppression marks lower and tied duplicate typed bonuses',()=>{
  const entries=[
    {value:3,type:'morale',source:'Heroism'},
    {value:2,type:'morale',source:'Bless'},
    {value:3,type:'morale',source:'Inspire Courage'},
    {value:1,type:'luck',source:'Divine Favor'}
  ];
  const breakdown=entries.map(e=>({name:e.source,suppressed:false}));
  context.markSuppressed(entries,breakdown);
  assert.deepEqual(breakdown.map(e=>e.suppressed),[false,true,true,false]);
});
