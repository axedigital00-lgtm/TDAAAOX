// Releasit COD AXSO — offres recommandées à partir des ventes réelles de la boutique (60 jours) :
// meilleure vente sans offre de quantité, produits souvent achetés ensemble, petit article d'impulsion
// après la commande, code promo à la fermeture. Partagé par le dashboard et Stella.
import { prisma } from "@/lib/prisma";

const arrondi = (n: number) => Math.max(50, Math.round(n / 50) * 50);

export async function suggererOffres(tenantId: string) {
  const depuis = new Date(Date.now() - 60 * 86_400_000);
  const [offres, produits, lignes, codes] = await Promise.all([
    prisma.offreReleasit.findMany({ where: { tenantId: tenantId }, select: { type: true, produitId: true, produitOffertId: true } }),
    prisma.produit.findMany({ where: { tenantId: tenantId, actif: true, type: { in: ["physique", "dropshipping"] } }, select: { id: true, nom: true, prix: true, stock: true, type: true } }),
    prisma.ligneCommande.findMany({ where: { commande: { tenantId: tenantId, createdAt: { gte: depuis }, statut: { not: "annulee" } } }, select: { commandeId: true, produitId: true, quantite: true }, take: 5000 }),
    prisma.codePromo.findMany({ where: { tenantId: tenantId, actif: true }, select: { id: true, code: true, type: true, valeur: true }, take: 20 }),
  ]);
  const prod = new Map(produits.map((p) => [p.id, p]));
  const vendus = new Map<string, number>();
  const parCommande = new Map<string, Set<string>>();
  for (const l of lignes) {
    if (!prod.has(l.produitId)) continue;
    vendus.set(l.produitId, (vendus.get(l.produitId) ?? 0) + l.quantite);
    parCommande.set(l.commandeId, (parCommande.get(l.commandeId) ?? new Set()).add(l.produitId));
  }
  const suggestions: { type: string; titre: string; raison: string; offre: Record<string, unknown> }[] = [];

  // 1. Meilleure vente sans offre de quantité : paliers −8 % et −15 %.
  const avecQuantite = new Set(offres.filter((o) => o.type === "quantite").map((o) => o.produitId));
  const meilleure = [...vendus.entries()].filter(([id]) => !avecQuantite.has(id)).sort((a, b) => b[1] - a[1])[0];
  const cibleQuantite = meilleure ? prod.get(meilleure[0]) : produits.filter((p) => !avecQuantite.has(p.id)).sort((a, b) => b.prix - a.prix)[0];
  if (cibleQuantite) suggestions.push({
    type: "quantite", titre: `Offre de quantité sur « ${cibleQuantite.nom} »`,
    raison: meilleure ? `Votre meilleure vente des 60 derniers jours (${meilleure[1]} vendus) : un palier « 2 » fait souvent monter le panier de 30 à 60 %.` : "Votre produit le plus cher : un prix dégressif aide à décider.",
    offre: { type: "quantite", titre: "Choisissez votre offre", produitId: cibleQuantite.id, paliers: [{ quantite: 2, prix: arrondi(cibleQuantite.prix * 0.92), badge: "Le plus populaire" }, { quantite: 3, prix: arrondi(cibleQuantite.prix * 0.85), libelle: "Meilleure affaire" }] },
  });

  // 2. Produits souvent achetés ensemble : case à cocher sur la fiche du premier.
  const paires = new Map<string, number>();
  for (const set of parCommande.values()) {
    const ids = [...set];
    for (const a of ids) for (const b of ids) if (a !== b) paires.set(`${a}|${b}`, (paires.get(`${a}|${b}`) ?? 0) + 1);
  }
  const dejaCase = new Set(offres.filter((o) => o.type === "case").map((o) => `${o.produitId}|${o.produitOffertId}`));
  const paire = [...paires.entries()].filter(([k]) => !dejaCase.has(k)).sort((a, b) => b[1] - a[1])[0];
  if (paire && paire[1] >= 2) {
    const [a, b] = paire[0].split("|").map((id) => prod.get(id)!);
    suggestions.push({ type: "case", titre: `Proposer « ${b.nom} » avec « ${a.nom} »`, raison: `Achetés ensemble dans ${paire[1]} commandes : proposez-le d'une case à cocher.`, offre: { type: "case", titre: `Ajouter ${b.nom}`, produitId: a.id, produitOffertId: b.id } });
  }

  // 3. Après la commande : un petit article d'impulsion (le moins cher en stock).
  if (!offres.some((o) => o.type === "apres_achat")) {
    const petit = produits.filter((p) => p.type !== "physique" || p.stock > 0).sort((x, y) => x.prix - y.prix)[0];
    if (petit) suggestions.push({ type: "apres_achat", titre: `Ajout en 1 clic : « ${petit.nom} »`, raison: "Un petit prix se décide en une seconde, juste après « Commande reçue ».", offre: { type: "apres_achat", titre: "Complétez votre commande", texte: "Livré avec le reste, sans frais en plus", produitOffertId: petit.id } });
  }

  // 4. À la fermeture : un code promo existant (ou en créer un).
  if (!offres.some((o) => o.type === "sortie")) {
    const code = codes.find((x) => x.type === "pourcentage") ?? codes[0];
    suggestions.push(code
      ? { type: "sortie", titre: `Code ${code.code} à la fermeture`, raison: "Rattrape une partie des clients qui ferment le formulaire sans commander.", offre: { type: "sortie", titre: code.type === "pourcentage" ? `−${code.valeur} % sur votre commande` : "Une réduction sur votre commande", texte: "Seulement aujourd'hui", codePromoId: code.id } }
      : { type: "sortie", titre: "Créer un code promo pour la fermeture", raison: "Créez d'abord un code (ex. −10 %) dans Réductions, puis proposez-le aux clients qui partent.", offre: {} });
  }
  return suggestions;
}
