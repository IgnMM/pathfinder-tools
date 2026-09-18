// Damage Calculator batch project -- Batch 24: ADD traits FIXED/CONDITIONAL (1 of 1),
// the first batch of a new ADD series (adding traits/feats/spells not yet in the
// catalogue, following the completed trait+feat+spell AUDIT series, batches 01-23).
// Regression coverage for the 13 newly added trait entries, plus the excluded/deferred/
// already-present entries this batch reports.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_24_ADDED_IDS = [
  'aberration-hunter', 'bestial-wrath', 'corpse-hunter', 'deck-fighter', 'entomophobe',
  'expert-boarder', 'militia', 'opportunistic', 'pirate-duelist', 'river-sniper',
  'sandy-ambush', 'shield-bearer', 'tianjing-temple-guard',
];

function countId(source, id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (source.match(re) || []).length;
}

function block(id) {
  const start = html.indexOf(`id:'${id}'`) >= 0 ? html.indexOf(`id:'${id}'`) : html.indexOf(`id:"${id}"`);
  assert.ok(start >= 0, `${id} must exist`);
  const end = html.indexOf('companionCompatibility:', start);
  const nextEntry = html.indexOf("\n{id:", start + 5);
  const stop = end > 0 && (nextEntry < 0 || end < nextEntry) ? end : (nextEntry > 0 ? nextEntry : start + 1200);
  return html.slice(start, stop);
}

test('Batch 24: all 13 newly added entries are present exactly once, each with a source link', () => {
  for (const id of BATCH_24_ADDED_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
    assert.match(block(id), /source:/);
  }
});

test('Batch 24: Bestial Wrath is a crit-confirmation-only bonus, not a flat attack number (same established pattern as Critical Focus etc.)', () => {
  const b = block('bestial-wrath');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:"A crit-confirmation bonus/);
});

test('Batch 24: Corpse Hunter is gated by the real targetMatches(ctx,\'undead\') hook', () => {
  const b = block('corpse-hunter');
  assert.match(b, /if\(!targetMatches\(ctx,'undead'\)\)/);
});

test('Batch 24: Militia is gated by the real ctx.flankingOn hook (set from the existing Flanking entry)', () => {
  const b = block('militia');
  assert.match(b, /if\(!ctx\.flankingOn\)/);
});

test('Batch 24: Expert Boarder is gated by the real ctx.style hook (one-handed or two-weapon fighting)', () => {
  const b = block('expert-boarder');
  assert.match(b, /if\(ctx\.style!=='oneHanded'&&ctx\.style!=='twf'\)/);
});

test('Batch 24: River Sniper is gated by the real ctx.weaponRanged hook', () => {
  const b = block('river-sniper');
  assert.match(b, /if\(!ctx\.weaponRanged\)/);
});

test('Batch 24 (new engine hook): Sandy Ambush offsets the existing Prone condition\'s -4 penalty by +2, gated by a new ctx.proneOn flag mirroring the established ctx.flankingOn/ctx.hasteOn pattern', () => {
  const b = block('sandy-ambush');
  assert.match(b, /if\(!ctx\.proneOn\)/);
  const flagIdx = html.indexOf("ctx.proneOn = p.active.some(a=>a.id==='cond-prone' && a.on!==false);");
  assert.ok(flagIdx >= 0, 'ctx.proneOn engine flag must be set from the cond-prone entry');
});

test('Batch 24: Entomophobe is a drawback (negative attack penalty vs vermin), not a bonus', () => {
  const b = block('entomophobe');
  assert.match(b, /compute:\(\)=>\(\{attack:-2,damage:0/);
});

test('Batch 24: Aberration Hunter, Deck Fighter, Opportunistic, Pirate Duelist and Tianjing Temple Guard are all AoO-scoped flat attack bonuses (no automatic AoO-vs-normal-attack distinction exists), matching the established convention for the same kind of trait already in the catalogue', () => {
  for (const id of ['aberration-hunter', 'deck-fighter', 'opportunistic', 'pirate-duelist', 'tianjing-temple-guard']) {
    const b = block(id);
    assert.match(b, /attacks of opportunity/);
    assert.match(b, /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:1\);return \{attack:v,damage:0/);
  }
});

test('Batch 24: Shield Bearer grants +1 damage only (its once/day ally-AC ability is not attack/damage and stays unmodeled)', () => {
  const b = block('shield-bearer');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:1/);
});

test('Batch 24: Mistrusted was already present and correctly implemented before this batch -- left untouched', () => {
  assert.equal(countId(html, 'trait-mistrusted'), 1);
  const b = block('trait-mistrusted');
  assert.match(b, /configFields:\[\{key:'race'/);
});

test('Batch 24: excluded entries (Elemental Pupil, Havoc of the Society, Provider, Vandal, Volatile Conduit) were not added -- none boost weapon/character attack or damage rolls', () => {
  for (const id of ['elemental-pupil', 'havoc-of-the-society', 'provider', 'vandal', 'volatile-conduit']) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 24: Mock Gladiator was not added -- its nonlethal-penalty removal plus once/day Intimidate-on-crit cannot be represented as a single additive modifier', () => {
  assert.equal(countId(html, 'mock-gladiator'), 0);
});

test('Batch 24: no newly added entry is mirrored into companion/index.html', () => {
  for (const id of BATCH_24_ADDED_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
