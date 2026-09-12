// Shared pure-calculation engine for calc/index.html (Character Calculator) and
// companion/index.html (Companion & Mount Calculator).
//
// STAGE 1 of a deliberately staged extraction (see project memory / session notes for
// the full comparison): only functions verified BYTE-IDENTICAL between the two files,
// with no dependency on currentProfile(), the DOM, or either file's own data model, are
// here. Each one is a pure function of its arguments.
//
// Deliberately NOT here (and not planned for a later stage without a concrete third
// use case): collectContributions(), compute(), abilityBuffBonus()/
// resolveAbilityComposites()/finalAbilityMods(), entryAppliesToLine(). Both files'
// versions of those encode genuinely different rules (Mythic feats/Smite/Flurry/TWF
// slots in Character; Eidolon evolutions/Phantom focus scoping/Rend/per-line lineId
// targeting in Companion) -- forcing them into one shared shape would either build an
// abstraction neither file needs in full, or leak one calculator's rules into the
// other's UI. See the extraction-plan discussion for the reasoning.
//
// Plain global functions/consts (no IIFE, no namespace) -- both pages' own inline
// <script> blocks call these by bare name (stackTotal(...), mod(...), etc.) exactly as
// they did when each had its own local copy; this file is a drop-in replacement for
// those local definitions, loaded via <script src="../assets/calc-engine.js"></script>
// before each page's own <script> block.

function mod(score){return Math.floor((Number(score)-10)/2)}
function signed(n){return (n>=0?'+':'')+n}

function diceMultiply(dice,mult){
  const m=String(dice).match(/^(\d+)d(\d+)$/i);
  if(!m) return dice+' ×'+mult;
  return (Number(m[1])*mult)+'d'+m[2];
}

// Official Core Rulebook "Weapon Damage Size Conversion" table (one size category
// larger). A single per-die-value chain (each die value belongs to exactly one row of
// the table), so this same table is correct however many times it's applied in a row --
// '3d6'/'3d8'/'4d8' are here so a second application (e.g. two stacked size-up effects)
// correctly reaches Huge-tier dice instead of silently no-op'ing on the second step.
const SIZE_UP_MEDIUM_TO_LARGE={'1':'1d2','1d2':'1d3','1d3':'1d4','1d4':'1d6','1d6':'1d8','1d8':'2d6','1d10':'2d8','1d12':'3d6','2d4':'2d6','2d6':'3d6','2d8':'3d8','2d10':'4d8','3d6':'4d6','3d8':'4d8','4d8':'6d8'};
function diceSizeUp(dice){
  return SIZE_UP_MEDIUM_TO_LARGE[String(dice).trim()] || dice;
}
function applySizeSteps(dice, steps){
  let d=dice;
  for(let i=0;i<steps;i++) d=diceSizeUp(d);
  return d;
}

// Same-type-never-stacks bonus resolution (PF1e core stacking rule): untyped/dodge/
// circumstance/special always sum; a negative value (a penalty) always applies in full;
// every other type keeps only its own highest value, and different types sum together.
function stackTotal(entries){
  let dodgeAndUntyped=0, penalties=0;
  let byType={};
  entries.forEach(e=>{
    if(e.value<0){ penalties+=e.value; return; }
    if(e.type==='untyped'||e.type==='dodge'||e.type==='circumstance'||e.type==='special'){ dodgeAndUntyped+=e.value; return; }
    byType[e.type]=Math.max(byType[e.type]||0, e.value);
  });
  let typedSum=Object.values(byType).reduce((a,b)=>a+b,0);
  return dodgeAndUntyped+typedSum+penalties;
}

// Marks, per type group, which named-type entries in a breakdown list don't actually
// count toward stackTotal()'s result -- including ties: only the FIRST entry that
// reaches the group's max is "active", every other one (lower or tied) is redundant per
// the same-type stacking rule above.
function markSuppressed(entries,breakdown){
  let byType={};
  entries.forEach(e=>{ if(e.value>0 && e.type!=='untyped'&&e.type!=='dodge'&&e.type!=='circumstance'&&e.type!=='special'){ (byType[e.type]=byType[e.type]||[]).push(e); } });
  let suppressedSources=new Set();
  Object.values(byType).forEach(list=>{
    if(list.length<2) return;
    let max=Math.max(...list.map(x=>x.value));
    let keptOne=false;
    list.forEach(x=>{
      if(x.value===max && !keptOne){ keptOne=true; return; }
      suppressedSources.add(x.source);
    });
  });
  breakdown.forEach(b=>{ if(suppressedSources.has(b.name)||suppressedSources.has(b.name.replace(' (custom)',''))) b.suppressed=true; });
}
