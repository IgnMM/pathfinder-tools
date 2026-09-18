// Damage Calculator batch project -- Batch 41: ADD feats ENGINE (5 of 7).
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

test('Batch 41: Octopus Focus is present exactly once with a source link', () => {
  assert.equal(countId(html, 'octopus-focus'), 1);
  assert.match(block('octopus-focus'), /source:/);
});

test('Batch 41: Octopus Focus grants +1 melee attack per enemy threatening the character, capped at the Dexterity modifier', () => {
  const b = block('octopus-focus');
  assert.match(b, /let cap=Math\.max\(0,ctx\.dex\|\|0\);let v=Math\.max\(0,Math\.min\(cap,cfg\.enemies\|\|0\)\);/);
});

test('Batch 41: Sabotaging Sunder was already present and correctly implemented (a configField for Disable Device ranks, replacing BAB/Strength for that CMB check) -- left untouched', () => {
  assert.equal(countId(html, 'sabotaging-sunder'), 1);
  assert.match(block('sabotaging-sunder'), /configFields:\[\{key:'ddRanks'/);
});

test('Batch 41: excluded entries were not added -- none is a bonus to the character\'s own attack or damage roll (coup de grace/reposition/repositioning maneuvers triggered on a crit with no attack number of their own, AC/dodge bonuses, a nemesis NPC\'s bonus against the character, ability-damage healing, movement-only mechanics, untracked skill-rank/sneak-attack-dice baselines, or enemy-state conditions)', () => {
  const excludedIds = [
    'merciless-butchery', 'mighty-bite', 'mobility', 'neckbreaker', 'nemesis', 'panther-claw',
    'planar-infusion', 'repositioning-strike', 'restorative-vigor', 'ride-by-attack',
    'runic-charge', 'sap-master', 'shatter-defenses',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 41: deferred entries were not added -- Mounted Blade and Pummeling Charge need the same action-economy primitive deferred for Cleave in batch 37; Noble Scion (Cheliax) and Planar Focus have multiple mutually exclusive branches, matching the Draconic Heritage precedent', () => {
  const deferredIds = ['mounted-blade', 'noble-scion-cheliax', 'planar-focus', 'pummeling-charge'];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 41: Octopus Focus is not mirrored into companion/index.html', () => {
  assert.equal(countId(companionHtml, 'octopus-focus'), 0);
});
