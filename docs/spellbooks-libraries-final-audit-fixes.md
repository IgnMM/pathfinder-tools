# Developer Brief — Final Spellbooks & Spell Libraries Audit

Date: 2026-09-14  
Repository: IgnMM/pathfinder-tools  
Baseline audited: main at a7e006a24a5a2f9738d8af8a7c464e5a5c23436c

## Objective

Correct the remaining catalogue inconsistencies between Character Spellbooks and Spell Libraries, add regression coverage, and make a small accessibility/UI pass. Do not change the Damage Calculator, Companion/Mount Calculator, profile schemas, or existing saved profiles.

## What has already been verified

- 25 class Spellbooks and 22 Spell Libraries were structurally inspected.
- No duplicate level|name keys were found in any base catalogue or reconstructed archetype catalogue.
- No invalid spell levels were found.
- No "Consultar manual" placeholders remain.
- Search, level filters, casting-time filters, source filters, cross-references, back navigation, and mobile CSS are present in the audited pages.
- Apart from the exceptions documented below, Spellbook and Library membership matches exactly for base lists and archetype deltas.
- The existing baseline reports 63/63 Node tests passing.

## Required correction 1 — Four missing Medium spells

The following spells are missing from both medium/index.html and medium-library/index.html even though assets/spell-master-index.json assigns them to the Medium list and Archives of Nethys confirms the class and level:

| Spell | Medium level | Source |
|---|---:|---|
| Baleful Shadow Transmutation | 6 | Blood of Shadows pg. 30 |
| Shadow Transmutation | 6 | Blood of Shadows pg. 30 |
| Subjective Reality | 5 | Occult Origins pg. 29 |
| Emblem of Greed | 6 | Arcane Anthology pg. 20 |

Authoritative pages:

- https://www.aonprd.com/SpellDisplay.aspx?ItemName=Baleful+Shadow+Transmutation
- https://www.aonprd.com/SpellDisplay.aspx?ItemName=shadow+transmutation
- https://www.aonprd.com/SpellDisplay.aspx?ItemName=subjective+reality
- https://www.aonprd.com/SpellDisplay.aspx?ItemName=Emblem+of+Greed

Implementation:

1. Reuse the full canonical spell objects already present in assets/spell-master-index.json.
2. Add them to the base SPELLS arrays in both Medium files at the correct levels.
3. Do not add separate copies to Storm Dreamer; the archetype must inherit them from the base list.
4. Confirm that base Medium increases from 377 to 381 spells in both tools.
5. Confirm there are still zero duplicate level|name pairs.

## Required correction 2 — Druid domain spells stored in the wrong delta layer

Current state:

- druid/index.html base SPELLS: 913 entries.
- druid-library/index.html base SPELLS: 792 entries.
- The difference is exactly 121 entries marked domainOnly:true.
- All eight Library archetype deltas repeat those same 121 domain spells.
- Example: Undine Adept has 122 additions, but only one is genuinely archetype-specific; the other 121 are the shared Nature Bond domain pool.

Affected file:

- druid-library/index.html

Recommended implementation, consistent with the Cleric/Oracle Library:

1. Move the 121 domainOnly entries into the Library base SPELLS array.
2. Remove those same entries from every archetype's addedSpells.
3. Preserve each archetype's genuine additions and removedKeys.
4. After reconstruction, every archetype must have exactly the same level|name membership as before.
5. Base Druid Library must increase from 792 to 913 entries.
6. Each domainOnly spell must be stored only once, not once per archetype.

Expected genuine addition counts after cleanup:

| Archetype | Genuine additions |
|---|---:|
| Death Druid | 12 |
| Feyspeaker | 358 |
| Halcyon Druid | 1,493 |
| Naga Aspirant | 25 |
| Nature Priest | 3 |
| Supernaturalist | 944 |
| Toxicologist | 4 |
| Undine Adept | 1 |

Add a short Library subtitle/note explaining that Nature Bond domain spells are included as optional class-granted spells.

## Required correction 3 — Witch patron spells stored in every archetype delta

Current state:

- witch/index.html base SPELLS: 1,257 entries.
- witch-library/index.html base SPELLS: 1,156 entries.
- The difference is exactly 101 entries marked patronOnly:true.
- Each of the three Library archetypes repeats those same 101 patron spells.

Affected file:

- witch-library/index.html

Implementation:

1. Move the 101 patronOnly entries into the Library base SPELLS array.
2. Remove those entries from every archetype's addedSpells.
3. Preserve genuine archetype additions.
4. Base Witch Library must increase from 1,156 to 1,257 entries.
5. Reconstructed archetype memberships must remain unchanged.
6. Store every patronOnly spell only once.

Expected genuine addition counts after cleanup:

| Archetype | Genuine additions |
|---|---:|
| Alley Witch | 3 |
| Dimensional Occultist | 8 |
| Winter Witch | 1 |

Add a short Library subtitle/note explaining that Patron spells are included as optional class-granted spells.

## Required correction 4 — Sorcerer bloodline pool incorrectly attached to Razmiran Priest

Current state:

- sorcerer/index.html contains 1,962 entries: 1,885 common Sorcerer/Wizard spells plus 77 bloodlineOnly spells.
- wizard-sorcerer-library/index.html base contains only the 1,885 common spells.
- Razmiran Priest's Library delta contains 79 additions: 77 bloodlineOnly entries plus only 2 genuine archetype additions.
- Therefore selecting Razmiran Priest incorrectly becomes the only way to expose the entire bloodline bonus-spell pool.

Affected file:

- wizard-sorcerer-library/index.html

Implementation:

1. Remove all 77 bloodlineOnly entries from Razmiran Priest's addedSpells.
2. Preserve its two genuine archetype additions.
3. Place the 77 bloodlineOnly entries in one shared optional pool rather than associating them with an archetype.
4. Preferred UI: add a Wizard/Sorcerer class selector. When Sorcerer is selected, allow the reference catalogue to include bloodline bonus spells and clearly label them "Bloodline spell". Do not present them as ordinary Wizard spells.
5. If the class selector is deferred, use a clearly labelled "Include Sorcerer bloodline spells" toggle. Do not silently mix them into the Wizard list.
6. Ensure Worldseeker and Spell Sage remain Wizard-only archetype choices and Razmiran Priest remains Sorcerer-only.
7. Reconstructed Razmiran Priest membership must remain correct for the chosen Sorcerer mode.

## Required correction 5 — Synchronize shared spell records

Identical level|name records should not display different sources, paragraph structure, save fields, or SR fields depending on whether the user opened the Spellbook or Library.

### Use the Spellbook record as canonical for the matching Library record

Apply this to:

- bard-library/index.html: 867 shared records. The Library has capitalisation-only school/save/SR differences and stripped page numbers in every source citation.
- druid-library/index.html: 792 currently shared base records. The Library strips source page numbers and has 114/115 save/SR formatting differences.
- arcanist-library/index.html: five records.
- medium-library/index.html: seven existing records, plus the four missing spells above.
- paladin-library/index.html: Divine Power and Find Traps.
- psychic-library/index.html: fourteen records.
- shaman-library/index.html: fourteen records.
- spiritualist-library/index.html: Augury, Surmount Affliction, and Hunger for Flesh, Mass.

The later Spellbook values generally contain explicit "none"/"no" values where the Library still contains blanks. Preserve those explicit values.

### Ranger exception: use the corrected Library/master descriptions

ranger-library/index.html contains the corrected descriptions for these six spells, while ranger/index.html still has flattened paragraphs or missing content:

- Alarm
- Anticipate Peril — the Spellbook is missing the Mythic Anticipate Peril addendum.
- Call Weapon
- Lay of the Land
- Channel the Gift
- Freedom of Movement

Copy the corrected effect text from ranger-library/index.html or assets/spell-master-index.json into ranger/index.html.

For source citations, do the opposite: retain/copy the fuller Spellbook citations with page numbers into ranger-library/index.html.

### Cosmetic-only Mesmerist difference

Diagnose Disease differs only in target-field capitalisation. Normalize both copies to the canonical master-index form. This is low priority but should be resolved while synchronizing.

## Required correction 6 — Library UI and accessibility

All audited Library templates have functional controls, but the common toolbar fields rely on placeholders or visual context rather than accessible names.

Implement centrally in assets/valid-sources.js where possible:

- search: aria-label="Search spells"
- filter: aria-label="Spell filter"
- archetype: aria-label="Archetype"
- levelButtons: role="group", aria-label="Spell levels"
- ctButtons: role="group", aria-label="Casting time"
- resultCount: role="status", aria-live="polite"

Only add an attribute when the element exists and does not already have a better explicit label.

For special optional spells shown in Libraries, add visible badges:

- Domain spell
- Patron spell
- Bloodline spell

Update affected subtitles so users understand that these are optional class-granted spells rather than ordinary members of the base class list.

Recommended small usability improvement:

- When filtering produces zero results, display a visible empty-state message such as "No spells match the current filters."
- Keep the existing clear-search button and source reset control.
- Do not add modal dialogs or extra navigation layers.

## Regression protection

Add tests/spell-catalog-integrity.test.js or extend the existing test suite with the following invariants:

1. Every Spellbook and Library HTML document is complete and ends with a closing html tag.
2. SPELLS and ARCHETYPES parse successfully.
3. No base or reconstructed archetype catalogue contains duplicate level|name keys.
4. Every spell and level listed for a class in assets/spell-master-index.json exists in that class's base Spellbook catalogue.
5. Medium contains the four confirmed missing spells in both files.
6. Paired Spellbook/Library base memberships match after documented exclusions.
7. Druid domainOnly and Witch patronOnly records are stored once, not copied into every archetype delta.
8. Razmiran Priest contains only its genuine archetype additions and does not own the shared bloodlineOnly pool.
9. Shared UI controls receive the accessible labels and live-result semantics above.
10. Existing archetype memberships remain unchanged after the delta cleanup.

Also update scripts/migrate-library-archetypes.js:

- Compare base Spellbook and Library memberships, not only archetype reconstructions.
- Report special-only pool leakage into archetype deltas.
- Keep the existing Paladin oath-only and Psychic constellation exceptions explicit and documented.
- Add explicit handling for the combined Wizard/Sorcerer Library instead of silently skipping it.

## Verification sequence

1. Work in a local clone/worktree. Do not rewrite or reconstruct unrelated commits.
2. Record the current full byte sizes and closing tags of every file before editing.
3. Make the catalogue corrections with a deterministic script where practical.
4. Verify before/after membership for every archetype.
5. Run all tests:

    node --test tests/*.test.js

6. Report the new passing-test total; do not keep referring to 63 if new tests have been added.
7. Open and manually smoke-test at least:
   - Base Medium and Storm Dreamer
   - Base Druid plus one low-delta archetype such as Undine Adept
   - Base Witch plus Winter Witch
   - Wizard mode, Sorcerer mode, and Razmiran Priest
   - Search, clear search, level filters, casting-time filters, favorites, source filters, and zero-results state
   - Mobile width and keyboard focus
8. Confirm no changes to profile-store schemas and no deletion or renaming of Kenneth, Hulkran, or any existing profile.
9. Inspect git diff and verify the destination repository and branch before pushing.
10. Because large minified HTML files have previously been truncated during upload, confirm exact file completeness after every write and again from the final committed tree.

## Scope boundary

Do not modify:

- Character Damage Calculator mathematics.
- Companion/Mount Calculator mathematics or presets.
- Existing character profile data.
- Service-worker behaviour unless a cache-version update is genuinely required by the final changed-file set.
- Unrelated UI pages.

Separate required correctness fixes from optional cosmetic improvements in the commit history.
