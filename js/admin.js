/*
  Balzner BBQ – Verwaltung (Demo)
  -------------------------------
  Jede Ansicht ist eine Funktion, die HTML in <main id="ansicht"> schreibt:
    uebersicht()   Kennzahlen + Diagramme
    kurse()        Termine anlegen/ändern/löschen, Teilnehmerliste, Drucken
    produkte()     Produkte anlegen/ändern/löschen, sichtbar/ausverkauft
    bestellungen() Bestellungen ansehen und Status setzen
    gutscheine()   Gutscheine ansehen, einlösen, erstellen
    anfragen()     Catering- und Kontaktanfragen
  Die Daten kommen aus js/store.js (gemeinsam mit der Webseite).
*/

// ---------- Hilfsfunktionen ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[z]));
const chf = (b) => "CHF " + Number(b).toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const chfRund = (b) => "CHF " + Math.round(b).toLocaleString("de-CH");
const datum = (iso) => iso ? new Date(iso + "T12:00").toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" }) : "–";
const datumLang = (iso) => new Date(iso + "T12:00").toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
const heute = () => Store.tagISO(new Date());
const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const ZAHLART = { twint: "TWINT", karte: "Karte", rechnung: "Rechnung", paypal: "PayPal", bar: "Bar" };

let db = Store.laden();
let aktuelleAnsicht = "uebersicht";
const merker = { kursTab: "kommend", bestFilter: "alle", bestSuche: "" };

function speichern() { Store.speichern(); zaehlerAktualisieren(); }

function meldung(text) {
  let t = $(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = text; t.classList.add("zeigen");
  clearTimeout(t.timer); t.timer = setTimeout(() => t.classList.remove("zeigen"), 2200);
}

const dialog = $("#dialog");
function dialogZeigen(html) { $("#dialogInhalt").innerHTML = html; if (!dialog.open) dialog.showModal(); }
dialog.addEventListener("click", (e) => { if (e.target === dialog || e.target.closest("[data-dialog-zu]")) dialog.close(); });

// ---------- Anmeldung (Demo) ----------
function anmelden(an) {
  try { an ? sessionStorage.setItem("bbq-admin", "1") : sessionStorage.removeItem("bbq-admin"); } catch (e) {}
  $("#login").hidden = an; $("#app").hidden = !an;
  if (an) zeigen(aktuelleAnsicht);
}
$("#anmelden").addEventListener("click", () => anmelden(true));
$("#abmelden").addEventListener("click", () => anmelden(false));
$("#zuruecksetzen").addEventListener("click", () => {
  if (!confirm("Alle Demo-Daten auf die Beispieldaten zurücksetzen? Eigene Änderungen gehen verloren.")) return;
  db = Store.zuruecksetzen(); zaehlerAktualisieren(); if (!$("#app").hidden) zeigen(aktuelleAnsicht); meldung("Beispieldaten wiederhergestellt");
});

// ---------- Navigation ----------
const ANSICHTEN = { uebersicht, kurse, produkte, bestellungen, gutscheine, hinweis, anfragen };
function zeigen(name) {
  if (!ANSICHTEN[name]) name = "uebersicht"; // unbekannte Ansicht (z. B. alte Datei im Cache): nicht abstürzen
  if (aktuelleAnsicht === "hinweis" && name !== "hinweis" && merker.hinweisEntwurf && merker.hinweisGeaendert &&
      !confirm("Die Änderungen am Hinweis sind noch nicht gespeichert. Trotzdem wechseln?")) return;
  if (name !== "hinweis") merker.hinweisEntwurf = null;
  aktuelleAnsicht = name;
  $$(".navpunkt[data-ansicht]").forEach((b) => b.classList.toggle("aktiv", b.dataset.ansicht === name));
  ANSICHTEN[name]();
  zaehlerAktualisieren();
}
$$(".navpunkt[data-ansicht]").forEach((b) => b.addEventListener("click", () => { zeigen(b.dataset.ansicht); window.scrollTo(0, 0); }));

function zaehlerAktualisieren() {
  const neu = db.bestellungen.filter((b) => b.status === "neu").length;
  const offen = db.anfragen.filter((a) => !a.erledigt).length;
  const z1 = $("#zahlBestellungen"), z2 = $("#zahlAnfragen");
  z1.textContent = neu; z1.hidden = !neu;
  z2.textContent = offen; z2.hidden = !offen;
  $("#zahlHinweis").hidden = !db.hinweis?.aktiv;
}

// Daten in anderem Tab geändert (z. B. jemand bucht auf der Webseite)
document.addEventListener("store-geaendert", () => { db = Store.laden(); if (!$("#app").hidden) zeigen(aktuelleAnsicht); meldung("Neue Daten von der Webseite"); });

// =====================================================================
// AUSWERTUNG
// =====================================================================
function letzte12Monate() {
  const jetzt = new Date(), liste = [];
  for (let m = 11; m >= 0; m--) {
    const d = new Date(jetzt.getFullYear(), jetzt.getMonth() - m, 1);
    liste.push({ key: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"), label: MONATE[d.getMonth()], jahr: d.getFullYear(), shop: 0, kurse: 0, gutscheine: 0 });
  }
  return liste;
}
function umsatzProMonat() {
  const monate = letzte12Monate(), idx = Object.fromEntries(monate.map((m, i) => [m.key, i]));
  const add = (iso, feld, betrag) => { const i = idx[iso.slice(0, 7)]; if (i !== undefined) monate[i][feld] += betrag; };
  db.bestellungen.forEach((b) => add(b.datum, "shop", b.waren));
  db.kurse.forEach((k) => k.teilnehmer.forEach((t) => add(t.gebucht, "kurse", t.betrag)));
  db.gutscheine.forEach((g) => add(g.datum, "gutscheine", g.betrag));
  monate.forEach((m) => (m.total = m.shop + m.kurse + m.gutscheine));
  return monate;
}
function verkaufteStueck() {
  const grenze = letzte12Monate()[0].key + "-01", zahl = {};
  db.bestellungen.filter((b) => b.datum >= grenze).forEach((b) => b.positionen.forEach((p) => (zahl[p.id] = (zahl[p.id] || 0) + p.menge)));
  return zahl;
}

// =====================================================================
// DIAGRAMME (selbst gezeichnet als SVG, keine externen Bibliotheken)
// =====================================================================
const SERIEN = [
  { feld: "shop", name: "Shop", farbe: "var(--serie-1)" },
  { feld: "kurse", name: "Kurse", farbe: "var(--serie-2)" },
  { feld: "gutscheine", name: "Gutscheine", farbe: "var(--serie-3)" },
];
const tooltip = $("#tooltip");
function tooltipZeigen(e, html) {
  tooltip.innerHTML = html; tooltip.classList.add("sichtbar");
  const b = tooltip.offsetWidth, h = tooltip.offsetHeight;
  let x = e.clientX + 14, y = e.clientY - h - 10;
  if (x + b > innerWidth - 8) x = e.clientX - b - 14;
  if (y < 8) y = e.clientY + 16;
  tooltip.style.left = x + "px"; tooltip.style.top = y + "px";
}
const tooltipWeg = () => tooltip.classList.remove("sichtbar");

// Pfad für einen Balken mit abgerundeter Oberkante (4 px)
function balkenPfad(x, y, w, h, r) {
  r = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
function schoeneSkala(max) {
  const roh = max / 4, mag = Math.pow(10, Math.floor(Math.log10(roh)));
  const schritt = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= roh);
  return { schritt, oben: Math.ceil(max / schritt) * schritt };
}

function gestapelteBalken(el, daten) {
  const breite = el.clientWidth || 600, hoehe = 260, li = 58, re = 8, ob = 10, un = 28;
  const pw = breite - li - re, ph = hoehe - ob - un;
  const { schritt, oben } = schoeneSkala(Math.max(...daten.map((d) => d.total), 1));
  const y = (v) => ob + ph - (v / oben) * ph;
  const spalte = pw / daten.length, bw = Math.min(38, spalte * 0.62);
  let svg = `<svg height="${hoehe}" viewBox="0 0 ${breite} ${hoehe}" role="img" aria-label="Umsatz pro Monat nach Bereich">`;
  for (let v = 0; v <= oben; v += schritt) {
    svg += `<line x1="${li}" x2="${breite - re}" y1="${y(v)}" y2="${y(v)}" stroke="var(--gitter)" stroke-width="1"/>`;
    svg += `<text x="${li - 8}" y="${y(v) + 4}" text-anchor="end">${v >= 1000 ? (v / 1000).toLocaleString("de-CH") + "k" : v}</text>`;
  }
  daten.forEach((d, i) => {
    const x = li + i * spalte + (spalte - bw) / 2;
    let basis = 0;
    const teile = SERIEN.filter((s) => d[s.feld] > 0);
    teile.forEach((s, j) => {
      const y0 = y(basis), y1 = y(basis + d[s.feld]);
      const gap = j > 0 ? 2 : 0; // 2 px Abstand zwischen den Segmenten
      const h = Math.max(0, y0 - y1 - gap);
      svg += j === teile.length - 1
        ? `<path d="${balkenPfad(x, y1, bw, h, 4)}" fill="${s.farbe}"/>`
        : `<rect x="${x}" y="${y1}" width="${bw}" height="${h}" fill="${s.farbe}"/>`;
      basis += d[s.feld];
    });
    const zeigeLabel = daten.length <= 12 && (spalte > 34 || i % 2 === 0);
    if (zeigeLabel) svg += `<text x="${x + bw / 2}" y="${hoehe - 8}" text-anchor="middle">${d.label}</text>`;
    svg += `<rect class="treffer" data-i="${i}" x="${li + i * spalte}" y="${ob}" width="${spalte}" height="${ph}" fill="transparent"/>`;
  });
  svg += "</svg>";
  el.innerHTML = svg;
  $$(".treffer", el).forEach((r) => {
    r.addEventListener("mousemove", (e) => {
      const d = daten[r.dataset.i];
      tooltipZeigen(e, `<b>${d.label} ${d.jahr}</b>` + SERIEN.map((s) => `<div class="zeile"><i style="background:${s.farbe}"></i><span>${s.name}</span><span>${chfRund(d[s.feld])}</span></div>`).join("") +
        `<div class="zeile" style="border-top:1px solid #4a3f35;margin-top:4px;padding-top:4px"><span>Total</span><span>${chfRund(d.total)}</span></div>`);
    });
    r.addEventListener("mouseleave", tooltipWeg);
  });
}

function horizontaleBalken(eintraege, max, format) {
  return `<div class="hbalken">${eintraege.map((e) => `
    <div class="hb-zeile" title="${esc(e.titel || "")}">
      <span class="name">${e.name}</span>
      <div class="hb-spur"><div class="hb-wert ${e.klasse || ""}" style="width:${Math.max(1, (e.wert / (e.max || max)) * 100)}%"></div></div>
      <span class="zahl">${format(e)}</span>
    </div>`).join("")}</div>`;
}

// =====================================================================
// ÜBERSICHT
// =====================================================================
function uebersicht() {
  const monate = umsatzProMonat();
  const total12 = monate.reduce((s, m) => s + m.total, 0);
  const dieser = monate[11], vor = monate[10];
  const neu = db.bestellungen.filter((b) => b.status === "neu");
  const offeneAnfragen = db.anfragen.filter((a) => !a.erledigt).length;
  const kommende = db.kurse.filter((k) => k.aktiv && k.datum >= heute()).sort((a, b) => a.datum.localeCompare(b.datum));
  const naechster = kommende[0];
  const offeneGutscheine = db.gutscheine.filter((g) => !g.eingeloest).reduce((s, g) => s + g.betrag, 0);

  const stueck = verkaufteStueck();
  const bestseller = db.produkte.map((p) => ({ name: esc(p.name), wert: stueck[p.id] || 0 })).sort((a, b) => b.wert - a.wert);
  const kursListe = db.kurse.slice().sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 8)
    .map((k) => ({ name: `${esc(k.titel)} <small>${datum(k.datum)}</small>`, titel: k.titel, wert: Store.belegt(k), max: k.plaetze, klasse: k.datum >= heute() ? "kommend" : "" }));
  const auslastungVergangen = db.kurse.filter((k) => k.datum < heute());
  const schnitt = auslastungVergangen.length ? Math.round(auslastungVergangen.reduce((s, k) => s + Store.belegt(k) / k.plaetze, 0) / auslastungVergangen.length * 100) : 0;

  $("#ansicht").innerHTML = `
    <div class="kopfzeile"><div><h1>Übersicht</h1><p>Guten Tag! Das läuft gerade bei Balzner BBQ.</p></div></div>
    <div class="kennzahlen">
      <div class="kennzahl"><span class="label">Umsatz 12 Monate</span><span class="wert">${chfRund(total12)}</span><span class="info">Shop, Kurse und Gutscheine</span></div>
      <div class="kennzahl"><span class="label">Umsatz ${MONATE[new Date().getMonth()]}</span><span class="wert">${chfRund(dieser.total)}</span>
        <span class="info">bis heute · ${MONATE[(new Date().getMonth() + 11) % 12]} total: ${chfRund(vor.total)}</span></div>
      <button class="kennzahl" data-gehe="bestellungen"><span class="label">Neue Bestellungen</span><span class="wert">${neu.length}</span><span class="info">${neu.length ? "warten auf Versand →" : "alles erledigt ✓"}</span></button>
      <button class="kennzahl" data-gehe="kurse"><span class="label">Nächster Kurs</span><span class="wert" style="font-size:1.25rem">${naechster ? esc(naechster.titel) : "–"}</span>
        <span class="info">${naechster ? `${datum(naechster.datum)} · ${Store.belegt(naechster)}/${naechster.plaetze} Plätze` : "keiner geplant"}</span></button>
      <button class="kennzahl" data-gehe="anfragen"><span class="label">Offene Anfragen</span><span class="wert">${offeneAnfragen}</span><span class="info">Catering & Kontakt →</span></button>
    </div>

    <div class="karte" style="margin-bottom:16px">
      <h2>Umsatz pro Monat</h2>
      <p class="unter">Letzte 12 Monate. Kurse nach Buchungsdatum, Shop ohne Versandkosten.</p>
      <div class="legende">${SERIEN.map((s) => `<span><i style="background:${s.farbe}"></i>${s.name}</span>`).join("")}</div>
      <div class="diagramm" id="umsatzDiagramm"></div>
      <details class="tabelle-zeigen"><summary>Als Tabelle anzeigen</summary>
        <div class="tabelle-wrap" style="margin-top:10px"><table class="tab"><thead><tr><th>Monat</th>${SERIEN.map((s) => `<th class="r">${s.name}</th>`).join("")}<th class="r">Total</th></tr></thead>
        <tbody>${monate.map((m) => `<tr><td>${m.label} ${m.jahr}</td>${SERIEN.map((s) => `<td class="r">${chfRund(m[s.feld])}</td>`).join("")}<td class="r"><b>${chfRund(m.total)}</b></td></tr>`).join("")}</tbody></table></div>
      </details>
    </div>

    <div class="raster raster-2">
      <div class="karte">
        <h2>Bestseller</h2>
        <p class="unter">Verkaufte Stück in den letzten 12 Monaten</p>
        ${horizontaleBalken(bestseller, Math.max(1, bestseller[0]?.wert || 1), (e) => e.wert + " Stk.")}
      </div>
      <div class="karte">
        <h2>Kursauslastung</h2>
        <p class="unter">Ø ${schnitt} % bei vergangenen Kursen · gestreift = noch offen</p>
        ${horizontaleBalken(kursListe, 1, (e) => `${e.wert}/${e.max}`)}
      </div>
      <div class="karte">
        <h2>Gutscheine</h2>
        <p class="unter">Noch nicht eingelöst</p>
        <span class="kennzahl" style="border:0;padding:0"><span class="wert">${chfRund(offeneGutscheine)}</span>
        <span class="info">${db.gutscheine.filter((g) => !g.eingeloest).length} offene Gutscheine</span></span>
      </div>
      <div class="karte">
        <h2>Zahlarten im Shop</h2>
        <p class="unter">Anteil der Bestellungen, 12 Monate</p>
        ${(() => {
          const z = {}; db.bestellungen.forEach((b) => (z[b.zahlart] = (z[b.zahlart] || 0) + 1));
          const n = db.bestellungen.length || 1;
          const e = Object.entries(z).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: ZAHLART[k] || k, wert: v / n }));
          return horizontaleBalken(e, 1, (x) => Math.round(x.wert * 100) + " %");
        })()}
      </div>
    </div>`;

  gestapelteBalken($("#umsatzDiagramm"), monate);
  $$("[data-gehe]").forEach((b) => b.addEventListener("click", () => zeigen(b.dataset.gehe)));
}
let resizeTimer;
addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { const el = $("#umsatzDiagramm"); if (el) gestapelteBalken(el, umsatzProMonat()); }, 150); });

// =====================================================================
// KURSE
// =====================================================================
function kurse() {
  const kommend = merker.kursTab === "kommend";
  const liste = db.kurse.filter((k) => (kommend ? k.datum >= heute() : k.datum < heute()))
    .sort((a, b) => (kommend ? a.datum.localeCompare(b.datum) : b.datum.localeCompare(a.datum)));
  $("#ansicht").innerHTML = `
    <div class="kopfzeile"><div><h1>Kurse</h1><p>Termine verwalten. Freie Plätze zählen bei jeder Buchung automatisch herunter.</p></div>
      <button class="btn btn-glut" id="neuerKurs">+ Neuer Kurs</button></div>
    <div class="werkzeug"><div class="chips">
      <button class="chip ${kommend ? "aktiv" : ""}" data-tab="kommend">Kommende</button>
      <button class="chip ${!kommend ? "aktiv" : ""}" data-tab="vergangen">Vergangene</button></div></div>
    ${liste.length ? `<div class="tabelle-wrap"><table class="tab">
      <thead><tr><th>Datum</th><th>Kurs</th><th>Belegung</th><th class="r">Preis</th><th class="r">Umsatz</th>${kommend ? "<th>Auf Webseite</th>" : ""}<th></th></tr></thead>
      <tbody>${liste.map((k) => {
        const b = Store.belegt(k), umsatz = k.teilnehmer.reduce((s, t) => s + t.betrag, 0);
        const st = b >= k.plaetze ? '<span class="status status-ok">voll</span>' : "";
        return `<tr>
          <td><b>${datum(k.datum)}</b><br><span class="grau">${esc(k.zeit)}</span></td>
          <td>${esc(k.titel)}<br><span class="grau">📍 ${esc(k.ort)}</span></td>
          <td><div class="belegung"><div class="hb-spur"><div class="hb-wert" style="width:${(b / k.plaetze) * 100}%"></div></div><span>${b}/${k.plaetze}</span> ${st}</div></td>
          <td class="r">${chf(k.preis)}</td><td class="r">${chfRund(umsatz)}</td>
          ${kommend ? `<td><label class="schalter"><input type="checkbox" data-sichtbar="${k.id}" ${k.aktiv ? "checked" : ""}><span>${k.aktiv ? "sichtbar" : "versteckt"}</span></label></td>` : ""}
          <td class="aktionen"><button class="knopf" data-teilnehmer="${k.id}">👥 Teilnehmer</button><button class="knopf" data-bearbeiten="${k.id}">Bearbeiten</button><button class="knopf gefahr" data-loeschen="${k.id}" title="Löschen">🗑</button></td>
        </tr>`;
      }).join("")}</tbody></table></div>` : `<div class="karte leer">Keine ${kommend ? "kommenden" : "vergangenen"} Kurse.</div>`}`;

  $$("[data-tab]").forEach((b) => b.addEventListener("click", () => { merker.kursTab = b.dataset.tab; kurse(); }));
  $("#neuerKurs").addEventListener("click", () => kursFormular());
  $$("[data-bearbeiten]").forEach((b) => b.addEventListener("click", () => kursFormular(db.kurse.find((k) => k.id === b.dataset.bearbeiten))));
  $$("[data-teilnehmer]").forEach((b) => b.addEventListener("click", () => teilnehmerListe(db.kurse.find((k) => k.id === b.dataset.teilnehmer))));
  $$("[data-sichtbar]").forEach((c) => c.addEventListener("change", () => {
    const k = db.kurse.find((x) => x.id === c.dataset.sichtbar); k.aktiv = c.checked; speichern(); kurse();
    meldung(c.checked ? "Kurs ist auf der Webseite sichtbar" : "Kurs ist auf der Webseite versteckt");
  }));
  $$("[data-loeschen]").forEach((b) => b.addEventListener("click", () => {
    const k = db.kurse.find((x) => x.id === b.dataset.loeschen);
    const n = Store.belegt(k);
    if (!confirm(`Kurs «${k.titel}» vom ${datum(k.datum)} löschen?` + (n ? `\n\nAchtung: ${n} Personen sind angemeldet.` : ""))) return;
    db.kurse = db.kurse.filter((x) => x !== k); speichern(); kurse(); meldung("Kurs gelöscht");
  }));
}

function kursFormular(k) {
  const neu = !k;
  k = k || { titel: "", datum: "", zeit: "14:00–19:00", ort: "Balzers", preis: 149, plaetze: 12, text: "" };
  dialogZeigen(`
    <h3>${neu ? "Neuer Kurs" : "Kurs bearbeiten"}</h3>
    <form class="formular" id="kursForm">
      <label>Titel<input name="titel" required value="${esc(k.titel)}" placeholder="z. B. Grill-Basiskurs"></label>
      <div class="reihe"><label>Datum<input type="date" name="datum" required value="${esc(k.datum)}"></label>
        <label>Zeit<input name="zeit" value="${esc(k.zeit)}"></label></div>
      <div class="reihe"><label>Ort<input name="ort" value="${esc(k.ort)}"></label>
        <label>Preis pro Person (CHF)<input type="number" name="preis" min="0" step="1" required value="${k.preis}"></label></div>
      <label>Anzahl Plätze<input type="number" name="plaetze" min="1" required value="${k.plaetze}"></label>
      <label>Beschreibung (auf der Webseite)<textarea name="text" rows="3">${esc(k.text)}</textarea></label>
      <div class="dialog-fuss"><button type="button" class="knopf" data-dialog-zu>Abbrechen</button><button class="knopf haupt" type="submit">${neu ? "Kurs anlegen" : "Speichern"}</button></div>
    </form>`);
  $("#kursForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const werte = { titel: f.titel.value.trim(), datum: f.datum.value, zeit: f.zeit.value, ort: f.ort.value, preis: Number(f.preis.value), plaetze: Number(f.plaetze.value), text: f.text.value };
    if (!neu && werte.plaetze < Store.belegt(k)) { alert(`Es sind schon ${Store.belegt(k)} Personen angemeldet. Weniger Plätze geht nicht.`); return; }
    if (neu) db.kurse.push({ id: Store.neueId("k"), ...werte, aktiv: true, teilnehmer: [] });
    else Object.assign(k, werte);
    speichern(); dialog.close();
    merker.kursTab = werte.datum >= heute() ? "kommend" : "vergangen";
    kurse(); meldung(neu ? "Kurs angelegt und auf der Webseite sichtbar" : "Kurs gespeichert");
  });
}

function teilnehmerListe(k) {
  const zeile = (t, i) => `<tr><td><b>${esc(t.name)}</b><br><span class="grau">${esc(t.email)}</span></td><td style="white-space:nowrap">${esc(t.telefon)}</td><td class="r">${t.personen}</td>
    <td>${esc(t.bemerkung) || '<span class="grau">–</span>'}</td><td><span class="grau">${ZAHLART[t.zahlart] || esc(t.zahlart)}</span></td>
    <td class="aktionen"><button class="knopf gefahr" data-weg="${i}" title="Abmelden">✕</button></td></tr>`;
  dialogZeigen(`
    <h3>${esc(k.titel)}</h3>
    <p>${datumLang(k.datum)} · ${esc(k.zeit)} · ${Store.belegt(k)} von ${k.plaetze} Plätzen belegt</p>
    ${k.teilnehmer.length ? `<div class="tabelle-wrap"><table class="tab"><thead><tr><th>Name</th><th>Telefon</th><th class="r">Pers.</th><th>Bemerkung</th><th>Bezahlt</th><th></th></tr></thead>
      <tbody>${k.teilnehmer.map(zeile).join("")}</tbody></table></div>` : '<p class="leer">Noch keine Anmeldungen.</p>'}
    <details><summary class="knopf" style="display:inline-block">+ Teilnehmer von Hand eintragen</summary>
      <form class="formular" id="tnForm" style="margin-top:12px">
        <div class="reihe"><label>Name<input name="name" required></label><label>Telefon<input name="telefon"></label></div>
        <div class="reihe"><label>E-Mail<input type="email" name="email"></label><label>Personen<input type="number" name="personen" min="1" value="1" required></label></div>
        <div class="reihe"><label>Bemerkung<input name="bemerkung"></label><label>Bezahlt mit<select name="zahlart"><option value="bar">Bar</option><option value="twint">TWINT</option><option value="rechnung">Rechnung</option></select></label></div>
        <button class="knopf haupt" type="submit">Eintragen</button>
      </form></details>
    <div class="dialog-fuss"><button class="knopf" id="drucken">🖨 Liste drucken</button><button class="knopf" data-dialog-zu>Schliessen</button></div>`);

  $$("[data-weg]").forEach((b) => b.addEventListener("click", () => {
    const t = k.teilnehmer[b.dataset.weg];
    if (!confirm(`${t.name} vom Kurs abmelden?`)) return;
    k.teilnehmer.splice(b.dataset.weg, 1); speichern(); teilnehmerListe(k); kurse();
  }));
  $("#tnForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target, personen = Number(f.personen.value);
    if (personen > Store.frei(k)) { alert(`Nur noch ${Store.frei(k)} Plätze frei.`); return; }
    k.teilnehmer.push({ name: f.name.value, email: f.email.value, telefon: f.telefon.value, personen, bemerkung: f.bemerkung.value, gebucht: heute(), zahlart: f.zahlart.value, betrag: personen * k.preis });
    speichern(); teilnehmerListe(k); kurse(); meldung("Teilnehmer eingetragen");
  });
  $("#drucken").addEventListener("click", () => {
    $("#druckbereich").innerHTML = `<h2>${esc(k.titel)}: ${datumLang(k.datum)}, ${esc(k.zeit)}</h2><p>${esc(k.ort)} · ${Store.belegt(k)} Personen</p>
      <table><thead><tr><th>Name</th><th>Telefon</th><th>Pers.</th><th>Bemerkung / Allergien</th><th>✓</th></tr></thead>
      <tbody>${k.teilnehmer.map((t) => `<tr><td>${esc(t.name)}</td><td>${esc(t.telefon)}</td><td>${t.personen}</td><td>${esc(t.bemerkung)}</td><td></td></tr>`).join("")}</tbody></table>`;
    document.body.classList.add("drucken"); dialog.close(); window.print(); document.body.classList.remove("drucken");
  });
}

// =====================================================================
// PRODUKTE
// =====================================================================
function produkte() {
  const stueck = verkaufteStueck();
  $("#ansicht").innerHTML = `
    <div class="kopfzeile"><div><h1>Produkte</h1><p>Was hier sichtbar ist, erscheint sofort im Shop der Webseite.</p></div>
      <button class="btn btn-glut" id="neuesProdukt">+ Neues Produkt</button></div>
    <div class="produkt-liste">${db.produkte.map((p) => `
      <article class="pk ${p.aktiv ? "" : "versteckt"}">
        <div class="pk-bild"><img src="${esc(p.bild)}" alt="">
          ${p.ausverkauft ? '<span class="status status-neu">Ausverkauft</span>' : !p.aktiv ? '<span class="status status-grau">Versteckt</span>' : ""}</div>
        <div class="pk-text">
          <div class="pk-kopf"><h3>${esc(p.name)}</h3><strong>${chf(p.preis)}</strong></div>
          <div class="pk-info">${p.typ === "box" ? "Geschenkbox" : "Gewürz"} · ${stueck[p.id] || 0} verkauft (12 Mt.)</div>
          <div class="pk-schalter">
            <label class="schalter"><input type="checkbox" data-aktiv="${p.id}" ${p.aktiv ? "checked" : ""}>Im Shop</label>
            <label class="schalter"><input type="checkbox" class="rot" data-aus="${p.id}" ${p.ausverkauft ? "checked" : ""}>Ausverkauft</label>
          </div>
          <div class="pk-aktionen"><button class="knopf" data-bearbeiten="${p.id}">Bearbeiten</button><button class="knopf gefahr" data-loeschen="${p.id}">Löschen</button></div>
        </div>
      </article>`).join("")}</div>`;

  $("#neuesProdukt").addEventListener("click", () => produktFormular());
  $$("[data-bearbeiten]").forEach((b) => b.addEventListener("click", () => produktFormular(db.produkte.find((p) => p.id === b.dataset.bearbeiten))));
  $$("[data-aktiv]").forEach((c) => c.addEventListener("change", () => { db.produkte.find((p) => p.id === c.dataset.aktiv).aktiv = c.checked; speichern(); produkte(); }));
  $$("[data-aus]").forEach((c) => c.addEventListener("change", () => { db.produkte.find((p) => p.id === c.dataset.aus).ausverkauft = c.checked; speichern(); produkte(); }));
  $$("[data-loeschen]").forEach((b) => b.addEventListener("click", () => {
    const p = db.produkte.find((x) => x.id === b.dataset.loeschen);
    if (!confirm(`«${p.name}» endgültig löschen?\n\nTipp: Mit «Im Shop» aus kann man es auch nur verstecken.`)) return;
    db.produkte = db.produkte.filter((x) => x !== p); speichern(); produkte(); meldung("Produkt gelöscht");
  }));
}

function produktFormular(p) {
  const neu = !p;
  p = p || { name: "", preis: 12, typ: "gewuerz", text: "", bild: "img/produkte/schwein.jpg", neu: true };
  let bild = p.bild;
  dialogZeigen(`
    <h3>${neu ? "Neues Produkt" : "Produkt bearbeiten"}</h3>
    <form class="formular" id="pForm">
      <div class="reihe" style="align-items:start">
        <div style="display:grid;gap:8px"><img class="bild-vorschau" id="pVorschau" src="${esc(bild)}" alt="">
          <label class="knopf" style="text-align:center">📷 Bild wählen<input type="file" accept="image/*" id="pDatei" hidden></label></div>
        <div style="display:grid;gap:12px">
          <label>Name<input name="name" required value="${esc(p.name)}" placeholder="z. B. Gewürz Rind"></label>
          <label>Preis (CHF)<input type="number" name="preis" min="0" step="0.5" required value="${p.preis}"></label>
          <label>Art<select name="typ"><option value="gewuerz" ${p.typ === "gewuerz" ? "selected" : ""}>Gewürz</option><option value="box" ${p.typ === "box" ? "selected" : ""}>Geschenkbox</option></select></label>
          <label class="schalter"><input type="checkbox" name="neu" ${p.neu ? "checked" : ""}>Als «Neu» markieren</label>
        </div>
      </div>
      <label>Beschreibung<textarea name="text" rows="3">${esc(p.text)}</textarea></label>
      <div class="dialog-fuss"><button type="button" class="knopf" data-dialog-zu>Abbrechen</button><button class="knopf haupt" type="submit">${neu ? "Produkt anlegen" : "Speichern"}</button></div>
    </form>`);

  // Bild verkleinern (max. 600 px), damit es in den Browser-Speicher passt
  $("#pDatei").addEventListener("change", (e) => {
    const datei = e.target.files[0]; if (!datei) return;
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 600 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      bild = c.toDataURL("image/jpeg", 0.82); $("#pVorschau").src = bild; URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(datei);
  });
  $("#pForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const werte = { name: f.name.value.trim(), preis: Number(f.preis.value), typ: f.typ.value, text: f.text.value, bild, neu: f.neu.checked };
    if (werte.typ === "box" && !p.auswahl && werte.name.toLowerCase().includes("klein")) werte.auswahl = 2;
    if (neu) db.produkte.push({ id: Store.neueId("p"), ...werte, aktiv: true, ausverkauft: false });
    else Object.assign(p, werte);
    speichern(); dialog.close(); produkte(); meldung(neu ? "Produkt angelegt und im Shop sichtbar" : "Produkt gespeichert");
  });
}

// =====================================================================
// BESTELLUNGEN
// =====================================================================
const STATUS = {
  neu: '<span class="status status-neu">● Neu</span>',
  versendet: '<span class="status status-ok">✓ Versendet</span>',
  abgeholt: '<span class="status status-ok">✓ Abgeholt</span>',
};
function bestellungen() {
  const f = merker.bestFilter, q = merker.bestSuche.toLowerCase();
  const liste = db.bestellungen.filter((b) => (f === "alle" || b.status === f) && (!q || (b.id + " " + b.name + " " + b.email).toLowerCase().includes(q)));
  const anz = (s) => db.bestellungen.filter((b) => b.status === s).length;
  $("#ansicht").innerHTML = `
    <div class="kopfzeile"><div><h1>Bestellungen</h1><p>Aus dem Shop. Neue Bestellungen versenden oder zur Abholung bereitlegen.</p></div></div>
    <div class="werkzeug">
      <div class="chips">${[["alle", "Alle", db.bestellungen.length], ["neu", "Neu", anz("neu")], ["versendet", "Versendet", anz("versendet")], ["abgeholt", "Abgeholt", anz("abgeholt")]]
        .map(([k, t, n]) => `<button class="chip ${f === k ? "aktiv" : ""}" data-filter="${k}">${t} (${n})</button>`).join("")}</div>
      <input class="suche" id="suche" type="search" placeholder="Suchen: Name, Nr., E-Mail" value="${esc(merker.bestSuche)}">
    </div>
    ${liste.length ? `<div class="tabelle-wrap"><table class="tab">
      <thead><tr><th>Nr.</th><th>Datum</th><th>Kunde</th><th>Artikel</th><th class="r">Total</th><th>Lieferung</th><th>Status</th><th></th></tr></thead>
      <tbody>${liste.slice(0, 150).map((b) => `<tr class="klickbar" data-detail="${b.id}">
        <td><b>${b.id}</b></td><td>${datum(b.datum)}</td><td>${esc(b.name)}</td>
        <td class="grau">${b.positionen.map((p) => (p.menge > 1 ? p.menge + "× " : "") + esc(p.name)).join(", ")}</td>
        <td class="r">${chf(b.total)}</td><td>${b.lieferung === "abholung" ? "🏠 Abholung" : "📦 Versand"}</td><td>${STATUS[b.status]}</td>
        <td class="aktionen">${b.status === "neu" ? `<button class="knopf haupt" data-erledigt="${b.id}">${b.lieferung === "abholung" ? "Abgeholt" : "Versendet"}</button>` : ""}</td>
      </tr>`).join("")}</tbody></table></div>` : '<div class="karte leer">Keine Bestellungen gefunden.</div>'}`;

  $$("[data-filter]").forEach((b) => b.addEventListener("click", () => { merker.bestFilter = b.dataset.filter; bestellungen(); }));
  $("#suche").addEventListener("input", (e) => { merker.bestSuche = e.target.value; const pos = e.target.selectionStart; bestellungen(); const s = $("#suche"); s.focus(); s.setSelectionRange(pos, pos); });
  $$("[data-erledigt]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); bestellungErledigt(b.dataset.erledigt); }));
  $$("[data-detail]").forEach((r) => r.addEventListener("click", () => bestellungDetail(db.bestellungen.find((b) => b.id === r.dataset.detail))));
}
function bestellungErledigt(id) {
  const b = db.bestellungen.find((x) => x.id === id);
  b.status = b.lieferung === "abholung" ? "abgeholt" : "versendet";
  speichern(); bestellungen(); meldung(`${b.id} als ${b.status} markiert`);
}
function bestellungDetail(b) {
  const gewuerzName = (id) => db.produkte.find((p) => p.id === id)?.name.replace("Gewürz ", "") || id;
  dialogZeigen(`
    <h3>Bestellung ${b.id} ${STATUS[b.status]}</h3>
    <p>${datumLang(b.datum)} · bezahlt mit ${ZAHLART[b.zahlart] || esc(b.zahlart)}</p>
    <div class="raster raster-2">
      <div><b>${esc(b.name)}</b><br><a href="mailto:${esc(b.email)}">${esc(b.email)}</a>${b.telefon ? `<br>${esc(b.telefon)}` : ""}</div>
      <div><b>${b.lieferung === "abholung" ? "Abholung in Balzers" : "Versand an"}</b><br>${esc(b.adresse)}</div>
    </div>
    <div class="tabelle-wrap"><table class="tab"><tbody>
      ${b.positionen.map((p) => `<tr><td>${p.menge}×</td><td>${esc(p.name)}${p.inhalt ? `<br><span class="grau">mit ${p.inhalt.map(gewuerzName).map(esc).join(" & ")}</span>` : ""}</td><td class="r">${chf(p.preis * p.menge)}</td></tr>`).join("")}
      <tr><td></td><td class="grau">Versand</td><td class="r">${b.versand ? chf(b.versand) : "gratis"}</td></tr>
      <tr><td></td><td><b>Total</b></td><td class="r"><b>${chf(b.total)}</b></td></tr>
    </tbody></table></div>
    <div class="dialog-fuss">
      ${b.status === "neu" ? `<button class="knopf haupt" id="dErledigt">${b.lieferung === "abholung" ? "Als abgeholt markieren" : "Als versendet markieren"}</button>`
        : `<button class="knopf" id="dZurueck">Zurück auf «Neu»</button>`}
      <button class="knopf" data-dialog-zu>Schliessen</button></div>`);
  $("#dErledigt")?.addEventListener("click", () => { dialog.close(); bestellungErledigt(b.id); });
  $("#dZurueck")?.addEventListener("click", () => { b.status = "neu"; speichern(); dialog.close(); bestellungen(); });
}

// =====================================================================
// GUTSCHEINE
// =====================================================================
function gutscheine() {
  const offen = db.gutscheine.filter((g) => !g.eingeloest);
  $("#ansicht").innerHTML = `
    <div class="kopfzeile"><div><h1>Gutscheine</h1><p>${offen.length} offen im Wert von ${chfRund(offen.reduce((s, g) => s + g.betrag, 0))}. Beim Einlösen den Code abhaken.</p></div>
      <button class="btn btn-glut" id="neuerGs">+ Gutschein erstellen</button></div>
    <div class="werkzeug"><input class="suche" id="gsSuche" type="search" placeholder="Code oder Name suchen" style="margin-left:0"></div>
    <div class="tabelle-wrap"><table class="tab">
      <thead><tr><th>Code</th><th>Ausgestellt</th><th>Für</th><th class="r">Betrag</th><th>Status</th><th></th></tr></thead>
      <tbody id="gsListe">${db.gutscheine.map((g, i) => `<tr data-such="${esc((g.code + " " + g.fuer).toLowerCase())}">
        <td><b style="font-family:monospace;font-size:1rem">${esc(g.code)}</b></td><td>${datum(g.datum)}</td><td>${esc(g.fuer)}</td><td class="r">${chf(g.betrag)}</td>
        <td>${g.eingeloest ? '<span class="status status-grau">Eingelöst</span>' : '<span class="status status-ok">Gültig</span>'}</td>
        <td class="aktionen"><button class="knopf" data-pdf="${i}" title="Gutschein als PDF herunterladen">📄 PDF</button><button class="knopf ${g.eingeloest ? "" : "haupt"}" data-einloesen="${i}">${g.eingeloest ? "Rückgängig" : "Einlösen"}</button></td></tr>`).join("")}</tbody>
    </table></div>`;

  $("#gsSuche").addEventListener("input", (e) => { const q = e.target.value.toLowerCase(); $$("#gsListe tr").forEach((tr) => (tr.hidden = !tr.dataset.such.includes(q))); });
  $$("[data-einloesen]").forEach((b) => b.addEventListener("click", () => { const g = db.gutscheine[b.dataset.einloesen]; g.eingeloest = !g.eingeloest; speichern(); gutscheine(); meldung(g.eingeloest ? `${g.code} eingelöst` : `${g.code} wieder gültig`); }));
  $$("[data-pdf]").forEach((b) => b.addEventListener("click", async () => {
    const g = db.gutscheine[b.dataset.pdf];
    b.disabled = true; await GutscheinPDF.herunterladen(g); b.disabled = false; meldung(`PDF für ${g.code} heruntergeladen`);
  }));
  $("#neuerGs").addEventListener("click", () => {
    dialogZeigen(`<h3>Gutschein erstellen</h3><p>Zum Beispiel für einen Verkauf vor Ort oder als Sponsoring. Das PDF wird sofort heruntergeladen.</p>
      <form class="formular" id="gsForm">
        <div class="reihe"><label>Betrag (CHF)<input type="number" name="betrag" min="1" value="100" required></label><label>Für (Name auf dem Gutschein)<input name="fuer" required></label></div>
        <label>Von (optional)<input name="von" placeholder="z. B. Familie Frick"></label>
        <label>Persönliche Nachricht (optional)<input name="nachricht" maxlength="90" placeholder="z. B. Alles Gute zum Geburtstag!"></label>
        <div class="dialog-fuss"><button type="button" class="knopf" data-dialog-zu>Abbrechen</button><button class="knopf haupt" type="submit">Erstellen & PDF herunterladen</button></div></form>`);
    $("#gsForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, code = neuerCode();
      const g = { code, betrag: Number(f.betrag.value), fuer: f.fuer.value.trim(), von: f.von.value.trim(), nachricht: f.nachricht.value.trim(), datum: heute(), eingeloest: false };
      db.gutscheine.unshift(g); speichern(); gutscheine();
      f.querySelector("[type=submit]").disabled = true;
      const bild = await GutscheinPDF.herunterladen(g);
      gutscheinFertig(g, bild);
    });
  });
}

// Code, den es noch nicht gibt
function neuerCode() {
  let c;
  do { c = "BBQ-" + Math.floor(1000 + Math.random() * 9000); } while (db.gutscheine.some((g) => g.code === c));
  return c;
}
function gutscheinFertig(g, bild) {
  dialogZeigen(`<h3>Gutschein ${esc(g.code)} erstellt</h3>
    <p>Das PDF wurde heruntergeladen (A5 quer, zum Ausdrucken oder per E-Mail Verschicken).</p>
    <img src="${bild}" alt="Vorschau Gutschein" style="width:100%;border-radius:10px;display:block">
    <div class="dialog-fuss"><button class="knopf" id="gsNochmal">📄 Nochmals herunterladen</button><button class="knopf haupt" data-dialog-zu>Fertig</button></div>`);
  $("#gsNochmal").addEventListener("click", () => GutscheinPDF.herunterladen(g));
}

// =====================================================================
// HINWEIS-POPUP
// Man bearbeitet einen Entwurf, sieht rechts live die Vorschau und speichert mit einem Knopf.
// =====================================================================
const VORSCHLAEGE = ["Catering", "Grillkurse", "Wildverarbeitung", "Fleischhandel", "Beratung", "Gewürzversand", "Firmenanlässe"];

function hinweis() {
  if (!merker.hinweisEntwurf) { merker.hinweisEntwurf = structuredClone(db.hinweis); merker.hinweisGeaendert = false; }
  const h = merker.hinweisEntwurf;
  const fehlend = VORSCHLAEGE.filter((v) => !h.punkte.some((p) => p.text.trim().toLowerCase() === v.toLowerCase()));

  $("#ansicht").innerHTML = `
    <div class="kopfzeile"><div><h1>Hinweis-Popup</h1><p>Erscheint beim Öffnen der Webseite, z. B. wenn ein Angebot für ein Jahr ausgebucht ist.</p></div></div>
    <div class="raster raster-2" style="align-items:start">
      <div class="karte">
        <form class="formular hinweis-form" id="hForm" style="box-shadow:none;padding:0">
          <label class="schalter gross"><input type="checkbox" name="aktiv" ${h.aktiv ? "checked" : ""}>
            <span><b>Popup auf der Webseite anzeigen</b><br><small id="hStatus">${h.aktiv ? "Ist eingeschaltet" : "Ist ausgeschaltet"}</small></span></label>

          <div class="reihe">
            <label>Jahr<input type="number" name="jahr" min="2000" max="2100" value="${esc(h.jahr)}"></label>
            <label>Titel<input name="titel" value="${esc(h.titel)}"></label>
          </div>
          <label>Einleitung<textarea name="einleitung" rows="2">${esc(h.einleitung)}</textarea>
            <small class="feldhilfe">{Jahr} wird automatisch durch das Jahr oben ersetzt.</small></label>

          <div>
            <span class="feldtitel">Was ist betroffen? <small>Nur angehakte Punkte erscheinen im Popup.</small></span>
            <div class="punkte" id="hPunkte">${h.punkte.map((p, i) => `
              <div class="punkt">
                <input type="checkbox" data-an="${i}" ${p.an ? "checked" : ""} aria-label="Im Popup anzeigen">
                <input type="text" data-text="${i}" value="${esc(p.text)}" aria-label="Angebot">
                <button type="button" class="knopf gefahr" data-entfernen="${i}" title="Entfernen">🗑</button>
              </div>`).join("")}</div>
            <div class="punkt neu">
              <input type="text" id="hNeu" placeholder="Weiteres Angebot, z. B. Hochzeiten">
              <button type="button" class="knopf" id="hDazu">+ Hinzufügen</button>
            </div>
            ${fehlend.length ? `<div class="chips" style="margin-top:10px">${fehlend.map((v) => `<button type="button" class="chip" data-vorschlag="${esc(v)}">+ ${esc(v)}</button>`).join("")}</div>` : ""}
          </div>

          <label>Schlusstext<textarea name="schluss" rows="2">${esc(h.schluss)}</textarea></label>

          <div class="dialog-fuss" style="justify-content:flex-start">
            <button type="submit" class="btn ${merker.hinweisGeaendert ? "btn-glut" : "btn-dunkel"}" id="hSpeichern">${merker.hinweisGeaendert ? "Speichern" : "Gespeichert ✓"}</button>
            <button type="button" class="knopf" id="hVorlage">Vorlage wiederherstellen</button>
            <a class="knopf" href="index.html" target="_blank" rel="noopener" style="text-decoration:none">Webseite ansehen ↗</a>
          </div>
        </form>
      </div>
      <div class="karte vorschau-karte">
        <h2>Vorschau</h2>
        <p class="unter">So sieht das Popup auf der Webseite aus.${h.aktiv ? "" : " <b>Zurzeit ausgeschaltet.</b>"}</p>
        <div class="vorschau-popup ${h.aktiv ? "" : "aus"}" id="hVorschau">${Hinweis.html(h)}</div>
      </div>
    </div>`;

  const form = $("#hForm");
  const geaendert = () => {
    merker.hinweisGeaendert = true;
    const k = $("#hSpeichern"); k.className = "btn btn-glut"; k.textContent = "Speichern";
    $("#hVorschau").innerHTML = Hinweis.html(h);
    $("#hVorschau").classList.toggle("aus", !h.aktiv);
    $("#hStatus").textContent = h.aktiv ? "Wird eingeschaltet (noch speichern)" : "Wird ausgeschaltet (noch speichern)";
  };
  // Tippen: Entwurf und Vorschau sofort aktualisieren (ohne neu zu zeichnen, damit der Cursor bleibt)
  form.addEventListener("input", (e) => {
    const el = e.target;
    if (el.name === "jahr") h.jahr = el.value;
    else if (["titel", "einleitung", "schluss"].includes(el.name)) h[el.name] = el.value;
    else if (el.dataset.text !== undefined) h.punkte[el.dataset.text].text = el.value;
    else return;
    geaendert();
  });
  form.addEventListener("change", (e) => {
    const el = e.target;
    if (el.name === "aktiv") { h.aktiv = el.checked; geaendert(); }
    else if (el.dataset.an !== undefined) { h.punkte[el.dataset.an].an = el.checked; geaendert(); }
  });
  const neuerPunkt = (text) => {
    text = text.trim(); if (!text) return;
    h.punkte.push({ text, an: true }); merker.hinweisGeaendert = true; hinweis();
  };
  $("#hDazu").addEventListener("click", () => neuerPunkt($("#hNeu").value));
  $("#hNeu").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); neuerPunkt(e.target.value); } });
  $$("[data-vorschlag]").forEach((b) => b.addEventListener("click", () => neuerPunkt(b.dataset.vorschlag)));
  $$("[data-entfernen]").forEach((b) => b.addEventListener("click", () => { h.punkte.splice(b.dataset.entfernen, 1); merker.hinweisGeaendert = true; hinweis(); }));
  $("#hVorlage").addEventListener("click", () => {
    if (!confirm("Texte und Liste auf die Vorlage zurücksetzen?")) return;
    merker.hinweisEntwurf = { ...Store.standardHinweis(), aktiv: h.aktiv }; merker.hinweisGeaendert = true; hinweis();
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    h.jahr = Number(h.jahr) || new Date().getFullYear();
    h.punkte = h.punkte.filter((p) => p.text.trim());
    db.hinweis = structuredClone(h); speichern();
    merker.hinweisGeaendert = false; hinweis();
    meldung(h.aktiv ? "Gespeichert: Popup ist auf der Webseite aktiv" : "Gespeichert: Popup ist ausgeschaltet");
  });
}

// =====================================================================
// ANFRAGEN
// =====================================================================
function anfragen() {
  const liste = db.anfragen.slice().sort((a, b) => a.erledigt - b.erledigt || b.datum.localeCompare(a.datum));
  $("#ansicht").innerHTML = `
    <div class="kopfzeile"><div><h1>Anfragen</h1><p>Aus dem Catering- und dem Kontaktformular der Webseite.</p></div></div>
    <div class="anfragen">${liste.length ? liste.map((a) => `
      <article class="karte anfrage ${a.erledigt ? "erledigt" : ""}">
        <div>
          <h3>${a.typ === "catering" ? `🍖 Catering: ${esc(a.art)}, ${a.personen} Personen` : `✉️ ${esc(a.betreff || "Kontaktanfrage")}`}
            ${a.erledigt ? '<span class="status status-grau">Erledigt</span>' : '<span class="status status-neu">Offen</span>'}</h3>
          <div class="meta"><span>${datum(a.datum)}</span><span><b>${esc(a.name)}</b></span>
            ${a.telefon ? `<a href="tel:${esc(a.telefon.replace(/\s/g, ""))}">📞 ${esc(a.telefon)}</a>` : ""}<a href="mailto:${esc(a.email)}">${esc(a.email)}</a>
            ${a.typ === "catering" ? `<span>📅 Anlass am ${datum(a.anlassDatum)}</span>${a.ort ? `<span>📍 ${esc(a.ort)}</span>` : ""}` : ""}</div>
        </div>
        <div class="rechts"><button class="knopf ${a.erledigt ? "" : "haupt"}" data-erl="${a.id}">${a.erledigt ? "Wieder öffnen" : "Erledigt"}</button></div>
        <p>${esc(a.text)}</p>
      </article>`).join("") : '<div class="karte leer">Keine Anfragen.</div>'}</div>`;
  $$("[data-erl]").forEach((b) => b.addEventListener("click", () => { const a = db.anfragen.find((x) => x.id === b.dataset.erl); a.erledigt = !a.erledigt; speichern(); anfragen(); }));
}

// ---------- Start ----------
let angemeldet = false;
try { angemeldet = sessionStorage.getItem("bbq-admin") === "1"; } catch (e) {}
zaehlerAktualisieren();
anmelden(angemeldet);
