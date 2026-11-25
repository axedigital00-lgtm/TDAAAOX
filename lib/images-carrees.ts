// Photos produit du catalogue : tous les formats sont acceptés. La grille du
// catalogue affiche des carrés, donc une photo non carrée est placée entière
// (jamais rognée) au centre d'un carré blanc avant l'envoi. Les photos trop
// grandes sont réduites, ce qui accélère l'envoi depuis un téléphone.
// Si la photo ne peut pas être lue par le navigateur, elle part telle quelle :
// rien ne doit bloquer l'ajout d'un produit. Navigateur uniquement.

const COTE_MAX = 2000;
const QUALITE = 0.9;

export const estCarre = (l: number, h: number) => l > 0 && h > 0 && Math.abs(l - h) <= 0.02 * Math.max(l, h);

/** Dimensions réelles d'une image (fichier ou URL). */
export function dimensions(src: File | string): Promise<{ l: number; h: number }> {
  return new Promise((ok, ko) => {
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    const img = new Image();
    img.onload = () => { ok({ l: img.naturalWidth, h: img.naturalHeight }); if (typeof src !== "string") URL.revokeObjectURL(url); };
    img.onerror = () => ko(new Error("Image illisible"));
    img.src = url;
  });
}

function charger(f: File): Promise<HTMLImageElement> {
  return new Promise((ok, ko) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => { ok(img); URL.revokeObjectURL(url); };
    img.onerror = () => { ko(new Error("Image illisible")); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

/** Met la photo au carré (entière, centrée, fond blanc) et la réduit si besoin. Rend le fichier d'origine en cas d'échec. */
export async function preparerPhoto(f: File): Promise<File> {
  if (f.type === "image/gif") return f; // animation conservée
  try {
    const img = await charger(f);
    const l = img.naturalWidth, h = img.naturalHeight;
    if (!l || !h) return f;
    if (estCarre(l, h) && Math.max(l, h) <= COTE_MAX && f.size <= 4 * 1024 * 1024 && f.type !== "image/heic") return f;
    const cote = Math.min(COTE_MAX, Math.max(l, h));
    const echelle = cote / Math.max(l, h);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = cote;
    const ctx = canvas.getContext("2d");
    if (!ctx) return f;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cote, cote);
    const dl = Math.round(l * echelle), dh = Math.round(h * echelle);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, Math.round((cote - dl) / 2), Math.round((cote - dh) / 2), dl, dh);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", QUALITE));
    if (!blob) return f;
    return new File([blob], f.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return f;
  }
}

/** Envoie les photos (une ou plusieurs), chacune préparée par preparerPhoto. Ne lève jamais : un échec d'envoi est rendu dans `erreur`. */
export async function envoyerImagesCarrees(fichiers: File[]): Promise<{ urls: string[]; refusees: string[]; erreur?: string }> {
  const urls: string[] = [];
  let erreur: string | undefined;
  for (const brut of fichiers) {
    const f = await preparerPhoto(brut);
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/upload", { method: "POST", body: fd }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { erreur = data.error === "blob_not_configured" ? "Stockage des fichiers non configuré" : data.error || "Erreur upload"; continue; }
    urls.push(data.url);
  }
  return { urls, refusees: [], erreur };
}

export const MESSAGE_REFUS = (refusees: string[]) => `Image${refusees.length > 1 ? "s" : ""} non envoyée${refusees.length > 1 ? "s" : ""} : ${refusees.join(", ")}`;
