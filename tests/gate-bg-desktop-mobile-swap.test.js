// Run with: node --test tests/gate-bg-desktop-mobile-swap.test.js
// The user supplied new "Portada"/"Portada-mobile" artwork to replace the single shared
// assets/gate-bg.jpg used by every "Welcome, Traveler" sync-gate screen (one image, no
// mobile variant) across ~34 pages. Split into assets/gate-bg-desktop.webp (default) and
// assets/gate-bg-mobile.webp (swapped in at max-width:560px via !important, matching the
// site's existing mobile breakpoint), applied identically everywhere gate-bg.jpg used to
// appear. The old gate-bg.jpg is removed. Originally shipped as .png (~2.4MB each); the
// user asked for the login screen to load faster, so both were re-encoded to WebP via
// sharp (quality 80) -- ~184KB/178KB, a ~92% size cut with no visible quality loss
// (verified by viewing the re-encoded file directly), matching the WebP format already
// used for every other tool-background image on the site.
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

test('assets/gate-bg-desktop.webp and assets/gate-bg-mobile.webp exist and are dramatically smaller than the original PNGs; no PNG or JPG leftovers', () => {
  const desktop = path.join(root, 'assets/gate-bg-desktop.webp');
  const mobile = path.join(root, 'assets/gate-bg-mobile.webp');
  assert.ok(fs.existsSync(desktop));
  assert.ok(fs.existsSync(mobile));
  assert.ok(fs.statSync(desktop).size < 400 * 1024, 'gate-bg-desktop.webp should be well under 400KB');
  assert.ok(fs.statSync(mobile).size < 400 * 1024, 'gate-bg-mobile.webp should be well under 400KB');
  assert.ok(!fs.existsSync(path.join(root, 'assets/gate-bg.jpg')));
  assert.ok(!fs.existsSync(path.join(root, 'assets/gate-bg-desktop.png')));
  assert.ok(!fs.existsSync(path.join(root, 'assets/gate-bg-mobile.png')));
});

test('every sync-gate page references gate-bg-desktop.webp as its default background and gate-bg-mobile.webp under max-width:560px, with no leftover gate-bg.jpg/.png reference', () => {
  for (const page of PAGES) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const prefix = (page === 'index.html' || page === 'hub.html') ? '' : '../';
    assert.match(html, new RegExp(`url\\('${prefix.replace('.', '\\.')}assets/gate-bg-desktop\\.webp'\\)`), `${page} should use gate-bg-desktop.webp`);
    assert.match(html, new RegExp(`@media\\(max-width:560px\\)\\{#syncGate\\{background-image:[^}]*url\\('${prefix.replace('.', '\\.')}assets/gate-bg-mobile\\.webp'\\) !important\\}\\}`), `${page} should swap to gate-bg-mobile.webp under 560px`);
    assert.doesNotMatch(html, /gate-bg\.jpg/, `${page} should have no leftover gate-bg.jpg reference`);
    assert.doesNotMatch(html, /gate-bg-(desktop|mobile)\.png/, `${page} should have no leftover gate-bg PNG reference`);
  }
});

test('every sync-gate page positions the background at center 20% (not plain center), so the top of the art -- where the rogue and warrior\'s heads sit -- is not cropped off by background-size:cover', () => {
  for (const page of PAGES) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.match(html, /background-size:cover;background-position:center 20%;/, `${page} should use the raised background-position`);
    assert.doesNotMatch(html, /background-position:center;/, `${page} should not have the old plain-center position left over`);
  }
});

test('service-worker.js precaches both new WebP gate-bg images, not the old PNG/JPG ones', () => {
  const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  assert.match(sw, /"\.\/assets\/gate-bg-desktop\.webp"/);
  assert.match(sw, /"\.\/assets\/gate-bg-mobile\.webp"/);
  assert.doesNotMatch(sw, /gate-bg\.jpg/);
  assert.doesNotMatch(sw, /gate-bg-(desktop|mobile)\.png/);
});
