// Damage Calculator batch project -- Batch 04: AUDIT trait FIXED/CONDITIONAL (4 of 5).
// Regression coverage for the 25 audited trait entries and the bugs/clarity fixes this
// batch found. Static-source assertions (grep-style on the HTML text), same pattern as
// the batch01-03 audit test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_04_IDS = [
  'nightstall-urchin','obari-veteran','observant-archer','open-palm-of-irori-p4',
  'opportune-slayer-lamashtu','trait-orc-impaler','oregent-vandal','outsider-enemy',
  'trait-overprotective','ozem-inspired','performer-s-surprise',
  'poisonous-slayer-norgorber','prideful-temper','prismati-player','proud-progenitor',
  'punish-insurrection','pyromancer','quain-martial-artist','ratfolk-avenger','river-rat',
  'ruthless','savanna-hunter','scarred-by-space-pirates','trait-scarred-descendant',
  'scion-of-goblinblood-p4',
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

test('Batch 04: all 25 entries are present exactly once', () => {
  for (const id of BATCH_04_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 04 fix: Nightstall Urchin attack bonus defaults to +1, not +2 (the +2 is a separate save-vs-fear bonus)', () => {
  const b = block('nightstall-urchin');
  assert.match(b, /key:'value'.*?default:1\}/);
  assert.match(b, /cfg\.value:1\)/, 'compute()\'s own fallback must also be 1, not just the declared configField default');
});

test('Batch 04 fix: Outsider Enemy buffs outsiders of the chosen subtype AGAINST you (a drawback), not your own attack/damage -- note-only', () => {
  const b = block('outsider-enemy');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Buffs outsiders/, 'the printed rule grants outsiders of the chosen subtype a bonus against YOU, not a bonus to your own rolls');
});

test('Batch 04 fix: Ruthless is a crit-confirmation-only bonus, not a flat attack bonus (inconsistent with 4 sibling entries using the identical "confirm critical hits" wording)', () => {
  const b = block('ruthless');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'A crit-confirmation bonus/);
});

test('Batch 04 fix: Open Palm of Irori documents its bonus is precision damage (not multiplied on a crit), same pattern as Master of the Sudden Strike (batch 3)', () => {
  const b = block('open-palm-of-irori-p4');
  assert.match(b, /precision damage/i);
});

test('Batch 04 fix: Ozem-Inspired and Savanna Hunter scope their bonus to attacks of opportunity only, not general attacks', () => {
  assert.match(block('ozem-inspired'), /attacks of opportunity/i);
  assert.match(block('savanna-hunter'), /attacks of opportunity/i);
});

test('Batch 04 fix: Performer\'s Surprise scopes its bonus to improvised/exotic/thrown weapons only', () => {
  assert.match(block('performer-s-surprise'), /improvised.*exotic.*thrown|improvised\/exotic\/thrown/i);
});

test('Batch 04 fix: River Rat scopes its bonus to a dagger only', () => {
  assert.match(block('river-rat'), /dagger only/i);
});

test('Batch 04: the 3 already-correct crit-confirmation-only traits stay note-only', () => {
  for (const id of ['trait-orc-impaler', 'trait-scarred-descendant']) {
    const b = block(id);
    assert.match(b, /A crit-confirmation bonus/, `${id} must stay a note-only crit-confirmation entry`);
  }
});

test('Batch 04: no trait in this batch is mirrored into companion/index.html', () => {
  for (const id of BATCH_04_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
