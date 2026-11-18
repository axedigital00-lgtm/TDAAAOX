// Modèles de politiques construits UNIQUEMENT à partir des données réelles de la boutique (pur, testable).
// Servent de repli sans IA et de base de travail à Axia (lib/politiques-axia.ts). Ce qui n'est pas
// connu reste « [À compléter : …] » : visible du marchand, jamais publié (lib/politiques.ts).
import type { ReglagesLivraison } from "./livraison-reglages";
import type { ReglagesPaiement } from "./paiement-pays";
import type { TypePolitique } from "./politiques";
import { formatMontant } from "./utils";

export type TypeVente = "physique" | "digital" | "mixte";

export interface FaitsBoutique {
  nom: string;
  description?: string | null;
  categorie?: string | null;
  pays: string; // nom lisible (« Cameroun »)
  devise: string;
  vente: TypeVente;
  email?: string | null;
  telephone?: string | null;
  whatsapp?: string | null;
  adresse?: string | null;
  horaires?: string | null;
  livraison: ReglagesLivraison;
  paiement: ReglagesPaiement;
  /** Outils de mesure réellement installés sur la vitrine (pixels). */
  traceurs: string[];
}

/** Physique, digital ou mixte : d'après les produits, sinon le mode de la boutique. */
export function typeVente(nbParType: Record<string, number>, modeBoutique?: unknown): TypeVente {
  const digital = (nbParType.digital ?? 0) > 0;
  const physique = Object.entries(nbParType).some(([t, n]) => t !== "digital" && n > 0);
  if (digital && physique) return "mixte";
  if (digital) return "digital";
  if (physique) return "physique";
  return modeBoutique === "digital" ? "digital" : "physique";
}

const AC = (quoi: string) => `[À compléter : ${quoi}]`;

function contacts(f: FaitsBoutique): string {
  const l = [
    f.whatsapp && `- WhatsApp : ${f.whatsapp}`,
    f.telephone && `- Téléphone : ${f.telephone}`,
    f.email && `- E-mail : ${f.email}`,
    f.adresse && `- Adresse : ${f.adresse}`,
    f.horaires && `- Horaires : ${f.horaires}`,
  ].filter(Boolean);
  return l.length ? l.join("\n") : `- ${AC("comment te contacter (WhatsApp, e-mail)")}`;
}

function moyensPaiement(f: FaitsBoutique): string[] {
  const l: string[] = [];
  if (f.vente !== "digital") {
    if (f.paiement.livraison) l.push("Paiement à la livraison : vous payez à la réception de votre commande.");
    if (f.paiement.whatsapp) l.push("Commande sur WhatsApp, payée à la livraison.");
    if (!f.paiement.livraisonHorsPays) l.push(`Le paiement à la livraison est réservé aux clients situés dans le même pays que la boutique (${f.pays}).`);
  }
  if (f.vente !== "physique") l.push(`Produits numériques : ${AC("comment vos clients paient les produits numériques")}`);
  return l;
}

const money = (f: FaitsBoutique, n: number) => formatMontant(n, f.devise);

function accesNumerique(f: FaitsBoutique): string {
  return [
    "Dès que le paiement est confirmé, vous recevez par e-mail le lien d'accès à vos produits numériques (téléchargement, formation ou clé). Vous les retrouvez aussi dans « Mon compte » de la boutique, avec votre adresse e-mail.",
    "",
    "- L'accès est à vie, sauf si une durée d'accès est indiquée sur la fiche du produit.",
    "- En cas de remboursement, l'accès au produit est coupé.",
  ].join("\n");
}

function livraison(f: FaitsBoutique): string {
  if (f.vente === "digital") {
    return [`## Accès à vos produits numériques`, "", accesNumerique(f), "", "## Une question ?", "", contacts(f)].join("\n");
  }
  const L = f.livraison;
  const zones = L.zones.length
    ? L.zones.map((z) => `- ${z.nom} : ${money(f, z.frais ?? L.frais)}${z.delai ? `, ${z.delai}` : L.delai ? `, ${L.delai}` : ""}`).join("\n")
    : `- ${AC("villes ou quartiers où tu livres")}`;
  const frais = L.gratuite
    ? "La livraison est offerte."
    : L.frais > 0 || L.zones.some((z) => (z.frais ?? 0) > 0)
      ? `Frais de livraison standard : ${money(f, L.frais)} (le tarif de votre zone s'affiche au moment de la commande).${L.minimum > 0 ? ` Livraison offerte dès ${money(f, L.minimum)} d'achat.` : ""}`
      : `Frais de livraison : ${AC("frais de livraison")}.`;
  return [
    `## Zones de livraison`, "", zones, "",
    `## Frais`, "", frais, "",
    `## Délais`, "", L.delai ? `Délai habituel : ${L.delai}.` : `Délai habituel : ${AC("délai de livraison habituel")}.`, "",
    `## Paiement`, "", ...moyensPaiement(f).map((m) => `- ${m}`), "",
    `## Suivi de votre commande`, "", "Vous pouvez suivre votre commande depuis la page « Suivi de commande » de la boutique.", "",
    `## Absence à la livraison`, "", AC("ce qui se passe si le client est absent ou injoignable à la livraison"), "",
    ...(f.vente === "mixte" ? [`## Produits numériques`, "", accesNumerique(f), ""] : []),
    `## Nous contacter`, "", contacts(f),
  ].join("\n");
}

function retours(f: FaitsBoutique): string {
  const physique = f.vente !== "digital";
  return [
    ...(physique ? [
      `## Retours`, "",
      `- Délai pour demander un retour : ${AC("délai de retour en jours")}`,
      `- État du produit : ${AC("état exigé du produit retourné (neuf, emballage d'origine…)")}`,
      `- Frais de retour : ${AC("qui paie les frais de retour")}`,
      `- Produits non repris : ${AC("produits qui ne peuvent pas être retournés, ou « aucun »")}`, "",
    ] : []),
    `## Remboursements`, "",
    `Les commandes payées à la livraison sont remboursées directement par la boutique : ${AC("moyen de remboursement (espèces, mobile money…)")}, sous ${AC("délai de remboursement")}.`, "",
    ...(f.vente !== "physique" ? [
      `## Produits numériques`, "",
      `- Conditions de remboursement : ${AC("conditions de remboursement des produits numériques")}`,
      "- Un produit numérique remboursé n'est plus accessible.", "",
    ] : []),
    `## Comment faire une demande`, "", "Contactez-nous en indiquant votre numéro de commande :", "", contacts(f),
  ].join("\n");
}

function confidentialite(f: FaitsBoutique): string {
  return [
    `## Données collectées`, "",
    "Quand vous passez commande, nous recueillons :", "",
    "- votre nom et votre numéro de téléphone ;",
    ...(f.vente !== "digital" ? ["- votre ville et votre adresse de livraison ;"] : []),
    "- votre adresse e-mail si vous la donnez ;",
    "- le contenu de vos commandes.", "",
    `## Utilisation`, "",
    "Ces données servent uniquement à traiter vos commandes, à vous livrer ou vous donner accès à vos achats, et à vous contacter à leur sujet (par exemple sur WhatsApp).", "",
    `## Partage`, "",
    `- La boutique ${f.nom} est hébergée par la plateforme Axso, qui conserve les données nécessaires au fonctionnement de la boutique.`,
    ...(f.vente !== "digital" ? ["- Le livreur chargé de votre commande reçoit votre nom, votre téléphone et votre adresse de livraison."] : []),
    ...(f.traceurs.length ? [`- Mesure d'audience et publicité : la boutique utilise ${f.traceurs.join(", ")}.`] : []),
    "- Vos données ne sont jamais vendues.", "",
    `## Cookies`, "",
    "La boutique utilise des cookies et le stockage de votre navigateur pour son fonctionnement (langue, panier, connexion à votre compte).", "",
    `## Durée de conservation`, "", AC("durée de conservation des données des clients"), "",
    `## Vos droits`, "",
    "Vous pouvez demander à consulter, corriger ou supprimer vos données en nous contactant :", "", contacts(f),
  ].join("\n");
}

function cgv(f: FaitsBoutique): string {
  return [
    `## Vendeur`, "",
    `${f.nom}, ${f.pays}.`, "", contacts(f), "",
    `## Produits`, "",
    `${f.description?.trim() || AC("ce que vend la boutique")}`, "",
    "Chaque fiche produit présente ses caractéristiques. Un produit en rupture de stock ne peut pas être commandé.", "",
    `## Prix`, "", `Les prix sont indiqués en ${f.devise} sur chaque fiche produit.${f.vente !== "digital" ? " Les frais de livraison s'ajoutent au moment de la commande." : ""}`, "",
    `## Commande`, "",
    `La commande est passée sur la boutique${f.vente !== "digital" && f.paiement.whatsapp ? " ou sur WhatsApp" : ""}. Elle est confirmée par la boutique.`, "",
    `## Paiement`, "", ...moyensPaiement(f).map((m) => `- ${m}`), "",
    ...(f.vente !== "digital" ? [`## Livraison`, "", "Les zones, frais et délais sont détaillés dans notre politique de livraison.", ""] : []),
    ...(f.vente !== "physique" ? [`## Produits numériques`, "", accesNumerique(f), ""] : []),
    `## Retours et remboursements`, "", "Les conditions sont détaillées dans notre politique de retours et remboursements.", "",
    `## Litiges`, "", `En cas de désaccord, contactez-nous d'abord pour trouver une solution. À défaut : ${AC("juridiction compétente en cas de litige (ville du tribunal)")}.`,
  ].join("\n");
}

export const MODELES: Record<TypePolitique, (f: FaitsBoutique) => string> = { livraison, retours, confidentialite, cgv };
