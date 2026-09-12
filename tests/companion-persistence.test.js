// Run with: node --test tests/companion-persistence.test.js
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'../companion/index.html'),'utf8');
const start=html.indexOf('let saveIndicatorTimer=null;');
const end=html.indexOf('function defaultProfile(',start);
assert.ok(start>=0&&end>start);

function setup(){
  const profile={name:'Kenneth',_updatedAt:100};
  let saved='';
  const context={
    STORE_KEY:'test-store',
    store:{active:'Kenneth',profiles:[profile]},
    currentProfile:()=>profile,
    localStorage:{setItem:(_key,value)=>{saved=value}},
    document:{getElementById:()=>null},
    clearTimeout:()=>{},setTimeout:()=>0
  };
  vm.createContext(context);
  vm.runInContext(html.slice(start,end),context);
  return {context,profile,getSaved:()=>JSON.parse(saved)};
}

test('ordinary edits touch the active profile timestamp',()=>{
  const {context,profile}=setup();
  context.saveStore();
  assert.ok(profile._updatedAt>100);
});

test('loading or switching a profile can persist UI state without making it newer',()=>{
  const {context,profile,getSaved}=setup();
  context.saveStore(false);
  assert.equal(profile._updatedAt,100);
  context.withoutProfileTouch(()=>context.saveStore());
  assert.equal(profile._updatedAt,100);
  assert.equal(getSaved().profiles[0]._updatedAt,100);
});
