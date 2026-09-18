// Damage Calculator batch project -- Batch 23: AUDIT spells ENGINE (1 of 1), the final
// batch of the spell AUDIT series and of the entire trait+feat+spell AUDIT project
// (batches 01-23). Regression coverage for the 11 audited spell entries and the bugs
// this batch found, including a fix ported to the companion catalogue's mirrored entry.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_23_IDS = [
  'animal-growth', 'blessing-of-fervor', 'enlarge-person', 'haste', 'heart-of-the-mammoth', 'heroism',
  'lead-blades', 'feat-named-bullet', 'feat-storm-of-blades', 'untold-wonder', 'wrath',
];
// animal-growth, haste and heroism are also mirrored into companion/index.html (pre-existing)
const MIRRORED = new Set(['animal-growth', 'haste', 'heroism']);
const NOT_MIRRORED = BATCH_23_IDS.filter(id => !MIRRORED.has(id));

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

function companionBlock(id) {
  const start = companionHtml.indexOf(`id:'${id}'`) >= 0 ? companionHtml.indexOf(`id:'${id}'`) : companionHtml.indexOf(`id:"${id}"`);
  assert.ok(start >= 0, `${id} must exist in companion/index.html`);
  return companionHtml.slice(start, start + 1400);
}

test('Batch 23: all 11 entries are present exactly once', () => {
  for (const id of BATCH_23_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 23 fix: Animal Growth was missing its -2 Dexterity size penalty in compute() (desc claimed it applied but only Strength was ever fed through abilityBuffBonus) -- now matches the already-correct sibling Enlarge Person shape', () => {
  const b = block('animal-growth');
  assert.match(b, /let rStr=abilityBuffBonus\(ctx,'str',cfg\.value!==undefined\?cfg\.value:8,'size'\);let rDex=abilityBuffBonus\(ctx,'dex',-2,'size'\);/);
});

test('Batch 23 fix (ported to companion): companion/index.html\'s mirrored Animal Growth had the identical bug -- desc said the Dex penalty was "applied automatically" but compute() never called abilityBuffBonus for dex', () => {
  const b = companionBlock('animal-growth');
  assert.match(b, /let rStr=abilityBuffBonus\(ctx,'str',cfg\.value!==undefined\?cfg\.value:8\);let rDex=abilityBuffBonus\(ctx,'dex',-2\);/);
});

test('Batch 23 fix: Named Bullet\'s desc/note described an unrelated -2 off-target penalty that doesn\'t appear anywhere in the spell\'s real rules text -- corrected to accurately summarize the actual effect (forced critical threat, touch AC, CL-scaled crit-differential damage) while staying note-only, since none of that is a baseline primitive here', () => {
  const b = block('feat-named-bullet');
  assert.doesNotMatch(b, /If the ammunition is used to attack any other target/);
  assert.match(b, /counts as a critical threat dealing 1 extra point of damage per caster level/);
});

test('Batch 23 fix: Wrath was silently missing its caster-level-12\\+ Improved Critical sub-effect against the designated enemy from both its desc and its note (sibling entries like Heart of the Mammoth do document their own not-modeled crit-range effects)', () => {
  const b = block('wrath');
  assert.match(b, /At caster level 12\+, also grants the benefit of Improved Critical/);
  assert.match(b, /cl>=12\?' -- also Improved Critical vs that enemy at CL12\+, not modeled here':''/);
});

test('Batch 23: already-correct entries stay unchanged (spot checks), including genuinely-verified engine hooks', () => {
  assert.match(block('enlarge-person'), /let rStr=abilityBuffBonus\(ctx,'str',2,'size'\);let rDex=abilityBuffBonus\(ctx,'dex',-2,'size'\);/);
  assert.match(block('haste'), /compute:\(\)=>\(\{attack:1,damage:0,note:'\+1 atk, plus one extra attack at full BAB/);
  assert.match(block('lead-blades'), /compute:\(\)=>\(\{attack:0,damage:0,note:'weapon damage die increased one size category/);
  assert.match(block('blessing-of-fervor'), /if\(cfg\.choice==='atk2'\)\{/);
  assert.match(block('heart-of-the-mammoth'), /compute:\(ctx\)=>\{let r1=abilityBuffBonus\(ctx,'str',8\),r2=abilityBuffBonus\(ctx,'con',8\);/);
});

test('Batch 23: Untold Wonder stays note-only (converts emotion-effect penalties into morale bonuses conditionally; this engine has no penalty-tracking primitive to convert)', () => {
  const b = block('untold-wonder');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:/);
});

test('Batch 23: Storm of Blades (feat-storm-of-blades) is left untouched -- the id currently holds a genuinely different, real, unrelated feat of the same name, not the audited spell', () => {
  const b = block('feat-storm-of-blades');
  assert.match(b, /vortex of cuts that lasts until the beginning of your next turn/);
});

test('Batch 23: no entry in this batch (except the pre-existing animal-growth/haste/heroism companion mirrors) is mirrored into companion/index.html', () => {
  for (const id of NOT_MIRRORED) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
