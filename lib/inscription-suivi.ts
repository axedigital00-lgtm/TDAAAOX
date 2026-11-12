// Suivi anonyme du parcours d'inscription, côté navigateur → /api/inscription/evenement.
// Aucune donnée personnelle : jamais d'email, de nom, de téléphone ni de texte libre saisi.
// `valeur` = choix non personnel seulement (type de boutique, code pays, id de design).
// Ne lève jamais d'exception : le suivi ne doit pas pouvoir bloquer l'inscription.
export type TypeEvenement = "vue" | "choix" | "abandon" | "fin" | "erreur";

const URL_API = "/api/inscription/evenement";
const CLE_SESSION = "axso_insc_session";
type Evt = { session: string; type: TypeEvenement; etape: string; valeur?: string; dureeMs?: number };

let file: Evt[] = [];
let minuteur: ReturnType<typeof setTimeout> | null = null;
let ecoute = false;
let fini = false;

function session(): string {
  try {
    let s = sessionStorage.getItem(CLE_SESSION);
    if (!s) { s = crypto.randomUUID().replace(/-/g, "").slice(0, 24); sessionStorage.setItem(CLE_SESSION, s); }
    return s;
  } catch { return "sans-stockage"; }
}

function vider() {
  if (minuteur) { clearTimeout(minuteur); minuteur = null; }
  while (file.length) {
    const corps = JSON.stringify(file.splice(0, 20));
    try {
      if (!navigator.sendBeacon?.(URL_API, corps)) fetch(URL_API, { method: "POST", body: corps, keepalive: true }).catch(() => {});
    } catch {}
  }
}

export function suivre(type: TypeEvenement, etape: string, extra?: { valeur?: string; dureeMs?: number }): void {
  if (typeof window === "undefined") return;
  try {
    if (type === "fin") fini = true;
    file.push({
      session: session(), type, etape: etape.slice(0, 40),
      ...(extra?.valeur ? { valeur: extra.valeur.slice(0, 60) } : {}),
      ...(extra?.dureeMs != null ? { dureeMs: Math.min(Math.max(Math.round(extra.dureeMs), 0), 3_600_000) } : {}),
    });
    if (!ecoute) {
      ecoute = true;
      addEventListener("pagehide", vider);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") vider(); });
    }
    if (file.length >= 20) vider();
    else if (!minuteur) minuteur = setTimeout(vider, 2000);
  } catch {}
}

/** Vue d'une étape ; la fonction rendue envoie le « choix » avec le temps passé sur l'étape. */
export function suivreEtape(etape: string): (choix?: string) => void {
  const debut = Date.now();
  suivre("vue", etape);
  return (choix?: string) => suivre("choix", etape, { valeur: choix, dureeMs: Date.now() - debut });
}

/** Abandon : à la fermeture de la page, envoie l'étape en cours (sauf si l'inscription est finie). */
export function surveillerAbandon(etapeCourante: () => string): () => void {
  if (typeof window === "undefined") return () => {};
  const surFermeture = () => { if (!fini) { suivre("abandon", etapeCourante()); vider(); } };
  addEventListener("pagehide", surFermeture);
  return () => removeEventListener("pagehide", surFermeture);
}
