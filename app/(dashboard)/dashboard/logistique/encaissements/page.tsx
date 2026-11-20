import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { MarquerRemisButton } from "@/components/dashboard/logistique/MarquerRemisButton";
import { formatMontant } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { aRemettre } from "@/lib/gains-livreur";

export default async function EncaissementsPage() {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "finance");
  const tenantId = (session.user as any)?.tenantId;

  const brutes = await prisma.commande.findMany({
    where: {
      tenantId,
      methodePaiement: { in: ["whatsapp_cod", "direct_cod"] },
      statut: "livree",
      codRemis: false,
    },
    select: {
      id: true, numero: true, clientNom: true, montantTotal: true, devise: true, updatedAt: true,
      livreur: { select: { id: true, nom: true, telephone: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  // Part gardée par le livreur sur les espèces (lib/gains-livreur.ts) : à remettre = encaissé − part.
  const gains = new Map((await prisma.gainLivreur.findMany({ where: { commandeId: { in: brutes.map(c => c.id) } }, select: { commandeId: true, montant: true } })).map(g => [g.commandeId, g.montant]));
  const commandesNonRemises = brutes.map(c => ({ ...c, part: gains.get(c.id) ?? 0, aRemettre: aRemettre(c.montantTotal, gains.get(c.id) ?? 0) }));
  // Jamais d'addition de devises différentes.
  const parDevise = (cs: typeof commandesNonRemises) => Object.entries(cs.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.devise]: (acc[c.devise] ?? 0) + c.aRemettre }), {}));

  const parLivreur = new Map<string, { nom: string; telephone: string; commandes: typeof commandesNonRemises }>();
  for (const c of commandesNonRemises) {
    const cle = c.livreur?.id ?? "non_assigne";
    if (!parLivreur.has(cle)) {
      parLivreur.set(cle, { nom: c.livreur?.nom ?? "Non assigné", telephone: c.livreur?.telephone ?? "", commandes: [] });
    }
    parLivreur.get(cle)!.commandes.push(c);
  }

  const groupes = [...parLivreur.entries()];

  const totaux = parDevise(commandesNonRemises);
  return (
    <Page width="narrow">
      <PageHeader icon="money" backHref="/dashboard/logistique" title={t("Encaissements à la livraison")} />

      <div className="axd-card axd-card--pad" style={{ marginBottom: "var(--space-400)" }}>
        <span className="axd-kpi__t axd-dotted" title={t("Montant encaissé par vos livreurs moins leur part")}>{t("À vous remettre par vos livreurs")}</span>
        {(totaux.length ? totaux : [["XAF", 0] as [string, number]]).map(([d, m]) => (
          <div key={d} className="axd-kpi__v axd-kpi__v--lg" style={{ marginBottom: 0 }}>{formatMontant(m, d)}</div>
        ))}
      </div>

      {groupes.length === 0 ? (
        <div className="axd-card"><div className="axd-empty">
          <h3>{t("Tout est réconcilié")}</h3>
          <p>{t("Les commandes payées à la livraison apparaissent ici tant que le livreur ne vous a pas remis l’argent.")}</p>
        </div></div>
      ) : (
        <div className="axd-stack">
          {groupes.map(([id, g]) => (
            <div key={id} className="axd-card" style={{ overflow: "hidden" }}>
              <div className="axd-card__head" style={{ padding: "var(--space-300) var(--space-400)" }}>
                <div>
                  <h2 className="axd-card__title">{t(g.nom)}</h2>
                  {g.telephone && <p className="axd-muted" style={{ margin: "2px 0 0", fontSize: 12 }}>{g.telephone}</p>}
                </div>
                <div style={{ textAlign: "right" }}>
                  {parDevise(g.commandes).map(([d, m]) => <div key={d} style={{ fontWeight: 650, color: "var(--color-text-strong)" }}>{formatMontant(m, d)}</div>)}
                  <div className="axd-muted" style={{ fontSize: 12 }}>{g.commandes.length} {g.commandes.length > 1 ? t("commandes") : t("commande")}</div>
                </div>
              </div>
              <table className="axd-ix">
                <thead><tr><th>{t("Commande")}</th><th>{t("Client")}</th><th className="axd-ix-num">{t("À remettre")}</th></tr></thead>
                <tbody>
                  {g.commandes.map((c) => (
                    <tr key={c.id}>
                      <td className="axd-ix-primary">{c.numero}</td>
                      <td>{t(c.clientNom)}</td>
                      <td className="axd-ix-num">
                        {formatMontant(c.aRemettre, c.devise)}
                        {c.part > 0 && <div className="axd-muted" style={{ fontSize: 11 }}>{formatMontant(c.montantTotal, c.devise)} − {t("part livreur")} {formatMontant(c.part, c.devise)}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: "var(--space-300) var(--space-400)", borderTop: "1px solid var(--color-border-secondary)" }}>
                <MarquerRemisButton commandeIds={g.commandes.map((c) => c.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
