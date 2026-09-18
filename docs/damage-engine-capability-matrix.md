# Damage Calculator batch project — Batch 00 capability matrix

Prep step before the ~1,068-entry feat/trait/spell batch project (hit/damage/critical
effects not already covered by the CMB/CMD project). Audits the existing modifier engine
in `calc/index.html` (Character) and `companion/index.html` (Companion & Mount) against
the 11 primitives the batch project needs, adds only the smallest primitives genuinely
missing, and records what's deliberately left unsupported. No feat/trait/spell catalogue
content changed in this batch.

## Status legend

- **EXISTS** — already fully supports the primitive, no change needed.
- **PARTIAL** — some support exists but with a real gap (documented below).
- **MISSING** — no support; left as a documented, intentional limitation for now.

## Matrix

| # | Primitive | Status | Where |
|---|---|---|---|
| 1 | Fixed typed/untyped attack & damage modifier | EXISTS | `stackTotal()` — `assets/calc-engine.js:51` |
| 2 | Weapon/ammo/natural/unarmed/individual-attack-line scope | PARTIAL | `entryAppliesToLine()` — `companion/index.html:3369`. **Companion only** — calc has no per-line targeting at all (only `weaponSlot: main/off/both` for two-weapon fighting). |
| 3a | Enemy type/alignment/identity conditions | EXISTS | `VS_FLAG_OPTIONS`/`targetMatches()` — `calc/index.html:760-777` |
| 3b | Position/distance conditions (flanking, point-blank, charging) | PARTIAL | Only two ad hoc ctx flags exist (`ctx.flankingOn`, `ctx.hasteOn`, `calc/index.html:5340-5354`), added because specific *other* modifiers needed to detect them — not a designed primitive family. Everything else (Point-Blank Shot, charging, first-attack-of-round) is just an ordinary always-on-while-toggled catalog entry. |
| 4 | Capped BAB/class-level/caster-level formulas | **Added: `scaledByLevel()`** | New shared helper, `assets/calc-engine.js` (see below) — previously always hand-written per modifier. |
| 5 | STR/DEX substitution without double-counting | EXISTS | `resolveAbilityComposites()` + `ctx._finalAbilityMods` — `calc/index.html:881-899` |
| 6 | Effective/"as-if-larger" weapon size ≠ actual size | PARTIAL | Exists only as 3 hardcoded id checks (Lead Blades/Gravity Bow/Strong Jaw, `calc/index.html:5750-5774`) — a new spell/feat needing this still requires hand-editing that id list, not just adding a catalogue row. |
| 7 | Extra damage dice with crit-multiplication policy | EXISTS | `extraDice:{normal,crit}` + `critDiceForMult()` — `calc/index.html:5583-5587` |
| 8 | Threat range / multiplier / confirmation as separate ops | PARTIAL | Threat range and multiplier are real, independent operations. Critical **confirmation** (the second d20) is never simulated — "crit" is an assumed-true toggle everywhere, same as every other situational effect. |
| 9a | Shared "grants an extra attack" mechanism | **Generalized** | Was a hardcoded id list (`calc/index.html:5825-5830`); now also accepts `grantsExtraAttack:true` from any modifier's own `compute()` return (see below). |
| 9b | Reroll / roll-twice as a non-flat operation | MISSING | Confirmed zero existing logic anywhere — every reroll/roll-twice effect in the current catalogue is note-only text; left that way. |
| 10 | Duration/activation/per-day/selected-option config | EXISTS (config), MISSING (resource counter) | `configFields` (`type:number\|select`) is the existing mechanism. No shared "N/day" counter widget exists — every per-day effect is either a plain toggle (assumed available) or a bespoke `configFields` entry. **Known discrepancy**: calc's `select` options are `{v,label}` objects (`calc/index.html:772`), companion's are `[value,label]` arrays (`companion/index.html:543`) — not unified; a batch entry's `configFields` must be translated by hand between the two files, same as every batch so far. |
| 11 | Shared application to Character + eligible Companion/Mount | EXISTS (mirrored, not shared) | Each file keeps its own separate `MODIFIERS` array (hand-mirrored, same pattern the CMB project used). Companion additionally gates by entity type via `modifierAppliesToCurrentEntity()` — `companion/index.html:1331`. |

## What was added in this batch

1. **`scaledByLevel(level, {per, base, step, cap, floorAt})`** — `assets/calc-engine.js`. Covers the single most common scaling shape in the rules text ("+2, plus 1 per 4 caster levels beyond 1st, maximum +7" → `scaledByLevel(casterLevel, {floorAt:1, per:4, base:2, cap:7})`). Purely additive — no existing modifier was changed to use it; future batch entries may use it or keep writing inline `Math.floor`/`Math.min` when the shape doesn't fit.
2. **`grantsExtraAttack` compute() field** — `calc/index.html`'s `hasExtraAttack` check now also asks every active modifier's own `compute()` result for a `grantsExtraAttack:true` field, in addition to the pre-existing hardcoded `haste`/`speed`/`blessing-of-fervor` id checks (left untouched, zero behavior change for existing entries). A future batch entry that grants a shared, non-stacking extra attack (same family as Haste) can declare it in its own `compute()` return instead of requiring this engine code to be hand-edited again. Scoped to `calc/index.html` only — companion's extra-attack handling is architecturally different (tied to its own per-line/Multiattack generation, not this boolean), and generalizing that is out of scope for "smallest primitive."

## Deliberately NOT added (would be "rewriting the engine broadly", against the batch project's own stop condition)

- **Per-attack-line scoping in calc** (companion's `entryAppliesToLine`/`attackLineIds` machinery has no calc equivalent, and calc's single-weapon UI has no stable per-line id system to hang it off). If a future calc-side batch entry genuinely needs "only this one specific natural attack," that entry gets flagged and deferred rather than approximated.
- **Generalizing effective-weapon-size** beyond the existing 3 hardcoded ids. Same reasoning — doable, but a real engine change, not a primitive gap this batch needs to close pre-emptively.
- **A reroll/roll-twice primitive.** No existing precedent to generalize from; stays note-only until a batch entry's specific shape makes the right abstraction obvious.
- **A shared per-day/resource-counter widget.** Every current per-day effect already works (as a toggle or a bespoke config field); building a generic counter component now would be speculative.
- **Unifying the `select` configFields option format** between calc (`{v,label}`) and companion (`[value,label]`). Touches every existing select field in both files for a convenience gain, not a capability gap — deferred.

## Tests

`tests/calc-engine-primitives.test.js` covers `scaledByLevel()` (base/step/cap/floorAt behavior, including the "+2 per 4 CL beyond 1st, max +7" worked example above) and confirms the existing `stackTotal()`/`markSuppressed()` behavior tested elsewhere is untouched.
