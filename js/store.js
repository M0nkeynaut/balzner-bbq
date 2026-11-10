/*
  DEMO-DATENSPEICHER
  ------------------
  Webseite und Verwaltung (admin.html) lesen und schreiben hier dieselben Daten.
  Im Entwurf liegen sie im Browser (localStorage), sind also nur auf diesem Gerät sichtbar.
  In der fertigen Version ersetzt ein Backend (z. B. PocketBase) genau diese Funktionen,
  der Rest der Seite bleibt gleich.

  Beim ersten Aufruf werden Beispieldaten erzeugt: Produkte und Kurse aus js/data.js
  sowie ein Jahr erfundener Bestellungen, Buchungen und Gutscheine für die Statistik.
*/
const Store = (() => {
  const SCHLUESSEL = "bbq-demo-db-v1";
  let db = null;

  // Zufallszahlen mit festem Startwert: Beispieldaten sehen bei jedem Zurücksetzen gleich aus
  function zufall(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const VORNAMEN = ["Lukas", "Anna", "Marco", "Sandra", "Thomas", "Julia", "Patrick", "Nina", "Daniel", "Laura", "Stefan", "Sarah", "Michael", "Lea", "Andreas", "Petra", "Simon", "Carmen", "Reto", "Manuela"];
  const NACHNAMEN = ["Frick", "Vogt", "Büchel", "Wolfinger", "Kaiser", "Marxer", "Beck", "Hasler", "Ospelt", "Negele", "Meier", "Schädler", "Gassner", "Kindle", "Eberle", "Nigg", "Brunhart", "Matt"];
  const ORTE = ["9496 Balzers", "9495 Triesen", "9490 Vaduz", "9494 Schaan", "9497 Triesenberg", "7310 Bad Ragaz", "9470 Buchs SG", "7320 Sargans", "9493 Mauren"];

  const tagISO = (d) => d.toISOString().slice(0, 10);
  const neueId = (p) => p + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function beispielDaten() {
    const r = zufall(20261110);
    const wahl = (liste) => liste[Math.floor(r() * liste.length)];
    const person = () => {
      const v = wahl(VORNAMEN), n = wahl(NACHNAMEN);
      return { name: v + " " + n, email: (v + "." + n).toLowerCase().replace(/ü/g, "ue").replace(/ä/g, "ae").replace(/ö/g, "oe") + "@example.com", telefon: "+423 " + (300 + Math.floor(r() * 499)) + " " + (10 + Math.floor(r() * 89)) + " " + (10 + Math.floor(r() * 89)) };
    };
    const heute = new Date();

    const produkte = PRODUKTE.map((p) => ({ ...p, aktiv: true, ausverkauft: false }));
    const gewuerze = produkte.filter((p) => p.typ === "gewuerz");

    // --- Kurse: kommende aus data.js + vergangene der letzten 12 Monate ---
    const kurse = [];
    const vergangen = [
      ["Grill-Basiskurs", 149, 12], ["Low & Slow: Pulled Pork & Ribs", 189, 10], ["Steak-Masterclass", 169, 12],
      ["Grill-Basiskurs", 149, 12], ["Fleischsommelier-Abend", 169, 14], ["Wild vom Grill", 179, 12],
      ["Burger-Werkstatt", 129, 14], ["Grill-Basiskurs", 149, 12], ["Weihnachts-Grillkurs", 159, 12],
    ];
    vergangen.forEach(([titel, preis, plaetze], i) => {
      const d = new Date(heute); d.setDate(d.getDate() - 330 + i * 36 + Math.floor(r() * 8));
      if (d >= heute) return;
      kurse.push({ id: "kv" + i, titel, datum: tagISO(d), zeit: "14:00–19:00", ort: "Balzers", preis, plaetze,
        text: "", aktiv: true, teilnehmer: teilnehmerErzeugen(plaetze, 0.6 + r() * 0.4, d, preis) });
    });
    KURSE.forEach((k) => {
      const { frei, ...rest } = k;
      kurse.push({ ...rest, aktiv: true, teilnehmer: teilnehmerErzeugen(k.plaetze, (k.plaetze - frei) / k.plaetze, heute, k.preis, true) });
    });

    function teilnehmerErzeugen(plaetze, anteil, kursDatum, preis, exakt) {
      const ziel = exakt ? Math.round(plaetze * anteil) : Math.min(plaetze, Math.round(plaetze * anteil));
      const liste = []; let belegt = 0;
      while (belegt < ziel) {
        const personen = Math.min(ziel - belegt, r() < 0.45 ? 2 : 1);
        const b = new Date(kursDatum); b.setDate(b.getDate() - 5 - Math.floor(r() * 50));
        if (b > heute) b.setTime(heute.getTime() - Math.floor(r() * 40) * 864e5);
        liste.push({ ...person(), personen, bemerkung: r() < 0.15 ? wahl(["Laktoseintoleranz", "Kein Schweinefleisch", "Vegetarisch", "Nussallergie"]) : "", gebucht: tagISO(b), zahlart: wahl(["twint", "twint", "karte", "paypal"]), betrag: personen * preis });
        belegt += personen;
      }
      return liste;
    }

    // --- Bestellungen: 12 Monate, Saison: Dezember stark, Sommer gut ---
    const saison = [0.6, 0.5, 0.6, 0.8, 1.0, 1.2, 1.3, 1.2, 0.9, 0.8, 1.4, 2.4];
    const bestellungen = [];
    let nr = 1001;
    for (let m = 11; m >= 0; m--) {
      const monat = new Date(heute.getFullYear(), heute.getMonth() - m, 1);
      const anzahl = Math.round((10 + r() * 6) * saison[monat.getMonth()]);
      for (let i = 0; i < anzahl; i++) {
        const d = new Date(monat); d.setDate(1 + Math.floor(r() * 28));
        if (d > heute) continue;
        const positionen = [];
        const n = 1 + Math.floor(r() * 2.6);
        for (let j = 0; j < n; j++) {
          const z = r();
          let p = z < 0.22 ? produkte[0] : z < 0.32 ? produkte[1] : wahl(gewuerze);
          if (p.id === "wild" && d < new Date(2025, 4, 1)) p = gewuerze[0];
          const inhalt = p.auswahl ? [wahl(gewuerze).id, wahl(gewuerze).id] : null;
          const vorhanden = positionen.find((x) => x.id === p.id && !inhalt);
          if (vorhanden) vorhanden.menge++;
          else positionen.push({ id: p.id, name: p.name, preis: p.preis, menge: 1, inhalt });
        }
        const waren = positionen.reduce((s, x) => s + x.preis * x.menge, 0);
        const lieferung = r() < 0.35 ? "abholung" : "versand";
        const versand = lieferung === "abholung" || waren >= EINSTELLUNGEN.gratisVersandAb ? 0 : EINSTELLUNGEN.versandKosten;
        const alterTage = (heute - d) / 864e5;
        const status = alterTage < 3 ? "neu" : alterTage < 6 && r() < 0.5 ? "neu" : lieferung === "abholung" ? "abgeholt" : "versendet";
        const p0 = person();
        bestellungen.push({ id: "B-" + nr++, datum: tagISO(d), ...p0, adresse: lieferung === "versand" ? "Musterstrasse " + (1 + Math.floor(r() * 40)) + ", " + wahl(ORTE) : "", lieferung, zahlart: wahl(["twint", "twint", "twint", "karte", "rechnung"]), positionen, waren, versand, total: waren + versand, status });
      }
    }
    bestellungen.sort((a, b) => b.datum.localeCompare(a.datum));

    // --- Gutscheine ---
    const gutscheine = [];
    for (let i = 0; i < 18; i++) {
      const d = new Date(heute); d.setDate(d.getDate() - Math.floor(r() * 360));
      const betrag = wahl([50, 50, 100, 100, 149, 189]);
      gutscheine.push({ code: "BBQ-" + Math.floor(1000 + r() * 8999), betrag, fuer: person().name, von: person().name, datum: tagISO(d), eingeloest: (heute - d) / 864e5 > 60 && r() < 0.6 });
    }
    gutscheine.sort((a, b) => b.datum.localeCompare(a.datum));

    // --- Anfragen (Catering / Kontakt) ---
    const vor = (t) => { const d = new Date(heute); d.setDate(d.getDate() - t); return tagISO(d); };
    const anlass = (t) => { const d = new Date(heute); d.setDate(d.getDate() + t); return tagISO(d); };
    const anfragen = [
      { id: "a1", typ: "catering", datum: vor(1), ...person(), anlassDatum: anlass(60), personen: 80, art: "Firmenanlass", ort: "Vaduz", text: "Sommerfest mit Pulled Pork und Burgern, ca. 10 Vegetarier.", erledigt: false },
      { id: "a2", typ: "kontakt", datum: vor(2), ...person(), betreff: "Wildverarbeitung", text: "Ich habe ein Reh aus der Jagd, können Sie es verarbeiten?", erledigt: false },
      { id: "a3", typ: "catering", datum: vor(9), ...person(), anlassDatum: anlass(120), personen: 120, art: "Hochzeit", ort: "Balzers", text: "Grillbuffet am Abend, Apéro vorher.", erledigt: true },
      { id: "a4", typ: "kontakt", datum: vor(14), ...person(), betreff: "Firmen-Grillkurs", text: "Wir suchen einen privaten Kurs für 12 Mitarbeitende im Frühling.", erledigt: true },
    ];

    return { version: 1, produkte, kurse, bestellungen, gutscheine, anfragen };
  }

  function laden() {
    if (db) return db;
    try { db = JSON.parse(localStorage.getItem(SCHLUESSEL)); } catch (e) { db = null; }
    if (!db || !db.version) { db = beispielDaten(); speichern(); }
    return db;
  }
  function speichern() {
    try { localStorage.setItem(SCHLUESSEL, JSON.stringify(db)); } catch (e) { /* Speicher voll oder gesperrt: Demo läuft trotzdem */ }
  }
  function zuruecksetzen() {
    db = beispielDaten(); speichern(); return db;
  }

  // Freie Plätze eines Kurses = Plätze minus gebuchte Personen
  const belegt = (k) => k.teilnehmer.reduce((s, t) => s + t.personen, 0);
  const frei = (k) => Math.max(0, k.plaetze - belegt(k));

  // Daten wurden in einem anderen Tab geändert (z. B. Verwaltung offen neben der Webseite)
  window.addEventListener("storage", (e) => {
    if (e.key === SCHLUESSEL) { db = null; document.dispatchEvent(new Event("store-geaendert")); }
  });

  return { laden, speichern, zuruecksetzen, belegt, frei, neueId, tagISO };
})();
