/*
  INHALTE DER SEITE
  -----------------
  Hier stehen alle Produkte, Grillkurse und Einstellungen.
  Wer etwas ändern will (Preis, Termin, neues Gewürz), ändert es nur hier.
  Später kann ein CMS (z. B. Pages CMS) genau diese Daten über ein Formular bearbeiten.
*/

// Basis-Adresse der Bilder. Im Entwurf werden die Bilder direkt von der alten Seite geladen.
// Für die fertige Seite kopieren wir sie in den Ordner "img/" und ändern das hier auf "img/".
const BILD = "https://balzner-bbq.li/wp-content/uploads/";

const EINSTELLUNGEN = {
  versandKosten: 9.0,        // ANNAHME: Versandpauschale in CHF, mit Kunde klären
  gratisVersandAb: 80.0,     // ANNAHME: ab diesem Warenwert kein Versand
  waehrung: "CHF",
};

// Gewürze, die man einzeln kaufen oder in die kleine Box legen kann
const PRODUKTE = [
  {
    id: "box-klein", name: "Gewürzbox klein", preis: 24.0, typ: "box", auswahl: 2,
    bild: BILD + "2022/01/cropped-klein-offen-2-300x300.jpg",
    text: "Die Geschenkbox mit zwei Gewürzen nach Wahl: ideal zum Verschenken.",
  },
  {
    id: "box-gross", name: "Gewürzbox gross", preis: 70.0, typ: "box",
    bild: BILD + "2025/05/cropped-WhatsApp-Bild-2025-05-05-um-18.28.49_cc3d38e8.jpg",
    text: "Alle unsere Gewürze in einer Box: die ultimative Gewürzerfahrung.",
  },
  {
    id: "schwein", name: "Gewürz Schwein", preis: 12.0, typ: "gewuerz",
    bild: BILD + "2022/01/BalznerBBQ_schwein-600x600-1-300x300.jpg",
    text: "Für Schwein und vieles mehr: bringt Geschmacksvielfalt auf den Grill.",
  },
  {
    id: "gefluegel", name: "Gewürz Geflügel", preis: 12.0, typ: "gewuerz",
    bild: BILD + "2022/01/BalznerBBQ_gefluegel-300x300-1.jpg",
    text: "Für saftiges, aromatisches Grillgeflügel.",
  },
  {
    id: "fisch", name: "Gewürz Fisch", preis: 12.0, typ: "gewuerz",
    bild: BILD + "2022/01/BalznerBBQ_fisch1-600x600-1-300x300.jpg",
    text: "Harmoniert perfekt mit gegrilltem Fisch.",
  },
  {
    id: "wild", name: "Gewürz Wild", preis: 12.0, typ: "gewuerz", neu: true,
    bild: BILD + "2025/05/cropped-cropped-WhatsApp-Bild-2025-05-04-um-14.35.26_9d0d9874-300x300.jpg",
    text: "Kräftig, würzig, wild: Kräuter, dunkle Gewürze und eine frische Zitrusnote. Für Wild, Rind, Lamm und Pilze.",
  },
  {
    id: "salz-grob", name: "Pfeffer-Salz grob", preis: 12.0, typ: "gewuerz",
    bild: BILD + "2022/01/cropped-BalznerBBQ_salz_grob-600x600-1-300x300.jpg",
    text: "Die Grundlage für Grillgerichte, Salate und Suppen.",
  },
  {
    id: "salz-fein", name: "Pfeffer-Salz fein", preis: 12.0, typ: "gewuerz",
    bild: BILD + "2022/01/cropped-BalznerBBQ_salz_fein-600x600-1-300x300.jpg",
    text: "Fein gemahlen, ausgewogen und sanft im Aroma.",
  },
];

// BEISPIEL-KURSE: Termine, Preise und Plätze sind erfunden und müssen mit dem Kunden abgestimmt werden.
const KURSE = [
  { id: "k1", titel: "Grill-Basiskurs", datum: "2027-03-20", zeit: "14:00–19:00", ort: "Balzers",
    preis: 149, plaetze: 12, frei: 5,
    text: "Direkt und indirekt grillen, Temperaturen im Griff, die perfekte Steakkruste." },
  { id: "k2", titel: "Low & Slow: Pulled Pork & Ribs", datum: "2027-04-17", zeit: "10:00–18:00", ort: "Balzers",
    preis: 189, plaetze: 10, frei: 2,
    text: "Smoken wie die Profis: Rubs, Holzwahl, Geduld und ein Tag voller Genuss." },
  { id: "k3", titel: "Fleischsommelier-Abend", datum: "2027-05-08", zeit: "18:00–22:00", ort: "Balzers",
    preis: 169, plaetze: 14, frei: 0,
    text: "Fleischkunde mit dem Dipl. Fleischsommelier: Cuts, Reifung, Degustation." },
  { id: "k4", titel: "Wild vom Grill", datum: "2027-09-25", zeit: "14:00–19:00", ort: "Balzers",
    preis: 179, plaetze: 12, frei: 9,
    text: "Reh, Hirsch und Wildschwein richtig zubereiten: von der Verarbeitung bis auf den Teller." },
];
