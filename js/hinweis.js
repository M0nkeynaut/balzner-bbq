/*
  HINWEIS-POPUP
  -------------
  Erzeugt das HTML des Popups. Wird von der Webseite (Popup beim Öffnen)
  und von der Verwaltung (Live-Vorschau) gleich verwendet.
  Einstellungen kommen aus dem Datenspeicher: db.hinweis
*/
const Hinweis = (() => {
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[z]));

  function html(h) {
    const t = Store.hinweisText(h);
    return `
      <div class="hinweis-popup">
        <div class="hinweis-icon" aria-hidden="true">🔥</div>
        <p class="eyebrow">Balzner BBQ</p>
        <h3>${esc(t.titel)}</h3>
        ${t.einleitung ? `<p class="hinweis-text">${esc(t.einleitung)}</p>` : ""}
        ${t.punkte.length ? `<ul class="hinweis-liste">${t.punkte.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
        ${t.schluss ? `<p class="hinweis-text">${esc(t.schluss)}</p>` : ""}
        <button class="btn btn-glut btn-voll" type="button" data-dialog-zu>Verstanden</button>
      </div>`;
  }

  // Schlüssel, damit ein geänderter Hinweis wieder angezeigt wird, auch wenn der alte schon weggeklickt wurde
  const schluessel = (h) => JSON.stringify([h.jahr, h.titel, h.einleitung, h.punkte, h.schluss]);

  return { html, schluessel };
})();
