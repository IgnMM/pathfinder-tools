// Run with: node --test tests/find-your-class-v2-launcher.test.js
// Static HTML coverage for find-your-class-v2/index.html, mirroring the
// static-check style already used for the v1 page (no DOM/jsdom available).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pageHtml = fs.readFileSync(path.join(root, 'find-your-class-v2', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'assets', 'find-your-class', 'v2', 'app.js'), 'utf8');

test('find-your-class-v2/index.html loads the v2 scripts, not the v1 ones', () => {
  assert.match(pageHtml, /src="\.\.\/assets\/find-your-class\/v2\/loader\.js"/);
  assert.match(pageHtml, /src="\.\.\/assets\/find-your-class\/v2\/matcher\.js"/);
  assert.match(pageHtml, /src="\.\.\/assets\/find-your-class\/v2\/app\.js"/);
  assert.ok(!/src="\.\.\/assets\/find-your-class\/(loader|matcher|concept-parser)\.js"/.test(pageHtml), 'must not accidentally load a v1 script');
});

test('find-your-class-v2/index.html resolves all class profiles and archetype batches into one profile set at bootstrap', () => {
  for (let i = 1; i <= 6; i++) assert.match(pageHtml, new RegExp(`class-profiles-batch-0${i}\\.json`));
  for (let i = 1; i <= 10; i++) assert.match(pageHtml, new RegExp(`archetype-profiles-pilot-${String(i).padStart(2, '0')}\\.json`));
  assert.match(pageHtml, /archetype-profiles-slayer\.json/);
  assert.match(pageHtml, /archetype-profiles-summoner-unchained\.json/);
  assert.match(pageHtml, /archetype-profiles-alchemist\.json/);
  for (const id of ['antipaladin','arcanist','barbarian','bard','bloodrager','brawler','cavalier','cleric','druid','fighter','gunslinger','hunter','inquisitor','investigator','kineticist','magus','medium','mesmerist','monk','monk-unchained','ninja','occultist','oracle','paladin','psychic','ranger','rogue','samurai','shaman','shifter','skald','sorcerer','spiritualist','summoner','swashbuckler','vigilante','warpriest']) assert.match(pageHtml, new RegExp(`archetype-profiles-${id}\\.json`));
  assert.match(pageHtml, /resolveAllProfiles\(classProfiles, archetypeOverrides\)/);
});

test('find-your-class-v2/index.html has no fixed-width element wider than a 320px viewport', () => {
  const styleBlock = pageHtml.match(/<style>([\s\S]*?)<\/style>/)[1];
  const fixedWidthPx = [...styleBlock.matchAll(/(?<![\w-])width:\s*(\d+)px/g)].map(m => Number(m[1]));
  for (const w of fixedWidthPx) assert.ok(w <= 320, `found a fixed pixel width of ${w}px, which would overflow a 320px viewport`);
});

test('no non-English UI text in the v2 experience', () => {
  const suspiciousChars = /[áéíóúñ¿¡]/i;
  assert.ok(!suspiciousChars.test(pageHtml));
  assert.ok(!suspiciousChars.test(appJs));
});

test('the v2 app.js is honest in its own comments about the missing concept-lexicon parser', () => {
  assert.match(appJs, /concept-lexicon.*parser/i);
});

// Regression: wireEvents() originally fell through to the 'click' listener
// for any element that wasn't a TEXTAREA or INPUT -- silently including
// <select> (the search-bar dropdown). A <select>'s value change never fires
// 'click' in a way that reads the new value, so switching searches via the
// dropdown did nothing until this was fixed to also treat SELECT as a
// 'change'-listening element, same as INPUT.
test('wireEvents attaches a "change" listener to SELECT elements, not "click" (the search-bar dropdown regression)', () => {
  const wireEventsSrc = appJs.slice(appJs.indexOf('function wireEvents('), appJs.indexOf('function reRunLastSearchIfShowingResults('));
  assert.match(wireEventsSrc, /SELECT/, 'wireEvents must special-case SELECT elements');
  assert.match(wireEventsSrc, /'SELECT'[^;]*\?\s*'change'/, 'a SELECT element must be wired to the "change" event, not "click"');
});
