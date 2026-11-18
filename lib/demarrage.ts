// Parcours de démarrage : chargement des données réelles et suivi (Tenant.demarrage). Règles : lib/demarrage-regles.ts.
import { prisma } from "@/lib/prisma";
import { lireReglagesLivraison } from "@/lib/livraison-reglages";
import { lirePolitiques } from "@/lib/politiques";
import {
  badgeCompleteVisible, bandeauVisible, calculerEtapes, completude, lireSuivi, majCompleteLe, progression,
  type CleEtape, type DonneesDemarrage, type SuiviDemarrage,
} from "@/lib/demarrage-regles";
import { phraseEtape } from "@/lib/demarrage-messages";

export async function chargerDemarrage(tenantId: string, maintenant = new Date()) {
  const [tenant, nbProduitsActifs, nbExemples] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        statut: true, themeConfig: true, parametresLivraison: true, politiques: true,
        adresse: true, horaires: true, email: true, domaineActifAt: true, demarrage: true,
      },
    }),
    prisma.produit.count({ where: { tenantId, actif: true, exempleAxia: false } }),
    prisma.produit.count({ where: { tenantId, actif: false, exempleAxia: true } }),
  ]);
  if (!tenant) return null;

  const donnees: DonneesDemarrage = {
    statut: tenant.statut,
    digital: (tenant.themeConfig as any)?.modeBoutique === "digital",
    nbProduitsActifs,
    nbExemples,
    zones: lireReglagesLivraison(tenant.parametresLivraison).zones,
    politiques: lirePolitiques(tenant.politiques),
    adresse: tenant.adresse,
    horaires: tenant.horaires,
    email: tenant.email,
    domaineActif: !!tenant.domaineActifAt,
    suivi: lireSuivi(tenant.demarrage),
  };
  const etapes = calculerEtapes(donnees);
  const comp = completude(etapes);

  // Date de passage à 100 % (badge 7 jours), effacée si une étape redevient incomplète.
  const completeLe = majCompleteLe(donnees.suivi, comp.pourcent, maintenant);
  if (completeLe !== undefined) {
    donnees.suivi = { ...donnees.suivi, completeLe };
    await marquerDemarrage(tenantId, { completeLe });
  }

  return { donnees, etapes, completude: comp, progression: progression(etapes) };
}

export interface EtatCompletude {
  /** Bandeau « Boutique complète à X % » : boutique publiée, incomplète, pas réduite (« Plus tard »). */
  visible: boolean;
  /** Badge « Boutique complète » (7 jours après le passage à 100 %). */
  badge: boolean;
  pourcent: number;
  /** Étapes « Pour bien vendre » manquantes : lien direct + conséquence réelle (clés i18n, `liste` remplit {0}). */
  manquantes: { cle: CleEtape; href: string; texte: string; liste?: string[] }[];
}

/** Bandeau de complétude (Tableau de bord, constructeur) et rappel après publication. */
export async function etatCompletude(tenantId: string, maintenant = new Date()): Promise<EtatCompletude | null> {
  const d = await chargerDemarrage(tenantId, maintenant);
  if (!d) return null;
  const { suivi, statut } = d.donnees;
  const { pourcent, manquantes } = d.completude;
  return {
    visible: statut !== "brouillon" && bandeauVisible(suivi, pourcent, maintenant),
    badge: badgeCompleteVisible(suivi, pourcent, maintenant),
    pourcent,
    manquantes: manquantes.map((e) => ({ cle: e.cle, href: e.href, ...phraseEtape(e, d.donnees) })),
  };
}

/** Fusionne une partie du suivi dans Tenant.demarrage (lecture-écriture, sans écraser le reste). */
export async function marquerDemarrage(tenantId: string, patch: Partial<SuiviDemarrage>) {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { demarrage: true } });
  if (!t) return;
  const suivi = { ...lireSuivi(t.demarrage), ...patch };
  await prisma.tenant.update({ where: { id: tenantId }, data: { demarrage: suivi as any } });
}

/** Pose une date seulement si elle n'existe pas encore (première fois). */
export async function marquerUneFois(tenantId: string, cle: "constructeurEnregistreLe" | "livraisonConfirmeeLe" | "lienAffiliesPartageLe" | "publieeLe") {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { demarrage: true } });
  if (!t || lireSuivi(t.demarrage)[cle]) return;
  await marquerDemarrage(tenantId, { [cle]: new Date().toISOString() });
}
