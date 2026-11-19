import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { formatDate } from "@/lib/utils";
import { AvisTutorial } from "@/components/dashboard/tutorials/AvisTutorial";
import { getT } from "@/lib/i18n/serveur";
import { Avatar, Badge, Banner, Button, Card, CardSection, EmptyState } from "@/components/ui/adm";
import { IllustrationGenerique } from "@/components/ui/illustrations";
import { EnTeteModule } from "../clients/EnTeteModule";

function Etoiles({ note, taille = 13 }: { note: number; taille?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${note}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" width={taille} height={taille} aria-hidden
          fill={i <= note ? "var(--color-brand)" : "none"} stroke={i <= note ? "var(--color-brand)" : "var(--color-border)"} strokeWidth={1.5}>
          <path d="M10 2.5l2.3 4.8 5.2.7-3.8 3.6.9 5.2L10 14.3l-4.6 2.5.9-5.2L2.5 8l5.2-.7z" />
        </svg>
      ))}
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
    <div className="space-y-4">
      <AvisTutorial />
      <EnTeteModule
        icon="star"
        title={t("Avis clients")}
        titleMeta={nonApprouves > 0 ? <Badge tone="attention">{nonApprouves} {t("à modérer")}</Badge> : undefined}
        tutoriel="avis"
      />

      {nonApprouves > 0 && (
        <Banner tone="warning">{nonApprouves} avis{" "}{t("en attente de modération — approuvez-les pour qu'ils soient visibles sur votre boutique.")}</Banner>
      )}

      {totalAvis === 0 ? (
        <EmptyState title={t("Aucun avis client")} image={<IllustrationGenerique />}>
          {t("Les avis apparaîtront ici dès que vos clients auront évalué leurs achats.")}
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <Card title={t("Note moyenne")}>
              <p className="tabular text-[32px] leading-10 font-[650] text-(--color-text-strong)">{noteMoyenne.toFixed(1)}</p>
              <Etoiles note={Math.round(noteMoyenne)} taille={18} />
              <p className="mt-2 text-(--color-text-secondary)">
                {t("Basé sur")} {totalAvis} avis · {totalAvis - nonApprouves} {t("approuvés")} · {nonApprouves} {t("en attente")}
              </p>
            </Card>
            <Card title={t("Répartition des notes")}>
              <div className="space-y-2">
                {repartition.map(({ note, count }) => {
                  const pct = (count / totalAvis) * 100;
                  return (
                    <div key={note} className="flex items-center gap-3">
                      <span className="w-6 shrink-0 font-[550]">{note} ★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-(--color-surface-tertiary)">
                        <div className="h-2 rounded-full bg-(--chart-primary)" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="tabular w-20 shrink-0 text-right text-(--color-text-secondary)">{count} ({Math.round(pct)} %)</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card padding="none" title={`${t("Tous les avis")} (${totalAvis})`}>
            {avis.map((a) => (
              <CardSection key={a.id} className="flex items-start gap-3">
                <Avatar name={a.client.nom} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-(--color-text-strong)">{t(a.client.nom)}</span>
                    {a.verifie && <Badge tone="success">{t("Achat vérifié")}</Badge>}
                    <Badge tone={a.approuve ? "success" : "attention"}>{a.approuve ? t("Approuvé") : t("En attente")}</Badge>
                  </div>
                  <Etoiles note={a.note} />
                  {a.titre && <p className="mt-1 font-semibold">{t(a.titre)}</p>}
                  {a.commentaire && <p className="mt-0.5 break-words text-(--color-text-secondary)">{t(a.commentaire)}</p>}
                  <p className="mt-1.5 text-xs text-(--color-text-subdued)">
                    {a.produit?.nom && <>{t(a.produit.nom)} · </>}{formatDate(a.createdAt)}
                  </p>
                </div>
                <form action={moderer} className="shrink-0">
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="approuve" value={a.approuve ? "0" : "1"} />
                  <Button type="submit" size="sm" variant={a.approuve ? "ghost" : "default"} icon={a.approuve ? "eye" : "checkCircle"}>
                    {a.approuve ? t("Masquer") : t("Approuver")}
                  </Button>
                </form>
              </CardSection>
            ))}
            {nbPages > 1 && (
              <div className="flex items-center justify-between border-t border-(--color-border-secondary) bg-(--color-surface-secondary) px-3 py-2 text-xs text-(--color-text-secondary)">
                {page > 1 ? <Button size="sm" variant="ghost" icon="chevronLeft" href={`/dashboard/avis?page=${page - 1}`}>{t("Précédent")}</Button> : <span />}
                <span>{page} / {nbPages}</span>
                {page < nbPages ? <Button size="sm" variant="ghost" icon="chevronRight" iconPosition="end" href={`/dashboard/avis?page=${page + 1}`}>{t("Suivant")}</Button> : <span />}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
