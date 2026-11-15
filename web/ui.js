// ═══════════════════════════════════════════════════════════════════════
// MarsWalk – ui.js
// Small shared UI helpers: status dots, error banners, data loading, modal.
// Loaded before every other app script.
// ═══════════════════════════════════════════════════════════════════════

(function () {
  var errors = {};

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /** state: "ok" | "warn" | "err" | "off" | "loading" */
  function setStatus(key, state, text) {
    var dot = $("dot-" + key), lbl = $("lbl-" + key);
    if (dot) dot.className = "dot " + state;
    if (lbl) lbl.textContent = text;
  }

  function renderErrors() {
    var box = $("error-banner");
    var msgs = Object.keys(errors).map(function (k) { return errors[k]; });
    box.style.display = msgs.length ? "block" : "none";
    box.innerHTML = msgs.map(function (m) { return "<div>" + esc(m) + "</div>"; }).join("");
  }
  function showError(key, msg) { errors[key] = msg; renderErrors(); }
  function clearError(key) { delete errors[key]; renderErrors(); }

  /**
   * Fetch a team JSON file. Always resolves: { ok: true, data } or, if the file
   * is missing / unreachable (e.g. opened via file://), { ok: false, error }.
   */
  function loadJSON(url) {
    return fetch(url)
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) { return { ok: true, data: data }; })
      .catch(function (e) { console.error("Could not load " + url, e); return { ok: false, error: e }; });
  }

  function openModal(id) { $(id).hidden = false; }
  function closeModal(id) { $(id).hidden = true; }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-close]");
    if (t) closeModal(t.getAttribute("data-close"));
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") document.querySelectorAll(".modal").forEach(function (m) { m.hidden = true; });
  });

  function fmtHours(h) {
    var hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    if (mm === 60) { hh++; mm = 0; }
    return hh + " h " + (mm < 10 ? "0" : "") + mm + " min";
  }

  /** Inline badge showing the source of a parameter on hover. */
  function sourceTag(source) {
    return '<span class="tag cited" title="' + esc(source) + '">source</span>';
  }

  window.MW = window.MW || {};
  window.MW.ui = {
    $: $, esc: esc, setStatus: setStatus, showError: showError, clearError: clearError,
    loadJSON: loadJSON, openModal: openModal, closeModal: closeModal,
    fmtHours: fmtHours, sourceTag: sourceTag,
  };
})();
