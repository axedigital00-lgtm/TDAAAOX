import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Card } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { HorizontalBars } from "@/components/dashboard/design-system/components/Charts";
import { Icon } from "@/components/dashboard/design-system/icons/Icon";
import { BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { AvisTutorial } from "@/components/dashboard/tutorials/AvisTutorial";
import { getT } from "@/lib/i18n/serveur";

// Étoiles de la note (texte lisible par les lecteurs d'écran : « 4 sur 5 »).
function Stars({ note, size = 13 }: { note: number; size?: number }) {
  return (
    <span className="axd-etoiles" role="img" aria-label={`${note} / 5`} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} aria-hidden data-pleine={i <= note || undefined}>★</span>)}
    </span>
  );
}

export default async function AvisPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "clients");

  const tenantId = (session.user as any)?.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) redirect("/inscription");

  // Statistiques par agrégat + liste paginée
  const PAR_PAGE = 50;
  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);
  const [avis, parNote, nonApprouves] = await Promise.all([
    prisma.avis.findMany({
      where: { tenantId },
      include: {
        produit: { select: { nom: true } },
        client:  { select: { nom: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
    }),
    prisma.avis.groupBy({ by: ["note"], where: { tenantId }, _count: { _all: true } }),
    prisma.avis.count({ where: { tenantId, approuve: false } }),
  ]);

  const totalAvis    = parNote.reduce((s, g) => s + g._count._all, 0);
  const noteMoyenne  = totalAvis > 0 ? parNote.reduce((s, g) => s + g.note * g._count._all, 0) / totalAvis : 0;
  const repartition  = [5,4,3,2,1].map(note => ({ note, count: parNote.find(g => g.note === note)?._count._all ?? 0 }));
  const nbPages      = Math.max(1, Math.ceil(totalAvis / PAR_PAGE));

  // Modération : approuver / masquer (le modèle n'a que le booléen approuve)
  async function moderer(formData: FormData) {
    "use server";
    await prisma.avis.updateMany({
      where: { id: String(formData.get("id")), tenantId },
      data: { approuve: formData.get("approuve") === "1" },
    });
    revalidatePath("/dashboard/avis");
  }


  return (
    <Page>
      <AvisTutorial />
      <PageHeader icon="star" backHref="/dashboard/clients"
        title={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{t("Avis clients")}<BoutonRevoirTutoriel moduleKey="avis" /></span>}
        titleMeta={nonApprouves > 0 ? <Badge tone="attention">{nonApprouves.toLocaleString(t.loc)} {t("à modérer")}</Badge> : undefined} />

      {nonApprouves > 0 && (
        <div style={{ marginBottom: "var(--space-400)" }}>
          <Banner tone="warning">{t("{0} avis en attente de modération : approuvez-les pour qu'ils soient visibles sur votre boutique.", nonApprouves)}</Banner>
        </div>
      )}

      <div className="axd-grid axd-g21" style={{ marginBottom: "var(--space-400)" }}>
        <Card title={t("Répartition des notes")}>
          {totalAvis === 0
            ? <p className="axd-muted" style={{ textAlign: "center", padding: "32px 0" }}>{t("Aucune donnée disponible")}</p>
            : <HorizontalBars items={repartition.map(({ note, count }) => ({ label: `${"★".repeat(note)} · ${totalAvis ? Math.round((count / totalAvis) * 100) : 0} %`, value: count }))} format={(v) => v.toLocaleString(t.loc)} />}
        </Card>
        <div className="axd-card axd-card--pad">
          <span className="axd-kpi__t">{t("Note moyenne")}</span>
          <div className="axd-kpi__v axd-kpi__v--lg" style={{ marginBottom: 4 }}>{noteMoyenne > 0 ? noteMoyenne.toLocaleString(t.loc, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : "—"}</div>
          <Stars note={Math.round(noteMoyenne)} size={18} />
          <p className="axd-muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
            {t("{0} avis · {1} approuvés · {2} en attente", totalAvis, totalAvis - nonApprouves, nonApprouves)}
          </p>
        </div>
      </div>

      <div className="axd-card" style={{ overflow: "hidden" }}>
        <div className="axd-card__head" style={{ padding: "var(--space-300) var(--space-400)" }}>
          <h2 className="axd-card__title">{t("Tous les avis")}</h2>
        </div>
        {avis.length === 0 ? (
          <div className="axd-empty">
            <h3>{t("Aucun avis client")}</h3>
            <p>{t("Les avis apparaîtront ici dès que vos clients auront évalué leurs achats.")}</p>
          </div>
        ) : avis.map((a) => (
          <div key={a.id} className="axd-livreur">
            <div className="axd-livreur__ligne" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <b style={{ color: "var(--color-text-strong)" }}>{t(a.client.nom)}</b>
                  <Stars note={a.note} />
                  {a.verifie && <Badge tone="info">{t("Achat vérifié")}</Badge>}
                  <Badge tone={a.approuve ? "success" : "attention"}>{a.approuve ? t("Approuvé") : t("En attente")}</Badge>
                </div>
                {a.titre && <p style={{ margin: "6px 0 0", fontWeight: 600, color: "var(--color-text-strong)" }}>{t(a.titre)}</p>}
                {a.commentaire && <p style={{ margin: "4px 0 0", overflowWrap: "anywhere" }}>{t(a.commentaire)}</p>}
                <p className="axd-muted" style={{ margin: "6px 0 0", fontSize: 12 }}>{a.produit?.nom ? `${t(a.produit.nom)} · ` : ""}{formatDate(a.createdAt)}</p>
              </div>
              <form action={moderer}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="approuve" value={a.approuve ? "0" : "1"} />
                <button type="submit" className={`axd-btn axd-btn--sm${a.approuve ? "" : " axd-btn--primary"}`}>{a.approuve ? t("Masquer") : t("Approuver")}</button>
              </form>
            </div>
          </div>
        ))}
        {nbPages > 1 && (
          <div className="axd-ix-pager">
            {page > 1 ? <Link href={`/dashboard/avis?page=${page - 1}`} className="axd-ix-pager__btn" aria-label={t("Page précédente")}><Icon name="chevronLeft" /></Link> : <span className="axd-ix-pager__btn" aria-disabled><Icon name="chevronLeft" /></span>}
            {page < nbPages ? <Link href={`/dashboard/avis?page=${page + 1}`} className="axd-ix-pager__btn" aria-label={t("Page suivante")}><Icon name="chevronRight" /></Link> : <span className="axd-ix-pager__btn" aria-disabled><Icon name="chevronRight" /></span>}
            <span>{t("Page {0} sur {1}", page, nbPages)}</span>
          </div>
        )}
      </div>
    </Page>
  );
}
