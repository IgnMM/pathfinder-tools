// Shared "Actions" quick-reference — Pathfinder's own rules call this topic Actions
// (Core Rulebook, Combat chapter, "Actions in Combat": Standard/Full-Round/Move/Swift &
// Immediate/Free Actions). "Casting Time" is only the spell stat-block's field NAME for
// which action a given spell costs to cast (its value is one of these Actions, or a
// longer duration like "1 minute") — this reference explains the Actions themselves, not
// that field, and is placed next to the Free/Move/Standard/Swift/Immediate/Other filter
// row (built by casting-time.js) those values sort spells into. Mirrors
// assets/conditions.js's mount pattern exactly (same "sourcesbox" dropdown styling, same
// <details>-per-entry layout) so it sits naturally next to that filter row and, on the 8
// Universal Sheets, next to the existing Conditions button.
(function (global) {
  const ACTION_TYPES = [
    { name: 'Free Action', filter: 'Free', desc: "Takes next to no time or effort. You can perform any number of free actions in a round (within reason — your GM may cap genuinely rules-abusive spam), and taking one never uses up your standard, move, swift, or full-round action for the turn. Examples outside spellcasting: dropping a held item, speaking a short sentence." },
    { name: 'Swift Action', filter: 'Swift', desc: "Takes only a small amount of time, but still counts as a real action: you can take exactly ONE swift action per turn, on top of your normal standard action and move action (or full-round action) that round. You cannot take a swift action on someone else's turn — for that, see Immediate Action. Using a swift action does not affect your ability to also take a standard, move, or full-round action that same turn." },
    { name: 'Immediate Action', filter: 'Immediate', desc: "Functions like a swift action, but can be performed at any time — even during another creature's turn — usually in reaction to some triggering event. The cost: using an immediate action counts as using your swift action for your NEXT turn as well, so you can't take an immediate action and then also take a swift action on your own turn right after." },
    { name: 'Move Action', filter: 'Move', desc: "Lets you move your speed, or perform an action that takes a similar amount of effort (drawing a weapon, standing up from prone, retrieving a stowed item). You can take a move action in place of your standard action if you don't need to do both — but not the reverse." },
    { name: 'Standard Action', filter: 'Standard', desc: "Lets you perform a single significant action — most attacks and most spells with a listed casting time of \"1 standard action\" fall here. In a normal turn you get one standard action and one move action (or you can trade the standard action for a second move action instead)." },
    { name: 'Full-Round Action', filter: 'Other', desc: "Consumes essentially your entire turn — the only movement normally still allowed is a single 5-foot step (typically before, after, or during the action, never combined with a longer move). A spell with a casting time of \"1 round\" is a full-round action: you finish casting it at the start of your next turn, and if anything interrupts you before then, the spell is lost." },
    { name: 'Longer Casting Times (1 minute, 10 minutes, 1 hour…)', filter: 'Other', desc: "Spells that take longer than a single round to cast (divinations like commune or contact other plane are common examples) fall well outside the normal combat action economy — they're meant to be cast during downtime or careful preparation, not mid-fight. A few spells list \"see text\" instead of a fixed time; those have some special or variable casting-time rule spelled out in their own description." }
  ];

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function panelHtml() {
    return ACTION_TYPES.map(a =>
      '<details class="conditionItem" style="margin-bottom:2px">' +
      '<summary style="cursor:pointer;font-size:.78rem;padding:3px 2px;color:var(--text,#eef2f7)">' + esc(a.name) + ' <span style="color:var(--muted,#9ba7b7);font-weight:400">— "' + esc(a.filter) + '" below</span></summary>' +
      '<p style="font-size:.7rem;color:var(--muted,#9ba7b7);line-height:1.35;margin:2px 0 6px;white-space:pre-line">' + esc(a.desc) + '</p>' +
      '</details>'
    ).join('');
  }

  function buildBox() {
    const box = document.createElement('details');
    box.className = 'sourcesbox actionTypesBox';
    // Belt-and-suspenders sizing: this box gets mounted as a sibling of #ctButtons
    // rather than inside it (that div's own render function does innerHTML='' on every
    // re-render, which would silently wipe out a child mount) — but its parent isn't
    // always a flex ROW like the Sources/Conditions button's own usual home, so without
    // this it can end up stretched to the full flex-column width instead of sizing to
    // its content like every other pill-styled control on the page.
    box.style.cssText = 'align-self:flex-start;display:inline-block;width:max-content;max-width:100%';
    const summary = document.createElement('summary');
    summary.title = 'What do the Free / Move / Standard / Swift / Immediate / Other filter buttons actually mean?';
    summary.textContent = 'Actions';
    box.appendChild(summary);
    const panel = document.createElement('div');
    panel.className = 'sourcesPanel actionTypesPanel';
    // .sourcesPanel's own CSS anchors "right:0" against its trigger button, which is
    // correct for Sources/Conditions (both sit near the right edge of their row) but
    // pushes this panel off the LEFT edge of the viewport for this button, which sits
    // near the far left of the page instead — override to anchor from the left edge.
    panel.style.cssText = 'min-width:280px;max-width:360px;right:auto;left:0';
    panel.innerHTML = panelHtml();
    box.appendChild(panel);
    return box;
  }

  // Mount inside an existing container (same call shape as PFConditions.mount).
  function mount(container, opts) {
    opts = opts || {};
    if (!container || container.querySelector('.actionTypesBox')) return;
    const box = buildBox();
    if (opts.before) container.insertBefore(box, opts.before);
    else container.appendChild(box);
  }

  // Mount as the next sibling of a reference element (e.g. the #ctButtons row) —
  // no dedicated container needed, so this works identically on every page's layout
  // without any HTML template changes.
  function mountAfter(refEl) {
    if (!refEl || !refEl.parentNode) return;
    if (refEl.parentNode.querySelector('.actionTypesBox')) return;
    const box = buildBox();
    refEl.parentNode.insertBefore(box, refEl.nextSibling);
  }

  global.PFActionTypes = { mount, mountAfter, ACTION_TYPES };
})(window);
