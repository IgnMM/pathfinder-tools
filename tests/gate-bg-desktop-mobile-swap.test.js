// Run with: node --test tests/gate-bg-desktop-mobile-swap.test.js
// The user supplied new "Portada"/"Portada-mobile" artwork to replace the single shared
// assets/gate-bg.jpg used by every "Welcome, Traveler" sync-gate screen (one image, no
// mobile variant) across ~34 pages. Split into assets/gate-bg-desktop.png (default) and
// assets/gate-bg-mobile.png (swapped in at max-width:560px via !important, matching the
// site's existing mobile breakpoint), applied identically everywhere gate-bg.jpg used to
// appear. The old gate-bg.jpg is removed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

const PAGES = [
  'alchemist/index.html', 'antipaladin/index.html', 'arcanist/index.html', 'bard/index.html',
  'bloodrager/index.html', 'calc/index.html', 'character/index.html', 'cleric/index.html',
  'companion/index.html', 'druid/index.html', 'gabriel/damage.html', 'gabriel/spells.html',
  'hub.html', 'hunter/index.html', 'index.html', 'inquisitor/index.html', 'investigator/index.html',
  'magus/index.html', 'medium/index.html', 'mesmerist/index.html', 'occultist/index.html',
  'oracle/index.html', 'paladin/index.html', 'psychic/index.html', 'ranger/index.html',
  'shaman/index.html', 'skald/index.html', 'sorcerer/index.html', 'spiritualist/index.html',
  'summoner/index.html', 'uran/index.html', 'warpriest/index.html', 'witch/index.html', 'wizard/index.html',
];

test('assets/gate-bg-desktop.png and assets/gate-bg-mobile.png exist; the old assets/gate-bg.jpg is gone', () => {
  assert.ok(fs.existsSync(path.join(root, 'assets/gate-bg-desktop.png')));
  assert.ok(fs.existsSync(path.join(root, 'assets/gate-bg-mobile.png')));
  assert.ok(!fs.existsSync(path.join(root, 'assets/gate-bg.jpg')));
});

test('every sync-gate page references gate-bg-desktop.png as its default background and gate-bg-mobile.png under max-width:560px, with no leftover gate-bg.jpg reference', () => {
  for (const page of PAGES) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const prefix = (page === 'index.html' || page === 'hub.html') ? '' : '../';
    assert.match(html, new RegExp(`url\\('${prefix.replace('.', '\\.')}assets/gate-bg-desktop\\.png'\\)`), `${page} should use gate-bg-desktop.png`);
    assert.match(html, new RegExp(`@media\\(max-width:560px\\)\\{#syncGate\\{background-image:[^}]*url\\('${prefix.replace('.', '\\.')}assets/gate-bg-mobile\\.png'\\) !important\\}\\}`), `${page} should swap to gate-bg-mobile.png under 560px`);
    assert.doesNotMatch(html, /gate-bg\.jpg/, `${page} should have no leftover gate-bg.jpg reference`);
  }
});

test('service-worker.js precaches both new gate-bg images, not the old one', () => {
  const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  assert.match(sw, /"\.\/assets\/gate-bg-desktop\.png"/);
  assert.match(sw, /"\.\/assets\/gate-bg-mobile\.png"/);
  assert.doesNotMatch(sw, /gate-bg\.jpg/);
});
