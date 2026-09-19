// Run with: node --test tests/hub-damage-picker-cards.test.js
// Regression coverage for hub.html's #section-damage picker: two plain .links text
// buttons were replaced with two illustrated tool-choice-card anchors (Character Hit
// &Damage Calculator / Companion & Mount Hit&Damage Calculator), per the supplied
// visual split brief. The existing href destinations, section id, and every other
// .links-based section (Spell Libraries, Character Spell Sheets, Sources) must be
// untouched.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const hubHtml = fs.readFileSync(path.join(root, 'hub.html'), 'utf8');

function section(id) {
  const start = hubHtml.indexOf(`id="${id}"`);
  assert.ok(start >= 0, `#${id} must exist`);
  const end = hubHtml.indexOf('</details>', start);
  return hubHtml.slice(start, end);
}

test('#section-damage exposes exactly two tool-choice-card links, to the original calc/ and companion/ destinations', () => {
  const block = section('section-damage');
  const hrefs = [...block.matchAll(/class="tool-choice-card" href="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(hrefs, ['calc/', 'companion/']);
  assert.match(block, /<strong>Character Hit&amp;Damage Calculator<\/strong>/);
  assert.match(block, /<strong>Companion &amp; Mount Hit&amp;Damage Calculator<\/strong>/);
});

test('each tool-choice-card supplies a responsive picture with the correct desktop/mobile WebP pair and decorative alt text', () => {
  const block = section('section-damage');
  for (const [desktop, mobile] of [
    ['character-combat-desktop.webp', 'character-combat-mobile.webp'],
    ['mounts-companions-desktop.webp', 'mounts-companions-mobile.webp'],
  ]) {
    assert.match(block, new RegExp(`source media="\\(max-width: 720px\\)" srcset="assets/tool-choice/${mobile}"`));
    assert.match(block, new RegExp(`img src="assets/tool-choice/${desktop}" alt="" width="1536" height="1024"`));
  }
});

test('the left (Character) card image is eager + high priority; the right (Companion) card is eager only, per the brief', () => {
  const block = section('section-damage');
  const charImg = block.match(/character-combat-desktop\.webp"[^>]*>/)[0];
  const compImg = block.match(/mounts-companions-desktop\.webp"[^>]*>/)[0];
  assert.match(charImg, /loading="eager"/);
  assert.match(charImg, /fetchpriority="high"/);
  assert.match(compImg, /loading="eager"/);
  assert.doesNotMatch(compImg, /fetchpriority/);
});

test('the four supplied WebP assets exist under assets/tool-choice/', () => {
  for (const f of [
    'character-combat-desktop.webp', 'character-combat-mobile.webp',
    'mounts-companions-desktop.webp', 'mounts-companions-mobile.webp',
  ]) {
    assert.ok(fs.existsSync(path.join(root, 'assets/tool-choice', f)), `assets/tool-choice/${f} should exist`);
  }
});

test('every other .links-based section (Spell Libraries, Character Spell Sheets, Sources) keeps its original plain-link markup untouched', () => {
  assert.match(hubHtml, /<div class="links">\s*<details class="subsection" id="subsection-spell-libraries">/);
  const sourcesLinksCount = (hubHtml.match(/<div class="links">/g) || []).length;
  assert.ok(sourcesLinksCount >= 1, 'other sections must still use the plain .links container');
});

test('the tool-choice CSS is scoped to its own classes, not a global override of .links or .card', () => {
  const cssStart = hubHtml.indexOf('.tool-choice-grid{');
  assert.ok(cssStart >= 0);
  const cssBlock = hubHtml.slice(cssStart, hubHtml.indexOf('</style>', cssStart));
  assert.doesNotMatch(cssBlock, /^\.links\b/m);
  assert.doesNotMatch(cssBlock, /^\.card\b/m);
});
