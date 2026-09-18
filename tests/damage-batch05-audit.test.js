// Damage Calculator batch project -- Batch 05 (final of the trait FIXED/CONDITIONAL
// audit series, 5 of 5): AUDIT trait FIXED/CONDITIONAL. Regression coverage for the 24
// audited entries and the bugs/clarity fixes this batch found. Static-source assertions
// (grep-style on the HTML text), same pattern as the batch01-04 audit test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_05_IDS = [
  'shadow-stabber','siege-defender','slayer-of-the-deep','spellcaster-s-anathema',
  'strength-of-submission','superior-clutch','surprise-weapon','trait-swordlords-page',
  'tar-taargadth-trained','tarnished-halls-runner','the-vessel-between','tiger-s-claw',
  'toxophilite','tribal','tunnel-fighter','undead-slayer','undead-slayer-pharasma',
  'unpredictable-reactions','trait-warsmith','weapon-training','youthful-infiltrator',
  'zealous-p4','zealous-striker','zest-for-battle',
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

test('Batch 05: all 24 entries are present exactly once', () => {
  for (const id of BATCH_05_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 05 fix: Toxophilite is a crit-confirmation-only bonus (bows), not a flat attack bonus -- inconsistent with its own already-correct criticalContext companion metadata', () => {
  const b = block('toxophilite');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'A crit-confirmation bonus/);
});

test('Batch 05 fix: Tunnel Fighter\'s +1 only applies to Critical Damage (never Normal Damage) -- note-only, since the generic damage field can\'t be scoped to Critical Damage alone', () => {
  const b = block('tunnel-fighter');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'\+1 dmg while underground, but ONLY on Critical Damage/);
});

test('Batch 05 fix: Zealous applies both its -5 attack penalty AND its +2 damage bonus (was damage-only, silently dropping the printed drawback)', () => {
  const b = block('zealous-p4');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /atkPenalty.*default:-5/);
});

test('Batch 05 fix: Tarnished Halls Runner names its firearms/technological-weapon restriction', () => {
  assert.match(block('tarnished-halls-runner'), /firearms.*technological|FIREARMS.*TECHNOLOGICAL/i);
});

test('Batch 05 DEFERRED: Weapon Training (weapon-training) still holds the Fighter class feature (Core Rulebook), not the Ulfen ethnicity trait this batch asked to audit -- id collision, correctly left untouched', () => {
  const b = block('weapon-training');
  assert.match(b, /category:"other"/, 'must still be the Fighter class feature entry');
  assert.match(b, /source:"Core Rulebook"/);
  assert.doesNotMatch(b, /Ulfen|bastard sword/, 'must not have been overwritten with the Ulfen trait\'s content');
});

test('Batch 05: the 2 already-correct crit-confirmation-only traits stay note-only', () => {
  for (const id of ['trait-swordlords-page']) {
    const b = block(id);
    assert.match(b, /A crit-confirmation bonus/, `${id} must stay a note-only crit-confirmation entry`);
  }
});

test('Batch 05: no trait in this batch is mirrored into companion/index.html', () => {
  const traitIds = BATCH_05_IDS.filter(id => id !== 'weapon-training'); // not a trait, deferred/untouched anyway
  for (const id of traitIds) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
