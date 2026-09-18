// Damage Calculator batch project -- Batch 33: ADD feats DYNAMIC (1 of 4).
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

test('Batch 33: Diva Strike is present exactly once with a source link', () => {
  assert.equal(countId(html, 'diva-strike'), 1);
  assert.match(block('diva-strike'), /source:/);
});

test('Batch 33: Diva Strike adds precision damage equal to the Charisma modifier via extraDice (not multiplied on a crit), and produces no effect when Charisma modifier is 0 or negative', () => {
  const b = block('diva-strike');
  assert.match(b, /let cha=ctx\.cha\|\|0;if\(cha<=0\)/);
  assert.match(b, /extraDice:\{normal:String\(cha\)\}/);
});

test('Batch 33: Adept Champion was already present and correctly implemented (a configField for the sacrificed smite damage bonus, computing half of it as CMB against the smite target) -- left untouched', () => {
  assert.equal(countId(html, 'adept-champion'), 1);
  const b = block('adept-champion');
  assert.match(b, /configFields:\[\{key:'smiteDmgBonus'/);
});

test('Batch 33: Bulette Leap was already present and correctly implemented (models the cumulative -2 CMB penalty on successive overrun attempts each round) -- left untouched', () => {
  assert.equal(countId(html, 'bulette-leap'), 1);
  const b = block('bulette-leap');
  assert.match(b, /configFields:\[\{key:'overrunNumber'/);
});

test('Batch 33: excluded entries were not added -- none is a bonus to the character\'s own attack or damage roll (they model unmodeled underwater/improvised-weapon penalties, grant AC/save/skill bonuses, are crit-triggered conditions with no attack number, are alternate multi-attack sequences, or grant a brand-new natural attack the user configures directly in the weapon UI rather than as an add-on modifier)', () => {
  const excludedIds = [
    'aquadynamic-focus', 'armor-trick', 'aspect-of-the-beast', 'banishing-critical',
    'barracuda-style', 'blinding-critical', 'bloatmage-initiate', 'catch-off-guard',
    'cloak-and-dagger-tactics', 'cloven-helm', 'covering-shield', 'crippling-critical',
    'dangerous-tail', 'deafening-critical', 'dented-helm', 'devastating-assault',
    'die-for-your-master', 'djinni-spirit',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 33: deferred entries were not added -- each depends on an untracked stat (armor bonus to AC) or a variable external resource (channel energy dice, a fighting-defensively baseline) this engine doesn\'t track', () => {
  const deferredIds = ['bulette-rampage', 'channel-smite', 'crane-style'];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 33: Diva Strike is not mirrored into companion/index.html', () => {
  assert.equal(countId(companionHtml, 'diva-strike'), 0);
});
