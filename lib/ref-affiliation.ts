// Code d'affiliation mémorisé chez le client (navigateur) : le dernier lien cliqué gagne,
// valable 30 jours (fenêtre d'attribution standard). Ancien format sans date : ignoré.
const CLE = "axso_ref";
const JOURS = 30;

export function memoriserRef(code: string) {
  try { localStorage.setItem(CLE, JSON.stringify({ code, exp: Date.now() + JOURS * 86400_000 })); } catch {}
}

export function lireRef(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) || "null");
    return v?.code && v.exp > Date.now() ? String(v.code) : null;
  } catch { return null; }
}

export function oublierRef() {
  try { localStorage.removeItem(CLE); } catch {}
}
