import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root=new URL('../assets/find-your-class/v2/',import.meta.url);
const read=n=>JSON.parse(fs.readFileSync(new URL(n,root)));
const classes=['monk-unchained','ninja','occultist','oracle','paladin'];
const expected={'monk-unchained':14,ninja:5,occultist:20,oracle:26,paladin:47};
const parents=['01','02','03'].flatMap(n=>read(`class-profiles-batch-${n}.json`).profiles);
const parentById=new Map(parents.map(x=>[x.id,x]));

for(const classId of classes)test(`${classId} canonical expansion is complete and evidence-backed`,()=>{
  const ps=read(`archetype-profiles-${classId}.json`).profiles;
  const src=JSON.parse(fs.readFileSync(new URL(`../assets/find-your-class/aon-catalog/class-details/${classId}.json`,import.meta.url))).profiles;
  const parent=parentById.get(classId);
  assert.equal(ps.length,expected[classId]);
  assert.deepEqual(ps.map(x=>x.id).sort(),src.map(x=>x.id).sort());
  for(const x of ps){assert.equal(x.reviewStatus,'reviewed');assert.ok(x.evidence.length);for(const[id,v]of Object.entries(x.capabilityOverrides)){assert.notEqual(v,parent.capabilities[id]);assert.ok(x.evidence.some(e=>e.field===`capabilityOverrides.${id}`));}for(const[id,v]of Object.entries(x.factOverrides))assert.notEqual(v,parent.facts[id]);}
});

test('batch has 112 unique profiles and preserves authoritative pilots',()=>{
  const all=classes.flatMap(id=>read(`archetype-profiles-${id}.json`).profiles),m=new Map(all.map(x=>[x.id,x]));
  assert.equal(all.length,112);assert.equal(new Set(all.map(x=>x.id)).size,112);
  assert.equal(m.get('monk-unchained:scaled-fist').capabilityOverrides['area-multi-target-damage'],'available');
  assert.equal(m.get('ninja:gunpowder-bombardier').factOverrides['has-bombs'],true);
  assert.equal(m.get('occultist:battle-host').capabilityOverrides['melee-combat'],'core');
  assert.equal(m.get('occultist:silksworn').capabilityOverrides['melee-combat'],'absent');
  assert.equal(m.get('oracle:warsighted').capabilityOverrides['melee-combat'],'core');
  assert.equal(m.get('paladin:holy-gun').factOverrides['has-firearms'],true);
});
