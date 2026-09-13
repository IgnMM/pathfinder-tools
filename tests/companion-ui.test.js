// Run with: node --test tests/companion-ui.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

test('implemented creature types are not described as coming later', () => {
  assert.doesNotMatch(html, /Familiar<\/b>, <b>Eidolon<\/b> and <b>Phantom<\/b> are coming/);
  assert.match(html, /Use the Character Calculator for this creature/);
});

test('Animal Growth copy matches the ability adjustments performed by the engine', () => {
  assert.match(html, /all applied automatically to ability-based attack\/damage math/);
  assert.doesNotMatch(html, /\+4 size bonus to Constitution and -2 size penalty to Dexterity \(not modeled here/);
});

test('attack editor controls expose accessible names and mobile layout rules', () => {
  for (const label of [
    'Attack name', 'Attack quantity', 'Attack type', 'Primary or secondary attack',
    'Base damage dice', 'Critical threat range', 'Critical multiplier', 'Base to-hit',
    'Ability-to-damage multiplier', 'Base fixed damage', 'Base damage type',
    'Enhancement bonus', 'Attack range', 'Special attack note',
    'Extra damage dice', 'Extra damage type'
  ]) assert.match(html, new RegExp(`aria-label="${label}"`));
  assert.match(html, /'Ability used for attack roll':'Ability used for damage roll'/);
  assert.match(html, /aria-label="\$\{label\}"/);
  assert.match(html, /@media\(max-width:600px\)/);
});

test('category badges distinguish active effects from saved inactive effects', () => {
  assert.match(html, /activeCount/);
  assert.match(html, /' active'\+\(savedCount!==activeCount\?' \/ '\+savedCount\+' saved'/);
});

test('Inspire Courage never derives the performer level from companion Hit Dice', () => {
  const start = html.indexOf("{id:'inspire-courage'");
  const end = html.indexOf("{id:'charge'", start);
  assert.ok(start >= 0 && end > start);
  const entry = html.slice(start, end);
  assert.match(entry, /label:"Performing bard's level"/);
  assert.match(entry, /default:1/);
  assert.doesNotMatch(entry, /linkLevel/);
});

test('sheet-wide ability selectors update attack rows and manual-attack defaults', () => {
  assert.match(html, /<label>Set all attack rolls to<\/label>/);
  assert.match(html, /<label>Set all damage rolls to<\/label>/);
  assert.match(html, /\(p\.attackLines\|\|\[\]\)\.forEach\(line=>line\[field\]=ability\)/);
  assert.match(html, /hitAbility:\$\('atkStat'\)\.value\|\|'str'/);
  assert.match(html, /dmgAbility:\$\('dmgStat'\)\.value\|\|'str'/);
});

test('ability-buff descriptions explain their per-attack-line behavior', () => {
  assert.doesNotMatch(html, /Only actually changes attack\/damage here if/);
  assert.match(html, /Automatically changes each attack line that uses Strength/);
  assert.match(html, /Automatically changes each attack line that uses Dexterity/);
});
