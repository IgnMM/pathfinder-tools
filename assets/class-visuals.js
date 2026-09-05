/* Shared identity for Character Spell Sheet seals and Spell Library tomes. */
window.PF_CLASS_VISUALS = {
  alchemist:{rune:'flask',color:'#79c95a'}, antipaladin:{rune:'horned-skull',color:'#df5260'},
  arcanist:{rune:'open-book',color:'#76aeea'}, bard:{rune:'mask',color:'#c77ad9'},
  bloodrager:{rune:'blood-flame',color:'#e35d53'}, cleric:{rune:'sun',color:'#e5bc48'},
  druid:{rune:'leaf',color:'#69c77b'}, hunter:{rune:'paw',color:'#9bc767'},
  inquisitor:{rune:'eye-triangle',color:'#b675dc'}, investigator:{rune:'lens',color:'#65c3c9'},
  magus:{rune:'split-blade',color:'#788ee8'}, medium:{rune:'spirit',color:'#9e86cd'},
  mesmerist:{rune:'spiral',color:'#d16baa'}, occultist:{rune:'starburst',color:'#d4aa45'},
  oracle:{rune:'veiled-eye',color:'#c48ee4'}, paladin:{rune:'shield-cross',color:'#e1c450'},
  psychic:{rune:'mind',color:'#e85bb0'}, ranger:{rune:'bow',color:'#8bc45b'},
  shaman:{rune:'totem',color:'#58bd83'}, skald:{rune:'war-horn',color:'#e1814f'},
  sorcerer:{rune:'spark',color:'#ef7d62'}, spiritualist:{rune:'ghost',color:'#7aa8df'},
  summoner:{rune:'portal',color:'#55c8bc'}, warpriest:{rune:'warhammer',color:'#d1aa4a'},
  witch:{rune:'cauldron',color:'#a87ad8'}, wizard:{rune:'tower',color:'#6baade'},
  other:{rune:'archive',color:'#8793a3'}
};

// assetsPath defaults to "../assets/" (correct from any one-level-deep tool folder,
// e.g. alchemist/index.html) -- pass "assets/" explicitly from a page at the site root
// (hub.html) instead.
window.pfClassRune = function(classId, className, assetsPath){
  const item = window.PF_CLASS_VISUALS[classId] || window.PF_CLASS_VISUALS.other;
  const label = className || classId;
  const base = assetsPath || '../assets/';
  return `<svg class="class-rune" role="img" aria-label="${label}"><use href="${base}class-runes.svg#rune-${item.rune}"></use></svg>`;
};
