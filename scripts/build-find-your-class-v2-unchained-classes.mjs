import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(repo, 'assets', 'find-your-class', 'v2');
const batches = ['01','02','03'].flatMap(id => JSON.parse(fs.readFileSync(path.join(dir, `class-profiles-batch-${id}.json`), 'utf8')).profiles);

function cloneParent(parentId, changes) {
  const parent = batches.find(item => item.id === parentId);
  if (!parent) throw new Error(`Missing parent profile: ${parentId}`);
  const profile = structuredClone(parent);
  Object.assign(profile, changes);
  return profile;
}

const barbarian = cloneParent('barbarian', {
  id:'barbarian-unchained', name:'Barbarian (Unchained)',
  sourceCitationText:'Pathfinder Unchained pg. 8',
  sourceUrl:'https://aonprd.com/ClassDisplay.aspx?ItemName=Barbarian%20(Unchained)',
  calibrationRole:'Streamlined rage martial with strong melee damage, speed, toughness and selectable rage powers.'
});

const rogue = cloneParent('rogue', {
  id:'rogue-unchained', name:'Rogue (Unchained)',
  sourceCitationText:'Pathfinder Unchained pg. 20',
  sourceUrl:'https://aonprd.com/ClassDisplay.aspx?ItemName=Rogue%20(Unchained)',
  calibrationRole:'Dexterity-focused skill expert with sneak attack, skill unlocks and built-in debilitating strikes.'
});
rogue.capabilities['debuffing-enemies'] = 'core';
rogue.practical['attribute-demands'] = 'low';

fs.writeFileSync(path.join(dir, 'class-profiles-batch-06.json'), `${JSON.stringify({
  schemaVersion:2,
  status:'reviewed',
  levelBand:'whole-career-1-20',
  notes:['The two remaining AoN player classes. AoN exposes no separate archetype rows for either unchained class.'],
  profiles:[barbarian, rogue]
}, null, 2)}\n`);
