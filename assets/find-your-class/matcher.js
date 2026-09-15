// Find Your Class -- deterministic matching engine (MVP).
// Implements FIND_YOUR_CLASS_MATCHING_ENGINE_HANDOFF.md. Reuses loader.js's
// validation/scoring primitives; adds no framework dependency; same Node/browser
// dual-export pattern as loader.js and matcher.js's own sibling.
//
// A number of product decisions in the handoff are under-specified for a purely
// mechanical implementation. Every one of them is called out at the point it is
// resolved with an "INTERPRETATION:" comment, and summarized again at the bottom
// of this file in AMBIGUITY_NOTES. Nothing below was decided silently.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./loader.js'));
  else root.PFFindYourClassMatcher = factory(root.PFFindYourClass);
}(typeof self !== 'undefined' ? self : this, function (FYC) {
  'use strict';

  function ValidationError(message, path) {
    this.name = 'ValidationError';
    this.message = path ? `${path}: ${message}` : message;
    this.path = path;
  }
  ValidationError.prototype = Object.create(Error.prototype);
  function assert(cond, message, path) { if (!cond) throw new ValidationError(message, path); }

  const MATCHED_THRESHOLD = 0.72;
  const TENSION_THRESHOLD = 0.45;
  // INTERPRETATION: "high-importance" is used by the different-approach role and
  // by selectNextQuestion's gate-priority rule but is never given a number in the
  // handoff. 8 is chosen to match this project's own prior convention (the pilot
  // question bank's own importanceHint:"high" mutations were calibrated to
  // roughly 8-9 in this repo's earlier work) -- see AMBIGUITY_NOTES #1.
  const HIGH_IMPORTANCE_THRESHOLD = 8;
  // INTERPRETATION: "numeric range at least 3" is given explicitly for
  // selectNextQuestion's own criterion-separation check; reused here as the
  // definition of "meaningfully different" for different-approach's numeric
  // comparison, for the same reason -- see AMBIGUITY_NOTES #2.
  const MEANINGFUL_NUMERIC_SEPARATION = 3;
  const UNEXPECTED_FIT_MAX_GAP = 0.12;
  const RESULT_ROLES = ['best-overall', 'different-approach', 'more-approachable', 'unexpected-fit'];

  // ---------------------------------------------------------------------
  // validatePreferenceRequest
  // ---------------------------------------------------------------------
  function validatePreferenceRequest(request, criteriaDoc) {
    assert(request && typeof request === 'object', 'request must be an object', 'request');
    assert(request.schemaVersion === 1, 'request.schemaVersion must be 1', 'request');
    const criteriaIndex = FYC.indexCriteria(criteriaDoc);

    const numericPreferences = request.numericPreferences || {};
    for (const [criterionId, pref] of Object.entries(numericPreferences)) {
      const path = `numericPreferences["${criterionId}"]`;
      const crit = criteriaIndex.get(criterionId);
      assert(crit, `unknown criterion id`, path);
      assert(crit.kind === 'capability' || crit.kind === 'directional', 'numericPreferences criteria must be capability or directional', path);

      if (pref.notRelevant === true) {
        assert(pref.importance === undefined && pref.desiredPosition === undefined, 'notRelevant:true cannot coexist with importance or desiredPosition', path);
        continue;
      }
      assert(Number.isInteger(pref.importance) && pref.importance >= 1 && pref.importance <= 10, 'active numeric preference requires integer importance 1-10', path);
      if (crit.kind === 'capability') {
        assert(pref.desiredPosition === undefined, 'desiredPosition is not valid on a capability criterion', path);
      } else {
        assert(pref.desiredPosition !== undefined, 'an active directional criterion requires desiredPosition', path);
        assert(typeof pref.desiredPosition === 'number' && pref.desiredPosition >= 1 && pref.desiredPosition <= 10, 'desiredPosition must be a number 1-10', path);
      }
    }

    const categoricalPreferences = request.categoricalPreferences || {};
    const catValuesById = new Map(criteriaDoc.criteria.filter(c => c.kind === 'categorical').map(c => [c.id, new Set(c.values)]));
    for (const [criterionId, pref] of Object.entries(categoricalPreferences)) {
      const path = `categoricalPreferences["${criterionId}"]`;
      assert(catValuesById.has(criterionId), 'unknown categorical criterion id', path);
      assert(['prefer', 'require', 'exclude'].includes(pref.mode), 'mode must be prefer, require or exclude', path);
      assert(Array.isArray(pref.values), 'values must be an array', path);
      if (pref.mode === 'require' || pref.mode === 'exclude') {
        assert(pref.values.length >= 1, `${pref.mode} needs at least one value`, path);
      }
      for (const v of pref.values) {
        assert(catValuesById.get(criterionId).has(v), `unknown categorical value "${v}"`, path);
      }
      if (pref.mode === 'prefer') {
        assert(Number.isInteger(pref.importance) && pref.importance >= 1 && pref.importance <= 10, 'a "prefer" categorical preference requires integer importance 1-10', path);
      }
      // INTERPRETATION: "a category cannot require and exclude the same value
      // after preferences are merged" cannot be violated by this request shape
      // (categoricalPreferences has at most one mode per criterionId, so a
      // single criterion can never simultaneously carry both a require and an
      // exclude entry). Implemented as a no-op-safe check for forward
      // compatibility with a future shape that allows multiple entries per
      // criterion -- see AMBIGUITY_NOTES #3.
    }

    if (request.gateAnswers) {
      for (const [gateId, answer] of Object.entries(request.gateAnswers)) {
        assert(answer && (answer.status === 'satisfied' || answer.status === 'conflict'), 'gateAnswers status must be "satisfied" or "conflict"', `gateAnswers["${gateId}"]`);
      }
    }

    if (request.conductPreferences) {
      const cp = request.conductPreferences;
      const path = 'conductPreferences';
      assert(['avoid', 'accept', 'welcome'].includes(cp.stance), 'stance must be avoid, accept or welcome', path);
      if (cp.importance !== undefined) assert(Number.isInteger(cp.importance) && cp.importance >= 1 && cp.importance <= 10, 'importance must be integer 1-10', path);
      assert(Array.isArray(cp.acceptedCodePresence), 'acceptedCodePresence must be an array', path);
      assert(Array.isArray(cp.acceptedMechanicalLossRisk), 'acceptedMechanicalLossRisk must be an array', path);
    }

    return true;
  }

  // ---------------------------------------------------------------------
  // expandCandidateBranches
  // ---------------------------------------------------------------------
  function cloneJson(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }

  function expandCandidateBranches(profiles) {
    const candidates = [];
    for (const profile of profiles) {
      candidates.push({
        internalId: profile.id,
        profile,
        isBranch: false,
        baseProfileId: profile.id,
        branchId: profile.branchId || null,
      });
      if (profile.materialAlternative) {
        const alt = profile.materialAlternative;
        const branched = cloneJson(profile);
        delete branched.materialAlternative;
        branched.branchId = alt.branchId;
        Object.assign(branched.scores, alt.scoreOverrides || {});
        Object.assign(branched.categories, alt.categoryOverrides || {});
        candidates.push({
          internalId: `${profile.id}::${alt.branchId}`,
          profile: branched,
          isBranch: true,
          baseProfileId: profile.id,
          branchId: alt.branchId,
        });
      }
    }
    return candidates;
  }

  // ---------------------------------------------------------------------
  // evaluateEligibility
  // ---------------------------------------------------------------------
  // Gate model (2026-09-15 matcher-contract correction, replacing the earlier
  // hard:boolean + type-keyed sentinel): every compatibilityGate carries a
  // stable, candidate-specific `id` (several candidates can share a gate
  // `type`, so `type` alone is never a safe answer key) and a `kind`:
  //   - "compatibility": an external player/campaign choice can make the
  //     profile unavailable. Unresolved until request.gateAnswers[gate.id]
  //     exists; a resolved answer's `status` is "satisfied" or "conflict".
  //   - "commitment": a restriction automatically accepted by choosing the
  //     archetype. Always eligible; surfaced as a disclosure, never awaits
  //     confirmation and never demotes a candidate.
  //   - "soft": the pre-existing warn-only gates (unchanged behaviour).
  function resolveCompatibilityGate(gate, gateAnswers) {
    const answer = gateAnswers && gateAnswers[gate.id];
    if (!answer) return 'needs-confirmation';
    assert(answer.status === 'satisfied' || answer.status === 'conflict', `gateAnswers["${gate.id}"].status must be "satisfied" or "conflict"`, 'gateAnswers');
    return answer.status;
  }

  function evaluateEligibility(candidate, request) {
    const profile = candidate.profile;
    const reasons = [];
    const warnings = [];
    const disclosures = [];
    let status = 'eligible';
    let unresolvedGate = null;

    for (const gate of profile.compatibilityGates || []) {
      if (gate.kind === 'soft') {
        warnings.push({ id: gate.id, type: gate.type, rule: gate.rule });
        continue;
      }
      if (gate.kind === 'commitment') {
        // Always eligible; visibly disclosed, never awaits confirmation and
        // never demotes the candidate (rule 6 of the correction).
        disclosures.push({ id: gate.id, type: gate.type, rule: gate.rule });
        continue;
      }
      // kind === 'compatibility'
      const resolution = resolveCompatibilityGate(gate, request.gateAnswers);
      if (resolution === 'conflict') {
        status = 'ineligible';
        reasons.push({ id: gate.id, type: gate.type, rule: gate.rule, cause: 'hard-gate-conflict' });
      } else if (resolution === 'needs-confirmation') {
        if (status !== 'ineligible') status = 'needs-confirmation';
        if (!unresolvedGate) unresolvedGate = gate;
        reasons.push({ id: gate.id, type: gate.type, rule: gate.rule, cause: 'unresolved-hard-gate' });
      }
    }

    const categoricalPreferences = request.categoricalPreferences || {};
    for (const [criterionId, pref] of Object.entries(categoricalPreferences)) {
      const candidateValues = (profile.categories && profile.categories[criterionId]) || [];
      if (pref.mode === 'require') {
        const overlap = pref.values.some(v => candidateValues.includes(v));
        if (!overlap) { status = 'ineligible'; reasons.push({ type: criterionId, cause: 'categorical-require-mismatch' }); }
      } else if (pref.mode === 'exclude') {
        const overlap = pref.values.some(v => candidateValues.includes(v));
        if (overlap) { status = 'ineligible'; reasons.push({ type: criterionId, cause: 'categorical-exclude-overlap' }); }
      }
    }

    if (request.conductPreferences && profile.conduct) {
      const cp = request.conductPreferences;
      const conduct = profile.conduct;
      const codeUnacceptable = !cp.acceptedCodePresence.includes(conduct.codePresence);
      const lossUnacceptable = !cp.acceptedMechanicalLossRisk.includes(conduct.mechanicalLossRisk);
      if (codeUnacceptable || lossUnacceptable) {
        if (cp.stance === 'avoid') {
          status = status === 'ineligible' ? status : 'ineligible';
          reasons.push({ type: 'conduct', cause: codeUnacceptable ? 'conduct-code-unacceptable' : 'conduct-loss-risk-unacceptable' });
        } else {
          warnings.push({ type: 'conduct', rule: `codePresence:${conduct.codePresence}, mechanicalLossRisk:${conduct.mechanicalLossRisk}` });
        }
      }
    }

    return { status, reasons, warnings, disclosures, unresolvedGate };
  }

  // ---------------------------------------------------------------------
  // scoreCandidate
  // ---------------------------------------------------------------------
  function scoreCandidate(candidate, request, criteriaDoc) {
    const criteriaIndex = FYC.indexCriteria(criteriaDoc);
    const profile = candidate.profile;

    let numericWeightedFitSum = 0, numericWeightSum = 0;
    let categoricalWeightedFitSum = 0, categoricalWeightSum = 0;
    let usedWeight = 0, totalActiveWeight = 0;
    let usableCount = 0;
    const matchedCriteria = [], tensionCriteria = [], neutralCriteria = [];
    const contributions = {};

    for (const [criterionId, pref] of Object.entries(request.numericPreferences || {})) {
      if (pref.notRelevant) continue;
      const crit = criteriaIndex.get(criterionId);
      const weight = FYC.importanceWeight(pref.importance);
      totalActiveWeight += weight;
      const candidateValue = profile.scores[criterionId];
      const result = crit.kind === 'directional'
        ? FYC.scoreDirectionalFit(candidateValue, pref.desiredPosition, pref.importance)
        : FYC.scoreCapabilityFit(candidateValue, pref.importance);
      if (result.unknown) { contributions[criterionId] = { unknown: true }; continue; }
      numericWeightedFitSum += result.weightedFit;
      numericWeightSum += weight;
      usedWeight += weight;
      usableCount++;
      contributions[criterionId] = { fit: result.fit, weightedFit: result.weightedFit, weight };
      if (result.fit >= MATCHED_THRESHOLD) matchedCriteria.push(criterionId);
      else if (result.fit < TENSION_THRESHOLD) tensionCriteria.push(criterionId);
      else neutralCriteria.push(criterionId);
    }

    for (const [criterionId, pref] of Object.entries(request.categoricalPreferences || {})) {
      if (pref.mode !== 'prefer') continue; // require/exclude are gates, not fit contributors
      const weight = FYC.importanceWeight(pref.importance);
      totalActiveWeight += weight;
      const candidateValues = profile.categories[criterionId];
      if (!candidateValues) { contributions[criterionId] = { unknown: true }; continue; }
      const fit = pref.values.some(v => candidateValues.includes(v)) ? 1 : 0;
      const weightedFit = fit * weight;
      categoricalWeightedFitSum += weightedFit;
      categoricalWeightSum += weight;
      usedWeight += weight;
      usableCount++;
      contributions[criterionId] = { fit, weightedFit, weight };
      if (fit >= MATCHED_THRESHOLD) matchedCriteria.push(criterionId);
      else if (fit < TENSION_THRESHOLD) tensionCriteria.push(criterionId);
      else neutralCriteria.push(criterionId);
    }

    const denominator = numericWeightSum + categoricalWeightSum;
    const overallFit = denominator > 0 ? (numericWeightedFitSum + categoricalWeightedFitSum) / denominator : null;
    const coverage = totalActiveWeight > 0 ? usedWeight / totalActiveWeight : null;

    let confidence;
    if (overallFit === null) confidence = 'low';
    else if (usableCount < 3 || coverage < 0.45) confidence = 'low';
    else if (usableCount < 6 || coverage < 0.75) confidence = 'medium';
    else confidence = 'high';

    return {
      candidate, overallFit, coverage, confidence,
      matchedCriteria, tensionCriteria, neutralCriteria, contributions,
      usableCount, totalActiveWeight,
    };
  }

  // ---------------------------------------------------------------------
  // rankCandidates
  // ---------------------------------------------------------------------
  function compareScored(a, b) {
    const fitA = a.overallFit === null ? -Infinity : a.overallFit;
    const fitB = b.overallFit === null ? -Infinity : b.overallFit;
    if (fitA !== fitB) return fitB - fitA;
    const covA = a.coverage === null ? -Infinity : a.coverage;
    const covB = b.coverage === null ? -Infinity : b.coverage;
    if (covA !== covB) return covB - covA;
    const tensionA = a.tensionCriteria.length, tensionB = b.tensionCriteria.length;
    if (tensionA !== tensionB) return tensionA - tensionB;
    const eligA = a.eligibility.status === 'eligible' ? 0 : 1;
    const eligB = b.eligibility.status === 'eligible' ? 0 : 1;
    if (eligA !== eligB) return eligA - eligB;
    return a.candidate.internalId < b.candidate.internalId ? -1 : a.candidate.internalId > b.candidate.internalId ? 1 : 0;
  }

  function rankCandidates(scoredCandidates) {
    return scoredCandidates.slice().sort(compareScored);
  }

  // ---------------------------------------------------------------------
  // assignResultRoles
  // ---------------------------------------------------------------------
  function highIndicesDiffer(candidateA, candidateB, request, criteriaDoc) {
    const a = candidateA.profile, b = candidateB.profile;
    let differences = 0;
    for (const [criterionId, pref] of Object.entries(request.numericPreferences || {})) {
      if (pref.notRelevant || pref.importance < HIGH_IMPORTANCE_THRESHOLD) continue;
      const va = a.scores[criterionId], vb = b.scores[criterionId];
      if (va === undefined || vb === undefined) continue;
      if (Math.abs(va - vb) >= MEANINGFUL_NUMERIC_SEPARATION) differences++;
    }
    for (const [criterionId, pref] of Object.entries(request.categoricalPreferences || {})) {
      if (pref.importance === undefined || pref.importance < HIGH_IMPORTANCE_THRESHOLD) continue;
      const va = a.categories[criterionId] || [], vb = b.categories[criterionId] || [];
      const overlap = va.some(v => vb.includes(v));
      if (!overlap) differences++;
    }
    return differences;
  }

  function isDuplicateOfSelected(scored, selected) {
    return selected.some(s => s.candidate.baseProfileId === scored.candidate.baseProfileId);
  }

  // Scans eligible, then (if allowed) needs-confirmation candidates, in ranked
  // order, for the first one satisfying `predicate` and not a duplicate/already
  // selected -- this is the literal implementation of "fill unoccupied slots with
  // the next strongest non-duplicate eligible candidate ... only then consider
  // needs-confirmation candidates" applied per-role. See AMBIGUITY_NOTES #5.
  function findForRole(rankedEligible, rankedNeedsConfirmation, selected, includeNeedsConfirmation, predicate) {
    for (const s of rankedEligible) {
      if (isDuplicateOfSelected(s, selected)) continue;
      if (selected.includes(s)) continue;
      if (predicate(s)) return s;
    }
    if (includeNeedsConfirmation) {
      for (const s of rankedNeedsConfirmation) {
        if (isDuplicateOfSelected(s, selected)) continue;
        if (selected.includes(s)) continue;
        if (predicate(s)) return s;
      }
    }
    return null;
  }

  function assignResultRoles(rankedCandidates, request, criteriaDoc) {
    const maxResults = (request.options && request.options.maxResults) || 4;
    const includeNeedsConfirmation = !!(request.options && request.options.includeNeedsConfirmation);

    const eligible = rankedCandidates.filter(s => s.eligibility.status === 'eligible');
    const needsConfirmation = rankedCandidates.filter(s => s.eligibility.status === 'needs-confirmation');

    const results = [];

    const best = findForRole(eligible, needsConfirmation, results, includeNeedsConfirmation, () => true);
    if (best) results.push(Object.assign({ role: 'best-overall' }, {}, { scored: best }));

    if (results.length < maxResults) {
      const bestScored = results[0] && results[0].scored;
      const different = bestScored ? findForRole(eligible, needsConfirmation, results.map(r => r.scored), includeNeedsConfirmation, s => {
        if (s === bestScored) return false;
        const differentClass = s.candidate.profile.classId !== bestScored.candidate.profile.classId;
        const differentCriteria = highIndicesDiffer(s.candidate, bestScored.candidate, request, criteriaDoc);
        return differentClass || differentCriteria >= 2;
      }) : null;
      if (different) results.push({ role: 'different-approach', scored: different });
    }

    if (results.length < maxResults) {
      const bestScored = results[0] && results[0].scored;
      const approachable = findForRole(eligible, needsConfirmation, results.map(r => r.scored), includeNeedsConfirmation, s => {
        const p = s.candidate.profile;
        const ok = p.scores['build-complexity'] <= 5 && p.scores['rules-mastery'] <= 5;
        if (!ok) return false;
        // "omit ... if it would duplicate the first without adding useful
        // information": skip if it's the same profile family as best-overall.
        if (bestScored && s.candidate.baseProfileId === bestScored.candidate.baseProfileId) return false;
        return true;
      });
      if (approachable) results.push({ role: 'more-approachable', scored: approachable });
    }

    if (results.length < maxResults) {
      const bestScored = results[0] && results[0].scored;
      if (bestScored) {
        const unexpected = findForRole(eligible, needsConfirmation, results.map(r => r.scored), includeNeedsConfirmation, s => {
          if (s.candidate.profile.classId === bestScored.candidate.profile.classId) return false;
          if (s.overallFit === null || bestScored.overallFit === null) return false;
          if (bestScored.overallFit - s.overallFit > UNEXPECTED_FIT_MAX_GAP) return false;
          const topMatch = s.matchedCriteria[0];
          if (!topMatch) return false;
          const explicitlyRequested = (request.numericPreferences && request.numericPreferences[topMatch]) ||
            (request.categoricalPreferences && request.categoricalPreferences[topMatch]);
          return !!explicitlyRequested;
        });
        if (unexpected) results.push({ role: 'unexpected-fit', scored: unexpected });
      }
    }

    return results.slice(0, maxResults);
  }

  // ---------------------------------------------------------------------
  // selectNextQuestion
  // ---------------------------------------------------------------------
  // INTERPRETATION: question-templates.json has no representation for an
  // unresolved compatibility gate -- only criterion questions exist. Rule 6
  // ("an unresolved hard gate ... outranks an ordinary preference question")
  // is implemented by synthesizing a gate-confirmation question object (same
  // {id, prompt, answers} shape as a real template) keyed by the gate's own
  // stable `id` (never its `type`, which several candidates can share) with a
  // natural-English yes/no prompt -- gate.confirmationPrompt when the data
  // supplies one (every current compatibility gate does), else a generic
  // fallback template. See AMBIGUITY_NOTES #6.
  function selectNextQuestion(request, currentRanking, questionTemplates, criteriaDoc, opts) {
    opts = opts || {};
    const criteriaIndex = FYC.indexCriteria(criteriaDoc);
    const top5 = currentRanking
      .filter(s => s.eligibility.status === 'eligible' || s.eligibility.status === 'needs-confirmation')
      .slice(0, 5);

    // Rule 6: an unresolved hard gate on a likely top result outranks a
    // preference question.
    for (const s of top5) {
      if (s.eligibility.unresolvedGate) {
        const gate = s.eligibility.unresolvedGate;
        const prompt = gate.confirmationPrompt || `Does your build comply with this requirement: ${gate.rule}`;
        return {
          id: `gate:${gate.id}`,
          synthetic: true,
          prompt,
          criteriaClarified: [],
          gateId: gate.id,
          answers: [
            { label: 'Yes', gateAnswer: { id: gate.id, status: 'satisfied' } },
            { label: 'No', gateAnswer: { id: gate.id, status: 'conflict' } },
          ],
        };
      }
    }

    function isAnswered(criterionId) {
      const num = request.numericPreferences && request.numericPreferences[criterionId];
      if (num) return true; // present at all (active or notRelevant) counts as answered
      const cat = request.categoricalPreferences && request.categoricalPreferences[criterionId];
      if (cat) return true;
      return false;
    }

    function criteriaSeparation(criterionId) {
      const crit = criteriaIndex.get(criterionId);
      if (!crit) return 0;
      if (crit.kind === 'categorical') {
        const valueSets = top5.map(s => new Set(s.candidate.profile.categories[criterionId] || []));
        for (let i = 0; i < valueSets.length; i++) {
          for (let j = i + 1; j < valueSets.length; j++) {
            const overlap = [...valueSets[i]].some(v => valueSets[j].has(v));
            if (!overlap && (valueSets[i].size || valueSets[j].size)) return 1;
          }
        }
        return 0;
      }
      const values = top5.map(s => s.candidate.profile.scores[criterionId]).filter(v => v !== undefined);
      if (values.length < 2) return 0;
      return Math.max(...values) - Math.min(...values);
    }

    let best = null, bestValue = -Infinity;
    for (const q of questionTemplates.questions) {
      const clarified = q.criteriaClarified || [];
      if (clarified.length === 0) continue; // non-scoring / navigation-only questions carry no decision value
      if (clarified.every(isAnswered)) continue;

      let separationScore = 0;
      for (const cid of clarified) {
        if (isAnswered(cid)) continue;
        const sep = criteriaSeparation(cid);
        if (crit_kind_is_numeric(criteriaIndex, cid)) {
          if (sep >= MEANINGFUL_NUMERIC_SEPARATION) separationScore += sep;
        } else if (sep > 0) {
          separationScore += MEANINGFUL_NUMERIC_SEPARATION; // categorical divergence counted as one "unit" of separation
        }
      }
      if (separationScore === 0) continue;

      const value = (separationScore * (q.priority || 1)) / (q.estimatedCognitiveCost || 1);
      if (value > bestValue) { bestValue = value; best = q; }
    }

    if (!best) return null;
    // Never manufacture a question once the result is already high-confidence
    // -- unless the caller knows the current best-overall is "provisional"
    // (fit < 0.58 despite that confidence reading): matcher-contract
    // correction rule 8 requires a follow-up question be offered in that case.
    if (!opts.forceQuestion && top5.length && top5.every(s => s.confidence === 'high')) return null;
    return best;
  }

  function crit_kind_is_numeric(criteriaIndex, id) {
    const c = criteriaIndex.get(id);
    return c && (c.kind === 'capability' || c.kind === 'directional');
  }

  // ---------------------------------------------------------------------
  // buildPresentationResult
  // ---------------------------------------------------------------------
  // INTERPRETATION: whyItFits/watchFor must read like one player advising
  // another (handoff tone examples), which is an authored-prose task in the
  // general case. Without an explanation-fragment library (explanation-
  // templates.json is intentionally empty -- see the criteria-audit pass),
  // deterministic generation here uses each criterion's own playerLabel in a
  // small fixed sentence template. This reliably avoids statistics/percentages
  // (the hard requirement) but will read more mechanically than the example
  // prose; a later fragment-authoring pass can replace this generator without
  // changing its call signature. See AMBIGUITY_NOTES #7.
  function describeCriterion(criteriaIndex, criterionId) {
    const c = criteriaIndex.get(criterionId);
    return (c && (c.playerLabel || c.shortLabel)) || criterionId;
  }

  // 2026-09-15 editorial-catalogue integration. The catalogue's own
  // instructions block governs selection ("Lead with at most two
  // highest-weight matches. Add at most one criterion tension after the
  // profile-specific tradeoff. Never expose criterion IDs, scores, weights or
  // percentages." / "Do not repeat the same criterion sentence twice in one
  // shortlist."). candidateBandFor implements "Choose the candidateBand from
  // catalogue score: low 1-4, middle 5-6, high 7-10" -- banded on the
  // CANDIDATE's own catalogue score, not the player's desired position.
  function candidateBandFor(value) {
    if (value <= 4) return 'low';
    if (value <= 6) return 'middle';
    return 'high';
  }

  function numericFragment(explanationCatalogue, criterionId, mode) {
    const entry = explanationCatalogue.numericNarratives[criterionId];
    if (!entry) return null;
    if (entry.kind === 'capability') return entry[mode] || null;
    return null; // directional entries are banded by the caller
  }

  function directionalFragment(explanationCatalogue, criterionId, candidateValue, mode) {
    const entry = explanationCatalogue.numericNarratives[criterionId];
    if (!entry || entry.kind !== 'directional' || candidateValue === undefined) return null;
    const band = entry.bands[candidateBandFor(candidateValue)];
    return (band && band[mode]) || null;
  }

  function categoricalFragment(explanationCatalogue, criterionId, value) {
    const entry = explanationCatalogue.categoricalNarratives[criterionId];
    return (entry && entry[value]) || null;
  }

  // Picks up to `limit` match sentences for the criteria this candidate scored
  // best on (by preference weight, per "highest-weight matches"), skipping any
  // sentence already used elsewhere in this shortlist (`usedSentences`, shared
  // across every buildPresentationResult call in one matchProfiles run).
  function pickMatchSentences(scored, request, criteriaIndex, explanationCatalogue, usedSentences, limit) {
    const profile = scored.candidate.profile;
    const ranked = Object.entries(scored.contributions)
      .filter(([, c]) => !c.unknown && c.fit >= MATCHED_THRESHOLD)
      .sort((a, b) => b[1].weight - a[1].weight);
    const picked = [];
    for (const [criterionId] of ranked) {
      if (picked.length >= limit) break;
      const crit = criteriaIndex.get(criterionId);
      let text = null;
      if (crit.kind === 'categorical') {
        const pref = request.categoricalPreferences[criterionId];
        const candidateValues = profile.categories[criterionId] || [];
        const overlap = pref.values.find(v => candidateValues.includes(v));
        if (overlap) text = categoricalFragment(explanationCatalogue, criterionId, overlap);
      } else if (crit.kind === 'capability') {
        text = numericFragment(explanationCatalogue, criterionId, 'match');
      } else {
        text = directionalFragment(explanationCatalogue, criterionId, profile.scores[criterionId], 'match');
      }
      if (text && !usedSentences.has(text)) { usedSentences.add(text); picked.push(text); }
    }
    return picked;
  }

  // Picks at most one tension sentence, by the same weight ordering, for
  // watchFor (placed after the profile's own tradeoff/editorialNote).
  function pickTensionSentence(scored, request, criteriaIndex, explanationCatalogue, usedSentences) {
    const profile = scored.candidate.profile;
    const ranked = Object.entries(scored.contributions)
      .filter(([, c]) => !c.unknown && c.fit < TENSION_THRESHOLD)
      .sort((a, b) => b[1].weight - a[1].weight);
    for (const [criterionId] of ranked) {
      const crit = criteriaIndex.get(criterionId);
      let text = null;
      if (crit.kind === 'categorical') {
        // "tension only when the preference is active but no selected value
        // overlaps" -- show the sentence for the player's own preferred value,
        // since the catalogue has no separate "tension" string per value.
        const pref = request.categoricalPreferences[criterionId];
        text = categoricalFragment(explanationCatalogue, criterionId, pref.values[0]);
      } else if (crit.kind === 'capability') {
        text = numericFragment(explanationCatalogue, criterionId, 'tension');
      } else {
        text = directionalFragment(explanationCatalogue, criterionId, profile.scores[criterionId], 'tension');
      }
      if (text && !usedSentences.has(text)) { usedSentences.add(text); return text; }
    }
    return null;
  }

  // specialCaseRules.appliesTo is "<field>:<value>"; field is one of the
  // fixed names below or a dotted path into the profile (e.g.
  // "conduct.deityChoiceProvenance").
  function resolveSpecialCaseField(candidate, field) {
    const profile = candidate.profile;
    if (field === 'classId') return profile.classId;
    if (field === 'profileId') return candidate.baseProfileId;
    if (field === 'branchId') return candidate.branchId;
    if (field === 'entityType') return profile.entityType === 'class-path' ? 'class-path' : 'archetype';
    return field.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), profile);
  }

  function matchingSpecialCaseRules(explanationCatalogue, candidate) {
    return explanationCatalogue.specialCaseRules.filter(rule => {
      const sep = rule.appliesTo.indexOf(':');
      const field = rule.appliesTo.slice(0, sep), value = rule.appliesTo.slice(sep + 1);
      return String(resolveSpecialCaseField(candidate, field)) === value;
    });
  }

  function pickRoleOpener(explanationCatalogue, role, internalId) {
    const openers = explanationCatalogue.roleOpeners && explanationCatalogue.roleOpeners[role];
    if (!openers || !openers.length) return null;
    let hash = 0;
    for (let i = 0; i < internalId.length; i++) hash = (hash * 31 + internalId.charCodeAt(i)) >>> 0;
    return openers[hash % openers.length];
  }

  function buildPresentationResult(roleEntry, request, criteriaDoc, explanationCatalogue, usedSentences) {
    const criteriaIndex = FYC.indexCriteria(criteriaDoc);
    const scored = roleEntry.scored;
    const candidate = scored.candidate;
    const profile = candidate.profile;
    const isClassPath = profile.entityType === 'class-path';
    usedSentences = usedSentences || new Set();

    // INTERPRETATION: title must be the short name ("Hexcrafter"), not the
    // compound "X — Y archetype" label. Batches 02-06 give profile.name
    // directly; the original 7 compass profiles only got displayLabel (e.g.
    // "Archer — Fighter archetype") from the Batch 01 overlay, so title falls
    // back to the text before " — " in that case.
    const title = profile.name || (profile.displayLabel ? profile.displayLabel.split(' — ')[0] : profile.id);
    const typeLabel = isClassPath ? 'Class' : 'Archetype';
    const parentLabel = isClassPath ? null : capitalize(profile.classId);

    // whyItFits/watchFor: authored editorial fragments when a catalogue is
    // supplied (the normal case); the old generic mechanical sentence is kept
    // ONLY as a last-resort fallback for a criterion the catalogue somehow
    // doesn't cover (never true for the current catalogue -- see the exact-
    // coverage test -- but the fallback stays as a safety net rather than a
    // silent gap).
    let whyItFits, watchFor;
    if (explanationCatalogue) {
      whyItFits = pickMatchSentences(scored, request, criteriaIndex, explanationCatalogue, usedSentences, 2);
      watchFor = [];
      if (profile.tradeoff) watchFor.push(profile.tradeoff);
      else if (profile.editorialNote) watchFor.push(profile.editorialNote);
      const tension = pickTensionSentence(scored, request, criteriaIndex, explanationCatalogue, usedSentences);
      if (tension && watchFor.length < 2) watchFor.push(tension);
    } else {
      whyItFits = scored.matchedCriteria.slice(0, 2).map(cid => {
        const label = describeCriterion(criteriaIndex, cid);
        return `This matters to you: ${lowerFirst(label)} -- and ${title} delivers on it.`;
      });
      watchFor = [];
      if (profile.tradeoff) watchFor.push(profile.tradeoff);
      else if (profile.editorialNote) watchFor.push(profile.editorialNote);
      for (const cid of scored.tensionCriteria) {
        if (watchFor.length >= 2) break;
        watchFor.push(`It falls short on ${lowerFirst(describeCriterion(criteriaIndex, cid))}, if that matters to you.`);
      }
    }

    const matchingRules = explanationCatalogue ? matchingSpecialCaseRules(explanationCatalogue, candidate).filter(r => r.id !== 'archetype-parent') : [];
    const ruleIds = new Set(matchingRules.map(r => r.id));

    const requirements = [];
    const conduct = profile.conduct;
    if (conduct) {
      // An authored special-case rule takes priority over the generic
      // mechanical sentence for the same fact, per "Remove the current
      // generic fallback whenever an authored fragment is available."
      if ((conduct.codePresence === 'mandatory' || conduct.codePresence === 'expected') && !ruleIds.has('druid-conduct')) {
        requirements.push(`This path ${conduct.codePresence === 'mandatory' ? 'requires' : 'expects'} living by a code${conduct.mechanicalLossRisk !== 'none' ? ', with real mechanical consequences for breaking it' : ''}.`);
      }
      if (conduct.alignmentRule && conduct.alignmentRule.kind !== 'none') {
        requirements.push(`Alignment is restricted: ${conduct.alignmentRule.values.join(', ')}.`);
      }
      if (conduct.deityRequired) {
        requirements.push('A deity is required.');
      } else if (conduct.deityChoiceProvenance === 'free-choice-with-consequences' && !ruleIds.has('free-choice-deity')) {
        requirements.push('You choose a deity or patron; once chosen, its expectations shape the character.');
      } else if (conduct.deityChoiceProvenance === 'fixed-source' && !ruleIds.has('razmiran-narrative')) {
        requirements.push("A specific patron or source defines this path narratively, not as a mechanical prerequisite.");
      }
    }
    for (const r of scored.eligibility.reasons) if (r.rule) requirements.push(r.rule);
    for (const w of scored.eligibility.warnings) if (w.rule) requirements.push(w.rule);
    for (const d of scored.eligibility.disclosures || []) if (d.rule) requirements.push(d.rule);
    for (const rule of matchingRules) requirements.push(rule.text);

    let summary = profile.playerSummary || profile.editorialNote || `${title} is a ${isClassPath ? 'Pathfinder class' : `${parentLabel} archetype`}.`;
    if (!isClassPath) summary = `${title} is a ${parentLabel} archetype. ${summary}`;

    if (explanationCatalogue) {
      const opener = pickRoleOpener(explanationCatalogue, roleEntry.role, candidate.internalId);
      if (opener) summary = `${opener} ${summary}`;
    }

    if (scored.confidence === 'low') {
      summary += ' This shortlist is still provisional -- a couple more answers would sharpen it.';
    }

    return {
      id: candidate.internalId,
      entityType: isClassPath ? 'class-path' : 'archetype',
      classId: profile.classId,
      archetypeId: isClassPath ? undefined : profile.archetypeId,
      title,
      typeLabel,
      parentLabel,
      role: roleEntry.role,
      fitBand: fitBandFor(scored, roleEntry.role),
      confidence: scored.confidence,
      summary,
      whyItFits: whyItFits.slice(0, 2),
      watchFor: watchFor.slice(0, 2),
      requirements,
      branchChoice: candidate.branchId || null,
    };
  }

  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  // 2026-09-15 matcher-contract correction resolved AMBIGUITY_NOTES #8 (the
  // earlier "no floor named for a low-fit best-overall" gap) explicitly:
  // best-overall below 0.58 is "provisional", not "worth-considering" or
  // "specialised-alternative" -- still shown, but flagged low-confidence with
  // a follow-up question (see matchProfiles' confidence override below).
  function fitBandFor(scored, role) {
    const fit = scored.overallFit === null ? 0 : scored.overallFit;
    const coverage = scored.coverage === null ? 0 : scored.coverage;
    if (fit >= 0.84 && coverage >= 0.70) return 'excellent';
    if (fit >= 0.72) return 'strong';
    if (fit >= 0.58) return 'worth-considering';
    return role === 'best-overall' ? 'provisional' : 'specialised-alternative';
  }

  // ---------------------------------------------------------------------
  // matchProfiles
  // ---------------------------------------------------------------------
  function matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue) {
    validatePreferenceRequest(request, criteriaDoc);

    const totalActivePrefs =
      Object.values(request.numericPreferences || {}).filter(p => !p.notRelevant).length +
      Object.values(request.categoricalPreferences || {}).filter(p => p.mode === 'prefer').length;

    if (totalActivePrefs === 0) {
      return {
        recommendations: [],
        confidence: 'low',
        nextQuestion: questionTemplates ? (questionTemplates.questions.find(q => (q.criteriaClarified || []).length > 0) || null) : null,
      };
    }

    const candidates = expandCandidateBranches(profiles);
    const scored = candidates.map(candidate => {
      const eligibility = evaluateEligibility(candidate, request);
      const fit = scoreCandidate(candidate, request, criteriaDoc);
      return Object.assign(fit, { eligibility });
    });

    const ranked = rankCandidates(scored);
    const roleEntries = assignResultRoles(ranked, request, criteriaDoc);
    // Shared across every result in this shortlist, per the catalogue's own
    // "Do not repeat the same criterion sentence twice in one shortlist."
    const usedSentences = new Set();
    const recommendations = roleEntries.map(entry => buildPresentationResult(entry, request, criteriaDoc, explanationCatalogue, usedSentences));

    // A "provisional" best-overall (fit < 0.58) always marks the whole
    // shortlist low-confidence, regardless of coverage/breadth -- the
    // candidate stays visible, but the caller should treat it as unsettled
    // and keep asking (matcher-contract correction rule 8).
    const bestIsProvisional = recommendations[0] && recommendations[0].role === 'best-overall' && recommendations[0].fitBand === 'provisional';
    const overallConfidence = roleEntries.length === 0 ? 'low' : (bestIsProvisional ? 'low' : roleEntries[0].scored.confidence);
    const nextQuestion = questionTemplates ? selectNextQuestion(request, ranked, questionTemplates, criteriaDoc, { forceQuestion: bestIsProvisional }) : null;

    return {
      recommendations,
      confidence: overallConfidence,
      nextQuestion,
      _internal: { ranked }, // raw scores retained for tests, per "definition of done"
    };
  }

  return {
    ValidationError,
    validatePreferenceRequest,
    expandCandidateBranches,
    evaluateEligibility,
    scoreCandidate,
    rankCandidates,
    assignResultRoles,
    selectNextQuestion,
    buildPresentationResult,
    matchProfiles,
  };
}));

/*
AMBIGUITY_NOTES (also summarized in the chat reply that shipped this module):

1. HIGH_IMPORTANCE_THRESHOLD=8 for "high-importance criteria/categories" (used by
   different-approach and selectNextQuestion's gate-priority framing) -- no
   number given in the handoff.
2. MEANINGFUL_NUMERIC_SEPARATION=3, reused from selectNextQuestion's explicit
   "numeric range at least 3" for different-approach's own "materially differs"
   numeric check, since no separate number is given there.
3. "A category cannot require and exclude the same value after preferences are
   merged" cannot be triggered by the given request shape (one mode per
   criterionId) -- implemented as a structurally-satisfied no-op, flagged for
   whenever a multi-entry-per-criterion shape is introduced.
4. RESOLVED 2026-09-15 (matcher-contract correction): the earlier value:"conflict"
   sentinel is gone. Every compatibilityGate now carries a stable, candidate-
   specific `id` (never keyed by `type` alone, since several candidates share a
   type) and a `kind` (compatibility / commitment / soft). gateAnswers is keyed
   by gate id: {status: "satisfied" | "conflict"}; an absent entry means
   unresolved. Only an unresolved/conflicting `compatibility` gate affects
   eligibility; `commitment` gates are always eligible and only disclosed
   (never demote); `soft` gates are unchanged (warn-only).
5. "Fill unoccupied slots with the next strongest non-duplicate eligible
   candidate. Only then consider needs-confirmation candidates." is implemented
   as the *selection algorithm* for each of roles 2-4 (scan the full ranked list
   for the next candidate satisfying that role's own definition, eligible tier
   first, then needs-confirmation), not as a generic fallback that invents a
   fifth role label. If no candidate anywhere satisfies a role's definition, that
   role is omitted (matching the explicit "omit" language given for roles 3/4,
   extended to role 2 for consistency).
6. question-templates.json has no gate-confirmation question type.
   selectNextQuestion synthesizes a minimal question object
   ({id:"gate:<gate-id>", synthetic:true, prompt, gateId, answers}) for an
   unresolved compatibility gate on a top candidate. As of the 2026-09-15
   correction, `prompt` is the gate's own authored `confirmationPrompt` (a
   natural English yes/no question) when the data supplies one -- every
   current compatibility gate does -- else a generic compliance-phrased
   fallback ("Does your build comply with this requirement: <rule>"), chosen
   so "Yes" always means satisfied/"No" always means conflict regardless of
   how the underlying rule text is phrased.
7. whyItFits/watchFor use a small fixed sentence template keyed off each
   criterion's playerLabel, since explanation-templates.json's fragment library
   was left intentionally empty pending Codex's editorial pass. This satisfies
   "no statistics" but will read more mechanically than the handoff's tone
   examples until real fragments exist.
8. RESOLVED 2026-09-15 (matcher-contract correction): best-overall below fit
   0.58 now gets fitBand "provisional" (added to vocabularies.json's fitBands)
   rather than the earlier stand-in "worth-considering". matchProfiles also
   forces the overall `confidence` to "low" whenever the best-overall result is
   provisional (even if scoreCandidate's own per-candidate confidence read
   "medium"/"high" from sheer coverage/breadth) and forces selectNextQuestion
   to still offer a question in that case, per "keep the candidate visible,
   mark the shortlist low-confidence and request another useful question."
*/
