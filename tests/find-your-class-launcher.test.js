// Run with: node --test tests/find-your-class-launcher.test.js
// Static HTML/CSS coverage for Find_Your_Class_UI_and_Onboarding_Handoff_v1.md
// parts that need no DOM/jsdom (this repo has no npm dependencies -- the Node
// test suite is Node built-ins only). Covers required tests 1-4, 18-21, 24-25.
// mount()'s actual DOM rendering is exercised manually in a real browser, not
// here -- see tests/find-your-class-app.test.js for the pure state-logic
// coverage (9-17, 22-23) that IS exercised in Node.
// NOTE: the launcher moved from a Library-scene widget in hub.html to the
// Sanctum home page's pentacle (index.html, 6th "center" node) after manual
// testing and a design discussion -- tests 1-3/24 target index.html now.
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

const homeHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const pageHtml = fs.readFileSync(path.join(root, 'find-your-class', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');

// ---------------------------------------------------------------------
// 1-2. The Arcane Compass launcher lives in the Sanctum home page's pentacle,
// as its 6th ("center") node, using the real supplied artwork, pointing at
// find-your-class/, and never sharing coordinates with one of the 5 existing
// vertex nodes (which would mean visual overlap).
// ---------------------------------------------------------------------
test('1. index.html has an Arcane Compass node in the pentacle, using the real artwork, pointing at find-your-class/', () => {
  assert.match(homeHtml, /<a class="node" data-pos="center" href="find-your-class\/" tabindex="0">/);
  assert.match(homeHtml, /data-pos="center"[\s\S]{0,40}[\s\S]*?src="assets\/find-your-class\/arcane-compass-table\.png"/);
  const imagePath = path.join(root, 'assets', 'find-your-class', 'arcane-compass-table.png');
  assert.ok(fs.existsSync(imagePath), 'the real Arcane Compass PNG must exist on disk, not just be referenced');
  assert.ok(fs.statSync(imagePath).size > 10000, 'the asset at that path must be a real image, not a stub/placeholder file');
});

test('2. the centre node does not share coordinates with any of the pentacle\'s 5 vertex nodes', () => {
  const positions = {};
  for (const m of homeHtml.matchAll(/\.node\[data-pos="([\w-]+)"\]\{\s*left:([\d.]+)%;\s*top:([\d.]+)%/g)) {
    if (!(m[1] in positions)) positions[m[1]] = { left: Number(m[2]), top: Number(m[3]) };
  }
  assert.ok(positions.center, 'expected a .node[data-pos="center"] CSS rule with left/top');
  for (const key of ['top', 'upper-left', 'upper-right', 'lower-left', 'lower-right']) {
    assert.ok(positions[key], `expected the pre-existing ${key} node to still be positioned`);
    const dx = Math.abs(positions.center.left - positions[key].left);
    const dy = Math.abs(positions.center.top - positions[key].top);
    assert.ok(dx > 5 || dy > 5, `centre node must not sit on top of the ${key} node`);
  }
});

// ---------------------------------------------------------------------
// 3. The old Library-scene launcher (desktop card + mobile card) is fully
// removed now that the Sanctum pentacle is the single entry point -- no
// leftover dead markup/CSS/ids for it should remain in hub.html.
// ---------------------------------------------------------------------
test('3. the old hub.html Library-scene launcher was removed, not left as dead code alongside the new one', () => {
  const hubHtml = fs.readFileSync(path.join(root, 'hub.html'), 'utf8');
  assert.ok(!/compassLauncher/.test(hubHtml), 'hub.html must not still reference the old compass-launcher ids/classes');
  assert.ok(!/compass-launcher/.test(hubHtml), 'hub.html must not still define compass-launcher CSS');
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
  const centerNodeMatch = homeHtml.match(/<a class="node" data-pos="center"[\s\S]*?<\/a>/);
  assert.ok(centerNodeMatch, 'expected to find the centre node markup');
  assert.ok(!suspiciousChars.test(centerNodeMatch[0]), 'the new pentacle centre node in index.html must contain no non-English UI characters');
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
test('24. the pentacle centre node has a stable accessible name (real alt text, not an empty/decorative image)', () => {
  const centerNodeMatch = homeHtml.match(/<a class="node" data-pos="center"[\s\S]*?<\/a>/);
  assert.ok(centerNodeMatch, 'expected to find the centre node markup');
  const altMatch = centerNodeMatch[0].match(/alt="([^"]+)"/);
  assert.ok(altMatch && altMatch[1].length > 5, 'the centre node\'s icon must carry meaningful alt text');
  assert.match(centerNodeMatch[0], /<span class="label">[^<]{4,}<\/span>/, 'the centre node must also carry a visible text label, same as the other 5 nodes');
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

test('the merged start screen (idea + priorities side by side) copy is present in app.js', () => {
  assert.match(appJs, /Tell me what you've got in mind/);
  assert.match(appJs, /Tell me your priorities/);
  assert.match(appJs, /Use my idea/);
});

test('the merged start screen renders both halves as one section, split by an "or" divider', () => {
  assert.match(appJs, /class="fycStartSplit"/);
  assert.match(appJs, /class="fycStartLeft"/);
  assert.match(appJs, /class="fycStartRight"/);
  assert.match(appJs, /class="fycStartDivider"[^>]*>[\s\S]{0,80}or/i);
});

test('every criterion in every preference group is rendered as a row on the right, not hidden behind a collapsed "add preference" picker', () => {
  // The old design hid every not-yet-touched criterion behind a collapsed
  // <details>"Add another preference" browser; the merged screen instead
  // shows all of them from the start. Confirm the old picker markup is
  // gone and the new one iterates every group's full assignment list
  // through criterionRow() with no filtering by "already set".
  assert.ok(!/fycBrowser/.test(appJs), 'the old collapsed preference-picker markup must be removed, not left alongside the new screen');
  assert.match(appJs, /PREFERENCE_GROUP_ASSIGNMENTS\[name\][\s\S]{0,200}\.map\(id => criterionRow\(id\)\)/);
});
