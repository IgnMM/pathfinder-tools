import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repo, 'assets', 'find-your-class', 'aon-catalog');
const indexUrl = 'https://aonprd.com/PrestigeClasses.aspx';

function decodeHtml(value = '') {
  const named = {amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' '};
  return value.replace(/<img\b[^>]*>/gi, '').replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match)
    .replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function encodeQueryValue(value) {
  return encodeURIComponent(value).replace(/'/g, '%27');
}

async function fetchText(url, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(url, {signal: controller.signal, headers: {'user-agent': 'PathfinderTools-AoN-prestige-audit/1.0'}});
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const html = await response.text();
      if (html.length < 1_000 || !html.includes('Archives of Nethys')) throw new Error('unexpected AoN response');
      return html;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
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

function parseIndex(html) {
  const records = [];
  const pattern = /<tr[^>]*>\s*<td[^>]*>\s*<a href="(PrestigeClassesDisplay\.aspx\?ItemName=[^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  for (const match of html.matchAll(pattern)) {
    const name = decodeHtml(match[2]);
    records.push({
      id: `prestige:${slugify(name)}`,
      entityType: 'prestige-class',
      name,
      aonUrl: `https://aonprd.com/PrestigeClassesDisplay.aspx?ItemName=${encodeQueryValue(name)}`,
      aonSummary: decodeHtml(match[3]),
      valuationStatus: 'pending'
    });
  }
  return records;
}

function parseDetail(html) {
  const bodyMatch = html.match(/<span id="MainContent_DataListTypes_LabelName_0">([\s\S]*?)<\/span>/i);
  const bodyHtml = bodyMatch?.[1] || '';
  const sourceMatch = bodyHtml.match(/<b>Source<\/b>\s*<a[^>]*><i>([\s\S]*?)<\/i><\/a>/i);
  const sourceCitationText = decodeHtml(sourceMatch?.[1] || '');
  const sourceParts = sourceCitationText.match(/^(.*?)\s+pg\.\s+(\d+)$/i);
  const requirementsMatch = bodyHtml.match(/<h2[^>]*>Requirements<\/h2>([\s\S]*?)(?=<h2[^>]*>Class Skills<\/h2>)/i);
  const hitDieMatch = bodyHtml.match(/<b>Hit Die<\/b>:\s*([^.<]+)/i);
  return {
    sourceCitationText,
    sourceBook: sourceParts?.[1] || '',
    sourcePage: sourceParts ? Number(sourceParts[2]) : null,
    requirementsText: decodeHtml(requirementsMatch?.[1] || ''),
    hitDie: decodeHtml(hitDieMatch?.[1] || ''),
    sourceText: decodeHtml(bodyHtml)
  };
}

async function fetchDetail(item, attempts = 5) {
  let detail;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    detail = parseDetail(await fetchText(item.aonUrl));
    if (detail.sourceCitationText && detail.requirementsText && detail.sourceText.length >= 300) return detail;
    await new Promise(resolve => setTimeout(resolve, attempt * 1000));
  }
  throw new Error(`Incomplete AoN detail for ${item.name}`);
}

const indexRecords = parseIndex(await fetchText(indexUrl));
if (indexRecords.length !== 119) throw new Error(`Expected 119 prestige classes, found ${indexRecords.length}`);
if (new Set(indexRecords.map(item => item.id)).size !== 119) throw new Error('Duplicate prestige-class IDs');
if (new Set(indexRecords.map(item => item.aonUrl)).size !== 119) throw new Error('Duplicate prestige-class URLs');

const detailed = await mapLimit(indexRecords, 5, async (item, index) => {
  const detail = await fetchDetail(item);
  process.stdout.write(`${index + 1}/${indexRecords.length} ${item.name}\n`);
  return {...item, ...detail};
});

const generatedAt = new Date().toISOString();
const catalogue = {
  schemaVersion: 1,
  generatedAt,
  source: 'Archives of Nethys Pathfinder 1e',
  sourceUrl: indexUrl,
  scope: 'Official Pathfinder 1e prestige classes exposed by the AoN Prestige Classes index.',
  recommendationPolicy: 'Optional future path only; show at most 1-3 when fit is exceptional and entry requirements are compatible.',
  counts: {prestigeClasses: detailed.length, valued: 0, pending: detailed.length},
  prestigeClasses: detailed.map(({sourceText, ...item}) => item)
};

await fs.mkdir(outDir, {recursive: true});
await fs.writeFile(path.join(outDir, 'aon-prestige-class-catalog.json'), `${JSON.stringify(catalogue, null, 2)}\n`);
await fs.writeFile(path.join(outDir, 'aon-prestige-class-details.json'), `${JSON.stringify({schemaVersion: 1, generatedAt, profiles: detailed}, null, 2)}\n`);
console.log(JSON.stringify(catalogue.counts, null, 2));
