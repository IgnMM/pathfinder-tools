// Run with: node --test tests/hub-class-seal-size.test.js
// The Character Spellbook class picker (hub.html #subsection-character-sheets,
// .classGrid > .class-seal) rendered each class icon quite large (clamp(115px,16vw,190px)).
// Reported live as too big -- shrunk ~28% (clamp(82px,11.5vw,136px)) so more of the grid
// is visible without scrolling, while staying readable/clickable.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const hubHtml = fs.readFileSync(path.join(__dirname, '../hub.html'), 'utf8');

test('class-seal icons are sized ~28% smaller than the old clamp(115px,16vw,190px)', () => {
  assert.doesNotMatch(hubHtml, /\.class-seal img\{width:clamp\(115px,16vw,190px\)/);
  assert.match(hubHtml, /\.class-seal img\{width:clamp\(82px,11\.5vw,136px\);height:auto;/);
});
