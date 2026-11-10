/*
  INHALTE DER SEITE
  -----------------
  Hier stehen alle Produkte, Grillkurse und Einstellungen.
  Wer etwas ändern will (Preis, Termin, neues Gewürz), ändert es nur hier.
  Später kann ein CMS (z. B. Pages CMS) genau diese Daten über ein Formular bearbeiten.
*/

// Produktbilder: freigestellt, zentriert, hellorange Hintergrund (erzeugt mit werkzeuge/produktbilder.py)
const PRODUKTBILD = "img/produkte/";

const EINSTELLUNGEN = {
  versandKosten: 9.0,        // ANNAHME: Versandpauschale in CHF, mit Kunde klären
  gratisVersandAb: 80.0,     // ANNAHME: ab diesem Warenwert kein Versand
  waehrung: "CHF",
};

// Gewürze, die man einzeln kaufen oder in die kleine Box legen kann
const PRODUKTE = [
  {
    id: "box-klein", name: "Gewürzbox klein", preis: 24.0, typ: "box", auswahl: 2,
    bild: PRODUKTBILD + "box-klein.jpg",
    text: "Die Geschenkbox mit zwei Gewürzen nach Wahl: ideal zum Verschenken.",
  },
  {
    id: "box-gross", name: "Gewürzbox gross", preis: 70.0, typ: "box",
    bild: PRODUKTBILD + "box-gross.jpg",
    text: "Alle unsere Gewürze in einer Box: die ultimative Gewürzerfahrung.",
  },
  {
    id: "schwein", name: "Gewürz Schwein", preis: 12.0, typ: "gewuerz",
    bild: PRODUKTBILD + "schwein.jpg",
    text: "Für Schwein und vieles mehr: bringt Geschmacksvielfalt auf den Grill.",
  },
  {
    id: "gefluegel", name: "Gewürz Geflügel", preis: 12.0, typ: "gewuerz",
    bild: PRODUKTBILD + "gefluegel.jpg",
    text: "Für saftiges, aromatisches Grillgeflügel.",
  },
  {
    id: "fisch", name: "Gewürz Fisch", preis: 12.0, typ: "gewuerz",
    bild: PRODUKTBILD + "fisch.jpg",
    text: "Harmoniert perfekt mit gegrilltem Fisch.",
  },
  {
    id: "wild", name: "Gewürz Wild", preis: 12.0, typ: "gewuerz", neu: true,
    bild: PRODUKTBILD + "wild.jpg",
    text: "Kräftig, würzig, wild: Kräuter, dunkle Gewürze und eine frische Zitrusnote. Für Wild, Rind, Lamm und Pilze.",
  },
  {
    id: "salz-grob", name: "Pfeffer-Salz grob", preis: 12.0, typ: "gewuerz",
    bild: PRODUKTBILD + "salz-grob.jpg",
    text: "Die Grundlage für Grillgerichte, Salate und Suppen.",
  },
  {
    id: "salz-fein", name: "Pfeffer-Salz fein", preis: 12.0, typ: "gewuerz",
    bild: PRODUKTBILD + "salz-fein.jpg",
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
