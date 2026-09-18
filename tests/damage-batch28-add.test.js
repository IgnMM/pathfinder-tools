// Damage Calculator batch project -- Batch 28: ADD feats FIXED/CONDITIONAL (2 of 6).
// Regression coverage for the 4 newly added feat entries, plus guards on the
// already-present entry and the excluded/deferred entries this batch reports.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_28_ADDED_IDS = ['eternal-enmity', 'gilded-weapons', 'greater-beast-hunter', 'horn-of-the-criosphinx'];

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

test('Batch 28: all 4 newly added entries are present exactly once, each with a source link', () => {
  for (const id of BATCH_28_ADDED_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
    assert.match(block(id), /source:/);
  }
});

test('Batch 28: Eternal Enmity adds 1d6 precision damage via extraDice (not multiplied on a crit)', () => {
  const b = block('eternal-enmity');
  assert.match(b, /extraDice:\{normal:'1d6'\}/);
});

test('Batch 28: Gilded Weapons is gated by the real targetMatches(ctx,\'chaotic\') hook', () => {
  const b = block('gilded-weapons');
  assert.match(b, /let vs=targetMatches\(ctx,'chaotic'\);/);
});

test('Batch 28: Greater Beast Hunter is a crit-confirmation-only bonus, not a flat attack number', () => {
  const b = block('greater-beast-hunter');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:"A crit-confirmation bonus/);
});

test('Batch 28: Horn of the Criosphinx is gated by both Fighting Style (Two-Handed) and the selected damage ability (Strength), adding exactly the +0.5x Strength delta over the existing 1.5x two-handed multiplier', () => {
  const b = block('horn-of-the-criosphinx');
  assert.match(b, /if\(ctx\.style!=='twoHanded'\)/);
  assert.match(b, /if\(ctx\.dmgStat!=='str'\)/);
  assert.match(b, /let extra=roundFrac\(\(ctx\.str\|\|0\)\*0\.5\);/);
});

test('Batch 28: Fury\'s Fall was already present and correctly implemented (adds the Dexterity modifier to CMB for trip only) -- left untouched', () => {
  assert.equal(countId(html, 'furys-fall'), 1);
  const b = block('furys-fall');
  assert.match(b, /compute:\(ctx\)=>\(\{attack:0,damage:0,cmb:Math\.max\(0,ctx\.dex\|\|0\)/);
});

test('Batch 28: excluded entries were not added -- none is a bonus to the character\'s own attack or damage roll, or the effect is out of this calculator\'s scope (companion-only, object interaction, appearance/AC/skill effects)', () => {
  const excludedIds = [
    'edge-runner', 'exhausting-critical', 'exotic-weapon-proficiency', 'feral-grace',
    'feral-heart', 'flanking-foil', 'ghostslayer', 'giant-killer-stance', 'giants-smash',
    'goblin-gunslinger', 'gory-finish', 'greater-feint',
    'greater-shield-specialization', 'greater-tenacious-hunter', 'human-guise',
    'improved-feinting-flurry',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 28: Grabbing Style was already present and correctly implemented as a note-only entry (removes a -4 grapple-CMB penalty and Dex-to-AC loss while pinning, neither a net numeric bonus this calculator tracks a baseline for) -- left untouched', () => {
  assert.equal(countId(html, 'grabbing-style'), 1);
  const b = block('grabbing-style');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Removes a -4 penalty/);
});

test('Batch 28: deferred entries were not added -- each depends on multi-entity ally-feat state or a multi-step trigger chain this engine can\'t track', () => {
  const deferredIds = ['enfilading-fire', 'false-opening', 'feint-partner'];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 28: no newly added entry is mirrored into companion/index.html', () => {
  for (const id of BATCH_28_ADDED_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
