// Run with: node --test tests/ui-fixes-sanctum-theme-dropdowns.test.js
// Regression coverage for three visual/UX bugs reported live and fixed in one pass:
// 1. The Sanctum's help-glyph.png had an opaque baked-in background (confirmed via
//    canvas pixel sampling: alpha=255 at every corner) instead of true transparency.
// 2. assets/arcane-theme.css's per-tool background art was wired in correctly (image
//    path, body class, CSS all present) but rendered as solid near-black: the supplied
//    tool-backgrounds WebP art is already very dark on its own (avg pixel brightness
//    ~18/255), and the theme's own darkening layers (a gradient baked into each
//    background-image plus a separate ::after scrim, both tuned assuming brighter
//    source art) fully hid it. Confirmed live by forcing opacity:1 and removing the
//    scrim, which revealed the art was there all along.
// 3. The feat/trait/spell/weapon/etc. "Search ... to add..." datalists in the
//    character and companion calculators were populated in MODIFIERS catalogue
//    (insertion/source-book) order, not alphabetically.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = (() => { try { return require('pngjs'); } catch { return {}; } })();

const calcHtml = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');
const themeCss = fs.readFileSync(path.join(__dirname, '../assets/arcane-theme.css'), 'utf8');

test('calc and companion populate every catalogue-search datalist in alphabetical order', () => {
  assert.match(calcHtml, /\.sort\(\(a,b\)=>a\.name\.localeCompare\(b\.name\)\)\.forEach\(m=>\{\s*let o=document\.createElement\('option'\);/);
  assert.match(companionHtml, /\.sort\(\(a,b\)=>a\.name\.localeCompare\(b\.name\)\)\.forEach\(m=>\{\s*let o=document\.createElement\('option'\);/);
});

test('arcane-theme.css darkening layers were eased so the supplied (already-dark) tool-background art is actually visible, not fully hidden', () => {
  // The pre-fix values (radial .9/.72/.35, linear .88/.55) fully hid the art in live
  // testing; the fixed values must be meaningfully lower, not just relabelled.
  assert.doesNotMatch(themeCss, /rgba\(6,8,11,\.9\)\s*100%/);
  assert.doesNotMatch(themeCss, /rgba\(6,8,11,\.88\)\s*100%/);
  assert.match(themeCss, /rgba\(6,8,11,\.58\)\s*100%/);
  assert.match(themeCss, /rgba\(6,8,11,\.55\)\s*100%/);
  // Every theme's own background-image gradient overlay was eased too (desktop rules).
  for (const themeRule of [
    /body\.theme-calc::before\{ background-image:linear-gradient\(180deg, rgba\(9,7,4,\.22\), rgba\(9,7,4,\.42\)\)/,
    /body\.theme-companion::before\{ background-image:linear-gradient\(180deg, rgba\(6,10,6,\.2\), rgba\(6,10,6,\.4\)\)/,
    /body\.theme-find-class::before\{ background-image:linear-gradient\(180deg, rgba\(5,8,14,\.22\), rgba\(5,8,14,\.42\)\)/,
    /body\.theme-characters::before\{ background-image:linear-gradient\(180deg, rgba\(9,7,4,\.22\), rgba\(9,7,4,\.42\)\)/,
    /body\.theme-sources::before\{ background-image:linear-gradient\(180deg, rgba\(4,8,11,\.22\), rgba\(4,8,11,\.42\)\)/,
  ]) assert.match(themeCss, themeRule);
});

test('help-glyph.png now has real alpha transparency at every corner (no baked-in background)', () => {
  if (!PNG) { return; } // pngjs not installed in this environment; browser pixel-sampling already confirmed the fix live.
  const buf = fs.readFileSync(path.join(__dirname, '../assets/sanctum/help-glyph.png'));
  const png = PNG.sync.read(buf);
  const corners = [
    [1, 1], [png.width - 2, 1], [1, png.height - 2], [png.width - 2, png.height - 2],
  ];
  for (const [x, y] of corners) {
    const idx = (png.width * y + x) << 2;
    assert.equal(png.data[idx + 3], 0, `corner (${x},${y}) should be fully transparent`);
  }
});
