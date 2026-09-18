// Damage Calculator batch project -- Batch 35: ADD feats DYNAMIC (3 of 4).
// Regression coverage for the 1 newly added feat entry, plus guards on the
// already-present entries and the excluded/deferred entries this batch reports.
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

test('Batch 35: Kirin Strike is present exactly once with a source link', () => {
  assert.equal(countId(html, 'kirin-strike'), 1);
  assert.match(block('kirin-strike'), /source:/);
});

test('Batch 35: Kirin Strike adds 2x Intelligence modifier as damage, with a hard minimum of 2 (applies even at 0 or negative Intelligence, per its own rules text)', () => {
  const b = block('kirin-strike');
  assert.match(b, /let v=Math\.max\(2,2\*\(ctx\.int\|\|0\)\);/);
});

test('Batch 35: Improved Sunder, Improved Trip, Malleable Form and Raging Throw were already present and correctly implemented -- left untouched', () => {
  for (const id of ['improved-sunder', 'improved-trip', 'malleable-form', 'raging-throw']) {
    assert.equal(countId(html, id), 1, `${id} should still be present exactly once`);
  }
  assert.match(block('improved-sunder'), /cmb:2,cmd:2/);
  assert.match(block('improved-trip'), /cmb:2,cmd:2/);
  assert.match(block('malleable-form'), /halves your own damage dealt, not modeled here/);
  assert.match(block('raging-throw'), /Collision damage \(Str mod \+ Con mod\) is separate/);
});

test('Batch 35: excluded entries were not added -- none is a bonus to the character\'s own attack or damage roll (they trigger a social-skill check, grant AC/DR/resistance/movement, buff an ally, debuff an enemy\'s own rolls, boost spell damage, model a poison-DC trade-off, or grant a brand-new natural attack the user configures directly)', () => {
  const excludedIds = [
    'intimidating-confidence', 'lithe-attacker', 'magical-heart', 'marid-spirit',
    'mental-derail', 'meteor-swing', 'mind-strike', 'mobile-fortress', 'monkey-moves',
    'narrow-frame', 'powerful-poisoning', 'protectors-strike', 'razortusk',
    'resilient-armor', 'resilient-brute', 'ruincaster', 'run',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 35: deferred entries were not added -- each is a combat-maneuver-triggered special damage with no display channel, a multi-branch effect (matching the Draconic Heritage precedent), or depends on an unbounded/untracked resource pool', () => {
  const deferredIds = ['merciless-rush', 'planar-mentor', 'radiant-charge'];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 35: Kirin Strike is not mirrored into companion/index.html', () => {
  assert.equal(countId(companionHtml, 'kirin-strike'), 0);
});
