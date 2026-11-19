import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge, Banner, Card } from "@/components/ui/adm";
import { formatDate } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { AVEC_EMAIL_REEL } from "@/lib/email";
import { EnTeteModule } from "../EnTeteModule";
import { SEGMENTS, pourcent, whereSegment, type Segment } from "../regles";
import { depenseMoyenne } from "@/lib/segments-clients";

// Segments fixes utilisés par les campagnes (D5 : lecture seule, pas de segment personnalisé côté back-end).
const LIBELLES: Record<Segment, { nom: string; regle: string }> = {
  tous: { nom: "Tous les clients", regle: "Tous les clients de la boutique." },
  vip: { nom: "VIP", regle: "Au moins 5 commandes, ou une dépense au moins égale à 2 fois la dépense moyenne de vos clients." },
  nouveaux: { nom: "Nouveaux", regle: "Une commande au plus." },
  inactifs: { nom: "Inactifs", regle: "Client depuis plus de 30 jours, aucune commande ces 30 derniers jours." },
};

export default async function SegmentsPage() {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "clients");
  const tenantId = (session.user as any)?.tenantId;

  const moyenne = await depenseMoyenne(tenantId);
  const maintenant = Date.now();
  const lignes = await Promise.all(SEGMENTS.map(async (s) => {
    const where = whereSegment(tenantId, s, moyenne, maintenant);
    const [nb, joignables, derniere] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.count({ where: { ...where, ...AVEC_EMAIL_REEL, relancesRefuseesLe: null } }),
      prisma.commande.aggregate({ where: { tenantId, client: where }, _max: { createdAt: true } }),
    ]);
    return { s, nb, joignables, derniere: derniere._max.createdAt };
  }));
  const total = lignes[0].nb;
  const th = "h-9 bg-(--color-surface-secondary) px-3 text-left text-xs font-[550] whitespace-nowrap text-(--color-text-secondary)";

  return (
    <div className="space-y-4">
      <EnTeteModule
        backHref="/dashboard/clients"
        icon="users"
        title={t("Segments")}
        secondaryActions={[{ content: t("Envoyer une campagne"), icon: "mail", href: "/dashboard/marketing/email" }]}
      />
      <Banner tone="info">{t("Ces segments sont calculés automatiquement et servent de destinataires à vos campagnes e-mail.")}</Banner>
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>{t("Nom du segment")}</th>
                <th className={`${th} text-right`}>{t("Clients")}</th>
                <th className={`${th} text-right`}>{t("% de clients")}</th>
                <th className={`${th} text-right`}>{t("Joignables par e-mail")}</th>
                <th className={th}>{t("Dernière activité")}</th>
                <th className={th}>{t("Auteur")}</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(({ s, nb, joignables, derniere }) => (
                <tr key={s} className="border-t border-(--color-border-secondary)">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-(--color-text-strong)">{t(LIBELLES[s].nom)}</p>
                    <p className="text-xs text-(--color-text-secondary)">{t(LIBELLES[s].regle)}</p>
                  </td>
                  <td className="tabular px-3 py-2 text-right">{nb}</td>
                  <td className="tabular px-3 py-2 text-right">{pourcent(nb, total)} %</td>
                  <td className="tabular px-3 py-2 text-right">{joignables}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{derniere ? formatDate(derniere) : "—"}</td>
                  <td className="px-3 py-2"><Badge tone="neutral">Axso</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
