// Anti-fraude Commande Express : score de risque 0–100 expliqué facteur par facteur, jeton anti-robot
// signé et empreinte d'IP. Le score n'empêche jamais une commande : il guide l'appel de confirmation.
// Seuls la liste noire, le champ piège et la limite par jour refusent une commande.
import { createHmac } from "node:crypto";

export type Facteur = { code: string; points: number; libelle: string };

export type Indices = {
  telephoneValide: boolean;
  nom: string;
  quantite: number;
  /** Temps entre l'ouverture du formulaire et l'envoi, en millisecondes (null : inconnu). */
  dureeMs: number | null;
  jetonValide: boolean;
  /** Commandes du même numéro dans cette boutique. */
  historique: { livrees: number; refusees: number; fauxNumero: number; dernieres24h: number };
  /** Commandes venues de la même connexion dans les dernières 24 h. */
  memeIp24h: number;
};

const NOM_SUSPECT = /^(test|essai|aaa+|xxx+|azer|qwer|asdf|abc|toto|null|undefined|client|fake)\b/i;

/** Facteurs retenus, du plus lourd au plus léger, et score borné à 0–100. */
export function scoreRisque(i: Indices): { score: number; niveau: "faible" | "moyen" | "eleve"; facteurs: Facteur[] } {
  const f: Facteur[] = [];
  const nom = i.nom.trim();
  if (i.historique.fauxNumero > 0) f.push({ code: "faux_numero", points: 45, libelle: "Numéro déjà signalé comme faux dans votre boutique" });
  if (i.historique.refusees > 0) f.push({ code: "refus_livraison", points: Math.min(40, 25 + 10 * (i.historique.refusees - 1)), libelle: "Commande déjà refusée ou annulée à la livraison" });
  if (!i.telephoneValide) f.push({ code: "telephone_invalide", points: 25, libelle: "Numéro de téléphone au format inhabituel" });
  if (i.dureeMs !== null && i.dureeMs < 4000) f.push({ code: "remplissage_rapide", points: 30, libelle: "Formulaire rempli en moins de 4 secondes (robot probable)" });
  if (!i.jetonValide) f.push({ code: "hors_formulaire", points: 20, libelle: "Commande envoyée sans passer par le formulaire de la boutique" });
  if (i.historique.dernieres24h > 0) f.push({ code: "doublon_recent", points: 15, libelle: "Même numéro déjà commandé dans les dernières 24 h" });
  if (i.memeIp24h >= 3) f.push({ code: "meme_connexion", points: 20, libelle: "Plusieurs commandes depuis la même connexion en 24 h" });
  if (nom.length < 3 || NOM_SUSPECT.test(nom) || /\d{3,}/.test(nom) || /(.)\1{3,}/.test(nom)) f.push({ code: "nom_suspect", points: 20, libelle: "Nom inhabituel" });
  if (i.quantite > 10) f.push({ code: "quantite_elevee", points: 15, libelle: "Quantité inhabituellement élevée" });
  if (i.historique.livrees > 0) f.push({ code: "client_fidele", points: -20, libelle: "Client déjà livré avec succès" });
  const score = Math.max(0, Math.min(100, f.reduce((n, x) => n + x.points, 0)));
  return { score, niveau: score >= 60 ? "eleve" : score >= 30 ? "moyen" : "faible", facteurs: f.sort((a, b) => b.points - a.points) };
}

function secret(): string {
  return [process.env.AXSO_CLE_CHIFFREMENT, process.env.AUTH_SECRET, process.env.NEXTAUTH_SECRET].map((s) => s?.trim()).find(Boolean) ?? "axso-dev";
}

/** Jeton glissé dans la configuration du formulaire : prouve que la commande vient de la vitrine. */
export function signerJeton(tenantId: string, maintenant = Date.now()): string {
  const ts = Math.floor(maintenant / 1000).toString(36);
  return `${ts}.${createHmac("sha256", secret()).update(`ce:${tenantId}:${ts}`).digest("base64url").slice(0, 22)}`;
}

/** Valable 7 jours (les pages produit peuvent rester en cache longtemps). */
export function jetonValide(jeton: unknown, tenantId: string, maintenant = Date.now()): boolean {
  if (typeof jeton !== "string" || !/^[0-9a-z]{1,10}\.[A-Za-z0-9_-]{22}$/.test(jeton)) return false;
  const [ts, sig] = jeton.split(".");
  const age = maintenant / 1000 - parseInt(ts, 36);
  if (!(age >= -300 && age <= 7 * 86_400)) return false;
  return createHmac("sha256", secret()).update(`ce:${tenantId}:${ts}`).digest("base64url").slice(0, 22) === sig;
}

/** Empreinte de l'IP : permet de compter et de bloquer une connexion sans garder l'adresse. */
export function empreinteIp(ip: string): string {
  return createHmac("sha256", secret()).update(`ip:${ip}`).digest("base64url").slice(0, 24);
}
