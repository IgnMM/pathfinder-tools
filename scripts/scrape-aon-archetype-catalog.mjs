import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repo, 'assets', 'find-your-class', 'aon-catalog');

const classes = [
  ['alchemist', 'Alchemist'], ['antipaladin', 'Antipaladin'], ['arcanist', 'Arcanist'],
  ['barbarian', 'Barbarian'], ['barbarian-unchained', 'Barbarian (Unchained)'], ['bard', 'Bard'],
  ['bloodrager', 'Bloodrager'], ['brawler', 'Brawler'], ['cavalier', 'Cavalier'], ['cleric', 'Cleric'],
  ['druid', 'Druid'], ['fighter', 'Fighter'], ['gunslinger', 'Gunslinger'], ['hunter', 'Hunter'],
  ['inquisitor', 'Inquisitor'], ['investigator', 'Investigator'], ['kineticist', 'Kineticist'],
  ['magus', 'Magus'], ['medium', 'Medium'], ['mesmerist', 'Mesmerist'], ['monk', 'Monk'],
  ['monk-unchained', 'Monk (Unchained)'], ['ninja', 'Ninja'], ['occultist', 'Occultist'],
  ['oracle', 'Oracle'], ['paladin', 'Paladin'], ['psychic', 'Psychic'], ['ranger', 'Ranger'],
  ['rogue', 'Rogue'], ['rogue-unchained', 'Rogue (Unchained)'], ['samurai', 'Samurai'],
  ['shaman', 'Shaman'], ['shifter', 'Shifter'], ['skald', 'Skald'], ['slayer', 'Slayer'],
  ['sorcerer', 'Sorcerer'], ['spiritualist', 'Spiritualist'], ['summoner', 'Summoner'],
  ['summoner-unchained', 'Summoner (Unchained)'], ['swashbuckler', 'Swashbuckler'],
  ['vigilante', 'Vigilante'], ['warpriest', 'Warpriest'], ['witch', 'Witch'], ['wizard', 'Wizard']
];

const newlyAddedClassIds = new Set(['barbarian-unchained', 'rogue-unchained', 'slayer', 'summoner-unchained']);
const legitimatelyEmptyClassIds = new Set(['barbarian-unchained', 'rogue-unchained']);

function decodeHtml(value = '') {
  const named = {amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' '};
  return value
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function fetchText(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(url, {signal: controller.signal, headers: {'user-agent': 'PathfinderTools-AoN-catalog-audit/1.0'}});
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, attempt * 750));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Failed ${url}: ${lastError?.message}`);
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker));
  return results;
}

function parseArchetypeRows(html, parentClassId, parentClassName) {
  const rows = [];
  const rowPattern = /<tr[^>]*>\s*<td[^>]*>\s*<a href="(ArchetypeDisplay\.aspx\?FixedName=[^"]+)"[^>]*>([\s\S]*?)<\/a><\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  for (const match of html.matchAll(rowPattern)) {
    const name = decodeHtml(match[2]);
    const relativeUrl = match[1].replace(/&amp;/g, '&');
    rows.push({
      id: `${parentClassId}:${slugify(name)}`,
      entityType: 'archetype',
      parentClassId,
      parentClassName,
      name,
      aonUrl: new URL(relativeUrl, 'https://aonprd.com/').href,
      replaces: decodeHtml(match[3]),
      aonSummary: decodeHtml(match[4])
    });
  }
  return rows;
}

async function fetchArchetypeIndex(id, name, attempts = 4) {
  const url = `https://aonprd.com/Archetypes.aspx?Class=${encodeURIComponent(name)}`;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const archetypes = parseArchetypeRows(await fetchText(url), id, name);
    if (archetypes.length || legitimatelyEmptyClassIds.has(id)) return {url, archetypes};
    await new Promise(resolve => setTimeout(resolve, attempt * 750));
  }
  throw new Error(`AoN returned an empty archetype index for ${name}`);
}

function parseDetail(html) {
  const sourceMatch = html.match(/<b>Source<\/b>\s*<a[^>]*><i>([\s\S]*?)<\/i><\/a>/i);
  const bodyMatch = html.match(/<span id="MainContent_DataListTypes_LabelName_0">([\s\S]*?)<\/span>/i);
  const sourceCitationText = decodeHtml(sourceMatch?.[1] || '');
  const parsed = sourceCitationText.match(/^(.*?)\s+pg\.\s+(\d+)$/i);
  return {
    sourceCitationText,
    sourceBook: parsed?.[1] || '',
    sourcePage: parsed ? Number(parsed[2]) : null,
    sourceText: decodeHtml(bodyMatch?.[1] || '')
  };
}

const classProfiles = (await Promise.all(['01', '02', '03', '04', '05', '06'].map(async batch =>
  JSON.parse(await fs.readFile(path.join(repo, 'assets/find-your-class/v2', `class-profiles-batch-${batch}.json`), 'utf8')).profiles
))).flat();
const valuedClassIds = new Set(classProfiles.map(item => item.id));
const completedArchetypeProfiles = (await Promise.all(['alchemist','antipaladin','arcanist','barbarian','bard','bloodrager','brawler','cavalier','cleric','druid','fighter','gunslinger','hunter','inquisitor','investigator','kineticist','magus','medium','mesmerist','monk','monk-unchained','ninja','occultist','oracle','paladin','psychic','ranger','rogue','samurai','shaman','shifter','skald','sorcerer','spiritualist'].map(async id =>
  JSON.parse(await fs.readFile(path.join(repo, `assets/find-your-class/v2/archetype-profiles-${id}.json`), 'utf8')).profiles
))).flat();
const valuedArchetypeIds = new Set((await Promise.all(Array.from({length: 10}, async (_, index) =>
  JSON.parse(await fs.readFile(path.join(repo, 'assets/find-your-class/v2', `archetype-profiles-pilot-${String(index + 1).padStart(2, '0')}.json`), 'utf8')).profiles
))).flat().concat(
  JSON.parse(await fs.readFile(path.join(repo, 'assets/find-your-class/v2/archetype-profiles-slayer.json'), 'utf8')).profiles,
  JSON.parse(await fs.readFile(path.join(repo, 'assets/find-your-class/v2/archetype-profiles-summoner-unchained.json'), 'utf8')).profiles,
  ...completedArchetypeProfiles
).map(item => item.id));

const classResults = await mapLimit(classes, 6, async ([id, name]) => {
  const {archetypes} = await fetchArchetypeIndex(id, name);
  process.stdout.write(`${name}: ${archetypes.length}\n`);
  return {id, name, entityType: 'class', aonUrl: `https://aonprd.com/ClassDisplay.aspx?ItemName=${encodeURIComponent(name)}`, archetypes};
});

const archetypes = classResults.flatMap(item => item.archetypes);
const duplicateIds = archetypes.map(item => item.id).filter((id, index, all) => all.indexOf(id) !== index);
const duplicateUrls = archetypes.map(item => item.aonUrl).filter((url, index, all) => all.indexOf(url) !== index);
if (duplicateIds.length || duplicateUrls.length) throw new Error(`Duplicate catalogue records: ${duplicateIds.length} ids / ${duplicateUrls.length} URLs`);

const missingScopeArchetypes = archetypes.filter(item => newlyAddedClassIds.has(item.parentClassId));
const detailedMissing = await mapLimit(missingScopeArchetypes, 5, async item => ({
  ...item,
  ...parseDetail(await fetchText(item.aonUrl)),
  valuationStatus: valuedArchetypeIds.has(item.id) ? 'valued' : 'pending'
}));

const classCatalogue = classResults.map(({archetypes: children, ...item}) => ({
  ...item,
  archetypeCount: children.length,
  valuationStatus: valuedClassIds.has(item.id) ? 'valued' : 'pending'
}));
const indexedArchetypes = archetypes.map(item => ({...item, valuationStatus: valuedArchetypeIds.has(item.id) ? 'valued' : 'pending'}));
const sourceBooks = [...new Set(detailedMissing.map(item => item.sourceBook).filter(Boolean))].sort();
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: 'Archives of Nethys Pathfinder 1e',
  scope: 'Official player-class archetype index exposed by AoN, including alternate, unchained and occult classes.',
  counts: {
    classes: classCatalogue.length,
    archetypes: indexedArchetypes.length,
    entities: classCatalogue.length + indexedArchetypes.length,
    valuedClasses: classCatalogue.filter(item => item.valuationStatus === 'valued').length,
    valuedArchetypes: indexedArchetypes.filter(item => item.valuationStatus === 'valued').length,
    pendingClasses: classCatalogue.filter(item => item.valuationStatus === 'pending').length,
    pendingArchetypes: indexedArchetypes.filter(item => item.valuationStatus === 'pending').length,
    newlyAddedDetailedArchetypes: detailedMissing.length,
    newlyAddedSourceBooks: sourceBooks.length
  },
  zeroArchetypeClasses: classCatalogue.filter(item => item.archetypeCount === 0).map(item => item.id),
  classes: classCatalogue,
  archetypes: indexedArchetypes
};

await fs.mkdir(outDir, {recursive: true});
await fs.writeFile(path.join(outDir, 'aon-player-archetype-catalog.json'), `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(path.join(outDir, 'new-scope-archetype-details.json'), `${JSON.stringify({schemaVersion: 1, generatedAt: report.generatedAt, profiles: detailedMissing}, null, 2)}\n`);
console.log(JSON.stringify(report.counts, null, 2));
