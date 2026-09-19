// Damage Calculator batch project -- Batch 54: AUDIT spells REVIEW/LIKELY EXCLUDE (1 of 1).
// The batch's own pre-analysis leaned "likely exclude" (direct spell damage rather than
// a persistent modifier), but Primal Regression was found already present and correctly
// implemented as a +6 enhancement Strength buff (the Int/Cha drawbacks and temp HP are
// correctly left unmodeled as not attack/damage relevant). No code change was needed;
// this file adds the regression coverage the audit's own guardrails require.
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
  const nextEntry = html.indexOf('\n{id:', start + 5);
  return html.slice(start, nextEntry > 0 ? nextEntry : start + 1200);
}

test('Batch 54: Primal Regression is present exactly once, already correctly implemented as +6 enhancement Strength via abilityBuffBonus', () => {
  assert.equal(countId(html, 'primal-regression'), 1);
  const b = block('primal-regression');
  assert.match(b, /source:/);
  assert.match(b, /abilityBuffBonus\(ctx,'str',6\)/);
  assert.match(b, /type:'enhancement-str'/);
});
