// Clickable spell-to-spell cross-references: when a spell's description mentions
// another known spell by name (and that mention was italicized in the original
// Archives of Nethys text — the only "special formatting" AoN actually uses for
// this, confirmed by inspecting real pages; it does NOT use real hyperlinks for
// this), the mention becomes clickable and opens a same-page popup with that
// spell's own details, no navigation.
//
// Data-driven, not string-guessing: assets/spell-crossrefs.json (built by an
// offline scrape) records, PER SPELL, exactly which other spell names were
// genuinely italicized in its source description. linkify() only wraps an
// occurrence of the effect text that is in that spell's own precomputed refs
// list — it never guesses from a spell-name substring match on its own, which
// avoids false positives like an ordinary word that happens to share a spell's
// name (e.g. "Light", "Resistance").
(function (global) {
  const INDEX_URL = '../assets/spell-master-index.json';
  const REFS_URL = '../assets/spell-crossrefs.json';

  let masterIndex = null; // normalized-lowercase-name -> spell entry
  let crossrefs = null;   // exact spell name -> [other spell names]
  let loadingPromise = null;

  function ensureLoaded() {
    if (loadingPromise) return loadingPromise;
    loadingPromise = Promise.all([
      fetch(INDEX_URL).then(r => r.json()).catch(() => ({ spells: {} })),
      fetch(REFS_URL).then(r => r.json()).catch(() => ({ refs: {} })),
    ]).then(([mi, cr]) => {
      masterIndex = mi.spells || {};
      crossrefs = cr.refs || {};
    });
    return loadingPromise;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Wraps any occurrence, in `text`, of a name listed in ownSpellName's precomputed
  // refs with a clickable span. Always HTML-escapes `text` first (the underlying
  // `effect` fields are plain text with no markup, so this also closes a latent
  // unescaped-interpolation gap in the callers that used to inject `s.effect` raw).
  // Safe to call before the data has finished loading — returns escaped plain text
  // with no links until ensureLoaded() has resolved at least once.
  function linkify(text, ownSpellName) {
    let html = escapeHtml(text || '');
    if (!crossrefs) return html;
    const refs = crossrefs[ownSpellName];
    if (!refs || !refs.length) return html;
    // Longest name first so e.g. "Mass Resurrection" isn't partially eaten by a
    // shorter "Resurrection" match landing first.
    const sorted = [...refs].sort((a, b) => b.length - a.length);
    for (const ref of sorted) {
      const escRef = escapeHtml(ref);
      // Case-insensitive: source prose legitimately mixes-case a mention mid-sentence
      // (e.g. "...such as geas/quest or insanity" even though the spell's own title
      // is "Geas/Quest") — match either way but keep the original on-page casing in
      // the visible link text (`m`), only the data-spell lookup key is canonical.
      const re = new RegExp('(?<![\\w])' + escapeRegExp(escRef) + '(?![\\w])', 'gi');
      html = html.replace(re, m => `<span class="pf-spellref" data-spell="${escRef}" tabindex="0" role="button">${m}</span>`);
    }
    return html;
  }

  function ensureModal() {
    if (document.getElementById('pfSpellRefModal')) return;
    const modal = document.createElement('div');
    modal.id = 'pfSpellRefModal';
    modal.innerHTML = `
      <div class="pfsr-card" role="dialog" aria-modal="true">
        <button class="pfsr-close" type="button" aria-label="Close">&times;</button>
        <div class="pfsr-body"></div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    modal.querySelector('.pfsr-close').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    if (!document.getElementById('pfSpellRefStyle')) {
      const style = document.createElement('style');
      style.id = 'pfSpellRefStyle';
      style.textContent = `
        .pf-spellref{color:#f1d78b;text-decoration:underline dotted;cursor:pointer}
        .pf-spellref:hover{color:#fff}
        #pfSpellRefModal{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;z-index:1000;padding:16px}
        #pfSpellRefModal.open{display:flex}
        #pfSpellRefModal .pfsr-card{background:#181c24;border:1px solid #313949;border-radius:10px;max-width:520px;width:100%;max-height:80vh;overflow-y:auto;padding:16px;position:relative;box-shadow:0 12px 32px rgba(0,0,0,.5)}
        #pfSpellRefModal .pfsr-close{position:absolute;top:8px;right:8px;background:none;border:none;color:#9ba7b7;font-size:1.4rem;line-height:1;cursor:pointer;padding:4px 8px}
        #pfSpellRefModal .pfsr-close:hover{color:#eef2f7}
        #pfSpellRefModal h3{margin:0 18px 6px 0;color:#f1d78b;font-size:1.05rem}
        #pfSpellRefModal .pfsr-stat{background:#0d1117;border:1px solid #313949;border-radius:6px;padding:5px 7px;margin-bottom:8px;font-size:.72rem;line-height:1.5;color:#eef2f7}
        #pfSpellRefModal .pfsr-stat b{color:#f1d78b;margin-right:4px}
        #pfSpellRefModal .pfsr-effect{font-size:.78rem;color:#c7d0dd;line-height:1.4}
        #pfSpellRefModal .pfsr-effect p{margin:0 0 8px}
        #pfSpellRefModal .pfsr-missing{color:#9ba7b7;font-size:.8rem}
      `;
      document.head.appendChild(style);
    }
  }

  function closeModal() {
    const modal = document.getElementById('pfSpellRefModal');
    if (modal) modal.classList.remove('open');
  }

  function showSpell(name) {
    ensureLoaded().then(() => {
      ensureModal();
      const modal = document.getElementById('pfSpellRefModal');
      const body = modal.querySelector('.pfsr-body');
      const entry = masterIndex[String(name).trim().toLowerCase()];
      if (!entry) {
        body.innerHTML = `<h3>${escapeHtml(name)}</h3><div class="pfsr-missing">No details available for this spell yet.</div>`;
      } else {
        const stat = (label, val) => val ? `<div class="pfsr-stat"><b>${label}</b> ${escapeHtml(val)}</div>` : '';
        body.innerHTML = `
          <h3>${escapeHtml(entry.name)}</h3>
          ${stat('School', entry.school)}
          ${stat('Casting Time', entry.castingTime)}
          ${stat('Components', entry.components)}
          ${stat('Range', entry.range)}
          ${stat('Target', entry.target)}
          ${stat('Duration', entry.duration)}
          ${stat('Saving Throw', entry.save)}
          ${stat('Spell Resistance', entry.sr)}
          <div class="pfsr-effect">${(entry.effect || '').split('\n\n').map(p => `<p>${linkify(p, entry.name)}</p>`).join('')}</div>
          ${entry.source ? `<div class="pfsr-stat" style="margin-top:8px;font-style:italic">${escapeHtml(entry.source)}</div>` : ''}
        `;
      }
      modal.classList.add('open');
    });
  }

  document.addEventListener('click', function (e) {
    const t = e.target.closest('.pf-spellref');
    if (t) { e.preventDefault(); showSpell(t.dataset.spell); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target.closest && e.target.closest('.pf-spellref');
    if (t) { e.preventDefault(); showSpell(t.dataset.spell); }
  });

  global.PFSpellRefs = { linkify, ensureLoaded, showSpell };
  // Every tool's own bootstrap script runs (and does its first render) BEFORE this
  // module's async fetch of the index/refs JSON can resolve, so the very first
  // paint always has crossrefs===null and renders plain, unlinked text. Once the
  // data lands, re-run whichever redraw function the page defines so the links
  // appear without a manual refresh. Every consuming tool exposes one or both of
  // these as a plain global function declaration.
  ensureLoaded().then(() => {
    if (typeof global.renderList === 'function') global.renderList();
    if (typeof global.render === 'function') global.render();
  });
})(window);
