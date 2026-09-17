// Run with: node --test tests/sanctum-home.test.js
// Regression coverage for index.html (The Sanctum home page). This page previously
// had its background and all 5 pentacle-vertex node icons embedded as inline
// data:image base64 URIs -- 1.08MB of text inside the HTML document itself, which
// meant every single page load had to transfer all six images again (no browser
// caching possible for inline data URIs) before ANYTHING could render. The user
// reported the icons intermittently "not appearing" -- almost certainly this
// document weight causing slow/failed rendering, not a broken image reference.
// Consolidated to separate cacheable files under assets/sanctum/, matching the
// pattern already used for the pentacle's centre (Find Your Class) icon.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const homeHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('index.html has no inline base64 data:image URIs -- every image is a separate, cacheable file', () => {
  const matches = homeHtml.match(/src="data:image\//g);
  assert.equal(matches, null, `found ${matches ? matches.length : 0} inline base64 image(s) -- these bloat the document and can never be browser-cached; extract each to assets/sanctum/ and reference it by path instead`);
});

test('index.html stays small (under 100KB) -- the whole point of moving images out of the document', () => {
  const sizeKB = Buffer.byteLength(homeHtml, 'utf8') / 1024;
  assert.ok(sizeKB < 100, `index.html is ${sizeKB.toFixed(0)}KB -- should be well under 100KB now that images live in separate files`);
});

test('the pentacle background and all 5 vertex node icons reference real files that exist on disk', () => {
  const files = [...homeHtml.matchAll(/src="(assets\/sanctum\/[^"]+)"/g)].map(m => m[1]);
  assert.equal(files.length, 6, 'expected exactly 6 assets/sanctum/ references: 1 background + 5 vertex node icons');
  for (const rel of files) {
    const full = path.join(root, rel);
    assert.ok(fs.existsSync(full), `${rel} must exist on disk`);
    assert.ok(fs.statSync(full).size > 5000, `${rel} must be a real image, not a stub/placeholder file`);
  }
});

test('all 5 vertex node icons have explicit width/height and a load-fade-in handler, same pattern as the centre node', () => {
  const iconTags = [...homeHtml.matchAll(/<img class="icon" src="assets\/sanctum\/[^>]+>/g)].map(m => m[0]);
  assert.equal(iconTags.length, 5);
  for (const tag of iconTags) {
    assert.match(tag, /width="300"/, tag);
    assert.match(tag, /height="300"/, tag);
    assert.match(tag, /onload="this\.classList\.add\('loaded'\)"/, tag);
  }
});

test('all 5 vertex node icons have non-empty, descriptive alt text (not decorative/empty)', () => {
  const iconTags = [...homeHtml.matchAll(/<img class="icon" src="assets\/sanctum\/[^>]+>/g)].map(m => m[0]);
  for (const tag of iconTags) {
    const altMatch = tag.match(/alt="([^"]*)"/);
    assert.ok(altMatch, `no alt attribute at all: ${tag}`);
    assert.ok(altMatch[1].length > 10, `alt text too short/empty for a real accessible name: ${JSON.stringify(altMatch[1])}`);
  }
});

test('the pentacle background image has explicit width/height (reserves layout space immediately)', () => {
  const bgMatch = homeHtml.match(/<img class="bg" src="assets\/sanctum\/[^>]+>/);
  assert.ok(bgMatch, 'the background <img> must exist');
  assert.match(bgMatch[0], /width="1400"/);
  assert.match(bgMatch[0], /height="1400"/);
});
