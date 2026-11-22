// Devis, comptes entreprises, retours en libre-service, workflows et lancements : règles pures.
import { z } from "zod";

// ─── Conditions de paiement ───────────────────────────────────────────
export const CONDITIONS = { comptant: 0, net15: 15, net30: 30, net60: 60 } as const;
export type ConditionPaiement = keyof typeof CONDITIONS;
export const LIBELLES_CONDITIONS: Record<ConditionPaiement, string> = {
  comptant: "À la livraison", net15: "Sous 15 jours", net30: "Sous 30 jours", net60: "Sous 60 jours",
};
const conditionSchema = z.enum(["comptant", "net15", "net30", "net60"]);

/** Commande à terme : la livraison ne vaut pas paiement (lib/commandes.ts). */
export const METHODE_A_TERME = "facture_terme";
export const methodeDePaiement = (c: ConditionPaiement) => (c === "comptant" ? "direct_cod" : METHODE_A_TERME);

export function echeancePaiement(c: ConditionPaiement, depuis: Date): Date | null {
  const jours = CONDITIONS[c];
  return jours ? new Date(depuis.getTime() + jours * 86_400_000) : null;
}

/** Vrai si l'encours de l'entreprise plus cette commande reste sous son plafond (null = sans plafond). */
export const sousPlafond = (plafond: number | null | undefined, encours: number, montant: number) =>
  plafond == null || encours + montant <= plafond;

// ─── Devis et commandes brouillons ────────────────────────────────────
export const STATUTS_DEVIS = ["brouillon", "envoye", "soumis", "accepte", "refuse", "annule"] as const;
export type StatutDevis = (typeof STATUTS_DEVIS)[number];

export const ligneDevisSchema = z.object({
  produitId: z.string().min(1).max(40),
  nom: z.string().trim().min(1).max(200),
  variante: z.string().max(200).nullish(),
  prix: z.number().min(0).max(1_000_000_000),
  quantite: z.number().int().min(1).max(99_999),
  imageUrl: z.string().max(2000).nullish(),
});
export type LigneDevis = z.infer<typeof ligneDevisSchema>;

export const devisSchema = z.object({
  entrepriseId: z.string().max(40).nullish(),
  clientNom: z.string().trim().min(1, "Nom du client requis").max(160),
  clientEmail: z.string().trim().email("E-mail invalide").max(200).nullish().or(z.literal("").transform(() => null)),
  clientTelephone: z.string().trim().min(6, "Téléphone requis").max(30),
  adresse: z.string().trim().max(300).nullish(),
  ville: z.string().trim().max(120).nullish(),
  pays: z.string().trim().max(60).nullish(),
  lignes: z.array(ligneDevisSchema).min(1, "Ajoutez au moins un produit").max(100),
  remise: z.number().min(0).default(0),
  livraison: z.number().min(0).default(0),
  conditions: conditionSchema.default("comptant"),
  bonCommande: z.string().trim().max(60).nullish(),
  note: z.string().trim().max(2000).nullish(),
  expireAt: z.coerce.date().nullish(),
});

export function totauxDevis(lignes: Pick<LigneDevis, "prix" | "quantite">[], remise = 0, livraison = 0) {
  const sousTotal = lignes.reduce((s, l) => s + l.prix * l.quantite, 0);
  const reduction = Math.min(Math.max(remise, 0), sousTotal);
  return { sousTotal, reduction, livraison: Math.max(livraison, 0), total: sousTotal - reduction + Math.max(livraison, 0) };
}

export const devisExpire = (d: { expireAt?: Date | null }, maintenant: Date) => !!d.expireAt && d.expireAt <= maintenant;
/** Le client accepte ou refuse uniquement un devis envoyé et encore valable. */
export const clientPeutRepondre = (d: { statut: string; expireAt?: Date | null }, maintenant: Date) => d.statut === "envoye" && !devisExpire(d, maintenant);
/** Le marchand transforme en commande tout devis qui n'est pas clos. */
export const marchandPeutConvertir = (statut: string) => statut === "brouillon" || statut === "envoye" || statut === "soumis";
export const devisModifiable = (statut: string) => statut === "brouillon" || statut === "envoye" || statut === "soumis";

/** Prix net d'un compte entreprise : remise du compte sur le prix (déjà au palier de gros), à l'unité près. */
export const prixEntreprise = (prix: number, remisePct: number) => Math.round(prix * (1 - Math.min(Math.max(remisePct, 0), 90) / 100));

// ─── Comptes entreprises ──────────────────────────────────────────────
export const entrepriseSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(160),
  contactNom: z.string().trim().max(160).nullish(),
  email: z.string().trim().email("E-mail invalide").max(200).nullish().or(z.literal("").transform(() => null)),
  telephone: z.string().trim().min(6, "Téléphone requis").max(30),
  adresse: z.string().trim().max(300).nullish(),
  ville: z.string().trim().max(120).nullish(),
  pays: z.string().trim().max(60).nullish(),
  identifiantFiscal: z.string().trim().max(60).nullish(),
  conditions: conditionSchema.default("comptant"),
  remisePct: z.number().min(0).max(90).default(0),
  plafond: z.number().min(0).nullish(),
  actif: z.boolean().default(true),
});

export const commandeProSchema = z.object({
  bonCommande: z.string().trim().max(60).nullish(),
  note: z.string().trim().max(2000).nullish(),
  lignes: z.array(z.object({ produitId: z.string().min(1).max(40), variante: z.string().max(200).nullish(), quantite: z.number().int().min(1).max(99_999) })).min(1, "Indiquez au moins une quantité").max(100),
});

// ─── Retours en libre-service ─────────────────────────────────────────
export const DELAI_RETOUR_JOURS = 14;
export const RAISONS_RETOUR = { defaut: "Article défectueux", erreur_commande: "Mauvais article reçu", endommage: "Article endommagé", change_avis: "J'ai changé d'avis" } as const;
export const retourClientSchema = z.object({
  commandeId: z.string().min(1).max(40),
  raison: z.enum(["defaut", "erreur_commande", "endommage", "change_avis"]),
  type: z.enum(["remboursement", "echange"]).default("remboursement"),
  description: z.string().trim().max(1000).nullish(),
});

export function refusRetour(c: { statut: string; livreeAt?: Date | null; retours?: { statut: string }[] }, maintenant: Date): string | null {
  if (c.statut !== "livree") return "Un retour s'ouvre une fois la commande livrée";
  if (c.retours?.some((r) => r.statut !== "rejete")) return "Un retour existe déjà pour cette commande";
  if (!c.livreeAt || maintenant.getTime() - c.livreeAt.getTime() > DELAI_RETOUR_JOURS * 86_400_000) return `Le délai de retour de ${DELAI_RETOUR_JOURS} jours est dépassé`;
  return null;
}

// ─── Workflows ────────────────────────────────────────────────────────
export const DECLENCHEURS_WORKFLOW = {
  "order.created": "Commande créée", "order.paid": "Commande payée", "order.fulfilled": "Commande livrée", "inventory.low": "Stock bas",
} as const;
export type DeclencheurWorkflow = keyof typeof DECLENCHEURS_WORKFLOW;
export const CHAMPS_WORKFLOW: Record<DeclencheurWorkflow, { champ: string; label: string; nombre?: boolean }[]> = {
  "order.created": [{ champ: "total", label: "Montant total", nombre: true }, { champ: "ville", label: "Ville" }, { champ: "pays", label: "Pays" }, { champ: "commandesClient", label: "Nombre de commandes du client", nombre: true }],
  "order.paid": [{ champ: "total", label: "Montant total", nombre: true }, { champ: "ville", label: "Ville" }, { champ: "pays", label: "Pays" }, { champ: "commandesClient", label: "Nombre de commandes du client", nombre: true }],
  "order.fulfilled": [{ champ: "total", label: "Montant total", nombre: true }, { champ: "ville", label: "Ville" }, { champ: "pays", label: "Pays" }, { champ: "commandesClient", label: "Nombre de commandes du client", nombre: true }],
  "inventory.low": [{ champ: "stock", label: "Stock restant", nombre: true }, { champ: "nom", label: "Nom du produit" }],
};
export const ACTIONS_WORKFLOW = { notifier: "Me notifier", email_client: "Envoyer un e-mail au client", segment_client: "Classer le client dans un segment", masquer_produit: "Masquer le produit" } as const;

const conditionWorkflow = z.object({ champ: z.string().regex(/^\w{1,40}$/), op: z.enum(["<", "<=", ">", ">=", "=", "!=", "contient"]), valeur: z.union([z.string().max(120), z.number()]) });
const actionWorkflow = z.discriminatedUnion("type", [
  z.object({ type: z.literal("notifier"), titre: z.string().trim().min(1, "Titre requis").max(120), message: z.string().trim().max(500).default("") }),
  z.object({ type: z.literal("email_client"), sujet: z.string().trim().min(1, "Sujet requis").max(160), message: z.string().trim().min(1, "Message requis").max(2000) }),
  z.object({ type: z.literal("segment_client"), segment: z.string().trim().min(1, "Segment requis").max(40) }),
  z.object({ type: z.literal("masquer_produit") }),
]);
export type ActionWorkflow = z.infer<typeof actionWorkflow>;

export const workflowSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(120),
  actif: z.boolean().default(true),
  declencheur: z.enum(["order.created", "order.paid", "order.fulfilled", "inventory.low"]),
  conditions: z.array(conditionWorkflow).max(8).default([]),
  actions: z.array(actionWorkflow).min(1, "Ajoutez au moins une action").max(6),
}).superRefine((w, ctx) => {
  const champs = new Set(CHAMPS_WORKFLOW[w.declencheur].map((c) => c.champ));
  if (w.conditions.some((c) => !champs.has(c.champ))) ctx.addIssue({ code: "custom", message: "Condition incompatible avec ce déclencheur" });
  for (const a of w.actions) {
    if (w.declencheur === "inventory.low" && (a.type === "email_client" || a.type === "segment_client")) ctx.addIssue({ code: "custom", message: "Un stock bas ne concerne aucun client" });
    if (w.declencheur !== "inventory.low" && a.type === "masquer_produit") ctx.addIssue({ code: "custom", message: "Masquer un produit se fait sur le déclencheur Stock bas" });
  }
});

/** Remplace {{champ}} par sa valeur dans un texte d'action. */
export const remplirModele = (texte: string, donnees: Record<string, unknown>) =>
  texte.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, c) => (Object.hasOwn(donnees, c) && donnees[c] != null ? String(donnees[c]) : ""));

// ─── Lancements planifiés ─────────────────────────────────────────────
export const lancementSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(120),
  debut: z.coerce.date(),
  fin: z.coerce.date().nullish(),
}).superRefine((l, ctx) => {
  if (l.fin && l.fin <= l.debut) ctx.addIssue({ code: "custom", message: "La fin doit suivre le début" });
});

export type ActionLancement = "publier" | "retablir" | null;
/** Ce que le passage planifié doit faire de ce lancement maintenant. */
export function actionLancement(l: { statut: string; debut: Date; fin?: Date | null }, maintenant: Date): ActionLancement {
  if (l.statut === "planifie" && l.debut <= maintenant) return l.fin && l.fin <= maintenant ? null : "publier";
  if (l.statut === "en_ligne" && l.fin && l.fin <= maintenant) return "retablir";
  return null;
}
