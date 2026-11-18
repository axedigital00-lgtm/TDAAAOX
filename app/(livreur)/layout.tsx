import { auth } from "@/lib/auth";
import { ActivationPush } from "@/components/ActivationPush";
import { MenusDeroulants } from "@/components/ui/MenusDeroulants";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { NavLivreur } from "@/components/livreur/NavLivreur";
import { NotificationsPanel } from "@/components/livreur/NotificationsPanel";
import { DisponibiliteToggle } from "@/components/livreur/DisponibiliteToggle";
import { I18nProvider } from "@/components/I18nProvider";
import { getLangue, dico } from "@/lib/i18n/serveur";
import { GeoTracker } from "@/components/livreur/GeoTracker";
import { getT } from "@/lib/i18n/serveur";


// Manifeste : installable (écran d'accueil), exigé par iPhone pour les notifications push.
export const metadata = { manifest: "/manifest-livreur.webmanifest" };
export default async function LivreurLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");

  const role = (session.user as any)?.role;
  if (role !== "livreur") redirect("/dashboard");

  const livreur = await prisma.livreur.findFirst({
    where: { userId: (session.user as any)?.id },
    include: { tenant: { select: { nomBoutique: true } } },
  });

  if (!livreur) redirect("/connexion");

  const enLivraison = (await prisma.commande.count({ where: { livreurId: livreur.id, statut: "expediee" } })) > 0;

  return (
    <I18nProvider langue={await getLangue()} dico={await dico("livreur")}>
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <ActivationPush espace="livreur" />
      <MenusDeroulants />
      {/* Fond étoilé subtil */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#F5A623]/5 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#080810] to-transparent" />
      </div>

      {/* Header premium */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo-dark.png" alt={t("Axso")}
              style={{ height: "30px", width: "auto", objectFit: "contain", flexShrink: 0 }}
            />
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm leading-none truncate">{t(livreur.nom.split(" ")[0])}</p>
              <p className="text-gray-500 text-xs truncate">
                {t(livreur.tenant?.nomBoutique) || t("Livreur indépendant")}
              </p>
            </div>
          </div>

          {/* Navigation PC (la barre du bas est réservée au mobile) */}
          <NavLivreur variante="haut" />

          <div className="flex items-center gap-2 flex-shrink-0">
            <DisponibiliteToggle livreurId={livreur.id} disponible={livreur.disponible} />
            <NotificationsPanel />
          </div>
        </div>
      </header>

      {/* Tracker GPS silencieux */}
      <GeoTracker livreurId={livreur.id} enLivraison={enLivraison} />

      <main className="max-w-2xl lg:max-w-5xl mx-auto px-4 py-5 pb-24 lg:pb-10">
        {!livreur.actif && (
          <div role="status" className="mb-5 rounded-2xl border border-[#F5A623]/25 bg-[#F5A623]/10 px-4 py-3 text-sm text-[#F5A623]">
            {livreur.valideAt
              ? t("Votre compte est suspendu. Contactez l'équipe Axso pour le réactiver.")
              : t("Votre compte est en attente de validation par l'équipe Axso. Vous recevrez des livraisons dès qu'il sera validé.")}
          </div>
        )}
        {children}
      </main>

      <NavLivreur variante="bas" />
    </div>
    </I18nProvider>
  );
}
