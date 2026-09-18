// Damage Calculator batch project -- Batch 34: ADD feats DYNAMIC (2 of 4).
// Regression coverage for the 5 newly added feat entries, plus guards on the 9
// already-present entries and the excluded/deferred entries this batch reports.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_34_ADDED_IDS = ['elemental-fist', 'flame-blade-dervish', 'focused-shot', 'ghostbane-ichor', 'great-hatred'];
const ALREADY_CORRECT_IDS = [
  'greater-sunder', 'improved-bull-rush', 'improved-dirty-trick', 'improved-disarm',
  'improved-drag', 'improved-grapple', 'improved-overrun', 'improved-reposition', 'improved-steal',
];

function countId(source, id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (source.match(re) || []).length;
}

function block(id) {
  const start = html.indexOf(`id:'${id}'`) >= 0 ? html.indexOf(`id:'${id}'`) : html.indexOf(`id:"${id}"`);
  assert.ok(start >= 0, `${id} must exist`);
  const nextEntry = html.indexOf('\n{id:', start + 5);
  return html.slice(start, nextEntry > 0 ? nextEntry : start + 1400);
}

test('Batch 34: all 5 newly added entries are present exactly once, each with a source link', () => {
  for (const id of BATCH_34_ADDED_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
    assert.match(block(id), /source:/);
  }
});

test('Batch 34: Elemental Fist adds 1d6 energy damage via extraDice, unarmed strikes only', () => {
  const b = block('elemental-fist');
  assert.match(b, /if\(ctx\.weaponCategory!=='unarmed'\)/);
  assert.match(b, /extraDice:\{normal:'1d6'\}/);
});

test('Batch 34: Flame Blade Dervish adds a flat Charisma-modifier damage bonus (crit-multiplied like an ordinary ability-based bonus, not extraDice)', () => {
  const b = block('flame-blade-dervish');
  assert.match(b, /compute:\(ctx\)=>\{let cha=ctx\.cha\|\|0;return \{attack:0,damage:cha,/);
});

test('Batch 34: Focused Shot adds precision damage equal to the Intelligence modifier via extraDice (not multiplied on a crit), no effect at 0 or negative', () => {
  const b = block('focused-shot');
  assert.match(b, /let int=ctx\.int\|\|0;if\(int<=0\)/);
  assert.match(b, /extraDice:\{normal:String\(int\)\}/);
});

test('Batch 34: Ghostbane Ichor is gated by ctx.currentTarget===\'incorporeal\' directly (targetMatches can\'t be used here -- TARGET_FLAG_MAP\'s incorporeal entry only sets critImmune, not an \'incorporeal\' flag)', () => {
  const b = block('ghostbane-ichor');
  assert.match(b, /let vs=ctx\.currentTarget==='incorporeal';/);
});

test('Batch 34: Great Hatred grants a flat +1 attack bonus vs. the hated race', () => {
  const b = block('great-hatred');
  assert.match(b, /compute:\(\)=>\(\{attack:1,damage:0,/);
});

test('Batch 34: the 9 combat-maneuver feats (Greater Sunder plus the 8 Improved-maneuver feats) were already present and correctly implemented (+2 CMB on their specific maneuver, +2 CMD against it for the 8 that grant CMD too) -- left untouched', () => {
  for (const id of ALREADY_CORRECT_IDS) {
    assert.equal(countId(html, id), 1, `${id} should still be present exactly once`);
    const b = block(id);
    assert.match(b, /cmb:2/, `${id} should still grant +2 CMB`);
  }
  assert.match(block('improved-bull-rush'), /cmd:2/);
});

test('Batch 34: excluded entries were not added -- none is a bonus to the character\'s own attack or damage roll (they grant AC/resistance, boost spell/object damage, or model a weapon-strength-rating mechanic not tracked here)', () => {
  const excludedIds = [
    'dodge', 'efreeti-stance', 'esoteric-evocation', 'exceptional-pull', 'flensing-strike',
    'furious-spell', 'gate-breaker', 'icy-stare',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 34: deferred entries were not added -- Draconic Heritage has too many mutually-exclusive branches to represent as one modifier without misleading players who chose a different branch; Great Rend and Greater Blood Frenzy both modify a "rend" special attack this calculator has no baseline for', () => {
  const deferredIds = ['draconic-heritage', 'great-rend', 'greater-blood-frenzy'];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 34: no newly added entry is mirrored into companion/index.html', () => {
  for (const id of BATCH_34_ADDED_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
