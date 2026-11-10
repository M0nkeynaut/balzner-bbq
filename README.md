# Balzner BBQ – neue Webseite (Entwurf)

## 1. Was das ist

Ein Entwurf für die neue Webseite von **Balzner BBQ** (Grillcatering, Grillkurse, Gewürze, Fleisch und Wild aus Balzers).
Er ersetzt die alte WordPress-Seite und bringt:

- **Shop mit Warenkorb:** Gewürzbox klein mit Auswahl von 2 Gewürzen, Versand oder Abholung, TWINT, Karte, Rechnung
- **Grillkurse mit Terminen:** freie Plätze, Buchung, Warteliste bei ausgebuchten Kursen
- **Gutscheine** zum Verschenken
- **Catering-Anfrage** mit den wichtigsten Eckdaten (Datum, Personen, Anlass)
- **Eigene Galerie** statt des kaputten Instagram-Feeds
- Handy-tauglich, schnell, keine Google-Schriften und keine Tracker

> **Entwurf:** Bestellungen, Buchungen und Formulare sind nur Demos. Es wird nichts bezahlt und nichts gesendet.
> Kurstermine, Kurspreise, Versandkosten, Telefonnummer und Impressum sind **Platzhalter**.

## 2. Wie es funktioniert

Eine **statische Webseite**: nur fertige Dateien, ohne Datenbank, ohne PHP und ohne Plugins.

| Datei | Inhalt |
|---|---|
| `index.html` | Aufbau der Seite (alle Abschnitte) |
| `css/style.css` | Gestaltung (Farben oben in `:root`) |
| `js/data.js` | **Inhalte:** Produkte, Preise, Kurse, Versandkosten. Hier ändert man im Alltag etwas. |
| `js/app.js` | Logik: Warenkorb, Dialoge, Formulare |
| `img/produkte/` | Produktbilder: freigestellt, zentriert, hellorange Hintergrund, 800×800 px |
| `werkzeuge/produktbilder.py` | Skript, das die Produktbilder erzeugt (siehe unten) |
| `robots.txt` | Sperrt die Testversion für Suchmaschinen |
| `.nojekyll` | Sagt GitHub Pages, dass die Dateien unverändert ausgeliefert werden sollen |

Die **Produktbilder** liegen lokal im Projekt. Team-, Galerie- und Titelbilder werden im Entwurf noch direkt von `balzner-bbq.li` geladen und kommen für die fertige Seite ebenfalls nach `img/`.

### Neue Produktbilder erzeugen

Das Skript stellt die Dosen und Boxen frei und setzt sie einheitlich mittig auf den orangen Hintergrund. Es läuft komplett lokal (Python mit OpenCV, NumPy).

```
python3 werkzeuge/produktbilder.py <ordner-mit-originalen> img/produkte
```

- Die Originale heissen wie die Produkt-ID in `js/data.js`, z. B. `wild.jpg`.
- Neue Dosen oben im Skript bei `BILDER` mit `"dose"` eintragen. Für Boxen oder schwierige Fotos gibt man ein Rechteck oder ein Vieleck an.
- Am besten fotografiert man die Dosen vor hellem, einfarbigem Hintergrund.

**Geplant für die fertige Version:**
- Bezahlung über **Payrexx** (Schweizer Anbieter, TWINT) oder Stripe
- Formulare über einen Formulardienst (z. B. Formspree) oder eine eigene kleine Mail-Funktion
- **Pages CMS / Decap CMS**, damit der Kunde Kurse, Produkte und Bilder selbst pflegen kann
- `noindex` in `index.html` und `robots.txt` entfernen

## 3. Was nötig ist, damit es läuft

Die Seite braucht nur einen Webserver für statische Dateien. Zum Ansehen reicht auch ein Doppelklick auf `index.html`.

### Windows
- Doppelklick auf `index.html`, **oder** mit Python (`winget install Python.Python.3.12`):
  ```
  python -m http.server 8080
  ```
  Dann im Browser `http://localhost:8080` öffnen.

### Linux (Arch-basiert, z. B. CachyOS)
- Python ist meist schon installiert, sonst: `sudo pacman -S python`
  ```
  python -m http.server 8080
  ```
  Dann im Browser `http://localhost:8080` öffnen.

### Proxmox (LXC-Container)
- **Template:** Debian 12 Standard
- **Ressourcen:** 1 CPU-Kern, 256 MB RAM, 2 GB Disk (mehr ist nicht nötig)
- **Installation im Container:**
  ```
  apt update && apt install -y nginx git
  rm -rf /var/www/html && git clone <repo-url> /var/www/html
  ```
- **Autostart:** nginx startet per systemd automatisch (`systemctl enable --now nginx`). Den Container in Proxmox auf „Start at boot“ stellen.
- **Aktualisieren:** `cd /var/www/html && git pull`

### Test-Hosting auf GitHub Pages
1. Repository auf GitHub anlegen und die Dateien hochladen (gratis nur mit **öffentlichem** Repo).
2. Im Repository unter **Settings → Pages**: Source „Deploy from a branch“, Branch `main`, Ordner `/ (root)`.
3. Nach ca. 1 Minute ist die Seite unter `https://<benutzer>.github.io/<repo>/` erreichbar.
