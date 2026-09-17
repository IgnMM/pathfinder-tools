import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repo, 'assets', 'find-your-class', 'aon-catalog', 'class-details');
const classId = process.argv[2];
if (!classId || !/^[a-z0-9-]+$/.test(classId)) throw new Error('Usage: node scripts/scrape-aon-class-archetype-details.mjs <class-id>');

function decodeHtml(value = '') {
  const named = {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '};
  return value.replace(/<img\b[^>]*>/gi,'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,'')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(Number.parseInt(n,16)))
    .replace(/&([a-z]+);/gi,(match,name)=>named[name.toLowerCase()] ?? match).replace(/\u00a0/g,' ')
    .replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,'\n').trim();
}

async function fetchText(url, attempts = 5) {
  let lastError;
  for (let attempt=1; attempt<=attempts; attempt++) {
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),45_000);
    try {
      const response=await fetch(url,{signal:controller.signal,headers:{'user-agent':'PathfinderTools-AoN-class-detail-audit/1.0'}});
      if(!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const html=await response.text();
      if(html.length<1_000 || !html.includes('Archives of Nethys')) throw new Error('unexpected AoN response');
      return html;
    } catch(error) { lastError=error; await new Promise(resolve=>setTimeout(resolve,attempt*1000)); }
    finally { clearTimeout(timer); }
  }
  throw new Error(`Failed ${url}: ${lastError?.message}`);
}

async function mapLimit(items, limit, mapper) {
  const results=new Array(items.length); let cursor=0;
  async function worker(){while(cursor<items.length){const index=cursor++; results[index]=await mapper(items[index],index);}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker)); return results;
}

function parseDetail(html) {
  const sourceMatch=html.match(/<b>Source<\/b>\s*<a[^>]*><i>([\s\S]*?)<\/i><\/a>/i);
  const bodyMatch=html.match(/<span id="MainContent_DataListTypes_LabelName_0">([\s\S]*?)<\/span>/i);
  const sourceCitationText=decodeHtml(sourceMatch?.[1] || '');
  const parsed=sourceCitationText.match(/^(.*?)\s+pg\.\s+(\d+)$/i);
  return {sourceCitationText,sourceBook:parsed?.[1]||'',sourcePage:parsed?Number(parsed[2]):null,sourceText:decodeHtml(bodyMatch?.[1]||'')};
}

async function fetchDetail(item, attempts=5) {
  let detail;
  for(let attempt=1;attempt<=attempts;attempt++){
    detail=parseDetail(await fetchText(item.aonUrl));
    if(detail.sourceCitationText && detail.sourceText.length>100) return detail;
    await new Promise(resolve=>setTimeout(resolve,attempt*1000));
  }
  throw new Error(`Incomplete AoN detail for ${item.id}`);
}

const catalogue=JSON.parse(await fs.readFile(path.join(repo,'assets/find-your-class/aon-catalog/aon-player-archetype-catalog.json'),'utf8'));
const records=catalogue.archetypes.filter(item=>item.parentClassId===classId);
if(!records.length) throw new Error(`No catalogue archetypes for ${classId}`);
const profiles=await mapLimit(records,5,async(item,index)=>{
  const detail=await fetchDetail(item); process.stdout.write(`${index+1}/${records.length} ${item.name}\n`); return {...item,...detail};
});
if(new Set(profiles.map(item=>item.id)).size!==records.length) throw new Error('Duplicate detail IDs');
await fs.mkdir(outDir,{recursive:true});
await fs.writeFile(path.join(outDir,`${classId}.json`),`${JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),parentClassId:classId,count:profiles.length,profiles},null,2)}\n`);
console.log(JSON.stringify({parentClassId:classId,count:profiles.length},null,2));
