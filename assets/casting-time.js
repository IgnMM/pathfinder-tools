// Shared casting-time classification — used by every spell tool on this site to
// build a "casting time" filter (Free / Move / Standard / Swift / Immediate) next
// to the level filter. Only categories actually present in a given spell list get
// a button — a class with no free-action spells never shows a "Free" button.
(function (global) {
  const CT_ORDER = ['free', 'move', 'standard', 'swift', 'immediate'];
  const CT_LABELS = { free: 'Free', move: 'Move', standard: 'Standard', swift: 'Swift', immediate: 'Immediate' };

  function ctCategory(castingTime) {
    const s = (castingTime || '').toLowerCase();
    if (/free action/.test(s)) return 'free';
    if (/swift action/.test(s)) return 'swift';
    if (/immediate action/.test(s)) return 'immediate';
    if (/move action/.test(s)) return 'move';
    if (/standard action/.test(s)) return 'standard';
    return null;
  }

  // Which of the 5 categories actually occur in this spell list, in display order.
  function presentCategories(spells, getCastingTime) {
    getCastingTime = getCastingTime || (s => s.castingTime);
    return CT_ORDER.filter(c => spells.some(s => ctCategory(getCastingTime(s)) === c));
  }

  global.PFCastingTime = { CT_ORDER, CT_LABELS, ctCategory, presentCategories };
})(window);
