// Run with: node --test tests/sanctum-desktop-pentacle.test.js
// The user supplied a wider (16:9) desktop-only version of the Sanctum's pentacle
// artwork ("Pntaculo-PC.png") so the hub "fills more" of a desktop screen instead of
// being letterboxed inside the old fixed-square .circle-wrap. Below 861px the page
// must keep using the original square jpg and its own tuned node coordinates
// untouched; at 861px+ a <picture> swaps in the new PNG, .circle-wrap widens to a
// 16:9 box, and all 6 nodes get their own coordinates -- located by sampling the new
// art's actual pixel brightness (a local-contrast peak search around the pentagram's
// glowing vertices/centre, done live in-browser against the real file), not guessed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('the Sanctum swaps to the new wide desktop pentacle art via <picture> at 861px+, keeping the original square jpg as the fallback/mobile source', () => {
  assert.match(html, /<picture>\s*<source media="\(min-width: 861px\)" srcset="assets\/sanctum\/pentacle-background-desktop\.png">\s*<img class="bg" src="assets\/sanctum\/pentacle-background\.jpg"/);
});

test('assets/sanctum/pentacle-background-desktop.png exists', () => {
  assert.ok(fs.existsSync(path.join(root, 'assets/sanctum/pentacle-background-desktop.png')));
});

test('.circle-wrap stays a bounded square box by default (mobile/tablet), but becomes a fixed full-viewport backdrop (object-fit:cover, no letterboxing) at min-width:861px, with .crest pulled out of flow to overlay its dark top band', () => {
  assert.match(html, /\.circle-wrap\{[^}]*width:min\(88vw,74vh,760px\);[^}]*aspect-ratio:1\/1;/);
  const block = html.slice(html.indexOf('@media (min-width: 861px)'), html.indexOf('.node{\n    position:absolute'));
  assert.match(block, /\.stage\{ padding-top:0; \}/);
  assert.match(block, /\.circle-wrap\{\s*position:fixed;\s*inset:0;\s*width:100vw;\s*height:100vh;\s*aspect-ratio:auto;\s*z-index:0;\s*\}/);
  assert.match(block, /\.circle-wrap img\.bg\{ object-fit:cover; \}/);
  assert.match(block, /\.crest\{\s*position:absolute;\s*top:clamp\(28px,6vh,56px\);\s*left:50%;\s*transform:translateX\(-50%\);\s*width:100%;\s*z-index:3;\s*\}/);
});

test('all 6 nodes get their own min-width:861px coordinates, distinct from the base square-art coordinates', () => {
  const block = html.slice(html.indexOf('@media (min-width:861px)'), html.indexOf('@media (max-width:560px)'));
  for (const rule of [
    /\.node\[data-pos="top"\]\{ left:50%; top:37%; \}/,
    /\.node\[data-pos="upper-left"\]\{ left:37\.7%; top:56%; \}/,
    /\.node\[data-pos="upper-right"\]\{ left:62\.5%; top:56%; \}/,
    /\.node\[data-pos="lower-left"\]\{ left:40\.2%; top:85\.5%; \}/,
    /\.node\[data-pos="lower-right"\]\{ left:59\.6%; top:85\.5%; \}/,
    /\.node\[data-pos="center"\]\{ left:50%; top:69%; \}/,
  ]) assert.match(block, rule);
});

test('the desktop breakpoint shrinks node width and label/rune font-size, since the new art\'s pentagram vertices sit closer together than the old square layout\'s and would otherwise collide, and pulls the label closer to its icon', () => {
  const block = html.slice(html.indexOf('@media (min-width:861px)'), html.indexOf('@media (max-width:560px)'));
  assert.match(block, /\.node\{ width:clamp\(72px,12cqw,128px\); \}/);
  assert.match(block, /\.node \.label\{ font-size:clamp\(\.56rem,\.95cqw,\.7rem\); margin-top:4px; \}/);
  assert.match(block, /\.node \.rune\{ font-size:clamp\(\.42rem,\.72cqw,\.56rem\); \}/);
  assert.match(block, /\.node\[data-pos="center"\] \.label\{ margin-top:4px; \}/);
});

test('the mobile (max-width:560px) square-art node overrides are untouched', () => {
  assert.match(html, /@media \(max-width:560px\)\{\s*\.circle-wrap\{ width:min\(94vw,70vh\); \}/);
});
