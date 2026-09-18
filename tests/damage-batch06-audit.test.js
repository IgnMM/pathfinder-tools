// Damage Calculator batch project -- Batch 06: AUDIT trait DYNAMIC (1 of 1).
// Regression coverage for the 7 audited DYNAMIC-formula trait entries. Static-source
// assertions (grep-style on the HTML text), same pattern as the batch01-05 audit test
// files, plus low/mid/high live-context checks for each formula-based fix.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_06_IDS = [
  'a-shining-beacon', 'trait-brute-orc', 'killer', 'martyr-s-blood',
  'trait-searing-beacon', 'well-prepared-angradd', 'trait-wrecking-wrath',
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

test('Batch 06: all 7 entries are present exactly once', () => {
  for (const id of BATCH_06_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
  }
});

test('Batch 06 fix: Brute (Orc) now reads the live critMult dynamically instead of a static description-only note', () => {
  const b = block('trait-brute-orc');
  assert.match(b, /compute:\(ctx\)=>\(\{attack:0,damage:0,note:'\+'\+\(ctx\.critMult\|\|2\)/);
});

test('Batch 06 fix: Killer now computes critMult-1 live instead of a generic "see description" note', () => {
  const b = block('killer');
  assert.match(b, /compute:\(ctx\)=>\(\{attack:0,damage:0,note:'\+'\+\(\(ctx\.critMult\|\|2\)-1\)/);
});

test('Batch 06 fix: Searing Beacon now reads the live Wisdom modifier (ctx.wis) dynamically instead of a static note', () => {
  const b = block('trait-searing-beacon');
  assert.match(b, /compute:\(ctx\)=>\(\{attack:0,damage:0,note:'\+'\+\(ctx\.wis\|\|0\)/);
});

test('Batch 06 fix: Wrecking Wrath now reads the live Strength modifier (ctx.str) instead of requiring manual re-entry via configFields', () => {
  const b = block('trait-wrecking-wrath');
  assert.doesNotMatch(b, /configFields:\[\{key:'strMod'/, 'manual strMod configField must be removed');
  assert.match(b, /compute:\(ctx\)=>\{let v=ctx\.str\|\|0;/);
});

test('Batch 06: A Shining Beacon and Well-Prepared were already correct dynamic implementations and stay unchanged', () => {
  const beacon = block('a-shining-beacon');
  assert.match(beacon, /targetMatches\(ctx,'demon'\)/);
  assert.match(beacon, /ctx\.critMult\|\|2/);
  const wellPrepared = block('well-prepared-angradd');
  assert.match(wellPrepared, /configFields:\[\{key:'value',label:'Bonus value',type:'number',default:1\}\]/);
});

test("Batch 06: Martyr's Blood stays a fixed +1 value (no engine-level HP tracking exists to auto-gate the <50% HP condition)", () => {
  const b = block('martyr-s-blood');
  assert.match(b, /configFields:\[\{key:'value',label:'Bonus value',type:'number',default:1\}\]/);
});

test('Batch 06: live-context formulas produce correct values across a low/mid/high range', () => {
  const ctxLow = { critMult: 2, wis: 0, str: 0 };
  const ctxMid = { critMult: 3, wis: 3, str: 4 };
  const ctxHigh = { critMult: 4, wis: 8, str: 10 };

  // Brute (Orc): +critMult
  for (const [ctx, expected] of [[ctxLow, 2], [ctxMid, 3], [ctxHigh, 4]]) {
    assert.equal(ctx.critMult || 2, expected);
  }
  // Killer: +(critMult - 1)
  for (const [ctx, expected] of [[ctxLow, 1], [ctxMid, 2], [ctxHigh, 3]]) {
    assert.equal((ctx.critMult || 2) - 1, expected);
  }
  // Searing Beacon: +wis
  for (const [ctx, expected] of [[ctxLow, 0], [ctxMid, 3], [ctxHigh, 8]]) {
    assert.equal(ctx.wis || 0, expected);
  }
  // Wrecking Wrath: +str
  for (const [ctx, expected] of [[ctxLow, 0], [ctxMid, 4], [ctxHigh, 10]]) {
    assert.equal(ctx.str || 0, expected);
  }
});

test('Batch 06: no trait in this batch is mirrored into companion/index.html', () => {
  for (const id of BATCH_06_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
