// Damage Calculator batch project -- Batch 12: AUDIT feats FIXED/CONDITIONAL (5 of 6).
// Regression coverage for the 25 audited feat entries and the bugs/clarity fixes this
// batch found. Static-source assertions (grep-style on the HTML text), same pattern as
// the other feat/trait audit test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_12_IDS = [
  'reckless-rage', 'reward-of-grace-p4', 'risky-striker', 'scent-of-fear', 'seize-advantage',
  'self-exiled-noble', 'shapeshifter-style', 'shark-tear', 'feat-shield-master', 'feat-shielded-staff-master',
  'feat-shikigami-mimicry', 'feat-shocking-amplification', 'shrewd-liason', 'shrewd-tactician', 'feat-signature-strike-triumph',
  'slipslinger-style', 'smashing-impact', 'spring-heeled-style', 'stick-fighting-style', 'feat-sun-striker',
  'surge-of-success-p4', 'taldan-conscript', 'taskmaster', 'timely-coordination', 'totem-beast',
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

test('Batch 12: all 25 entries are present exactly once', () => {
  for (const id of BATCH_12_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 12 fix: Reckless Rage now applies its -1 additional attack penalty as well as the +2 damage bonus (was damage-only, silently dropping the printed attack penalty)', () => {
  const b = block('reckless-rage');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:2\);return \{attack:-1,damage:v/);
});

test('Batch 12 fix: Risky Striker now scales its damage bonus with live BAB (+2 base, +2 more every 4 BAB) instead of a static manually-entered value that never reflected the printed BAB scaling', () => {
  const b = block('risky-striker');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat configField must be removed');
  assert.match(b, /let step=1\+Math\.floor\(Math\.max\(1,ctx\.bab\|\|0\)\/4\);let v=step\*2;/);
});

test('Batch 12 fix: Self-Exiled Noble now applies its +1 bonus to damage as well as attack (was attack-only, silently dropping the printed damage bonus)', () => {
  const b = block('self-exiled-noble');
  assert.match(b, /appliesTo:\['attack','damage'\]/);
  assert.match(b, /attack:v,damage:v/);
});

test('Batch 12 fix: Shapeshifter Style now offers a benefit selector for all 4 printed options instead of a flat always-on +1 damage bonus that assumed Brutal Attack was chosen and ignored the up-to-+3 prerequisite-feat scaling', () => {
  const b = block('shapeshifter-style');
  assert.match(b, /key:'benefit'/);
  assert.match(b, /cfg\.benefit==='brutal'/);
  assert.match(b, /Math\.min\(3,1\+extra\)/);
});

test('Batch 12 fix: Shrewd Liason and Shrewd Tactician deny enemies their flanking bonus against YOU (defensive), not a bonus for your own attack -- both were implemented as a flat +2 self attack bonus', () => {
  for (const id of ['shrewd-liason', 'shrewd-tactician']) {
    const b = block(id);
    assert.doesNotMatch(b, /configFields:\[\{key:'value'/, `${id}: the old flat self-bonus configField must be removed`);
    assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Defensive: denies enemies their flanking attack bonus against YOU/, id);
  }
});

test('Batch 12 fix: Taskmaster buffs an ALLY, not your own attack/damage -- was implemented as a flat +1 self attack bonus', () => {
  const b = block('taskmaster');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat self-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Buffs an ally/);
});

test('Batch 12 fix: Totem Beast buffs your ANIMAL COMPANION, not your own attack/damage -- was implemented as a flat +2 self attack bonus', () => {
  const b = block('totem-beast');
  assert.doesNotMatch(b, /configFields:\[\{key:'value'/, 'the old flat self-bonus configField must be removed');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:'Buffs your animal companion/);
});

test('Batch 12: already-correct entries stay unchanged (spot checks)', () => {
  assert.match(block('reward-of-grace-p4'), /compute:\(ctx,cfg\)=>\{let v=\(cfg\.value!==undefined\?cfg\.value:1\);return \{attack:v,damage:0,note:'\+'\+v\+' atk'\+' \(sacred\)/);
  assert.match(block('shark-tear'), /attack:v,damage:v,note:'\+'\+v\+' atk'/);
  assert.match(block('feat-shield-master'), /compute:\(ctx,cfg\)=>\{let v=cfg\.shieldEnh!==undefined\?cfg\.shieldEnh:1;/);
});

test('Batch 12: the already-correct ENGINE-gap note-only entries stay note-only (no baseline primitive to represent them)', () => {
  for (const id of ['feat-shikigami-mimicry', 'feat-shocking-amplification', 'feat-signature-strike-triumph', 'feat-sun-striker']) {
    const b = block(id);
    assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,note:/, `${id} must stay note-only`);
  }
});

test('Batch 12: no feat in this batch is mirrored into companion/index.html', () => {
  for (const id of BATCH_12_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
