// Damage Calculator batch project -- Batch 29: ADD feats FIXED/CONDITIONAL (3 of 6).
// Regression coverage for the 3 newly added feat entries, plus guards on the
// already-present entry and the excluded/deferred entries this batch reports.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_29_ADDED_IDS = ['kinslayer', 'monkey-style', 'object-of-legend'];

function countId(source, id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (source.match(re) || []).length;
}

function block(id) {
  const start = html.indexOf(`id:'${id}'`) >= 0 ? html.indexOf(`id:'${id}'`) : html.indexOf(`id:"${id}"`);
  assert.ok(start >= 0, `${id} must exist`);
  const nextEntry = html.indexOf('\n{id:', start + 5);
  return html.slice(start, nextEntry > 0 ? nextEntry : start + 1200);
}

test('Batch 29: all 3 newly added entries are present exactly once, each with a source link', () => {
  for (const id of BATCH_29_ADDED_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
    assert.match(block(id), /source:/);
  }
});

test('Batch 29: Kinslayer adds 1d6 precision damage via extraDice (not multiplied on a crit)', () => {
  const b = block('kinslayer');
  assert.match(b, /extraDice:\{normal:'1d6'\}/);
});

test('Batch 29 (reuses the batch-26 ctx.proneOn engine hook): Monkey Style offsets the full -4 Prone melee attack penalty while using this style', () => {
  const b = block('monkey-style');
  assert.match(b, /if\(!ctx\.proneOn\)/);
  assert.match(b, /return \{attack:4,damage:0,/);
});

test('Batch 29: Object of Legend is a crit-confirmation-only bonus (+10, once/day, vs a quest-specific foe), not a flat attack number', () => {
  const b = block('object-of-legend');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:"A crit-confirmation bonus/);
});

test('Batch 29: Kobold Style was already present and correctly implemented (+4 CMB vs enemies denied their Dex bonus to AC) -- left untouched', () => {
  assert.equal(countId(html, 'kobold-style'), 1);
  const b = block('kobold-style');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,cmb:4,note:'\+4 CMB vs enemies denied their Dex bonus to AC'\}\)/);
});

test('Batch 29: Massed Charge was already present and correctly implemented (models the +2 CMB on opposed bull rush/overrun/trip; the squeezing-penalty removal correctly stays unmodeled, no baseline squeeze penalty tracked) -- left untouched', () => {
  assert.equal(countId(html, 'massed-charge'), 1);
  const b = block('massed-charge');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,cmb:2,note:'\+2 CMB \(opposed bull rush\/overrun\/trip only/);
});

test('Batch 29: excluded entries were not added -- none is a bonus to the character\'s own attack or damage roll (they buff allies, debuff enemies, model unmodeled proficiency/encumbrance penalties, or are otherwise out of scope)', () => {
  const excludedIds = [
    'improved-position-of-strength', 'improved-punishing-step', 'lead-by-example',
    'lead-from-the-back', 'light-gravity-acclimation', 'lighting-the-way', 'low-profile',
    'martial-weapon-proficiency', 'maximized-spellstrike', 'merciful-bane',
    'mobile-stronghold', 'net-adept', 'obscuring-beacon', 'onslaught', 'out-of-the-sun',
    'panther-parry',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 29: deferred entries were not added -- each depends on a parry/feint trigger chain, a stamina pool, or (Improved Natural Attack) a shared die-size-up engine mechanism whose stacking with Strong Jaw/Animal Growth needs care beyond a single catalogue entry', () => {
  const deferredIds = [
    'improved-natural-attack', 'improved-parry', 'improved-surprise-follow-through',
    'improved-two-weapon-feint',
  ];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 29: no newly added entry is mirrored into companion/index.html', () => {
  for (const id of BATCH_29_ADDED_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
