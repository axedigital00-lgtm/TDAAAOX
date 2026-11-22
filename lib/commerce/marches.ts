// Marchés : vendre dans plusieurs pays depuis une seule boutique — devise affichée, ajustement de
// prix par pays, arrondi local et pays où la boutique est ouverte. La devise de règlement reste
// celle de la boutique ; la conversion sert à l'affichage (le paiement est encaissé en devise boutique).
import { z } from "zod";

/** Unités de devise pour 1 EUR. XAF et XOF sont à parité fixe ; les autres sont des valeurs de
 *  référence que le marchand peut écraser par marché (champ `taux`). */
export const TAUX_EUR: Record<string, number> = {
  XAF: 655.957, XOF: 655.957, EUR: 1, USD: 1.08, GBP: 0.85, NGN: 1650, GHS: 16.5, KES: 140,
  MAD: 10.9, TND: 3.4, CDF: 3050, GNF: 9300, RWF: 1500, ZAR: 20, CAD: 1.48,
};

export const DEVISES = Object.keys(TAUX_EUR);

/** Devise usuelle par pays (ISO 3166 alpha-2) pour pré-remplir un marché. */
export const DEVISE_PAYS: Record<string, string> = {
  CM: "XAF", GA: "XAF", CG: "XAF", TD: "XAF", CF: "XAF", GQ: "XAF",
  SN: "XOF", CI: "XOF", BJ: "XOF", TG: "XOF", BF: "XOF", ML: "XOF", NE: "XOF", GW: "XOF",
  NG: "NGN", GH: "GHS", KE: "KES", MA: "MAD", TN: "TND", CD: "CDF", GN: "GNF", RW: "RWF", ZA: "ZAR",
  FR: "EUR", BE: "EUR", DE: "EUR", US: "USD", GB: "GBP", CA: "CAD",
};

export const marcheSchema = z.object({
  id: z.string().min(1).max(40),
  nom: z.string().trim().min(1).max(60),
  pays: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1).max(60),
  devise: z.string().refine((d) => d in TAUX_EUR, "Devise non prise en charge"),
  taux: z.number().positive().optional(), // unités de devise pour 1 EUR, sinon TAUX_EUR
  ajustementPct: z.number().min(-50).max(200).default(0),
  arrondi: z.enum(["aucun", "unite", "dizaine", "centaine", "99"]).default("aucun"),
  actif: z.boolean().default(true),
});
export type Marche = z.infer<typeof marcheSchema>;
export const marchesSchema = z.array(marcheSchema).max(30).superRefine((ms, ctx) => {
  const vus = new Set<string>();
  for (const m of ms) for (const p of m.pays) {
    if (vus.has(p)) ctx.addIssue({ code: "custom", message: `Le pays ${p} est dans deux marchés` });
    vus.add(p);
  }
});

export function lireMarches(brut: unknown): Marche[] {
  const r = marchesSchema.safeParse(brut ?? []);
  return r.success ? r.data : [];
}

export function convertir(montant: number, de: string, vers: string, taux?: number): number {
  if (de === vers) return montant;
  const tDe = TAUX_EUR[de], tVers = taux ?? TAUX_EUR[vers];
  if (!tDe || !tVers) return montant;
  return (montant / tDe) * tVers;
}

export function arrondir(v: number, mode: Marche["arrondi"], devise: string): number {
  const decimales = ["XAF", "XOF", "GNF", "RWF", "CDF", "NGN"].includes(devise) ? 0 : 2;
  switch (mode) {
    case "unite": return Math.round(v);
    case "dizaine": return Math.round(v / 10) * 10;
    case "centaine": return Math.round(v / 100) * 100;
    case "99": return decimales ? Math.floor(v) + 0.99 : Math.max(Math.ceil(v / 100) * 100 - 1, 0);
    default: return Number(v.toFixed(decimales));
  }
}

/** Marché qui couvre un pays (actif uniquement). */
export function marcheDuPays(marches: Marche[], pays?: string | null): Marche | null {
  if (!pays) return null;
  const p = pays.toUpperCase();
  return marches.find((m) => m.actif && m.pays.includes(p)) ?? null;
}

/** Prix affiché dans un marché, à partir du prix boutique. */
export function prixMarche(prix: number, deviseBoutique: string, marche: Marche | null): { montant: number; devise: string } {
  if (!marche) return { montant: prix, devise: deviseBoutique };
  const ajuste = prix * (1 + marche.ajustementPct / 100);
  return { montant: arrondir(convertir(ajuste, deviseBoutique, marche.devise, marche.taux), marche.arrondi, marche.devise), devise: marche.devise };
}

/** Affichage vitrine d'un visiteur : son marché (devise, taux, arrondi) prime sur la conversion par défaut.
 *  L'ajustement n'entre pas ici : il changerait le prix vu sans changer le montant encaissé. */
export function affichageVisiteur(opts: { marches: Marche[]; pays: string | null; deviseBoutique: string; deviseParDefaut: string; ratioVers: (devise: string) => number }) {
  const m = marcheDuPays(opts.marches, opts.pays);
  if (!m) return { devise: opts.deviseParDefaut, ratio: opts.ratioVers(opts.deviseParDefaut), arrondi: "aucun" as Marche["arrondi"] };
  const ratio = m.taux ? convertir(1, opts.deviseBoutique, m.devise, m.taux) : opts.ratioVers(m.devise);
  return { devise: m.devise, ratio, arrondi: m.arrondi };
}
