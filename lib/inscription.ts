// Parcours d'inscription marchand : paramètres d'arrivée et progression sauvegardée.
// Module pur : utilisé par la page (navigateur) et testé dans tests/inscription.test.ts.
import { z } from "zod";
import type { PlanBoutique } from "./ai-agent";

export const emailValide = (email?: string | null) => !!email && z.string().email().safeParse(email).success;

/** ?email= (pré-remplit le compte, depuis le hero) et ?plan= (plan choisi sur les tarifs). */
export function lireParametresInscription(params: URLSearchParams) {
  const email = params.get("email")?.trim() ?? "";
  const plan = params.get("plan")?.trim() ?? "";
  return {
    email: emailValide(email) ? email : "",
    // Gardé de bout en bout ; sans effet tant qu'il n'y a pas de plan payant (tout compte démarre en Essentiel).
    plan: /^palier[0-2]$/.test(plan) ? plan : "",
  };
}

// ─── Écrans, dans l'ordre ───────────────────────────────────────────────────
// « charte » : identité visuelle (logo, couleurs, polices), entre le design et le prénom/WhatsApp.
export const ETAPES = ["type", "vente", "nom", "pays", "analyse", "design", "charte", "identite", "acces", "decollage", "code", "revelation"] as const;
export type Etape = (typeof ETAPES)[number];

/** Poussée de la jauge (0 à 1) : monte à chaque écran, 1 au décollage. */
export function poussee(etape: Etape): number {
  const i = ETAPES.indexOf(etape);
  const fin = ETAPES.indexOf("decollage");
  return Math.min(1, Math.max(0, i / fin));
}

/** Libellé de la jauge, de « Allumage » à « Décollage ». */
export function palierJauge(p: number): string {
  if (p >= 1) return "Décollage";
  if (p >= 0.7) return "Pleine poussée";
  if (p >= 0.35) return "Montée en pression";
  return "Allumage";
}

// ─── Progression sauvegardée dans le navigateur ─────────────────────────────
// Reprise après un rechargement. Jamais le mot de passe. Le plan d'Axia est gardé
// pour ne pas relancer (et repayer) l'analyse.
export const CLE_PROGRESSION = "axso_inscription_v1";
const DUREE_MAX = 7 * 86400_000;

const produit = z.object({
  nom: z.string(), prix: z.number(), categorie: z.string(),
  description: z.string().optional(), stock: z.number().optional(),
  imageUrl: z.string().optional(), type: z.enum(["physique", "digital"]).optional(),
}).passthrough();

// Identité visuelle (écran « charte ») : tout est facultatif. Couleurs et polices absentes = celles du design.
const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
export const schemaCharte = z.object({
  logoUrl: z.string().max(500).default(""),
  sansLogo: z.boolean().default(false),
  couleurs: z.object({ principale: hex, secondaire: hex }).nullable().default(null),
  polices: z.object({ titre: z.string().max(40), corps: z.string().max(40) }).nullable().default(null),
});
export type Charte = z.infer<typeof schemaCharte>;
export const CHARTE_VIDE: Charte = { logoUrl: "", sansLogo: false, couleurs: null, polices: null };

const schemaProgression = z.object({
  etape: z.enum(ETAPES),
  typeBoutique: z.enum(["physique", "digital", ""]).default(""),
  vente: z.string().max(2000).default(""),
  nom: z.string().max(60).default(""),
  paysCode: z.string().max(20).default(""),
  paysNom: z.string().max(80).default(""),
  devise: z.string().max(5).default("XAF"),
  // Réponses pour lesquelles le plan a été fait : réponse changée → nouvelle analyse.
  planPour: z.string().default(""),
  plan: z.object({ nomBoutique: z.string(), slug: z.string(), themeId: z.string(), produits: z.array(produit) }).passthrough().nullable().default(null),
  themeIds: z.array(z.string()).max(4).default([]),
  messageIA: z.string().max(2000).default(""),
  prenom: z.string().max(80).default(""),
  whatsapp: z.string().max(30).default(""),
  email: z.string().max(200).default(""),
  planParam: z.string().max(20).default(""),
  charte: schemaCharte.default(CHARTE_VIDE),
  // Boutique déjà créée (rechargement après la création) : il ne reste qu'à se connecter.
  creee: z.object({ email: z.string(), slug: z.string() }).nullable().default(null),
  le: z.number(),
});
// Le schéma vérifie la forme minimale ; le plan reste typé comme celui renvoyé par Axia.
export type Progression = Omit<z.infer<typeof schemaProgression>, "plan"> & { plan: (PlanBoutique & { messageIA?: string }) | null };

/** Signature des réponses qui servent à l'analyse d'Axia. */
export const signatureReponses = (p: Pick<Progression, "typeBoutique" | "vente" | "nom" | "paysCode">) =>
  JSON.stringify([p.typeBoutique, p.vente, p.nom, p.paysCode]);

/**
 * Lit une progression sauvegardée : null si absente, abîmée ou trop vieille.
 * Un rechargement pendant l'analyse ou le décollage ramène à l'écran d'avant
 * (la requête en cours est perdue avec la page).
 */
export function lireProgression(brut: string | null, maintenant = Date.now()): Progression | null {
  if (!brut) return null;
  let p: Progression;
  try {
    const r = schemaProgression.safeParse(JSON.parse(brut));
    if (!r.success) return null;
    p = r.data as Progression;
  } catch { return null; }
  if (maintenant - p.le > DUREE_MAX) return null;
  if (p.creee) return { ...p, etape: "code" };
  if (p.etape === "analyse") return { ...p, etape: p.plan && p.planPour === signatureReponses(p) ? "design" : "pays" };
  // Sans mot de passe sauvegardé, le décollage reprend à l'écran des accès.
  if (p.etape === "decollage" || p.etape === "code" || p.etape === "revelation") return { ...p, etape: "acces" };
  // Écrans qui demandent le plan d'Axia : sans lui, retour au pays.
  if (["design", "charte", "identite", "acces"].includes(p.etape) && !p.plan) return { ...p, etape: "pays" };
  return p;
}
