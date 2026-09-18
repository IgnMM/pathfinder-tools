// Damage Calculator batch project -- Batch 22: AUDIT spells DYNAMIC (1 of 1), the last
// spell-audit batch. These entries have formula/scaling effects per their own rules text,
// so "Decision: DYNAMIC" means represent the formula and cap as user-set inputs rather
// than freezing a sample value or deferring to a note when a real primitive (a number or
// select configField) can represent it faithfully. Regression coverage for the 19
// audited spell entries and the bugs this batch found.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_22_IDS = [
  'aid', 'aura-of-cannibalism', 'battle-trance', 'blood-scent', 'bloodsworn-retribution', 'contagious-zeal',
  'deadly-juggernaut', 'death-knell', 'divine-favor', 'emblem-of-greed', 'fiendish-wrath', 'heroes-feast',
  'heroism-greater', 'inspiring-recovery', 'greater-magic-fang', 'greater-magic-weapon', 'reaper-s-coterie',
  'saddle-surge', 'transformation',
];
// divine-favor, heroism-greater and greater-magic-fang are also mirrored into
// companion/index.html (pre-existing, untouched)
const MIRRORED = new Set(['divine-favor', 'heroism-greater', 'greater-magic-fang']);
const NOT_MIRRORED = BATCH_22_IDS.filter(id => !MIRRORED.has(id));

function countId(source, id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (source.match(re) || []).length;
}

function block(id) {
  const start = html.indexOf(`id:'${id}'`) >= 0 ? html.indexOf(`id:'${id}'`) : html.indexOf(`id:"${id}"`);
  assert.ok(start >= 0, `${id} must exist`);
  const end = html.indexOf('companionCompatibility:', start);
  return html.slice(start, end > 0 ? end : start + 1400);
}

test('Batch 22: all 19 entries are present exactly once', () => {
  for (const id of BATCH_22_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 22 fix: Aura of Cannibalism was note-only despite a directly modelable two-tier competence bonus gated by accumulated temp HP -- now a select configField', () => {
  const b = block('aura-of-cannibalism');
  assert.match(b, /options:\[\{v:'low',label:'Below 5/);
  assert.match(b, /compute:\(ctx,cfg\)=>\{let v=cfg\.tier==='high'\?2:cfg\.tier==='mid'\?1:0;/);
});

test('Batch 22 fix: Blood Scent was note-only despite a directly modelable two-tier morale bonus (+2 normal / +4 vs a strong scent) -- now a select configField', () => {
  const b = block('blood-scent');
  assert.match(b, /options:\[\{v:'normal',label:'Normal — \+2'\}/);
  assert.match(b, /compute:\(ctx,cfg\)=>\{let v=cfg\.tier==='strong'\?4:2;return \{attack:v,damage:v/);
});

test('Batch 22 fix: Bloodsworn Retribution was note-only despite a directly modelable formula (self-inflicted damage taken / 5, capped by the spell\'s own 25-point cap) -- now a number configField', () => {
  const b = block('bloodsworn-retribution');
  assert.match(b, /configFields:\[\{key:'dmg',label:'Self-inflicted damage taken \(0-25\)',type:'number',default:20\}\]/);
  assert.match(b, /let d=Math\.max\(0,Math\.min\(25,cfg\.dmg\|\|0\)\);let v=Math\.floor\(d\/5\);/);
});

test('Batch 22 fix: Deadly Juggernaut was note-only despite a directly modelable cumulative luck bonus (+1/kill, cap +5) -- now a number configField', () => {
  const b = block('deadly-juggernaut');
  assert.match(b, /compute:\(ctx,cfg\)=>\{let v=Math\.max\(0,Math\.min\(5,cfg\.kills\|\|0\)\);return \{attack:v,damage:v/);
});

test('Batch 22 fix: Emblem of Greed was note-only despite a directly modelable caster-level-tiered enhancement bonus (+1/+2 at CL15/+3 at CL19) -- now a caster-level configField, cross-referencing the existing Flaming/Flaming Burst entries instead of re-implementing them', () => {
  const b = block('emblem-of-greed');
  assert.match(b, /let b=cl>=19\?3:cl>=15\?2:1;return \{attack:b,damage:b/);
  assert.match(b, /add the separate Flaming\/Flaming Burst entry/);
});

test('Batch 22 fix: Reaper\'s Coterie was note-only despite a directly modelable cumulative profane bonus (+1/kill, cap = half caster level) -- now caster-level and kills configFields', () => {
  const b = block('reaper-s-coterie');
  assert.match(b, /let cap=Math\.floor\(\(cfg\.cl\|\|1\)\/2\);let v=Math\.max\(0,Math\.min\(cap,cfg\.kills\|\|0\)\);/);
});

test('Batch 22 fix: Saddle Surge was note-only despite a directly modelable formula (+1 damage per 5ft moved, capped at caster level) -- now caster-level and feet-moved configFields', () => {
  const b = block('saddle-surge');
  assert.match(b, /let raw=Math\.floor\(\(cfg\.feet\|\|0\)\/5\);let v=Math\.max\(0,Math\.min\(cl,raw\)\);/);
});

test('Batch 22: already-correct entries stay unchanged (spot checks)', () => {
  assert.match(block('aid'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:1\);return \{attack:v,damage:0/);
  assert.match(block('divine-favor'), /compute:\(ctx,cfg\)=>\{let b=Math\.min\(3,Math\.max\(1,Math\.floor\(\(cfg\.cl\|\|1\)\/3\)\)\);/);
  assert.match(block('greater-magic-fang'), /compute:\(ctx,cfg\)=>\{let b=Math\.min\(5,Math\.floor\(\(cfg\.cl\|\|1\)\/4\)\);/);
  assert.match(block('greater-magic-weapon'), /compute:\(ctx,cfg\)=>\{let b=Math\.min\(5,Math\.floor\(\(cfg\.cl\|\|1\)\/4\)\);return \{attack:b,damage:b/);
  assert.match(block('transformation'), /compute:\(ctx\)=>\{let r1=abilityBuffBonus\(ctx,'str',4\),r2=abilityBuffBonus\(ctx,'dex',4\),r3=abilityBuffBonus\(ctx,'con',4\);/);
  assert.match(block('death-knell'), /compute:\(ctx\)=>\{let r=abilityBuffBonus\(ctx,'str',2\);/);
});

test('Batch 22: Battle Trance stays as-is (the base spell grants no attack/damage bonus at all; only its Mythic Augmented 5th tier grants a fixed +4 morale to Strength, which was already correctly modeled)', () => {
  const b = block('battle-trance');
  assert.match(b, /compute:\(ctx\)=>\{let r=abilityBuffBonus\(ctx,'str',4\);/);
});

test('Batch 22: no entry in this batch (except the pre-existing divine-favor/heroism-greater/greater-magic-fang companion mirrors) is mirrored into companion/index.html', () => {
  for (const id of NOT_MIRRORED) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
