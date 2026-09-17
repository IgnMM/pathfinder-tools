import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const repo = new URL('../', import.meta.url);
const readJson = relative => JSON.parse(fs.readFileSync(new URL(relative, repo), 'utf8'));
const catalogue = readJson('assets/find-your-class/aon-catalog/aon-prestige-class-catalog.json');
const details = readJson('assets/find-your-class/aon-catalog/aon-prestige-class-details.json').profiles;

test('AoN prestige catalogue contains 119 unique classes and URLs', () => {
  assert.equal(catalogue.prestigeClasses.length, 119);
  assert.equal(details.length, 119);
  assert.equal(new Set(details.map(item => item.id)).size, 119);
  assert.equal(new Set(details.map(item => item.aonUrl)).size, 119);
  assert.deepEqual(catalogue.counts, {prestigeClasses: 119, valued: 0, pending: 119});
});

test('every prestige class has source text and explicit entry requirements', () => {
  for (const item of details) {
    assert.match(item.id, /^prestige:[a-z0-9-]+$/);
    assert.equal(item.entityType, 'prestige-class');
    assert.match(item.aonUrl, /^https:\/\/aonprd\.com\/PrestigeClassesDisplay\.aspx\?ItemName=/);
    assert.ok(item.sourceCitationText.length, `${item.id}: source`);
    assert.ok(item.requirementsText.length, `${item.id}: requirements`);
    assert.ok(item.sourceText.length > 300, `${item.id}: detail`);
    assert.equal(item.valuationStatus, 'pending');
  }
});

test('representative prestige classes are present', () => {
  const ids = new Set(details.map(item => item.id));
  for (const id of ['prestige:arcane-trickster', 'prestige:dragon-disciple', 'prestige:mammoth-rider', 'prestige:mystic-theurge', 'prestige:winter-witch']) {
    assert.ok(ids.has(id), id);
  }
});
