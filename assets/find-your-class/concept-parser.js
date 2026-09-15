// Find Your Class -- MVP deterministic concept-text parser.
// Implements Find_Your_Class_UI_and_Onboarding_Handoff_v1.md's "MVP concept
// interpretation" section. Not semantic AI: a reviewable word/phrase lexicon
// (assets/find-your-class/concept-lexicon.json) mapped to SUGGESTED
// preference mutations, always origin "inferred-unconfirmed" -- nothing here
// ever reaches the matcher's request contract until a player confirms it on
// Stage 2 (that confirmation step lives in app.js, not here).
// Same Node/browser dual-export pattern as loader.js/matcher.js.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PFFindYourClassConceptParser = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const IMPORTANCE_HINT_VALUES = { low: 3, medium: 5, high: 8 };
  const IMPORTANCE_HINT_RANK = { low: 0, medium: 1, high: 2 };

  function importanceFromHint(hint) {
    return IMPORTANCE_HINT_VALUES[hint] || IMPORTANCE_HINT_VALUES.medium;
  }

  // "lowercase and normalise punctuation" -- straight/curly quotes and dashes
  // folded, punctuation replaced with spaces (keeping internal hyphens, since
  // several lexicon phrases are hyphenated e.g. "weapon-user"), whitespace
  // collapsed.
  function normaliseConceptText(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[‘’′]/g, "'")
      .replace(/[“”″]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/[^a-z0-9'\-\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function wordCount(phrase) {
    return phrase.trim().split(/\s+/).length;
  }

  // "support multi-word phrases before single words": sort longest (by word
  // count, then character length) first, so e.g. "animal companion" is tried
  // -- and its matched span consumed -- before the bare "companion" entry
  // gets a chance to also fire redundantly on the same words.
  function sortedLexiconEntries(lexicon) {
    return (lexicon.entries || []).slice().sort((a, b) => {
      const wcDiff = wordCount(b.phrase) - wordCount(a.phrase);
      if (wcDiff !== 0) return wcDiff;
      const lenDiff = b.phrase.length - a.phrase.length;
      if (lenDiff !== 0) return lenDiff;
      return a.phrase < b.phrase ? -1 : a.phrase > b.phrase ? 1 : 0;
    });
  }

  // Single-word phrases tolerate a plain English suffix (plural/verb form:
  // "controls" matches "control", "buffed" matches "buff") so ordinary
  // sentence conjugation doesn't require every lexicon entry to be spelled
  // out in every inflected form. Multi-word phrases match exactly -- the
  // lexicon's own multi-word entries are already written the way a player
  // would naturally phrase them.
  function findPhraseSpans(normalisedText, phrase) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const suffix = wordCount(phrase) === 1 ? "(?:'?s|es|ed|ing)?" : '';
    const re = new RegExp(`\\b${escaped}${suffix}\\b`, 'g');
    const spans = [];
    let m;
    while ((m = re.exec(normalisedText))) {
      spans.push([m.index, m.index + m[0].length]);
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return spans;
  }

  function overlapsConsumed(span, consumed) {
    return consumed.some(([s, e]) => span[0] < e && span[1] > s);
  }

  // Returns raw (unmerged, possibly duplicate-per-criterion) suggestions, one
  // group per matched lexicon entry, each carrying the exact phrase that
  // triggered it (retain the source phrase, per the handoff).
  function findConceptSuggestions(normalisedText, lexicon) {
    const consumed = [];
    const results = [];
    for (const entry of sortedLexiconEntries(lexicon)) {
      const spans = findPhraseSpans(normalisedText, entry.phrase);
      const freeSpan = spans.find(span => !overlapsConsumed(span, consumed));
      if (!freeSpan) continue;
      consumed.push(freeSpan);
      for (const suggestion of entry.suggestions) {
        results.push(Object.assign({}, suggestion, {
          sourcePhrase: entry.phrase,
          origin: 'inferred-unconfirmed',
        }));
      }
    }
    return results;
  }

  function directionalAgree(a, b) {
    return a.desiredPosition === b.desiredPosition;
  }
  function categoricalAgree(a, b) {
    return a.mode === b.mode;
  }
  function strongerHint(a, b) {
    return (IMPORTANCE_HINT_RANK[b] || 0) > (IMPORTANCE_HINT_RANK[a] || 0) ? b : a;
  }

  // Groups raw suggestions by criterionId. Within a group, entries that AGREE
  // (same desiredPosition for directional; same mode for categorical, values
  // unioned; capability entries always agree, only importance varies) are
  // combined into one suggestion with every triggering phrase retained.
  // Entries that DISAGREE are left as separate, un-merged suggestions sharing
  // the same criterionId -- detectSuggestionConflicts below turns that
  // situation into an explicit conflict for the player to resolve, rather
  // than silently picking a winner.
  function mergeConceptSuggestions(rawSuggestions) {
    const byCriterion = new Map();
    for (const s of rawSuggestions) {
      if (!byCriterion.has(s.criterionId)) byCriterion.set(s.criterionId, []);
      byCriterion.get(s.criterionId).push(s);
    }

    const merged = [];
    for (const [criterionId, group] of byCriterion) {
      const buckets = [];
      for (const s of group) {
        let bucket = buckets.find(b => {
          if (s.kind !== b.kind) return false;
          if (s.kind === 'directional') return directionalAgree(s, b);
          if (s.kind === 'categorical') return categoricalAgree(s, b);
          return true; // capability: always compatible
        });
        if (!bucket) { bucket = Object.assign({}, s, { sourcePhrase: [s.sourcePhrase] }); buckets.push(bucket); continue; }
        bucket.sourcePhrase = bucket.sourcePhrase.concat(s.sourcePhrase);
        if (bucket.importanceHint) bucket.importanceHint = strongerHint(bucket.importanceHint, s.importanceHint);
        if (bucket.kind === 'categorical') {
          bucket.values = Array.from(new Set(bucket.values.concat(s.values)));
        }
      }
      for (const b of buckets) merged.push(b);
    }
    return merged;
  }

  // Splits a merged list into `clean` (one suggestion per criterionId -- safe
  // to surface directly) and `conflicts` (a criterionId with 2+ mutually
  // disagreeing options, surfaced for the player to choose rather than
  // resolved silently).
  function detectSuggestionConflicts(mergedSuggestions) {
    const byCriterion = new Map();
    for (const s of mergedSuggestions) {
      if (!byCriterion.has(s.criterionId)) byCriterion.set(s.criterionId, []);
      byCriterion.get(s.criterionId).push(s);
    }
    const clean = [];
    const conflicts = [];
    for (const [criterionId, group] of byCriterion) {
      if (group.length === 1) clean.push(group[0]);
      else conflicts.push({ criterionId, options: group });
    }
    return { clean, conflicts };
  }

  return {
    normaliseConceptText,
    findConceptSuggestions,
    mergeConceptSuggestions,
    detectSuggestionConflicts,
    importanceFromHint,
  };
}));
