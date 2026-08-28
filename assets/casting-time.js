// Shared casting-time classification — used by every spell tool on this site to
// build a "casting time" filter (Free / Move / Standard / Swift / Immediate) next
// to the level filter. Only categories actually present in a given spell list get
// a button — a class with no free-action spells never shows a "Free" button.
(function (global) {
  const CT_ORDER = ['free', 'move', 'standard', 'swift', 'immediate'];
  const CT_LABELS = { free: 'Free', move: 'Move', standard: 'Standard', swift: 'Swift', immediate: 'Immediate' };

  // Returns an array of every category the castingTime text matches (usually one,
  // but some spells have a genuinely compound casting time, e.g. "1 swift action or
  // 1 immediate action" — such a spell must show under BOTH filter buttons, not just
  // whichever category happened to match first).
  function ctCategory(castingTime) {
    const s = (castingTime || '').toLowerCase();
    const cats = [];
    if (/free action/.test(s)) cats.push('free');
    if (/swift action/.test(s)) cats.push('swift');
    if (/immediate action/.test(s)) cats.push('immediate');
    if (/move action/.test(s)) cats.push('move');
    if (/standard action/.test(s)) cats.push('standard');
    return cats;
  }

  // Which of the 5 categories actually occur in this spell list, in display order.
  function presentCategories(spells, getCastingTime) {
    getCastingTime = getCastingTime || (s => s.castingTime);
    return CT_ORDER.filter(c => spells.some(s => ctCategory(getCastingTime(s)).includes(c)));
  }

  global.PFCastingTime = { CT_ORDER, CT_LABELS, ctCategory, presentCategories };
})(window);
