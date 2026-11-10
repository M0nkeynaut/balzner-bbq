"""Produktbilder freistellen, zentrieren und auf hellorangen Hintergrund setzen.
Aufruf: python3 -I produktbilder.py <eingabe-ordner> <ausgabe-ordner> [vorschau.png]
"""
import sys, os
import numpy as np
import cv2

EIN, AUS = sys.argv[1], sys.argv[2]
os.makedirs(AUS, exist_ok=True)
GROESSE = 800

# Pro Bild: Rechteck (x0, y0, x1, y1 in Anteilen) als Startbereich fürs Freistellen, None = automatisch.
# "fuellen" = wie viel der Bildhöhe/-breite das Objekt maximal einnimmt.
BILDER = {
    "schwein": ("dose", 0.74), "gefluegel": ("dose", 0.74), "fisch": ("dose", 0.74), "wild": ("dose", 0.74),
    "salz-grob": ("dose", 0.74), "salz-fein": ("dose", 0.74),
    "box-gross": ((0.01, 0.06, 0.99, 0.95), 0.86),
    # Kleine Box ragt oben aus dem Foto: Umriss von Hand als Vieleck
    "box-klein": ([(0.112, 0.0), (0.878, 0.0), (0.885, 0.585), (0.845, 0.632), (0.15, 0.622), (0.112, 0.585)], 0.86),
}


def auto_rechteck(img):
    """Hintergrundfarbe aus den Ecken schätzen und alles deutlich Andere umrahmen."""
    h, w = img.shape[:2]
    k = max(4, h // 20)
    ecken = np.concatenate([img[:k, :k], img[:k, -k:], img[-k:, :k], img[-k:, -k:]]).reshape(-1, 3)
    bg = np.median(ecken, axis=0)
    diff = np.linalg.norm(img.astype(float) - bg, axis=2)
    maske = (diff > 60).astype(np.uint8)
    maske = cv2.morphologyEx(maske, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(maske)
    i = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    x, y, bw, bh = stats[i, :4]
    r = int(0.02 * w)
    return max(0, x - r), max(0, y - r), min(w - 1, x + bw + r), min(h - 1, y + bh + r)


def dose_maske(img):
    """Dose = Zylinder: Kanten aus den dunklen Pixeln messen, Rechteck mit runden Ecken."""
    h, w = img.shape[:2]
    grau = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(float)
    dunkel = grau < 90
    breite = dunkel.sum(axis=1)
    zeilen = np.where(breite > 0.5 * breite.max())[0]
    L = int(np.median([np.argmax(dunkel[y]) for y in zeilen]))
    R = int(np.median([w - 1 - np.argmax(dunkel[y][::-1]) for y in zeilen]))
    k = max(4, h // 20)
    ecken = np.concatenate([img[:k, :k], img[:k, -k:]]).reshape(-1, 3)
    bg = np.median(ecken, axis=0)
    diff = np.linalg.norm(img.astype(float) - bg, axis=2)[:, L:R]
    # Zeilen, in denen die Dose fast über die ganze Breite vom Hintergrund abweicht (auch Silberrand)
    voll = np.where((diff > 40).mean(axis=1) > 0.85)[0]
    oben = voll.min()
    W = R - L
    # Unterkante: pro Spalte die letzte Zeile, die sich noch vom Hintergrund darunter abhebt
    glatt = cv2.GaussianBlur(grau, (0, 0), 1.0)
    xs, ys = [], []
    for c in range(L + W // 10, R - W // 10):
        spalte = np.where(dunkel[:, c])[0]
        if len(spalte) == 0:
            continue
        start = spalte.max()
        ende = min(h - 2, start + int(0.15 * W))
        if ende <= start + 2:
            continue
        werte = glatt[start + 1:ende, c]
        ref = np.median(werte[-5:])                 # Hintergrund unterhalb der Dose
        anders = np.where(np.abs(werte - ref) > 15)[0]  # Silberring weicht ab (heller oder dunkler)
        if len(anders):
            xs.append(c); ys.append(start + 1 + int(anders.max()))
    xs, ys = np.array(xs), np.array(ys)
    # Unterkante einer Dose = halbe Ellipse: y = yc + b * sqrt(1 - ((x - mitte) / halbbreite)^2)
    mitte, hb = (L + R) / 2, W / 2
    ell = lambda x: np.sqrt(np.clip(1 - ((x - mitte) / hb) ** 2, 0, 1))
    A = np.stack([np.ones(len(xs)), ell(xs)], axis=1)
    gut = np.ones(len(xs), bool)
    for _ in range(3):  # Ausreisser schrittweise entfernen
        (yc, bb), *_ = np.linalg.lstsq(A[gut], ys[gut], rcond=None)
        gut = np.abs(yc + bb * ell(xs) - ys) < 3

    m = 2  # 2 px nach innen, gegen helle Kanten
    r = int(W * 0.07)
    fg = np.zeros((h, w), np.uint8)
    yy = np.arange(h)[:, None]
    spalten = np.arange(L + m, R - m + 1)
    boden = yc + bb * ell(spalten) - m
    fg[:, L + m:R - m + 1] = ((yy >= oben + m) & (yy <= boden[None, :])).astype(np.uint8) * 255
    # obere Ecken abrunden
    for cx, seite in ((L + m + r, -1), (R - m - r, 1)):
        for y in range(oben + m, oben + m + r):
            dx = int(np.sqrt(max(0, r * r - (oben + m + r - y) ** 2)))
            if seite < 0:
                fg[y, L + m:max(L + m, cx - dx)] = 0
            else:
                fg[y, min(R - m + 1, cx + dx + 1):R - m + 1] = 0
    return cv2.GaussianBlur(fg, (0, 0), max(0.8, w / 700)).astype(float) / 255


def freistellen(img, rechteck):
    h, w = img.shape[:2]
    if rechteck == "dose":
        return dose_maske(img)
    if isinstance(rechteck, list):  # Vieleck: Maske direkt zeichnen
        fg = np.zeros((h, w), np.uint8)
        cv2.fillPoly(fg, [np.array([(int(x * w), int(y * h)) for x, y in rechteck])], 255)
        return cv2.GaussianBlur(fg, (0, 0), 1.2).astype(float) / 255
    if rechteck is None:
        x0, y0, x1, y1 = auto_rechteck(img)
    else:
        x0, y0, x1, y1 = int(rechteck[0] * w), int(rechteck[1] * h), int(rechteck[2] * w), int(rechteck[3] * h)
    x0, y0 = max(x0, 1), max(y0, 1)
    x1, y1 = min(x1, w - 2), min(y1, h - 2)
    maske = np.zeros((h, w), np.uint8)
    bgd, fgd = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(img, maske, (x0, y0, x1 - x0, y1 - y0), bgd, fgd, 8, cv2.GC_INIT_WITH_RECT)
    fg = np.where((maske == 1) | (maske == 3), 255, 0).astype(np.uint8)
    # nur grösstes Stück behalten, Löcher schliessen, Kante weich machen
    n, lab, stats, _ = cv2.connectedComponentsWithStats(fg)
    if n > 1:
        fg = np.where(lab == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
    konturen, _ = cv2.findContours(fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    fg = np.zeros_like(fg)
    cv2.drawContours(fg, konturen, -1, 255, cv2.FILLED)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    # Kante etwas nach innen ziehen, damit kein heller Rand vom alten Hintergrund bleibt
    k = max(3, w // 120)
    fg = cv2.erode(fg, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    alpha = cv2.GaussianBlur(fg, (0, 0), max(1.0, w / 600)).astype(float) / 255
    return alpha


def hintergrund():
    """Heller, warmer Orange-Verlauf: Mitte heller, Rand etwas kräftiger."""
    yy, xx = np.mgrid[0:GROESSE, 0:GROESSE].astype(float)
    d = np.sqrt((xx - GROESSE / 2) ** 2 + (yy - GROESSE * 0.45) ** 2) / (GROESSE * 0.75)
    d = np.clip(d, 0, 1)[..., None]
    innen = np.array([222, 238, 253], float)   # BGR  #fdeede
    aussen = np.array([176, 208, 247], float)  # BGR  #f7d0b0
    return innen * (1 - d) + aussen * d


def setzen(img, alpha, fuellen):
    ys, xs = np.where(alpha > 0.5)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    obj, a = img[y0:y1, x0:x1].astype(float), alpha[y0:y1, x0:x1]
    oh, ow = obj.shape[:2]
    s = min(GROESSE * fuellen / oh, GROESSE * 0.86 / ow)
    nw, nh = int(ow * s), int(oh * s)
    inter = cv2.INTER_CUBIC if s > 1 else cv2.INTER_AREA
    obj = cv2.resize(obj, (nw, nh), interpolation=inter)
    a = cv2.resize(a, (nw, nh), interpolation=inter)[..., None]
    a = np.clip(a, 0, 1)

    bild = hintergrund()
    ox = (GROESSE - nw) // 2
    oy = (GROESSE - nh) // 2 - int(GROESSE * 0.01)

    # weicher Bodenschatten
    schatten = np.zeros((GROESSE, GROESSE), float)
    cx, cy = GROESSE // 2, oy + nh
    cv2.ellipse(schatten, (cx, cy), (int(nw * 0.48), max(6, int(nh * 0.035))), 0, 0, 360, 1.0, -1)
    schatten = cv2.GaussianBlur(schatten, (0, 0), GROESSE * 0.025)[..., None]
    bild = bild * (1 - 0.38 * schatten) + np.array([40, 60, 110.0]) * 0.38 * schatten

    region = bild[oy:oy + nh, ox:ox + nw]
    bild[oy:oy + nh, ox:ox + nw] = obj * a + region * (1 - a)
    return np.clip(bild, 0, 255).astype(np.uint8)


fertig = []
for name, (rechteck, fuellen) in BILDER.items():
    img = cv2.imread(os.path.join(EIN, name + ".jpg"))
    alpha = freistellen(img, rechteck)
    out = setzen(img, alpha, fuellen)
    ziel = os.path.join(AUS, name + ".jpg")
    cv2.imwrite(ziel, out, [cv2.IMWRITE_JPEG_QUALITY, 86, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
    fertig.append(out)
    print(name, "ok")

if len(sys.argv) > 3:
    kl = [cv2.resize(f, (300, 300), interpolation=cv2.INTER_AREA) for f in fertig]
    zeilen = [np.hstack(kl[i:i + 4]) for i in range(0, 8, 4)]
    cv2.imwrite(sys.argv[3], np.vstack(zeilen))
