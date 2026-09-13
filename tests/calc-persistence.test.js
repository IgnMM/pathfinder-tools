// Run with: node --test tests/calc-persistence.test.js
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'../calc/index.html'),'utf8');
const start=html.indexOf('let saveIndicatorTimer=null;');
const end=html.indexOf('function defaultProfile(',start);
assert.ok(start>=0&&end>start);

test('pinning a character updates both the URL and the cloud-load tab identity',()=>{
  const fnStart=html.indexOf('function pinUrlToProfile(');
  const fnEnd=html.indexOf('\n}',fnStart)+2;
  const replaced=[];
  const context={
    window:{},
    location:{href:'https://example.test/calc/?embedded=1'},
    history:{replaceState:(_state,_title,url)=>replaced.push(url)},
    URL
  };
  vm.createContext(context);
  vm.runInContext(html.slice(fnStart,fnEnd),context);
  context.pinUrlToProfile('Merisiel');
  assert.equal(context.window.__pinnedProfile,'Merisiel');
  assert.equal(replaced[0],'/calc/?embedded=1&profile=Merisiel');
});

function setup(){
  const profile={name:'Kenneth',_updatedAt:100};
  let saved='';
  const context={
    STORE_KEY:'test-store',
    store:{active:'Kenneth',profiles:[profile]},
    currentProfile:()=>profile,
    mergeStores:local=>local,
    loadStore:()=>context.store,
    localStorage:{setItem:(_key,value)=>{saved=value}},
    document:{getElementById:()=>null},
    clearTimeout:()=>{},setTimeout:()=>0
  };
  vm.createContext(context);
  vm.runInContext(html.slice(start,end),context);
  return {context,profile,getSaved:()=>JSON.parse(saved)};
}

test('ordinary character edits touch the active profile timestamp',()=>{
  const {context,profile}=setup();
  context.saveStore();
  assert.ok(profile._updatedAt>100);
});

test('loading, switching, or cloud application can save without touching the profile',()=>{
  const {context,profile,getSaved}=setup();
  context.saveStore(false);
  assert.equal(profile._updatedAt,100);
  context.withoutProfileTouch(()=>context.saveStore());
  assert.equal(profile._updatedAt,100);
  assert.equal(getSaved().profiles[0]._updatedAt,100);
});
