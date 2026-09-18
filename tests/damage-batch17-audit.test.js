// Damage Calculator batch project -- Batch 17: AUDIT feats ENGINE (1 of 3).
// Regression coverage for the 23 audited feat entries and the bugs/clarity fixes this
// batch found. Static-source assertions (grep-style on the HTML text), same pattern as
// the other feat/trait audit test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_17_IDS = [
  'feat-acute-shot', 'agonizing-obedience', 'feat-arcane-blast', 'feat-arcing-weapon', 'battle-cry',
  'beast-hunter', 'berserker-s-cry', 'feat-block-upper-chakras', 'feat-blood-tide', 'feat-combat-meditation',
  'feat-creature-focus', 'critical-focus', 'feat-dauntless-destiny', 'deadly-aim', 'death-from-above',
  'feat-divine-interference', 'dragonslayer-dahak', 'duelist-of-the-roaring-falls', 'eagle-knight-candidate', 'falling-water-gambit',
  'feat-fateful-channel', 'feat-foment-the-blood', 'furious-focus',
];
// furious-focus is also mirrored into companion/index.html (pre-existing, untouched)
const NOT_MIRRORED = BATCH_17_IDS.filter(id => id !== 'furious-focus');

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

test('Batch 17: all 23 entries are present exactly once', () => {
  for (const id of BATCH_17_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 17 fix: Agonizing Obedience grants no flat, always-on attack bonus in its own rules text (skill penalties, an agony-strike debuff on the target, and HD-gated boons specific to the chosen agony) -- was implemented as a fabricated flat +4 self attack bonus', () => {
  const b = block('agonizing-obedience');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old fabricated flat +4 configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'No agony grants a flat always-on attack bonus/);
});

test('Battle 17 fix: Battle Cry buffs ALLIES (no "including yourself" clause, unlike its sibling Berserker\'s Cry), not your own attack -- was implemented as a flat +1 self attack bonus', () => {
  const b = block('battle-cry');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat self-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Buffs allies/);
});

test('Batch 17 fix: Critical Focus is a crit-confirmation-only bonus, not a flat attack bonus -- was implemented as a flat +4 self attack bonus applied to every attack roll', () => {
  const b = block('critical-focus');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat attack-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'A crit-confirmation bonus \(\+4 circumstance\)/);
});

test("Batch 17 DEFERRED: Dragonslayer (dragonslayer-dahak) still holds the Inner Sea Gods Dahak trait, not the Dragonslayer's Handbook ENGINE-tier feat this batch asked to audit -- id collision, correctly left untouched (same pattern as Weapon Training in batch05 and Cruelty in batch09)", () => {
  const b = block('dragonslayer-dahak');
  assert.match(b, /category:'trait'/, 'must still be the Dahak deity trait entry');
  assert.match(b, /source:'Inner Sea Gods'/);
  assert.doesNotMatch(b, /breath weapon/, 'must not have been overwritten with the ENGINE-tier feat content');
});

test("Batch 17 fix: Duelist of the Roaring Falls now points to the engine's existing 'Ability -> Damage rolls' picker for its primary Str->Dex substitution effect, instead of silently only implementing the +1 competence fallback case", () => {
  const b = block('duelist-of-the-roaring-falls');
  assert.match(b, /Ability -> Damage rolls/);
});

test('Batch 17 fix: Eagle Knight Candidate now offers a branch selector (Golden Legion buffs allies, Steel Falcons grants +1 damage vs a concealed target, Twilight Talons doubles threat range) instead of a flat +1 self attack bonus that matches none of the three actual branches', () => {
  const b = block('eagle-knight-candidate');
  assert.match(b, /key:'branch'/);
  assert.match(b, /cfg\.branch==='steel'/);
  assert.match(b, /appliesTo:\['damage'\]/);
});

test('Batch 17 fix: Falling Water Gambit is a crit-confirmation bonus plus a threat-range increase, not a flat attack bonus -- was implemented as a flat +2 self attack bonus applied to every attack roll', () => {
  const b = block('falling-water-gambit');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat attack-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'A crit-confirmation bonus \(\+2\)/);
});

test('Batch 17: already-correct entries stay unchanged (spot checks)', () => {
  assert.match(block('berserker-s-cry'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:1\);return \{attack:0,damage:v/);
  assert.match(block('deadly-aim'), /compute:\(ctx\)=>\{let step=1\+Math\.floor\(Math\.max\(1,ctx\.bab\)\/4\);/);
  assert.match(block('feat-creature-focus'), /compute:\(ctx,cfg\)=>\{if\(!targetMatches\(ctx,cfg\.vsFlag\)\)/);
  assert.match(block('furious-focus'), /special:'furious-focus'/);
});

test('Batch 17: the already-correct ENGINE-gap note-only entries stay note-only (no baseline primitive to represent them)', () => {
  for (const id of ['feat-acute-shot', 'feat-arcane-blast', 'feat-arcing-weapon', 'feat-block-upper-chakras', 'feat-blood-tide', 'feat-combat-meditation', 'feat-dauntless-destiny', 'feat-divine-interference', 'feat-fateful-channel', 'feat-foment-the-blood']) {
    const b = block(id);
    assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:/, `${id} must stay note-only`);
  }
});

test('Batch 17: no feat in this batch (except the pre-existing furious-focus companion mirror) is mirrored into companion/index.html', () => {
  for (const id of NOT_MIRRORED) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
