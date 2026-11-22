import "@fontsource-variable/inter/wght.css";
import "@/components/dashboard/design-system/tokens/tokens.css";
import "@/components/dashboard/design-system/ds.css";
import "@/components/dashboard/design-system/legacy.css";
import { auth } from "@/lib/auth";
import { MenusDeroulants } from "@/components/ui/MenusDeroulants";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ExtrasDashboard } from "@/components/dashboard/ExtrasDashboard";
import { quotaCommandesAtteint, planActif } from "@/lib/abonnement";
import { permissionsSession, estCaissierPur } from "@/lib/permissions-server";
import { AbonnementOverlayProvider } from "@/components/dashboard/AbonnementOverlayProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { I18nProvider } from "@/components/I18nProvider";
import { getLangue, dico } from "@/lib/i18n/serveur";
import { DeviseProvider } from "@/components/dashboard/DeviseProvider";
import { EssaiIllimite } from "@/components/dashboard/EssaiIllimite";
import { etatEssai } from "@/lib/essai";
import { finPromo } from "@/lib/promo";
import { boutiquesDuCompte } from "@/lib/tenant";
import { urlBoutique } from "@/lib/utils";


// Manifeste : installable (écran d'accueil), exigé par iPhone pour les notifications push.
export const metadata = { manifest: "/manifest-dashboard.webmanifest" };
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/connexion");
  // Compte affilié sans boutique : son espace est /affilie.
  if ((session.user as any)?.role === "affilie") redirect("/affilie");
  if ((session.user as any)?.role === "transporteur") redirect("/transporteur");

  const tenantId = (session.user as any)?.tenantId;
  // Lectures indépendantes en parallèle : chaque aller-retour vers la base se ressent à chaque page.
  const [t, quotaAtteint, planInfo, permissions, modeCaisse, modePos, commandesATraiter] = await Promise.all([
    tenantId ? prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, nomBoutique: true, devise: true, sousDomaineAt: true, customDomain: true, domaineActifAt: true },
    }) : null,
    tenantId ? quotaCommandesAtteint(tenantId) : false,
    tenantId ? planActif(tenantId) : finPromo().then((promoFinLe) => ({ plan: "palier0" as const, promoFinLe })),
    permissionsSession(session),
    estCaissierPur(session),
    // Mode de la caisse (simple | pro) : allège ou déploie le menu « Caisse & magasin ».
    // Une boutique sans réglages — ou une base pas encore migrée — reste en mode simple.
    tenantId
      ? prisma.reglagesPos.findUnique({ where: { tenantId }, select: { mode: true } }).then((r) => (r?.mode === "pro" ? "pro" as const : "simple" as const), () => "simple" as const)
      : "simple" as const,
    // Compteur de l'item « Commandes » de la sidebar : commandes pas encore traitées.
    tenantId ? prisma.commande.count({ where: { tenantId, statut: { in: ["en_attente", "confirmee"] } } }).catch(() => 0) : 0,
  ]);
  const boutique = t ? { slug: t.slug, nomBoutique: t.nomBoutique, devise: t.devise, url: urlBoutique(t) } : null; // adresse publique (nom.axsoafrica.com)
  const { plan: palier, promoFinLe } = planInfo;
  const promo = promoFinLe ? { finLe: promoFinLe.toISOString(), maintenant: Date.now() } : null;
  // Essai Illimité (lib/essai.ts) : proposé, décompté et clos pour le propriétaire seulement.
  // Pendant la promo de lancement, tout le monde a déjà l'Illimité : l'essai attend la fin.
  const essai = tenantId && !promo && (await boutiquesDuCompte((session.user as any).id)).proprietaire.includes(tenantId)
    ? await etatEssai(tenantId) : null;

  return (
    <I18nProvider langue={await getLangue()} dico={await dico("dashboard", "boutique")}>
    <AbonnementOverlayProvider palier={palier}>
      <DashboardShell session={session} boutique={boutique} quotaAtteint={quotaAtteint} palier={palier} permissions={permissions} modeCaisse={modeCaisse} modePos={modePos} promo={promo} commandesATraiter={commandesATraiter}>
        <DeviseProvider devise={boutique?.devise || "XAF"}>{children}</DeviseProvider>
      </DashboardShell>
      <ExtrasDashboard />
      {essai && <EssaiIllimite phase={essai.phase} finLe={essai.finLe?.toISOString() ?? null} proposer={essai.proposer} montrerFin={essai.montrerFin} />}
      {/* Liste ouverte des menus déroulants, la même dans tous les navigateurs. */}
      <MenusDeroulants />
    </AbonnementOverlayProvider>
    </I18nProvider>
  );
}
