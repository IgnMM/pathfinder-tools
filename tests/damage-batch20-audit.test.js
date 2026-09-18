// Damage Calculator batch project -- Batch 20: AUDIT spells FIXED/CONDITIONAL (1 of 2),
// the first batch of the spell AUDIT series (following the completed trait series 01-07
// and feat series 08-19). Regression coverage for the 25 audited spell entries and the
// bugs this batch found. Static-source assertions (grep-style on the HTML text), same
// pattern as the other trait/feat audit test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_20_IDS = [
  'black-spot', 'blade-of-light', 'blessed-fist', 'blood-in-the-water', 'boiling-blood', 'bone-fists',
  'enemys-heart', 'enticing-adulation', 'good-hope', 'holy-sword', 'holy-whisper', 'hunter-s-blessing',
  'magic-fang', 'magic-weapon', 'marid-s-mastery', 'prayer', 'psychic-leech', 'rage-spell', 'righteous-vigor',
  'shillelagh', 'song-of-discord-greater', 'swallow-your-fear', 'unhallowed-blows', 'unholy-sword', 'unliving-rage',
];
// good-hope, magic-fang and prayer are also mirrored into companion/index.html (pre-existing, untouched)
const MIRRORED = new Set(['good-hope', 'magic-fang', 'prayer']);
const NOT_MIRRORED = BATCH_20_IDS.filter(id => !MIRRORED.has(id));

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

test('Batch 20: all 25 entries are present exactly once', () => {
  for (const id of BATCH_20_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 20 fix: Blade of Light was note-only despite having a modelable +2 sacred attack bonus and +1d6 damage vs undead (same targetMatches/extraDice pattern as Holy Sword)', () => {
  const b = block('blade-of-light');
  assert.match(b, /compute:\(ctx\)=>\{let vs=targetMatches\(ctx,'undead'\);/);
  assert.match(b, /extraDice:vs\?\{normal:'1d6'\}:undefined/);
  assert.doesNotMatch(b, /special — not added to totals/);
});

test('Batch 20 fix: Magic Weapon cannot target natural weapons per its own rules text, but applied its +1/+1 unconditionally -- now gated off when Attack Category is natural', () => {
  const b = block('magic-weapon');
  assert.match(b, /compute:\(ctx\)=>ctx\.weaponCategory==='natural'\?\{attack:0,damage:0,note:'no effect/);
});

test('Batch 20 fix: Unhallowed Blows only affects a natural weapon or unarmed strike per its own rules text, but applied its bonus regardless of Attack Category -- now gated to natural/unarmed only, matching Magic Fang\'s established pattern', () => {
  const b = block('unhallowed-blows');
  assert.match(b, /if\(ctx\.weaponCategory!=='natural'&&ctx\.weaponCategory!=='unarmed'\)return\{attack:0,damage:0,note:'no effect/);
});

test('Batch 20: already-correct entries stay unchanged (spot checks)', () => {
  assert.match(block('black-spot'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:2\);return \{attack:v,damage:v/);
  assert.match(block('magic-fang'), /compute:\(ctx\)=>\(ctx\.weaponCategory==='natural'\|\|ctx\.weaponCategory==='unarmed'\)\?/);
  assert.match(block('holy-sword'), /compute:\(ctx\)=>\{let vs=targetMatches\(ctx,'evil'\);/);
  assert.match(block('unholy-sword'), /compute:\(ctx\)=>\{let vs=targetMatches\(ctx,'good'\);/);
  assert.match(block('rage-spell'), /compute:\(ctx\)=>\{let r1=abilityBuffBonus\(ctx,'str',2\),r2=abilityBuffBonus\(ctx,'con',2\);/);
});

test('Batch 20: Righteous Vigor stays note-only (its cumulative per-hit stacking that resets on a miss is inherently stateful across a combat and cannot be represented as a single-shot modifier)', () => {
  const b = block('righteous-vigor');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:/);
});

test('Batch 20: no entry in this batch (except the pre-existing good-hope/magic-fang/prayer companion mirrors) is mirrored into companion/index.html', () => {
  for (const id of NOT_MIRRORED) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
