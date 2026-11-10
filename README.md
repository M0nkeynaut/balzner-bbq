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
- **Verwaltung (`admin.html`)** für den Kunden:
  - **Übersicht:** Umsatz pro Monat (Shop, Kurse, Gutscheine), Bestseller, Kursauslastung, Zahlarten
  - **Kurse:** anlegen, ändern, verstecken, löschen; Teilnehmerliste ansehen, drucken, von Hand ergänzen
  - **Produkte:** anlegen (mit Bild), ändern, im Shop ein-/ausblenden, als ausverkauft markieren, löschen
  - **Bestellungen:** filtern, suchen, als versendet/abgeholt markieren
  - **Gutscheine:** einlösen, erstellen
  - **Anfragen:** Catering und Kontakt, als erledigt markieren

> **Entwurf:** Es wird nichts bezahlt und nichts gesendet. Bestellungen, Buchungen, Gutscheine und Anfragen
> landen im **Browser-Speicher** und erscheinen in der Verwaltung, aber nur im selben Browser auf demselben Gerät.
> Ein Jahr Beispieldaten (erfundene Namen) wird beim ersten Öffnen erzeugt und lässt sich jederzeit zurücksetzen.
> Kurstermine, Kurspreise, Versandkosten, Telefonnummer und Impressum sind **Platzhalter**.

## 2. Wie es funktioniert

Eine **statische Webseite**: nur fertige Dateien, ohne Datenbank, ohne PHP und ohne Plugins.

| Datei | Inhalt |
|---|---|
| `index.html` | Aufbau der Seite (alle Abschnitte) |
| `css/style.css` | Gestaltung (Farben oben in `:root`) |
| `js/data.js` | **Startinhalte:** Produkte, Preise, Kurse, Versandkosten (werden beim ersten Öffnen in den Speicher übernommen) |
| `js/store.js` | **Datenspeicher** für Webseite und Verwaltung, erzeugt auch die Beispieldaten. Wird später durch das Backend ersetzt. |
| `js/app.js` | Logik der Webseite: Warenkorb, Dialoge, Formulare |
| `admin.html`, `js/admin.js`, `css/admin.css` | Verwaltung (Demo-Anmeldung ohne Passwort) |
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
- **Backend mit PocketBase** (ein Programm, eingebaute Datenbank, Login): ersetzt `js/store.js`, damit alle Daten zentral gespeichert sind und die Verwaltung von jedem Gerät aus funktioniert
- Persönliches Login für die Verwaltung (statt «Demo öffnen»)
- Bezahlung über **Payrexx** (Schweizer Anbieter, TWINT) oder Stripe. Nach der Zahlung meldet Payrexx das automatisch ans Backend.
- E-Mail-Bestätigungen an Kunden und Benachrichtigung an Balzner BBQ bei neuen Bestellungen/Anfragen
- `noindex` in `index.html`/`admin.html` und `robots.txt` entfernen

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
