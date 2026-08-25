// Shared "Valid Sources" logic — used by every spell tool on this site to derive
// which sourcebooks are allowed, from one global list synced under the user's code.
// A tool/character that hasn't been manually customized follows this global list;
// once a person edits that tool's own Sources panel, it detaches and stops following.
(function (global) {
  const GLOBAL_KEY = 'pf1_global_sources_v1';

  // Every sourcebook seen across this site's spell databases (Cleric, Wizard/Sorcerer,
  // Bard, Witch, Druid, Ranger, Antipaladin, Paladin), used to render the "Valid Sources"
  // checklist on the home page.
  const ALL_BOOKS = ["Advanced Class Guide","Advanced Class Origins","Advanced Player's Guide","Advanced Race Guide","Adventurer's Armory 2","Adventurer's Guide","Agents of Evil","Andoran, Spirit of Liberty","Animal Archive","Aquatic Adventures","Arcane Anthology","Armor Master's Handbook","Black Markets","Blood of Shadows","Blood of the Ancients","Blood of the Beast","Blood of the Coven","Blood of the Elements","Blood of the Moon","Blood of the Night","Blood of the Sea","Book of the Damned","Book of the Damned - Volume 1: Princes of Darkness","Book of the Damned - Volume 2: Lords of Chaos","Book of the Damned - Volume 3: Horsemen of the Apocalypse","Champions of Balance","Champions of Corruption","Champions of Purity","Cheliax, Empire of Devils","Chronicle of Legends","Chronicle of the Righteous","Cities of Golarion","Classic Treasures Revisited","Cohorts and Companions","Conquest of Bloodsworn Vale","Core Rulebook","Curse of the Crimson Throne (PFRPG)","Dark Markets - A Guide to Katapesh","Demon Hunter's Handbook","Demons Revisited","Dirty Tactics Toolbox","Disciple's Doctrine","Distant Realms","Distant Worlds","Divine Anthology","Dragon Empires Primer","Dragonslayer's Handbook","Dungeon Denizens Revisited","Dungeoneer's Handbook","Dungeons of Golarion","Dwarves of Golarion","Elemental Master's Handbook","Faction Guide","Faiths and Philosophies","Faiths of Balance","Faiths of Corruption","Faiths of Purity","Familiar Folio","GameMastery Condition Cards","Giant Hunter's Handbook","Gnomes of Golarion","Goblins of Golarion","Gods & Magic","Guardians of Dragonfall","Guide to the River Kingdoms","Haunted Heroes Handbook","Healer's Handbook","Hell's Vengeance Player's Guide","Heroes from the Fringe","Heroes of the Darklands","Heroes of the High Court","Heroes of the Streets","Heroes of the Wild","Horror Adventures","Humans of Golarion","Inner Sea Gods","Inner Sea Intrigue","Inner Sea Magic","Inner Sea Monster Codex","Inner Sea Races","Inner Sea Temples","Inner Sea World Guide","Knights of the Inner Sea","Kobolds of Golarion","Land of the Pharaohs","Lands of the Linnorm Kings","Legacy of Dragons","Legacy of the First World","Lost Kingdoms","Magic Tactics Toolbox","Magical Marketplace","Melee Tactics Toolbox","Monster Codex","Monster Hunter's Handbook","Monster Summoner's Handbook","Mythic Adventures","Mythic Origins","Occult Adventures","Occult Mysteries","Occult Origins","Occult Realms","Orcs of Golarion","Osirion, Legacy of the Pharaohs","Paizo Blog - Ultimate Cantrips","Path of the Hellknight","Pathfinder #102: Breaking the Bones of Hell","Pathfinder #107: Scourge of the Godclaw","Pathfinder #110: The Thrushmoor Terror","Pathfinder #113: What Grows Within","Pathfinder #115: Trail of the Hunted","Pathfinder #116: Fangs of War","Pathfinder #119: Prisoners of the Blight","Pathfinder #131: The Reaper's Right Hand","Pathfinder #134: It Came from Hollow Mountain","Pathfinder #135: Runeplague","Pathfinder #140: Eulogy for Roslar's Coffer","Pathfinder #143: Borne by the Sun's Grace","Pathfinder #14: Children of the Void","Pathfinder #16: Endless Night","Pathfinder #17: A Memory of Darkness","Pathfinder #19: Howl of the Carrion King","Pathfinder #23: The Impossible Eye","Pathfinder #24: The Final Wish","Pathfinder #29: Mother of Flies","Pathfinder #2: The Skinsaw Murders","Pathfinder #30: The Twice-Damned Prince","Pathfinder #32: Rivers Run Red","Pathfinder #35: War of the River Kings","Pathfinder #41: The Thousand Fangs Below","Pathfinder #42: Sanctum of the Serpent God","Pathfinder #50: Night of Frozen Shadows","Pathfinder #55: The Wormwood Mutiny","Pathfinder #56: Raiders of the Fever Sea","Pathfinder #59: The Price of Infamy","Pathfinder #5: Sins of the Saviors","Pathfinder #62: Curse of the Lady's Light","Pathfinder #64: Beyond the Doomsday Door","Pathfinder #65: Into the Nightmare Rift","Pathfinder #67: The Snows of Summer","Pathfinder #68: The Shackled Hut","Pathfinder #69: Maiden, Mother, Crone","Pathfinder #71: Rasputin Must Die!","Pathfinder #74: Sword of Valor","Pathfinder #77: Herald of the Ivory Labyrinth","Pathfinder #78: City of Locusts","Pathfinder #80: Empty Graves","Pathfinder #81: Shifting Sands","Pathfinder #82: Secrets of the Sphinx","Pathfinder #84: Pyramid of the Sky Pharaoh","Pathfinder #86: Lords of Rust","Pathfinder #89: Palace of Fallen Stars","Pathfinder #91: Battle of Bloodmarch Hills","Pathfinder #93: Forge of the Giant God","Pathfinder #95: Anvil of Fire","Pathfinder Adventure Path #91: Battle of Bloodmarch Hills","Pathfinder Campaign Setting","Pathfinder Comics #10","Pathfinder Player Companion: Agents of Evil","Pathfinder Player Companion: Black Markets","Pathfinder Society Field Guide","Pathfinder Society Primer","Paths of the Righteous","People of the North","People of the River","People of the Sands","People of the Stars","People of the Wastes","Pirates of the Inner Sea","Planar Adventures","Plane-Hopper's Handbook","Planes of Power","Potions and Poisons","Psychic Anthology","Qadira, Jewel of the East","Quests & Campaigns","Ranged Tactics Toolbox","Rise of the Runelords Anniversary Edition","Rival Guide","Sargava, the Lost Colony","Second Darkness Player's Guide","Seekers of Secrets","Spymaster's Handbook","Taldor, Echoes of Glory","Technology Guide","The Dragon's Demand","The First World, Realm of the Fey","The Harrow Handbook","Ultimate Combat","Ultimate Intrigue","Ultimate Magic","Ultimate Wilderness","Undead Slayer's Handbook","Villain Codex","Wilderness Origins"];

  // A handful of spells across different research passes cited these region books
  // by just their short name or just their subtitle instead of the full comma title
  // (e.g. "Osirion" or "Legacy of the Pharaohs" instead of "Osirion, Legacy of the
  // Pharaohs"). Fold those fragments into the one canonical entry so they don't show
  // up as separate, confusing checkboxes.
  const BOOK_ALIASES = {
    'Andoran': 'Andoran, Spirit of Liberty',
    'Spirit of Liberty': 'Andoran, Spirit of Liberty',
    'Cheliax': 'Cheliax, Empire of Devils',
    'Empire of Devils': 'Cheliax, Empire of Devils',
    'Osirion': 'Osirion, Legacy of the Pharaohs',
    'Legacy of the Pharaohs': 'Osirion, Legacy of the Pharaohs',
    'Taldor': 'Taldor, Echoes of Glory',
    'Echoes of Glory': 'Taldor, Echoes of Glory',
    'The First World': 'The First World, Realm of the Fey',
    'Realm of the Fey': 'The First World, Realm of the Fey'
  };

  // Default "valid sources" ruleset (used the first time, before anyone has picked
  // their own selection): no other-campaign Adventure Path content, no race-locked
  // splatbooks (only relevant if a character is that race), no deity-locked faith
  // content (only relevant if a character follows that deity), nothing from the
  // Occult Adventures line. Everything else starts valid.
  const DEFAULT_EXCLUDED_BOOKS = {"Advanced Race Guide":true,"Blood of Shadows":true,"Blood of the Ancients":true,"Blood of the Beast":true,"Blood of the Coven":true,"Blood of the Elements":true,"Blood of the Moon":true,"Blood of the Night":true,"Blood of the Sea":true,"Champions of Balance":true,"Champions of Corruption":true,"Champions of Purity":true,"Curse of the Crimson Throne (PFRPG)":true,"Disciple's Doctrine":true,"Divine Anthology":true,"Dwarves of Golarion":true,"Faiths and Philosophies":true,"Faiths of Balance":true,"Faiths of Corruption":true,"Faiths of Purity":true,"Gnomes of Golarion":true,"Goblins of Golarion":true,"Gods & Magic":true,"Hell's Vengeance Player's Guide":true,"Humans of Golarion":true,"Inner Sea Gods":true,"Inner Sea Temples":true,"Knights of the Inner Sea":true,"Kobolds of Golarion":true,"Occult Adventures":true,"Occult Mysteries":true,"Occult Origins":true,"Occult Realms":true,"Orcs of Golarion":true,"Pathfinder #102: Breaking the Bones of Hell":true,"Pathfinder #107: Scourge of the Godclaw":true,"Pathfinder #110: The Thrushmoor Terror":true,"Pathfinder #113: What Grows Within":true,"Pathfinder #115: Trail of the Hunted":true,"Pathfinder #116: Fangs of War":true,"Pathfinder #119: Prisoners of the Blight":true,"Pathfinder #131: The Reaper's Right Hand":true,"Pathfinder #134: It Came from Hollow Mountain":true,"Pathfinder #135: Runeplague":true,"Pathfinder #140: Eulogy for Roslar's Coffer":true,"Pathfinder #143: Borne by the Sun's Grace":true,"Pathfinder #14: Children of the Void":true,"Pathfinder #16: Endless Night":true,"Pathfinder #17: A Memory of Darkness":true,"Pathfinder #19: Howl of the Carrion King":true,"Pathfinder #23: The Impossible Eye":true,"Pathfinder #24: The Final Wish":true,"Pathfinder #29: Mother of Flies":true,"Pathfinder #2: The Skinsaw Murders":true,"Pathfinder #30: The Twice-Damned Prince":true,"Pathfinder #32: Rivers Run Red":true,"Pathfinder #35: War of the River Kings":true,"Pathfinder #41: The Thousand Fangs Below":true,"Pathfinder #42: Sanctum of the Serpent God":true,"Pathfinder #50: Night of Frozen Shadows":true,"Pathfinder #55: The Wormwood Mutiny":true,"Pathfinder #56: Raiders of the Fever Sea":true,"Pathfinder #59: The Price of Infamy":true,"Pathfinder #5: Sins of the Saviors":true,"Pathfinder #62: Curse of the Lady's Light":true,"Pathfinder #64: Beyond the Doomsday Door":true,"Pathfinder #65: Into the Nightmare Rift":true,"Pathfinder #67: The Snows of Summer":true,"Pathfinder #68: The Shackled Hut":true,"Pathfinder #69: Maiden, Mother, Crone":true,"Pathfinder #71: Rasputin Must Die!":true,"Pathfinder #74: Sword of Valor":true,"Pathfinder #77: Herald of the Ivory Labyrinth":true,"Pathfinder #78: City of Locusts":true,"Pathfinder #80: Empty Graves":true,"Pathfinder #81: Shifting Sands":true,"Pathfinder #82: Secrets of the Sphinx":true,"Pathfinder #84: Pyramid of the Sky Pharaoh":true,"Pathfinder #86: Lords of Rust":true,"Pathfinder #89: Palace of Fallen Stars":true,"Pathfinder #91: Battle of Bloodmarch Hills":true,"Pathfinder #93: Forge of the Giant God":true,"Pathfinder #95: Anvil of Fire":true,"Pathfinder Adventure Path #91: Battle of Bloodmarch Hills":true,"Pathfinder Comics #10":true,"Rise of the Runelords Anniversary Edition":true,"Second Darkness Player's Guide":true};

  // "Book A pg. X, Book B pg. Y"  -> split on the comma (real separator: text
  //   right before it ends in "pg. NNN")
  // "Book A; Book B"              -> split on ";" (never appears inside a real title)
  // "Osirion, Legacy of the Pharaohs pg. 46" -> NOT split (no "pg. NNN" before the comma)
  function splitCitation(source) {
    if (!source) return [];
    const semiParts = source.split(/;\s*/);
    const out = [];
    for (const part of semiParts) {
      const segments = [];
      let last = 0;
      const re = /pg\.?\s*\d+[a-zA-Z]?\s*,\s*/g;
      let m;
      while ((m = re.exec(part))) {
        segments.push(part.slice(last, m.index) + m[0].replace(/,\s*$/, ''));
        last = m.index + m[0].length;
      }
      segments.push(part.slice(last));
      out.push(...segments);
    }
    return out.map(s => s.trim()).filter(Boolean);
  }

  function bookName(citation) {
    const name = citation
      .replace(/\s*pg\.?\s*\d+[a-zA-Z]?\s*$/i, '')
      .replace(/^(Pathfinder RPG|PRPG)\s+/i, '')
      .trim();
    return BOOK_ALIASES[name] || name;
  }

  function booksFor(source) {
    return splitCitation(source).map(bookName).filter(Boolean);
  }

  // A spell is allowed if AT LEAST ONE of its cited books is valid (not excluded) —
  // dual-citation spells are usable if the player has access to either book.
  function isAllowed(source, excludedBooks) {
    const books = booksFor(source || 'Unknown');
    if (!books.length) return !excludedBooks['Unknown'];
    return books.some(b => !excludedBooks[b]);
  }

  function loadGlobalExcludedLocal() {
    try {
      const raw = localStorage.getItem(GLOBAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.excluded === 'object') return parsed.excluded;
      }
    } catch (e) {}
    return Object.assign({}, DEFAULT_EXCLUDED_BOOKS);
  }

  function saveGlobalExcludedLocal(excludedBooks) {
    localStorage.setItem(GLOBAL_KEY, JSON.stringify({ excluded: excludedBooks }));
  }

  // Given every distinct raw `source` string a tool's SPELLS array uses, compute
  // the excludedSources object (same shape/granularity the tool already persists)
  // that reflects the current global valid-sources selection.
  function computeExcludedSources(allSourceStrings, excludedBooks) {
    const out = {};
    allSourceStrings.forEach(src => {
      if (!isAllowed(src, excludedBooks)) out[src || 'Unknown'] = true;
    });
    return out;
  }

  global.PFSources = {
    GLOBAL_KEY,
    ALL_BOOKS,
    DEFAULT_EXCLUDED_BOOKS,
    splitCitation,
    bookName,
    booksFor,
    isAllowed,
    loadGlobalExcludedLocal,
    saveGlobalExcludedLocal,
    computeExcludedSources
  };
})(window);
