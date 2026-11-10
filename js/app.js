/*
  Balzner BBQ – Logik der Seite
  -----------------------------
  1. Kurse und Produkte aus js/data.js anzeigen
  2. Warenkorb (wird im Browser gemerkt)
  3. Dialoge: Box-Auswahl, Kasse, Kursbuchung, Gutschein
  4. Formulare (im Entwurf nur Demo, später an Payrexx/Formspree o. ä. anbinden)
*/

// ---------- Kleine Hilfsfunktionen ----------
const $ = (sel) => document.querySelector(sel);
const chf = (betrag) => EINSTELLUNGEN.waehrung + " " + betrag.toFixed(2);
const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const produktVon = (id) => PRODUKTE.find((p) => p.id === id);

// ---------- 1. Kurse anzeigen ----------
function kurseAnzeigen() {
  $("#kursListe").innerHTML = KURSE.map((k) => {
    const d = new Date(k.datum);
    let platzText = `${k.frei} von ${k.plaetze} Plätzen frei`, platzKlasse = "";
    if (k.frei === 0) { platzText = "Ausgebucht"; platzKlasse = "voll"; }
    else if (k.frei <= 3) { platzText = `Nur noch ${k.frei} Plätze`; platzKlasse = "wenig"; }
    return `
      <article class="kurs">
        <div class="kurs-datum">
          <div class="tag">${d.getDate()}</div>
          <div class="monat">${MONATE[d.getMonth()]} ${d.getFullYear()}</div>
        </div>
        <div>
          <h3>${k.titel}</h3>
          <p>${k.text}</p>
          <div class="kurs-meta"><span>🕑 ${k.zeit}</span><span>📍 ${k.ort}</span></div>
        </div>
        <div class="kurs-aktion">
          <span class="kurs-preis">${chf(k.preis)}</span>
          <span class="plaetze ${platzKlasse}">${platzText}</span>
          ${k.frei === 0
            ? `<button class="btn btn-hell btn-klein" data-warteliste="${k.id}">Warteliste</button>`
            : `<button class="btn btn-glut btn-klein" data-buchen="${k.id}">Jetzt buchen</button>`}
        </div>
      </article>`;
  }).join("");
}

// ---------- 1b. Produkte anzeigen ----------
function produkteAnzeigen() {
  $("#produktListe").innerHTML = PRODUKTE.map((p) => `
    <article class="produkt">
      ${p.neu ? '<span class="tag-neu">Neu</span>' : ""}
      ${p.typ === "box" ? '<span class="tag-neu tag-box">Geschenk</span>' : ""}
      <img src="${p.bild}" alt="${p.name}" loading="lazy">
      <div class="produkt-text">
        <h3>${p.name}</h3>
        <p>${p.text}</p>
        <div class="produkt-fuss">
          <span class="preis">${chf(p.preis)}</span>
          <button class="btn btn-dunkel btn-klein" data-kaufen="${p.id}">In den Warenkorb</button>
        </div>
      </div>
    </article>`).join("");
}

// ---------- 2. Warenkorb ----------
// Jede Position: { id, menge, inhalt (nur bei Gewürzbox klein: gewählte Gewürze) }
let warenkorb = [];
try { warenkorb = JSON.parse(localStorage.getItem("bbq-warenkorb")) || []; } catch (e) { warenkorb = []; }

function speichern() {
  try { localStorage.setItem("bbq-warenkorb", JSON.stringify(warenkorb)); } catch (e) { /* egal */ }
  warenkorbAnzeigen();
}

function hinzufuegen(id, inhalt) {
  const schluessel = id + (inhalt ? ":" + inhalt.join(",") : "");
  const pos = warenkorb.find((w) => w.schluessel === schluessel);
  if (pos) pos.menge++;
  else warenkorb.push({ schluessel, id, menge: 1, inhalt });
  speichern();
  meldung(produktVon(id).name + " im Warenkorb");
}

function summen() {
  const waren = warenkorb.reduce((s, w) => s + produktVon(w.id).preis * w.menge, 0);
  return { waren };
}

function versandFuer(waren, art) {
  if (art === "abholung" || waren >= EINSTELLUNGEN.gratisVersandAb) return 0;
  return EINSTELLUNGEN.versandKosten;
}

function warenkorbAnzeigen() {
  const anzahl = warenkorb.reduce((s, w) => s + w.menge, 0);
  const badge = $("#warenkorbAnzahl");
  badge.textContent = anzahl;
  badge.classList.toggle("leer", anzahl === 0);

  if (anzahl === 0) {
    $("#wkInhalt").innerHTML = '<p class="leer-text">Ihr Warenkorb ist noch leer.<br>Wie wäre es mit einem Gewürz? 🌶️</p>';
    $("#wkFuss").innerHTML = '<a href="#shop" class="btn btn-dunkel btn-voll" data-schliessen>Zum Shop</a>';
    return;
  }

  $("#wkInhalt").innerHTML = warenkorb.map((w, i) => {
    const p = produktVon(w.id);
    const extra = w.inhalt ? `<small>Mit: ${w.inhalt.map((g) => produktVon(g).name.replace("Gewürz ", "")).join(" & ")}</small>` : "";
    return `
      <div class="wk-pos">
        <img src="${p.bild}" alt="">
        <div>
          <h4>${p.name}</h4>${extra}
          <div class="menge">
            <button data-minus="${i}" aria-label="weniger">−</button>
            <span>${w.menge}</span>
            <button data-plus="${i}" aria-label="mehr">+</button>
          </div>
        </div>
        <strong>${chf(p.preis * w.menge)}</strong>
      </div>`;
  }).join("");

  const { waren } = summen();
  const restGratis = EINSTELLUNGEN.gratisVersandAb - waren;
  $("#wkFuss").innerHTML = `
    <div class="summe-zeile"><span>Zwischensumme</span><span>${chf(waren)}</span></div>
    <div class="summe-zeile"><span>Versand</span><span>${restGratis > 0 ? "ab " + chf(EINSTELLUNGEN.versandKosten) : "gratis"}</span></div>
    ${restGratis > 0 ? `<small style="color:var(--text-hell)">Noch ${chf(restGratis)} bis zum Gratisversand. Abholung in Balzers ist immer gratis.</small>` : ""}
    <div class="summe-zeile total"><span>Total <small style="font-weight:400">zzgl. Versand</small></span><span>${chf(waren)}</span></div>
    <button class="btn btn-glut btn-voll" data-kasse>Zur Kasse</button>`;
}

function warenkorbOeffnen(offen) {
  $("#warenkorb").classList.toggle("offen", offen);
  $("#overlay").classList.toggle("offen", offen);
}

// ---------- 3. Dialoge ----------
const dialog = $("#dialog");
function dialogZeigen(html) {
  $("#dialogInhalt").innerHTML = html;
  if (!dialog.open) dialog.showModal();
}

function meldung(text) {
  let t = $(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = text;
  t.classList.add("zeigen");
  clearTimeout(t.timer);
  t.timer = setTimeout(() => t.classList.remove("zeigen"), 2200);
}

function erfolgZeigen(titel, text) {
  dialogZeigen(`
    <div class="erfolg">
      <div class="icon">🔥</div>
      <h3 style="margin-right:0">${titel}</h3>
      <p>${text}</p>
      <p><small><strong>Entwurf:</strong> In der fertigen Seite wird hier echt bezahlt bzw. eine E-Mail an Balzner BBQ gesendet.</small></p>
      <button class="btn btn-dunkel" data-dialog-zu>Schliessen</button>
    </div>`);
}

// Gewürzbox klein: zwei Gewürze auswählen
function boxAuswahl(box) {
  const gewuerze = PRODUKTE.filter((p) => p.typ === "gewuerz");
  dialogZeigen(`
    <h3>${box.name}</h3>
    <p>Wählen Sie genau ${box.auswahl} Gewürze für Ihre Box.</p>
    <form id="boxForm">
      <div class="auswahl-liste">
        ${gewuerze.map((g) => `<label class="auswahl"><input type="checkbox" value="${g.id}">${g.name}</label>`).join("")}
      </div>
      <button class="btn btn-glut btn-voll" type="submit" disabled>Bitte ${box.auswahl} wählen</button>
    </form>`);
  const form = $("#boxForm"), knopf = form.querySelector("button");
  form.addEventListener("change", () => {
    const gewaehlt = form.querySelectorAll("input:checked");
    // Nicht mehr als erlaubt auswählbar
    form.querySelectorAll("input:not(:checked)").forEach((i) => (i.disabled = gewaehlt.length >= box.auswahl));
    knopf.disabled = gewaehlt.length !== box.auswahl;
    knopf.textContent = knopf.disabled ? `Bitte ${box.auswahl} wählen (${gewaehlt.length}/${box.auswahl})` : `In den Warenkorb · ${chf(box.preis)}`;
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    hinzufuegen(box.id, [...form.querySelectorAll("input:checked")].map((i) => i.value));
    dialog.close();
  });
}

// Zahlungsarten-Auswahl (wiederverwendbar)
const zahlartenHtml = (mitRechnung = true) => `
  <label style="margin-bottom:-6px">Bezahlen mit</label>
  <div class="zahlarten">
    <label class="zahlart"><input type="radio" name="zahlart" value="twint" checked>TWINT</label>
    <label class="zahlart"><input type="radio" name="zahlart" value="karte">Karte</label>
    ${mitRechnung ? '<label class="zahlart"><input type="radio" name="zahlart" value="rechnung">Rechnung</label>' : '<label class="zahlart"><input type="radio" name="zahlart" value="paypal">PayPal</label>'}
  </div>`;

// Kasse
function kasseZeigen() {
  warenkorbOeffnen(false);
  const { waren } = summen();
  dialogZeigen(`
    <h3>Bestellung abschliessen</h3>
    <form class="formular" id="kasseForm">
      <label>Lieferung
        <select name="lieferung">
          <option value="versand">Versand (LI / CH)</option>
          <option value="abholung">Abholung in Balzers (gratis)</option>
        </select>
      </label>
      <div class="reihe">
        <label>Vorname<input name="vorname" required autocomplete="given-name"></label>
        <label>Nachname<input name="nachname" required autocomplete="family-name"></label>
      </div>
      <label>E-Mail<input type="email" name="email" required autocomplete="email"></label>
      <div id="adresse">
        <label>Strasse und Nr.<input name="strasse" required autocomplete="street-address"></label>
        <div class="reihe" style="margin-top:14px">
          <label>PLZ<input name="plz" required autocomplete="postal-code"></label>
          <label>Ort<input name="ort" required autocomplete="address-level2"></label>
        </div>
      </div>
      ${zahlartenHtml(true)}
      <div>
        <div class="summe-zeile"><span>Waren</span><span>${chf(waren)}</span></div>
        <div class="summe-zeile"><span>Versand</span><span id="kasseVersand"></span></div>
        <div class="summe-zeile total"><span>Total</span><span id="kasseTotal"></span></div>
      </div>
      <button class="btn btn-glut btn-voll" type="submit">Zahlungspflichtig bestellen</button>
    </form>`);

  const form = $("#kasseForm");
  const aktualisieren = () => {
    const art = form.lieferung.value;
    const versand = versandFuer(waren, art);
    $("#kasseVersand").textContent = versand ? chf(versand) : "gratis";
    $("#kasseTotal").textContent = chf(waren + versand);
    // Bei Abholung braucht es keine Adresse
    $("#adresse").style.display = art === "abholung" ? "none" : "";
    $("#adresse").querySelectorAll("input").forEach((i) => (i.required = art !== "abholung"));
  };
  form.addEventListener("change", aktualisieren);
  aktualisieren();
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.vorname.value;
    warenkorb = [];
    speichern();
    erfolgZeigen(`Danke, ${name}!`, "Ihre Bestellung ist eingegangen. Sie erhalten eine Bestätigung per E-Mail.");
  });
}

// Kursbuchung
function kursBuchen(kurs) {
  dialogZeigen(`
    <h3>${kurs.titel}</h3>
    <p>${new Date(kurs.datum).toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${kurs.zeit} · ${kurs.ort}</p>
    <form class="formular" id="kursForm">
      <label>Anzahl Personen
        <select name="personen">
          ${Array.from({ length: kurs.frei }, (_, i) => `<option value="${i + 1}">${i + 1} Person${i ? "en" : ""}</option>`).join("")}
        </select>
      </label>
      <div class="reihe">
        <label>Name<input name="name" required autocomplete="name"></label>
        <label>Telefon<input type="tel" name="telefon" required autocomplete="tel"></label>
      </div>
      <label>E-Mail<input type="email" name="email" required autocomplete="email"></label>
      <label>Allergien / Bemerkungen<input name="bemerkung"></label>
      ${zahlartenHtml(false)}
      <button class="btn btn-glut btn-voll" type="submit">Buchen · <span id="kursTotal">${chf(kurs.preis)}</span></button>
    </form>`);
  const form = $("#kursForm");
  form.personen.addEventListener("change", () => ($("#kursTotal").textContent = chf(kurs.preis * form.personen.value)));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    erfolgZeigen("Platz reserviert!", `Wir freuen uns auf Sie beim Kurs «${kurs.titel}». Alle Infos kommen per E-Mail.`);
  });
}

function wartelisteZeigen(kurs) {
  dialogZeigen(`
    <h3>Warteliste: ${kurs.titel}</h3>
    <p>Der Kurs ist ausgebucht. Wir melden uns, sobald ein Platz frei wird oder ein neuer Termin feststeht.</p>
    <form class="formular" id="wlForm">
      <label>Name<input name="name" required></label>
      <label>E-Mail<input type="email" name="email" required></label>
      <button class="btn btn-dunkel btn-voll" type="submit">Auf die Warteliste</button>
    </form>`);
  $("#wlForm").addEventListener("submit", (e) => {
    e.preventDefault();
    erfolgZeigen("Eingetragen!", "Sie stehen auf der Warteliste.");
  });
}

function gutscheinZeigen() {
  dialogZeigen(`
    <h3>Gutschein verschenken</h3>
    <p>Der Gutschein kommt als PDF per E-Mail, bereit zum Ausdrucken.</p>
    <form class="formular" id="gsForm">
      <label>Betrag
        <select name="betrag">
          <option value="50">CHF 50</option><option value="100">CHF 100</option>
          <option value="149">Grill-Basiskurs (CHF 149)</option><option value="189">Low & Slow (CHF 189)</option>
        </select>
      </label>
      <label>Für (Name auf dem Gutschein)<input name="fuer" required></label>
      <label>Persönliche Nachricht<textarea name="nachricht" rows="2"></textarea></label>
      <label>Ihre E-Mail<input type="email" name="email" required></label>
      ${zahlartenHtml(false)}
      <button class="btn btn-glut btn-voll" type="submit">Gutschein kaufen</button>
    </form>`);
  $("#gsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    erfolgZeigen("Gutschein unterwegs!", "Das PDF wird an Ihre E-Mail-Adresse gesendet.");
  });
}

const INFOS = {
  impressum: "<h3>Impressum</h3><p>Platzhalter: Firmenname, Adresse, Kontakt, Handelsregister-/UID-Nummer vom Kunden.</p>",
  datenschutz: "<h3>Datenschutz</h3><p>Platzhalter: Datenschutzerklärung nach DSG/DSGVO. Die Seite lädt keine Google-Schriften und keine Tracker.</p>",
  agb: "<h3>AGB & Versand</h3><p>Platzhalter: Versandkosten, Lieferzeit, Rückgabe, Stornobedingungen für Kurse.</p>",
};

// ---------- 4. Klicks auf der ganzen Seite an einer Stelle behandeln ----------
document.addEventListener("click", (e) => {
  const z = e.target.closest("[data-kaufen],[data-buchen],[data-warteliste],[data-gutschein],[data-kasse],[data-plus],[data-minus],[data-schliessen],[data-dialog-zu],[data-info]");
  if (!z) return;
  const d = z.dataset;

  if (d.kaufen) {
    const p = produktVon(d.kaufen);
    p.auswahl ? boxAuswahl(p) : hinzufuegen(p.id);
  } else if (d.buchen) kursBuchen(KURSE.find((k) => k.id === d.buchen));
  else if (d.warteliste) wartelisteZeigen(KURSE.find((k) => k.id === d.warteliste));
  else if ("gutschein" in d) gutscheinZeigen();
  else if ("kasse" in d) kasseZeigen();
  else if ("plus" in d) { warenkorb[d.plus].menge++; speichern(); }
  else if ("minus" in d) {
    warenkorb[d.minus].menge--;
    if (warenkorb[d.minus].menge <= 0) warenkorb.splice(d.minus, 1);
    speichern();
  }
  else if ("schliessen" in d) warenkorbOeffnen(false);
  else if ("dialogZu" in d) dialog.close();
  else if (d.info) { e.preventDefault(); dialogZeigen(INFOS[d.info]); }
});

$("#warenkorbOeffnen").addEventListener("click", () => warenkorbOeffnen(true));
$("#overlay").addEventListener("click", () => warenkorbOeffnen(false));
dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); }); // Klick neben den Dialog schliesst ihn

// Mobiles Menü
$("#menuBtn").addEventListener("click", () => $("#nav").classList.toggle("offen"));
$("#nav").addEventListener("click", (e) => { if (e.target.tagName === "A") $("#nav").classList.remove("offen"); });

// Catering- und Kontaktformular (Entwurf: nur Bestätigung)
$("#cateringForm").addEventListener("submit", (e) => {
  e.preventDefault(); e.target.reset();
  erfolgZeigen("Anfrage gesendet!", "Danke! Wir melden uns innert 48 Stunden mit einer Offerte.");
});
$("#kontaktForm").addEventListener("submit", (e) => {
  e.preventDefault(); e.target.reset();
  erfolgZeigen("Nachricht gesendet!", "Danke für Ihre Nachricht, wir melden uns bald.");
});

// ---------- Start ----------
$("#jahr").textContent = new Date().getFullYear();
kurseAnzeigen();
produkteAnzeigen();
warenkorbAnzeigen();
