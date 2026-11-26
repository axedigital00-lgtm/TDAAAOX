// Commande Express AXSO sur la fiche produit : configuration publique compilée côté serveur
// (aucun appel au dashboard depuis la vitrine), puis le script léger /commande-express.js.
// Rien n'est rendu si le marchand n'a pas activé Commande Express ou si le produit est numérique.
import { getT } from "@/lib/i18n/serveur";
import { lireReglages } from "@/lib/commande-express/reglages";
import { lireReglagesLivraison } from "@/lib/livraison-reglages";
import { lireReglagesPaiement } from "@/lib/paiement-pays";
import { exempleTelephone } from "@/lib/devise-convert";
import { TYPES_NUMERIQUES } from "@/lib/pricing";
import { signerJeton } from "@/lib/commande-express/risque";

type Props = {
  tenant: { id: string; slug: string; devise: string; pays?: string | null; parametresLivraison: unknown; parametresPaiement: unknown };
  produit: { id: string; nom: string; type: string; prix: number; images: string[]; variantes?: { nom: string; valeur: string; prix: number | null }[] };
};

export async function CommandeExpressWidget({ tenant, produit }: Props) {
  if (TYPES_NUMERIQUES.has(produit.type)) return null;
  const r = await lireReglages(tenant.id);
  if (!r.actif) return null;
  const t = await getT();
  const T = (s: string) => t(s);
  const config = {
    slug: tenant.slug, devise: tenant.devise, pays: tenant.pays ?? "", couleur: r.couleur, boutonCollant: r.boutonCollant, demanderEmail: r.demanderEmail,
    texteBouton: T(r.texteBouton), canal: lireReglagesPaiement(tenant.parametresPaiement).livraison ? "direct" : "whatsapp",
    zones: lireReglagesLivraison(tenant.parametresLivraison).zones.map((z) => z.nom),
    exempleTelephone: exempleTelephone(tenant.pays), jeton: signerJeton(tenant.id),
    produit: { id: produit.id, nom: produit.nom, prix: produit.prix, image: produit.images[0] ?? null, variantes: (produit.variantes ?? []).map((v) => ({ nom: v.nom, valeur: v.valeur, prix: v.prix })) },
    textes: Object.fromEntries(Object.entries({
      commander: "Commander maintenant", titre: "Commander", fermer: "Fermer", option: "Option", quantite: "Quantité", nom: "Nom complet",
      telephone: "Téléphone (WhatsApp de préférence)", email: "E-mail (facultatif)", zone: "Ville ou zone de livraison", choisir: "Choisir…", ville: "Ville",
      quartier: "Quartier", repere: "Repère (facultatif)", repereEx: "Ex. face pharmacie", position: "Partager ma position (facultatif)",
      positionEnCours: "Localisation…", positionOk: "Position partagée", positionKo: "Position refusée : indiquez un repère", total: "Total",
      note: "Paiement à la livraison. Frais de livraison selon votre zone.", valider: "Commander · paiement à la livraison", envoi: "Envoi de la commande…",
      errNom: "Indiquez votre nom.", errTel: "Indiquez un numéro de téléphone valide.", errZone: "Indiquez votre ville ou zone de livraison.",
      errServeur: "Commande impossible pour le moment.", errReseau: "Connexion interrompue. Vérifiez votre réseau et touchez à nouveau « Commander » : vous ne serez pas débité deux fois.",
      merci: "Commande reçue !", merciTexte: "Commande n° {0}. La boutique vous contacte pour la livraison. Total à payer à la réception : {1}.",
      whatsapp: "Envoyer ma commande sur WhatsApp", suivi: "Suivre ma commande",
    }).map(([k, v]) => [k, T(v)])),
  };
  // JSON dans une balise script : « < » échappé pour qu'aucun texte ne puisse fermer la balise.
  const json = JSON.stringify(config).replace(/</g, "\\u003c");
  return (
    <>
      <script id="axso-ce" type="application/json" dangerouslySetInnerHTML={{ __html: json }} />
      <script src="/commande-express.js" defer />
    </>
  );
}
