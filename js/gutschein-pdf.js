/*
  GUTSCHEIN ALS PDF
  -----------------
  Zeichnet den Gutschein im Browser auf ein Canvas (A5 quer, 300 dpi):
  Glut und Flammen, Grillfoto, Logo, Betrag, Name, Code, Gültigkeit.
  Danach wird daraus ein PDF zusammengebaut und heruntergeladen.
  Läuft komplett lokal: keine Bibliothek, kein Server, nichts geht ins Internet.

  Benutzung:
    GutscheinPDF.herunterladen({ code, betrag, fuer, von, nachricht, datum })
    GutscheinPDF.vorschau(gutschein)  -> Promise mit Bild-URL (für Vorschau im Dialog)
*/
const GutscheinPDF = (() => {
  const B = 2480, H = 1748;                 // A5 quer bei 300 dpi
  const PT_B = 595.28, PT_H = 419.53;       // A5 quer in PDF-Punkten
  const GUELTIG_JAHRE = 3;                  // ANNAHME: Gültigkeit mit Kunde klären
  const FOTO = "img/gutschein/fleisch.jpg";

  const F = {
    kohle: "#17130f", creme: "#f6efe4", grau: "#b9a996",
    glut: "#e0591f", glutHell: "#f28a3c", gold: "#ffc861",
  };
  const TITEL = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';
  const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  // Zufall mit Startwert aus dem Code: jeder Gutschein sieht leicht anders aus, aber immer gleich beim Neu-Erstellen
  function zufall(text) {
    let s = 0; for (const z of String(text)) s = (s * 31 + z.charCodeAt(0)) | 0;
    return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const bildLaden = (src) => new Promise((ok, fehler) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fehler; i.src = src; });
  const datumCH = (d) => d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
  const betragText = (b) => "CHF " + (Number.isInteger(Number(b)) ? Number(b).toLocaleString("de-CH") + ".–" : Number(b).toFixed(2));

  // ---------- Zeichnen ----------
  function flammen(ctx, r, textRand) {
    ctx.save();
    // Grundglut am unteren Rand
    const glut = ctx.createLinearGradient(0, H, 0, H - 520);
    glut.addColorStop(0, "rgba(242,110,40,.75)"); glut.addColorStop(.45, "rgba(224,89,31,.25)"); glut.addColorStop(1, "rgba(224,89,31,0)");
    ctx.fillStyle = glut; ctx.fillRect(0, H - 520, B, 520);

    ctx.globalCompositeOperation = "lighter";
    const ebenen = [
      { unschaerfe: 46, groesse: 1.35, farben: ["rgba(224,89,31,.55)", "rgba(200,50,20,.25)", "rgba(200,50,20,0)"] },
      { unschaerfe: 10, groesse: 1.0, farben: ["rgba(255,150,60,.85)", "rgba(224,89,31,.5)", "rgba(224,89,31,0)"] },
      { unschaerfe: 3, groesse: .55, farben: ["rgba(255,205,110,.75)", "rgba(255,160,60,.45)", "rgba(255,140,50,0)"] },
    ];
    for (const e of ebenen) {
      ctx.filter = `blur(${e.unschaerfe}px)`;
      const n = 38;
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * B + (r() - .5) * 70;
        const h = (150 + r() * 230) * e.groesse * (1 - .35 * Math.abs(i / (n - 1) - .5));
        const w = (55 + r() * 45) * e.groesse;
        const sw = (r() - .5) * 90 * e.groesse;
        const g = ctx.createLinearGradient(0, H, 0, H - h);
        g.addColorStop(0, e.farben[0]); g.addColorStop(.55, e.farben[1]); g.addColorStop(1, e.farben[2]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - w, H + 20);
        ctx.bezierCurveTo(x - w, H - h * .45, x + sw - w * .25, H - h * .7, x + sw, H - h);
        ctx.bezierCurveTo(x + sw + w * .25, H - h * .7, x + w, H - h * .45, x + w, H + 20);
        ctx.closePath(); ctx.fill();
      }
    }
    // Funken: über dem Foto hoch hinauf, im Textbereich links nur knapp über den Flammen
    ctx.filter = "blur(1px)";
    for (let i = 0; i < 90; i++) {
      const x = r() * B, hoch = x > textRand ? 760 : 180;
      const y = H - 120 - Math.pow(r(), 1.6) * hoch, rad = 2 + r() * 6;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 2.2);
      g.addColorStop(0, "rgba(255,240,190,.95)"); g.addColorStop(.4, "rgba(255,170,70,.7)"); g.addColorStop(1, "rgba(224,89,31,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad * 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function textPasst(ctx, text, schrift, start, min, maxBreite) {
    let g = start;
    do { ctx.font = schrift.replace("{g}", g); if (ctx.measureText(text).width <= maxBreite) break; g -= 4; } while (g > min);
    return g;
  }
  function umbrechen(ctx, text, maxBreite, maxZeilen) {
    const woerter = String(text).split(/\s+/), zeilen = [];
    let z = "";
    for (const w of woerter) {
      const test = z ? z + " " + w : w;
      if (ctx.measureText(test).width > maxBreite && z) { zeilen.push(z); z = w; } else z = test;
    }
    if (z) zeilen.push(z);
    if (zeilen.length > maxZeilen) { zeilen.length = maxZeilen; zeilen[maxZeilen - 1] += " …"; }
    return zeilen;
  }
  function abstand(ctx, px) { if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px"; }

  async function zeichnen(g) {
    const r = zufall(g.code);
    const c = document.createElement("canvas"); c.width = B; c.height = H;
    const ctx = c.getContext("2d");
    const ausgestellt = g.datum ? new Date(g.datum + "T12:00") : new Date();
    const bis = new Date(ausgestellt); bis.setFullYear(bis.getFullYear() + GUELTIG_JAHRE);

    // Hintergrund
    ctx.fillStyle = F.kohle; ctx.fillRect(0, 0, B, H);

    // Foto rechts (Fleisch auf der Feuerplatte), nach links in die Kohle auslaufend
    const fx = Math.round(B * .47);
    try {
      const foto = await bildLaden(FOTO);
      const zielB = B - fx, zielH = H, s = Math.max(zielB / foto.width, zielH / foto.height);
      const qb = zielB / s, qh = zielH / s;
      ctx.drawImage(foto, (foto.width - qb) / 2, (foto.height - qh) / 2, qb, qh, fx, 0, zielB, zielH);
    } catch (e) { /* ohne Foto geht es auch */ }
    let v = ctx.createLinearGradient(fx, 0, fx + 620, 0);
    v.addColorStop(0, F.kohle); v.addColorStop(1, "rgba(23,19,15,0)");
    ctx.fillStyle = v; ctx.fillRect(fx, 0, 620, H);
    v = ctx.createLinearGradient(0, 0, 0, H);
    v.addColorStop(0, "rgba(23,19,15,.35)"); v.addColorStop(.55, "rgba(23,19,15,.05)"); v.addColorStop(1, "rgba(23,19,15,.85)");
    ctx.fillStyle = v; ctx.fillRect(fx, 0, B - fx, H);

    flammen(ctx, r, fx + 250);

    // feiner Rahmen
    ctx.strokeStyle = "rgba(242,138,60,.45)"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(70, 70, B - 140, H - 140, 26); ctx.stroke();

    // ---------- Text links ----------
    const x = 190;
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";

    ctx.font = `700 104px ${TITEL}`; abstand(ctx, 2);
    ctx.fillStyle = F.creme; ctx.fillText("Balzner", x, 270);
    const lb = ctx.measureText("Balzner ").width;
    ctx.fillStyle = F.glut; ctx.fillText("BBQ", x + lb, 270);

    ctx.font = `700 34px ${SANS}`; abstand(ctx, 9);
    ctx.fillStyle = F.glutHell; ctx.fillText("FEUER · FLEISCH · GESCHMACK", x, 340);

    ctx.font = `700 236px ${TITEL}`; abstand(ctx, 6);
    ctx.fillStyle = F.creme; ctx.fillText("Gutschein", x - 8, 640);

    // Betrag mit Glut-Verlauf
    const bt = betragText(g.betrag);
    const gw = textPasst(ctx, bt, `700 {g}px ${TITEL}`, 200, 120, 1100);
    const vg = ctx.createLinearGradient(0, 860 - gw, 0, 860);
    vg.addColorStop(0, F.gold); vg.addColorStop(1, F.glut);
    ctx.fillStyle = vg; abstand(ctx, 2); ctx.fillText(bt, x, 870);

    // für + Name
    ctx.font = `500 50px ${SANS}`; abstand(ctx, 4);
    ctx.fillStyle = F.grau; ctx.fillText("FÜR", x, 990);
    abstand(ctx, 0);
    textPasst(ctx, g.fuer || "", `italic 600 {g}px ${TITEL}`, 124, 64, 1080);
    ctx.fillStyle = F.creme; ctx.fillText(g.fuer || "", x, 1115);

    // Nachricht und «von»
    let y = 1200;
    if (g.nachricht) {
      ctx.font = `italic 44px ${TITEL}`; ctx.fillStyle = F.creme;
      for (const z of umbrechen(ctx, "«" + g.nachricht + "»", 1050, 2)) { ctx.fillText(z, x, y); y += 58; }
    }
    if (g.von && !String(g.von).includes("@") && g.von !== "Verwaltung") {
      ctx.font = `500 40px ${SANS}`; ctx.fillStyle = F.grau; ctx.fillText("von " + g.von, x, y + 6);
    }

    // Kleingedrucktes
    ctx.font = `500 34px ${SANS}`; abstand(ctx, 1); ctx.fillStyle = "rgba(246,239,228,.82)";
    ctx.fillText("Einlösbar für Grillkurse, Catering und Gewürze.", x, 1430);
    ctx.fillText(`Ausgestellt ${datumCH(ausgestellt)} · gültig bis ${datumCH(bis)} · balzner-bbq.li`, x, 1478);

    // ---------- Stempel mit Code (rechts oben, über dem Foto) ----------
    ctx.save();
    ctx.translate(B - 360, 380); ctx.rotate(-.12);
    ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 40;
    ctx.fillStyle = F.glut; ctx.beginPath(); ctx.arc(0, 0, 210, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,236,200,.85)"; ctx.lineWidth = 5; ctx.setLineDash([14, 12]);
    ctx.beginPath(); ctx.arc(0, 0, 182, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = "center"; ctx.fillStyle = "#fff";
    ctx.font = `700 30px ${SANS}`; abstand(ctx, 6); ctx.fillText("CODE", 0, -48);
    abstand(ctx, 2); textPasst(ctx, g.code, `700 {g}px ${SANS}`, 76, 40, 300); ctx.fillText(g.code, 0, 30);
    ctx.font = `600 28px ${SANS}`; abstand(ctx, 4); ctx.fillText("BALZERS · FL", 0, 92);
    ctx.restore();

    return c;
  }

  // ---------- PDF zusammenbauen: eine Seite, ein JPEG-Bild ----------
  async function pdfAusCanvas(canvas, titel) {
    const jpg = new Uint8Array(await (await new Promise((ok) => canvas.toBlob(ok, "image/jpeg", .9))).arrayBuffer());
    const enc = new TextEncoder(), teile = [], offsets = [];
    let laenge = 0;
    const add = (x) => { const b = typeof x === "string" ? enc.encode(x) : x; teile.push(b); laenge += b.length; };
    const obj = (n, inhalt) => { offsets[n] = laenge; add(`${n} 0 obj\n`); inhalt(); add("\nendobj\n"); };
    const sicher = (t) => String(t).replace(/[^\x20-\x7e]/g, "").replace(/[()\\]/g, "");
    const inhalt = `q ${PT_B} 0 0 ${PT_H} 0 0 cm /Im0 Do Q`;

    add("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    obj(1, () => add("<< /Type /Catalog /Pages 2 0 R >>"));
    obj(2, () => add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
    obj(3, () => add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PT_B} ${PT_H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`));
    obj(4, () => { add(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`); add(jpg); add("\nendstream"); });
    obj(5, () => add(`<< /Length ${inhalt.length} >>\nstream\n${inhalt}\nendstream`));
    obj(6, () => add(`<< /Title (${sicher(titel)}) /Producer (Balzner BBQ) >>`));
    const xref = laenge;
    add(`xref\n0 7\n0000000000 65535 f \n` + offsets.slice(1).map((o) => String(o).padStart(10, "0") + " 00000 n \n").join(""));
    add(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(teile, { type: "application/pdf" });
  }

  const dateiname = (g) => `Gutschein-${g.code}-${String(g.fuer || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}.pdf`;

  async function herunterladen(g) {
    const canvas = await zeichnen(g);
    const blob = await pdfAusCanvas(canvas, `Gutschein ${g.code}`);
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = dateiname(g); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return canvas.toDataURL("image/jpeg", .7);
  }
  async function vorschau(g) { return (await zeichnen(g)).toDataURL("image/jpeg", .7); }

  return { herunterladen, vorschau, zeichnen, pdfAusCanvas, dateiname };
})();
