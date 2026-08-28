// Shared casting-time classification — used by every spell tool on this site to
// build a "casting time" filter (Free / Move / Standard / Swift / Immediate) next
// to the level filter. Only categories actually present in a given spell list get
// a button — a class with no free-action spells never shows a "Free" button.
(function (global) {
  const CT_ORDER = ['free', 'move', 'standard', 'swift', 'immediate', 'other'];
  const CT_LABELS = { free: 'Free', move: 'Move', standard: 'Standard', swift: 'Swift', immediate: 'Immediate', other: 'Other' };

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
    // "standard" alone (not requiring the word "action" right after it) so this still
    // matches known real source typos/truncations verbatim-copied from Nethys itself
    // (e.g. "1 standard actino", "1 standard" with no "action" at all) rather than
    // silently falling through to "other" for them.
    if (/standard/.test(s)) cats.push('standard');
    // Anything that isn't one of the 5 standard PF1e action types — "1 round", "10
    // minutes", "1 hour", "see text", "full-round action", etc. — goes in a catch-all
    // "Other" bucket instead of matching nothing, which previously made these spells
    // silently show up under EVERY filter (the bug: a "1 round" spell appearing under
    // the Swift filter, since an empty cats array was treated as "show everywhere").
    if (cats.length === 0) cats.push('other');
    return cats;
  }

  // Which of the 5 categories actually occur in this spell list, in display order.
  function presentCategories(spells, getCastingTime) {
    getCastingTime = getCastingTime || (s => s.castingTime);
    return CT_ORDER.filter(c => spells.some(s => ctCategory(getCastingTime(s)).includes(c)));
  }

  global.PFCastingTime = { CT_ORDER, CT_LABELS, ctCategory, presentCategories };
})(window);
