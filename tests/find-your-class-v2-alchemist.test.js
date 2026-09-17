import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root=new URL('../assets/find-your-class/v2/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,root),'utf8'));
const parent=['01','02','03'].flatMap(id=>read(`class-profiles-batch-${id}.json`).profiles).find(item=>item.id==='alchemist');
const profiles=read('archetype-profiles-alchemist.json').profiles;
const sourceRecords=JSON.parse(fs.readFileSync(new URL('../assets/find-your-class/aon-catalog/class-details/alchemist.json',import.meta.url),'utf8')).profiles;

test('all 63 AoN Alchemist archetypes are represented exactly once and reviewed',()=>{
  assert.equal(sourceRecords.length,63); assert.equal(profiles.length,63); assert.equal(new Set(profiles.map(item=>item.id)).size,63);
  assert.deepEqual(profiles.map(item=>item.id).sort(),sourceRecords.map(item=>item.id).sort());
  for(const profile of profiles){assert.equal(profile.parentClassId,'alchemist');assert.equal(profile.reviewStatus,'reviewed');assert.ok(profile.playerSummary.length);assert.ok(profile.tradeoff.length);assert.ok(profile.evidence.length);}
});

test('Alchemist profiles contain only material parent deltas with evidence',()=>{
  for(const profile of profiles){
    for(const [id,value] of Object.entries(profile.capabilityOverrides)){assert.notEqual(value,parent.capabilities[id],`${profile.id}: redundant ${id}`);assert.ok(profile.evidence.some(item=>item.field===`capabilityOverrides.${id}`),`${profile.id}: evidence ${id}`);}
    for(const [id,value] of Object.entries(profile.practicalOverrides)) assert.notEqual(value,parent.practical[id],`${profile.id}: redundant ${id}`);
    for(const [id,value] of Object.entries(profile.factOverrides)) assert.notEqual(value,parent.facts[id],`${profile.id}: redundant ${id}`);
    for(const [category,values] of Object.entries(profile.identityAdds)) for(const value of values) assert.ok(!parent.identity[category].includes(value),`${profile.id}: redundant add ${category}/${value}`);
    for(const [category,values] of Object.entries(profile.identityRemoves)) for(const value of values) assert.ok(parent.identity[category].includes(value),`${profile.id}: absent removal ${category}/${value}`);
    for(const target of Object.keys(profile.enemySpecializationOverrides||{})) assert.ok(profile.evidence.some(item=>item.field===`enemySpecializationOverrides.${target}`),`${profile.id}: enemy evidence ${target}`);
    if(profile.professionIdentity.length) assert.equal(profile.factOverrides['has-profession-identity'],true,`${profile.id}: profession fact`);
  }
});

test('the four former pilot profiles were re-reviewed in the complete class file',()=>{
  const byId=new Map(profiles.map(item=>[item.id,item]));
  assert.equal(byId.get('alchemist:chirurgeon').capabilityOverrides['healing-recovery'],'core');
  assert.equal(byId.get('alchemist:beastmorph').factOverrides['has-shapeshifting'],true);
  assert.equal(byId.get('alchemist:gun-chemist').factOverrides['has-firearms'],true);
  assert.equal(byId.get('alchemist:vivisectionist').factOverrides['has-bombs'],false);
});

test('representative Alchemist transformations resolve as intended',()=>{
  const byId=new Map(profiles.map(item=>[item.id,item]));
  assert.equal(byId.get('alchemist:metamorph').capabilityOverrides['area-multi-target-damage'],'absent');
  assert.equal(byId.get('alchemist:construct-rider').factOverrides['has-mount'],true);
  assert.equal(byId.get('alchemist:preservationist').capabilityOverrides['summoning-companions'],'core');
  assert.equal(byId.get('alchemist:sacrament-alchemist').factOverrides['requires-deity'],true);
});
