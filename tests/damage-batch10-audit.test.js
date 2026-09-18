// Damage Calculator batch project -- Batch 10: AUDIT feats FIXED/CONDITIONAL (3 of 6).
// Regression coverage for the 25 audited feat entries and the bugs/clarity fixes this
// batch found. Static-source assertions (grep-style on the HTML text), same pattern as
// the other feat/trait audit test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_10_IDS = [
  'feat-esoteric-enchantment', 'exploit-lore', 'ferocious-loyalty', 'fire-hand', 'flagbearer',
  'focused-discipline', 'feat-focused-target', 'giant-vendetta', 'gloom-strike', 'feat-greater-channel-smite',
  'greater-snap-shot-p4', 'greater-weapon-focus-p4', 'greater-weapon-specialization-p4', 'halfling-slinger',
  'feat-harrowed', 'horde-charge', 'improved-charging-hurler', 'improved-studied-combatant',
  'improvisational-focus', 'janni-style', 'know-weakness', 'legacy-of-ozem', 'liberator',
  'marksman-s-utility', 'martial-focus',
];

function countId(source, id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (source.match(re) || []).length;
}

function block(id) {
  const start = html.indexOf(`id:'${id}'`) >= 0 ? html.indexOf(`id:'${id}'`) : html.indexOf(`id:"${id}"`);
  assert.ok(start >= 0, `${id} must exist`);
  const end = html.indexOf('companionCompatibility:', start);
  return html.slice(start, end > 0 ? end : start + 1200);
}

test('Batch 10: all 25 entries are present exactly once', () => {
  for (const id of BATCH_10_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 10 fix: Ferocious Loyalty now models both tiers (+1 base vs a foe threatening an ally, or +2 when an ally was rendered helpless/killed) instead of a flat +1 that dropped the printed escalation entirely', () => {
  const b = block('ferocious-loyalty');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat single-value configField must be removed');
  assert.match(b, /key:'tier'/);
  assert.match(b, /let v=cfg\.tier==='avenging'\?2:1;/);
});

test('Batch 10 fix: Flagbearer now applies its +1 morale bonus to damage as well as attack (was attack-only, silently dropping the printed weapon damage bonus)', () => {
  const b = block('flagbearer');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /attack:v,damage:v/);
});

test('Batch 10 fix: Focused Discipline now applies its +2 morale bonus to damage as well as attack (was attack-only, silently dropping the printed weapon damage bonus)', () => {
  const b = block('focused-discipline');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /attack:v,damage:v/);
});

test('Batch 10 fix: Greater Snap Shot now scales its damage bonus with live BAB (+2 base, +4 at BAB 16, +6 at BAB 20) instead of a static manually-entered value that never reflected the printed BAB scaling', () => {
  const b = block('greater-snap-shot-p4');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat configField must be removed');
  assert.match(b, /let bab=ctx\.bab\|\|0;let v=bab>=20\?6:\(bab>=16\?4:2\);/);
});

test('Batch 10 fix: Improved Studied Combatant now applies its +4 bonus to damage as well as melee attack (was attack-only, silently dropping the printed damage-roll bonus)', () => {
  const b = block('improved-studied-combatant');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /attack:v,damage:v/);
});

test('Batch 10 fix: Janni Style grants only defensive benefits (reduced charge AC penalty, reduced flanking bonus against YOU) -- neither is a bonus for your own attack/damage, was implemented as a flat +1 self attack bonus', () => {
  const b = block('janni-style');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat +1 self-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Both benefits are defensive/);
});

test('Batch 10 fix: Liberator now applies its +1 bonus to weapon damage as well as attack (was attack-only, silently dropping the printed weapon damage bonus)', () => {
  const b = block('liberator');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /attack:v,damage:v/);
});

test('Batch 10: already-correct entries stay unchanged (spot checks)', () => {
  assert.match(block('exploit-lore'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:2\);return \{attack:v,damage:v/);
  assert.match(block('legacy-of-ozem'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:1\);return \{attack:0,damage:v,note:'\+'\+v\+' dmg'\+' \(sacred\)/);
  assert.match(block('horde-charge'), /only applies to the first attack/);
});

test('Batch 10: the already-correct ENGINE-gap note-only entries stay note-only (no baseline primitive to represent them)', () => {
  for (const id of ['feat-esoteric-enchantment', 'feat-focused-target', 'feat-greater-channel-smite', 'feat-harrowed']) {
    const b = block(id);
    assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:/, `${id} must stay note-only`);
  }
});

test('Batch 10: no feat in this batch is mirrored into companion/index.html', () => {
  for (const id of BATCH_10_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
