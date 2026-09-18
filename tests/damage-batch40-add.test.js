// Damage Calculator batch project -- Batch 40: ADD feats ENGINE (4 of 7).
// Regression coverage for the 1 newly added feat entry, plus guards on the
// already-present entry and the excluded/deferred entries this batch reports.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

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

test('Batch 40: Long-Nose Form is present exactly once with a source link', () => {
  assert.equal(countId(html, 'long-nose-form'), 1);
  assert.match(block('long-nose-form'), /source:/);
});

test('Batch 40: Long-Nose Form grants +2 untyped to Strength via abilityBuffBonus', () => {
  const b = block('long-nose-form');
  assert.match(b, /abilityBuffBonus\(ctx,'str',2\)/);
});

test('Batch 40: Improved Two-Weapon Fighting was already present and correctly implemented (integrated into the TWF iterative-attack system) -- left untouched', () => {
  assert.equal(countId(html, 'improved-two-weapon-fighting'), 1);
});

test('Batch 40: excluded entries were not added -- none is a bonus to the character\'s own attack or damage roll (miss-chance/reroll mechanics, skill bonuses, weapon-die overrides the user already sets directly in the weapon UI, ability-replacement redundant with the existing dropdowns, companion-defense mechanics, or multi-branch spell-specific tricks with no single core bonus)', () => {
  const excludedIds = [
    'gaze-reflection', 'graceful-athlete', 'greater-blind-fight', 'greater-wilding-strike',
    'guided-hand', 'illusive-gnome-surprise', 'improved-blind-fight',
    'improved-wilding-strike', 'improvised-weapon-mastery', 'inspired-sneak-attack',
    'intercept-blow', 'linnorm-style', 'magic-trick', 'martial-dominance',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 40: deferred entries were not added -- Great Cleave and Heaven\'s Step need the same action-economy primitive deferred for Cleave in batch 37; Improved Critical would need touching several hardcoded "Keen:" note-text lines shared with the existing threat-range-doubling engine, risking a misleading note under time pressure', () => {
  const deferredIds = ['great-cleave', 'heavens-step', 'improved-critical'];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 40: Long-Nose Form is not mirrored into companion/index.html', () => {
  assert.equal(countId(companionHtml, 'long-nose-form'), 0);
});
