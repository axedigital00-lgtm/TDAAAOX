// Éditeur du formulaire Releasit COD AXSO : modèle de design, animation du bouton, ordre, libellés et
// obligation des champs, champs personnalisés, message de succès. Lecture tolérante (valeurs par défaut).
import { z } from "zod";

export const MODELES = {
  minimal: { nom: "Minimal", fond: "#FFFFFF", texte: "#111111", champ: "#FFFFFF", bordure: "#E3E3E3", rayon: 12, ombre: "0 -10px 40px rgba(0,0,0,.25)" },
  sombre: { nom: "Premium sombre", fond: "#0F1115", texte: "#F5F5F5", champ: "#1A1D24", bordure: "#2C313B", rayon: 14, ombre: "0 -10px 40px rgba(0,0,0,.5)" },
  afro: { nom: "Afro-chic", fond: "#FFF8EE", texte: "#2B1A0E", champ: "#FFFFFF", bordure: "#E9CFA8", rayon: 18, ombre: "0 -10px 40px rgba(80,40,0,.25)" },
  flash: { nom: "Flash promo", fond: "#FFFFFF", texte: "#111111", champ: "#FFF5F5", bordure: "#FFB4B4", rayon: 10, ombre: "0 -10px 40px rgba(200,0,0,.25)" },
  or: { nom: "Luxe or", fond: "#14110B", texte: "#F3E7C9", champ: "#1E1A12", bordure: "#6B5A2E", rayon: 4, ombre: "0 -10px 40px rgba(0,0,0,.55)" },
  compact: { nom: "Mobile compact", fond: "#FFFFFF", texte: "#111111", champ: "#F6F6F6", bordure: "#F6F6F6", rayon: 10, ombre: "0 -6px 24px rgba(0,0,0,.2)" },
} as const;
export type Modele = keyof typeof MODELES;

/** Champs du formulaire de base, dans leur ordre par défaut. Nom, téléphone et ville restent obligatoires. */
export const CHAMPS_BASE = ["nom", "telephone", "email", "ville", "quartier", "repere", "position"] as const;
export type ChampBase = (typeof CHAMPS_BASE)[number];
export const CHAMPS_FIXES: ChampBase[] = ["nom", "telephone", "ville"];
export const LIBELLES_DEFAUT: Record<ChampBase, string> = {
  nom: "Nom complet", telephone: "Téléphone (WhatsApp de préférence)", email: "E-mail (facultatif)", ville: "Ville ou zone de livraison",
  quartier: "Quartier", repere: "Repère (facultatif)", position: "Partager ma position (facultatif)",
};

const champ = z.object({
  cle: z.string().max(40),
  libelle: z.string().trim().max(80).optional(),
  visible: z.boolean().optional(),
  requis: z.boolean().optional(),
});
const champPerso = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,24}$/),
  libelle: z.string().trim().min(1).max(80),
  type: z.enum(["texte", "liste", "case"]),
  options: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  requis: z.boolean().optional(),
});

export const schemaFormulaire = z.object({
  modele: z.enum(Object.keys(MODELES) as [Modele, ...Modele[]]).default("minimal"),
  animation: z.enum(["aucune", "pulse", "shake", "glow"]).default("pulse"),
  titre: z.string().trim().max(80).optional(),
  sousTitre: z.string().trim().max(120).optional(),
  champs: z.array(champ).max(20).default([]),
  perso: z.array(champPerso).max(6).default([]),
  succes: z.string().trim().max(300).optional(),
  boutonEnvoi: z.string().trim().max(50).optional(),
});
export type Formulaire = z.infer<typeof schemaFormulaire>;

/** Formulaire stocké, complété : chaque champ de base présent une fois, dans l'ordre choisi. */
export function lireFormulaire(brut: unknown, demanderEmail = false): Formulaire & { champs: { cle: ChampBase; libelle?: string; visible: boolean; requis: boolean }[] } {
  const r = schemaFormulaire.safeParse(brut ?? {});
  const f = r.success ? r.data : schemaFormulaire.parse({});
  const vus = new Set<string>();
  const ordonnes = f.champs.filter((c): c is typeof c & { cle: ChampBase } => (CHAMPS_BASE as readonly string[]).includes(c.cle) && !vus.has(c.cle) && !!vus.add(c.cle));
  for (const cle of CHAMPS_BASE) if (!vus.has(cle)) ordonnes.push({ cle, visible: cle === "email" ? demanderEmail : true });
  return {
    ...f,
    champs: ordonnes.map((c) => ({
      cle: c.cle, libelle: c.libelle || undefined,
      visible: CHAMPS_FIXES.includes(c.cle) ? true : c.visible !== false,
      requis: CHAMPS_FIXES.includes(c.cle) ? true : c.cle === "position" ? false : !!c.requis,
    })),
  };
}

/** Réponses aux champs personnalisés envoyées par le navigateur : seuls les champs configurés, bornées. */
export function lireReponses(f: Formulaire, brut: unknown): { ok: true; champs: { libelle: string; valeur: string }[] } | { ok: false; erreur: string } {
  const recu = brut && typeof brut === "object" ? (brut as Record<string, unknown>) : {};
  const champs: { libelle: string; valeur: string }[] = [];
  for (const c of f.perso) {
    const v = recu[c.id];
    let valeur = c.type === "case" ? (v === true || v === "oui" ? "Oui" : "") : typeof v === "string" ? v.trim().slice(0, 300) : "";
    if (c.type === "liste" && valeur && !(c.options ?? []).includes(valeur)) valeur = "";
    if (c.requis && !valeur) return { ok: false, erreur: `Champ obligatoire : ${c.libelle}` };
    if (valeur) champs.push({ libelle: c.libelle, valeur });
  }
  return { ok: true, champs };
}
