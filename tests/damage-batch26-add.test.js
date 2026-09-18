// Damage Calculator batch project -- Batch 26: ADD traits ENGINE (1 of 1). Disciplined
// Body already existed (trait-disciplined-body) but only covered its CMB-check use case,
// silently missing the attack-roll use case this batch was asked to add -- a genuine gap,
// fixed by extending the existing entry rather than adding a duplicate. Volatile Fuse is
// deferred: a firearm-misfire/explosion mechanic with no baseline primitive here.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');

function countId(source, id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (source.match(re) || []).length;
}

function block(id) {
  const start = html.indexOf(`id:'${id}'`) >= 0 ? html.indexOf(`id:'${id}'`) : html.indexOf(`id:"${id}"`);
  assert.ok(start >= 0, `${id} must exist`);
  const end = html.indexOf('companionCompatibility:', start);
  return html.slice(start, end > 0 ? end : start + 1400);
}

test('Batch 26: Disciplined Body is present exactly once, still under its original id (no duplicate added)', () => {
  assert.equal(countId(html, 'trait-disciplined-body'), 1);
  assert.equal(countId(html, 'disciplined-body'), 0);
});

test('Batch 26 fix: Disciplined Body now covers the attack-roll substitution (Wis for Str/Dex) it was silently missing, alongside its already-correct CMB-check case', () => {
  const b = block('trait-disciplined-body');
  assert.match(b, /appliesTo:\['attack','cmb'\]/);
  assert.match(b, /key:'rollType'.*options:\[\{v:'',label:'— pick —'\},\{v:'attack',label:'Attack roll'\},\{v:'cmb',label:'CMB check'\}\]/);
});

test('Batch 26: Disciplined Body replaces the ability rather than adding a flat bonus -- attack roll case', () => {
  const b = block('trait-disciplined-body');
  assert.match(b, /if\(cfg\.rollType==='attack'\) return \{attack:v,damage:0,cmb:0,/);
});

test('Batch 26: Disciplined Body\'s pre-existing CMB-check case is unchanged in formula (Wis mod - chosen ability mod)', () => {
  const b = block('trait-disciplined-body');
  assert.match(b, /let base=cfg\.ability==='dex'\?ctx\.dex:ctx\.str; let v=\(ctx\.wis\|\|0\)-\(base\|\|0\);/);
});

test('Batch 26: Disciplined Body requires picking both roll type and ability before applying anything (once/day, declared before rolling)', () => {
  const b = block('trait-disciplined-body');
  assert.match(b, /if\(!cfg\.rollType\|\|!cfg\.ability\) return \{attack:0,damage:0,cmb:0,note:'pick the roll type/);
});

test('Batch 26: Volatile Fuse was not added -- its firearm misfire-reroll and scaling explosion-damage mechanics are a dedicated roll-behavior operation with no baseline primitive here', () => {
  assert.equal(countId(html, 'volatile-fuse'), 0);
});
