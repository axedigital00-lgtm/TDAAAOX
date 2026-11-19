import Link from "next/link";
import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Avatar, Badge, Card, CardSection, KeyValue, Timeline, badgeCommande, badgePaiement, type TimelineItem } from "@/components/ui/adm";
import { Icon } from "@/components/ui/icones";
import { formatDate, formatMontant, dateRelative } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { PAIEMENT } from "@/lib/commandes";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { EnTeteModule } from "../EnTeteModule";
import { segmentClient, tauxEchecCod } from "../regles";

// ponytail: 200 dernières commandes chargées pour la fiche ; agréger en base si un client en dépasse beaucoup plus.
const MAX_COMMANDES = 200;

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "clients");
  const tenantId = (session.user as any)?.tenantId;
  const { id } = await params;

  // Toujours filtré par boutique : un client d'une autre boutique → 404.
  const client = await prisma.client.findFirst({ where: { id, tenantId } });
  if (!client) notFound();

  const [tenant, commandes] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true, nomBoutique: true } }),
    prisma.commande.findMany({
      where: { tenantId, clientId: client.id },
      select: {
        id: true, numero: true, createdAt: true, montantTotal: true, devise: true, statut: true,
        paiementStatut: true, methodePaiement: true, expedieeAt: true,
        lignes: { select: { nom: true, quantite: true } },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_COMMANDES,
    }),
  ]);
  const devise = tenant?.devise || "XOF";

  // Mêmes règles que la liste : commandes payées, hors annulées et remboursées.
  const payees = commandes.filter((c) => c.paiementStatut === PAIEMENT.PAYE && !["annulee", "remboursee"].includes(c.statut));
  const depense = payees.reduce((s, c) => s + c.montantTotal, 0);
  const seg = segmentClient(payees.length, depense, devise);
  const cod = tauxEchecCod(commandes);
  const derniere = commandes[0];

  const heure = (d: Date) => d.toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const evenements: TimelineItem[] = [
    ...commandes.slice(0, 20).map((c) => ({
      id: c.id,
      content: (
        <span>
          <Link href={`/dashboard/commandes/${c.id}`} className="font-[550] text-(--color-link) hover:underline">{t("Commande")} {c.numero}</Link>
          {" · "}{formatMontant(c.montantTotal, c.devise)}{" · "}{t(badgeCommande(c.statut).label)}
        </span>
      ),
      time: heure(c.createdAt),
    })),
    { id: "inscrit", content: t("Client enregistré"), time: heure(client.createdAt) },
  ];

  const lien = "inline-flex items-center gap-1.5 text-(--color-link) hover:underline";
  const wa = client.telephone ? buildWhatsAppLink(client.telephone, t("Bonjour {0}, ", client.nom)) : null;
  const recherche = client.telephone || client.email;
  const indicateurs = [
    { label: t("Montant dépensé"), value: formatMontant(depense, devise) },
    { label: t("Commandes"), value: String(commandes.length >= MAX_COMMANDES ? `${MAX_COMMANDES}+` : commandes.length) },
    { label: t("Client depuis"), value: formatDate(client.createdAt) },
    ...(cod ? [{ label: t("Livraisons à la livraison échouées"), value: `${cod.pourcent} % (${cod.echecs}/${cod.total})` }] : []),
  ];

  return (
    <div className="space-y-4">
      <EnTeteModule
        backHref="/dashboard/clients"
        title={<span className="flex items-center gap-2"><Avatar name={client.nom} size={28} />{client.nom}</span>}
        titleMeta={<Badge tone={seg.tone}>{t(seg.label)}</Badge>}
        secondaryActions={[
          ...(wa ? [{ content: t("Écrire sur WhatsApp"), icon: "whatsapp" as const, href: wa }] : []),
          ...(recherche ? [{ content: t("Voir ses commandes"), icon: "orders" as const, href: `/dashboard/commandes?q=${encodeURIComponent(recherche)}` }] : []),
        ]}
      />

      <div className="grid grid-cols-2 overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card) sm:grid-cols-4">
        {indicateurs.map((m) => (
          <div key={m.label} className="border-(--color-border-secondary) px-4 py-3 not-last:border-r">
            <p className="text-(--color-text-secondary)">{m.label}</p>
            <p className="tabular font-[650] text-(--color-text-strong)">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {derniere && (() => {
            const st = badgeCommande(derniere.statut);
            const pa = badgePaiement(derniere.paiementStatut, derniere.methodePaiement);
            return (
              <Card padding="none" title={t("Dernière commande")}>
                <CardSection className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/dashboard/commandes/${derniere.id}`} className="font-[650] text-(--color-link) hover:underline">{t("Commande")} {derniere.numero}</Link>
                    <Badge tone={pa.tone} progress={pa.progress}>{t(pa.label)}</Badge>
                    <Badge tone={st.tone} progress={st.progress}>{t(st.label)}</Badge>
                    <span className="ml-auto text-(--color-text-secondary)">{dateRelative(derniere.createdAt)}</span>
                  </div>
                  <KeyValue items={[
                    ...derniere.lignes.map((l) => ({ label: t(l.nom), value: `×${l.quantite}` })),
                    { label: t("Total"), value: formatMontant(derniere.montantTotal, derniere.devise), strong: true },
                  ]} />
                </CardSection>
              </Card>
            );
          })()}
          <Card title={t("Chronologie")}>
            <Timeline items={evenements} />
            {commandes.length > 20 && recherche && (
              <Link href={`/dashboard/commandes?q=${encodeURIComponent(recherche)}`} className={`${lien} mt-3`}>{t("Voir toutes ses commandes")}</Link>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card padding="none" title={t("Client")}>
            <CardSection className="space-y-1.5">
              <p className="text-xs font-[550] text-(--color-text-secondary)">{t("Coordonnées")}</p>
              {client.email && <a href={`mailto:${client.email}`} className={`${lien} break-all`}><Icon name="mail" />{client.email}</a>}
              {client.telephone && <a href={`tel:${client.telephone}`} className={lien}><Icon name="user" />{client.telephone}</a>}
              {!client.email && !client.telephone && <p className="text-(--color-text-secondary)">{t("Aucune coordonnée")}</p>}
            </CardSection>
            <CardSection className="space-y-1">
              <p className="text-xs font-[550] text-(--color-text-secondary)">{t("Relances automatiques")}</p>
              <p>{client.relancesRefuseesLe ? t("Désinscrit le {0}", formatDate(client.relancesRefuseesLe)) : t("Accepte les relances")}</p>
            </CardSection>
          </Card>

          <Card title={t("Adresse par défaut")}>
            {client.adresse || client.ville ? (
              <div className="space-y-1">
                {client.adresse && <p>{client.adresse}</p>}
                <p className="text-(--color-text-secondary)">{[client.ville, client.pays].filter(Boolean).join(", ")}</p>
              </div>
            ) : <p className="text-(--color-text-secondary)">{t("Aucune adresse enregistrée")}</p>}
          </Card>

          {(client.pointsFidelite > 0 || client.creditPlafond > 0 || client.codeClient) && (
            <Card title={t("En magasin")}>
              <KeyValue items={[
                ...(client.codeClient ? [{ label: t("Code client"), value: client.codeClient }] : []),
                { label: t("Points de fidélité"), value: String(client.pointsFidelite) },
                ...(client.creditPlafond > 0 ? [{ label: t("Crédit utilisé"), value: `${formatMontant(client.creditUtilise, devise)} / ${formatMontant(client.creditPlafond, devise)}` }] : []),
                ...(client.creditBloque ? [{ label: t("Crédit"), value: t("Bloqué") }] : []),
              ]} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
