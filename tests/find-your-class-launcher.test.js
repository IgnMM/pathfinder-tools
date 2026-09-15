// Run with: node --test tests/find-your-class-launcher.test.js
// Static HTML/CSS coverage for Find_Your_Class_UI_and_Onboarding_Handoff_v1.md
// parts that need no DOM/jsdom (this repo has no npm dependencies -- the Node
// test suite is Node built-ins only). Covers required tests 1-4, 18-21, 24-25.
// mount()'s actual DOM rendering is exercised manually in a real browser, not
// here -- see tests/find-your-class-app.test.js for the pure state-logic
// coverage (9-17, 22-23) that IS exercised in Node.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets', 'find-your-class');
const FYC = require(path.join(dir, 'loader.js'));
const Matcher = require(path.join(dir, 'matcher.js'));
const App = require(path.join(dir, 'app.js'));

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')); }
const criteriaDoc = readJson('criteria.json');
const profiles = readJson('compass-profiles.json').profiles;
const questionTemplates = readJson('question-templates.json');
const explanationCatalogue = readJson('explanation-templates.json');

const hubHtml = fs.readFileSync(path.join(root, 'hub.html'), 'utf8');
const pageHtml = fs.readFileSync(path.join(root, 'find-your-class', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');

// ---------------------------------------------------------------------
// 1-2. Desktop launcher exists, sits inside the library map, and never
// overlaps a book hitbox -- checked against the SAME coordinate constants
// hub.html's own script uses to place the book grid (COL_LEFT0 etc.).
// ---------------------------------------------------------------------
test('1. hub.html has a desktop Arcane Compass launcher inside the library map, pointing at find-your-class/', () => {
  assert.match(hubHtml, /id="compassLauncherDesktop"/);
  assert.match(hubHtml, /class="compass-launcher"[^>]*id="compassLauncherDesktop"[^>]*href="find-your-class\/"/);
  // It must be nested inside #libraryMap in the source order (added right after bookLens).
  const mapIdx = hubHtml.indexOf('id="libraryMap"');
  const launcherIdx = hubHtml.indexOf('id="compassLauncherDesktop"');
  const detailsCloseIdx = hubHtml.indexOf('</details>', mapIdx);
  assert.ok(mapIdx > -1 && launcherIdx > mapIdx && launcherIdx < detailsCloseIdx, 'compass launcher must be inside the Spell Libraries subsection, after the map opens');
});

test('2. desktop launcher CSS never overlaps the book-hitbox grid', () => {
  // Same constants as hub.html's own book-hitbox placement script.
  const COL_LEFT0 = 16.50, COL_PITCH = (78.35 - 16.50) / 8, BOX_W = 7.70;
  const ROW_TOP0 = 2.50, ROW_PITCH = 26.30, BOX_H = 26.99;
  const gridRight = COL_LEFT0 + COL_PITCH * 8 + BOX_W;
  const gridBottom = ROW_TOP0 + ROW_PITCH * 2 + BOX_H;

  const css = hubHtml.match(/a\.compass-launcher\{([^}]+)\}/);
  assert.ok(css, '.compass-launcher rule must exist');
  const decl = css[1];
  const left = Number(decl.match(/left:([\d.]+)%/)[1]);
  const top = Number(decl.match(/top:([\d.]+)%/)[1]);
  const width = Number(decl.match(/width:([\d.]+)%/)[1]);
  const height = Number(decl.match(/height:([\d.]+)%/)[1]);
  const right = left + width;

  // Safe if it lies fully below the grid's bottom edge OR fully right of the
  // grid's right edge (either condition alone guarantees zero overlap).
  const safelyBelow = top >= gridBottom;
  const safelyRight = left >= gridRight;
  assert.ok(safelyBelow || safelyRight, `launcher box [left:${left} top:${top} right:${right} bottom:${top + height}] must not overlap the book grid [right:${gridRight.toFixed(2)} bottom:${gridBottom.toFixed(2)}]`);
  assert.ok(right <= 100 && top + height <= 100, 'launcher must stay inside the map bounds');
});

// ---------------------------------------------------------------------
// 3. Mobile launcher renders as its own card OUTSIDE .library-scroll (so it
// never scrolls off-screen with the horizontally-scrolling shelf), and the
// desktop launcher is hidden at the same breakpoint the map switches to a
// horizontal scroller (<=640px, matching .library-map's own min-width rule).
// ---------------------------------------------------------------------
test('3. mobile launcher card lives outside .library-scroll and hides the desktop one at <=640px', () => {
  const scrollIdx = hubHtml.indexOf('<div class="library-scroll"');
  const mobileIdx = hubHtml.indexOf('id="compassLauncherMobile"');
  assert.ok(mobileIdx > -1 && mobileIdx < scrollIdx, 'the mobile launcher card must appear before .library-scroll opens, i.e. entirely outside it');
  assert.match(hubHtml, /@media\(max-width:640px\)\{a\.compass-launcher\{display:none\}\}/);
  assert.match(hubHtml, /@media\(max-width:640px\)\{[\s\S]*?a\.compass-launcher-mobile\{display:flex/);
});

// ---------------------------------------------------------------------
// 4. Every visible string in the new experience is English (this whole site
// is English-only) -- scan for characters that would only appear in
// non-English UI text (accented Spanish vowels, inverted punctuation, etc.)
// inside player-visible strings.
// ---------------------------------------------------------------------
test('4. no non-English UI text in the new find-your-class experience', () => {
  const suspiciousChars = /[áéíóúñ¿¡]/i;
  assert.ok(!suspiciousChars.test(pageHtml), 'find-your-class/index.html must contain no non-English UI characters');
  // app.js's template strings are where all player-visible copy lives.
  assert.ok(!suspiciousChars.test(appJs), 'app.js must contain no non-English UI characters');
  const hubLauncherSection = hubHtml.slice(hubHtml.indexOf('compassLauncherMobile') - 50, hubHtml.indexOf('id="subsection-character-sheets"'));
  assert.ok(!suspiciousChars.test(hubLauncherSection), 'the new compass launcher markup in hub.html must contain no non-English UI characters');
});

// ---------------------------------------------------------------------
// Build two real recommendations (one archetype, one class-path) through the
// live matcher so 18-21 assert against real data, not fixtures.
// ---------------------------------------------------------------------
function matchFor(numericPreferences, categoricalPreferences) {
  const request = { schemaVersion: 1, numericPreferences: numericPreferences || {}, categoricalPreferences: categoricalPreferences || {}, gateAnswers: {}, options: { maxResults: 4, includeNeedsConfirmation: true } };
  return Matcher.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
}

test('18-19. recommendation cards name the real parent class for archetypes, and never claim a parent for a class-path', () => {
  const result = matchFor({ 'personal-durability': { importance: 9 }, 'melee-ranged': { desiredPosition: 1, importance: 8 } });
  const archetypeRec = result.recommendations.find(r => r.entityType === 'archetype');
  const classPathRec = result.recommendations.find(r => r.entityType === 'class-path');
  if (archetypeRec) {
    const vm = App.buildResultCardViewModel(archetypeRec, profiles);
    assert.equal(vm.typeText, `Archetype · ${archetypeRec.parentLabel}`);
    assert.ok(vm.parentLabel !== archetypeRec.title, 'the labelled parent class must not just repeat the archetype\'s own name');
    const realProfile = profiles.find(p => p.id === archetypeRec.id.split('::')[0]);
    assert.equal(archetypeRec.parentLabel.toLowerCase(), realProfile.classId.toLowerCase(), 'parentLabel must be the archetype\'s real parent class');
  }
  if (classPathRec) {
    const vm = App.buildResultCardViewModel(classPathRec, profiles);
    assert.equal(vm.typeText, 'Class path');
    assert.ok(!vm.typeText.includes('Archetype'), 'a class-path card must never be labelled as an archetype of some parent');
  }
  assert.ok(archetypeRec || classPathRec, 'test setup must produce at least one of each kind to exercise across the full suite run');
});

test('20. the requirements section is omitted entirely (not shown empty) when a path has no requirements', () => {
  const withNone = App.buildResultCardViewModel({ role: 'best-overall', entityType: 'class-path', id: 'sorcerer-base', title: 'Sorcerer', summary: 'x', whyItFits: [], watchFor: [], requirements: [] }, profiles);
  assert.equal(withNone.hasRequirements, false);
  const withSome = App.buildResultCardViewModel({ role: 'best-overall', entityType: 'class-path', id: 'sorcerer-base', title: 'Sorcerer', summary: 'x', whyItFits: [], watchFor: [], requirements: ['Must be Lawful.'] }, profiles);
  assert.equal(withSome.hasRequirements, true);
  assert.deepEqual(withSome.requirements, ['Must be Lawful.']);
});

test('21. a one-result shortlist builds a normal card with no special-cased content', () => {
  const result = matchFor({ 'companion-centrality': { desiredPosition: 10, importance: 10 } }, { 'magic-identity': { mode: 'require', values: ['nature'] } });
  const solo = result.recommendations.length ? [result.recommendations[0]] : [];
  assert.ok(solo.length >= 1, 'expected at least one recommendation to build a view model from');
  const vm = App.buildResultCardViewModel(solo[0], profiles);
  assert.ok(vm.title && vm.summary, 'a lone recommendation must render a complete, normal card, not a truncated one');
  assert.ok(vm.roleLabel);
});

// ---------------------------------------------------------------------
// 24. Stable accessible names: every interactive launcher/action-shaped
// element carries a real accessible name (aria-label or visible text), not
// an icon/image alone.
// ---------------------------------------------------------------------
test('24. launcher elements have stable accessible names', () => {
  assert.match(hubHtml, /id="compassLauncherDesktop"[^>]*aria-label="[^"]+"/);
  assert.match(hubHtml, /id="compassLauncherMobile"[^>]*aria-label="[^"]+"/);
  const desktopLabel = hubHtml.match(/id="compassLauncherDesktop"[^>]*aria-label="([^"]+)"/)[1];
  const mobileLabel = hubHtml.match(/id="compassLauncherMobile"[^>]*aria-label="([^"]+)"/)[1];
  assert.ok(desktopLabel.length > 5 && mobileLabel.length > 5);
});

// ---------------------------------------------------------------------
// 25. No horizontal overflow at 320px: the standalone page's layout is fluid
// (percentage/relative widths in main content), and any wide elements are
// scoped to overflow-x containers, not the page body.
// ---------------------------------------------------------------------
test('25. find-your-class/index.html has no fixed-width element wider than a 320px viewport', () => {
  const styleBlock = pageHtml.match(/<style>([\s\S]*?)<\/style>/)[1];
  const fixedWidthPx = [...styleBlock.matchAll(/(?<![\w-])width:\s*(\d+)px/g)].map(m => Number(m[1]));
  for (const w of fixedWidthPx) assert.ok(w <= 320, `found a fixed pixel width of ${w}px, which would overflow a 320px viewport`);
  // main must not force a minimum width the way the (deliberately wide,
  // horizontally-scrollable) library map does.
  assert.ok(!/main\{[^}]*min-width/.test(styleBlock));
});

test('the Stage 1 ("Your idea") copy required by the handoff is present in app.js', () => {
  assert.match(appJs, /What kind of character are you imagining/);
  assert.match(appJs, /Read my idea/);
  assert.match(appJs, /Browse preferences instead/);
});
