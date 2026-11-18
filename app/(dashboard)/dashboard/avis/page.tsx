import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { formatDate } from "@/lib/utils";
import { Star, MessageSquare, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { AvisTutorial } from "@/components/dashboard/tutorials/AvisTutorial";
import { getT } from "@/lib/i18n/serveur";
import { Alerte, Badge, Bouton, EnTetePage, EtatVide } from "@/components/ui";

const AVATAR_COLORS = [
  ["#FFF8EC","#F5A623"],["#EFF6FF","#3B82F6"],["#F0FDF4","#16A34A"],
  ["#FAF5FF","#7C3AED"],["#FFF1F2","#E11D48"],["#ECFEFF","#0891B2"],
];

async function Avatar({ nom }: { nom: string }) {
  const t = await getT();
  const hash = nom.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const [bg, text] = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const initiales = nom.trim().split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
      style={{ background: bg, color: text, border: `1px solid ${text}20` }}>
      {t(initiales)}
    </div>
  );
}

function Stars({ note, size = 13 }: { note: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size}
          fill={i <= note ? "#F5A623" : "transparent"}
          stroke={i <= note ? "#F5A623" : "#E8E8E8"} />
      ))}
    </div>
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

  const NOTE_COLORS: Record<number, string> = { 5:"#16A34A", 4:"#F5A623", 3:"#D97706", 2:"#EA580C", 1:"#DC2626" };

  return (
    <div className="space-y-5"
      style={{ fontFamily: "'Poppins','Century Gothic',system-ui,sans-serif" }}>
      <AvisTutorial />

      <EnTetePage
        className="mb-0 pt-1"
        titre={t("Avis clients")}
        description={<>{totalAvis}{" "}{t("avis au total ·")}{" "}{nonApprouves}{" "}{t("en attente de modération")}</>}
        indicateurs={<>
          <BoutonRevoirTutoriel moduleKey="avis" />
          <Badge>{totalAvis}</Badge>
          {nonApprouves > 0 && <Badge ton="attention" icone={<Clock aria-hidden />}>{nonApprouves}{" "}{t("à modérer")}</Badge>}
        </>}
      />

      {/* ── Stats : note + répartition ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Note moyenne */}
        <div className="ax-card p-8 flex flex-col items-center justify-center text-center">
          <span className="ax-label mb-3">{t("Note moyenne")}</span>
          <p className="text-[40px] md:text-[52px] font-black text-[#111111] leading-none tabular-nums">
            {noteMoyenne > 0 ? noteMoyenne.toFixed(1) : "—"}
          </p>
          <div className="my-3">
            <Stars note={Math.round(noteMoyenne)} size={20} />
          </div>
          <p className="text-[12px] text-[#AAAAAA]">
            {t("Basé sur")}{" "}<span className="font-semibold text-[#666]">{totalAvis}</span> avis
          </p>
          {totalAvis > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 border-t border-[#F5F5F5] w-full justify-center">
              <div className="flex items-center gap-1 text-[11.5px] text-[#16A34A]">
                <CheckCircle2 size={11} /> {totalAvis - nonApprouves}{" "}{t("approuvés")}
              </div>
              <div className="flex items-center gap-1 text-[11.5px] text-[#D97706]">
                <Clock size={11} /> {t(nonApprouves)}{" "}{t("en attente")}
              </div>
            </div>
          )}
        </div>

        {/* Répartition */}
        <div className="lg:col-span-2 ax-card p-6">
          <h3 className="text-[13px] font-semibold text-[#111111] mb-4">{t("Répartition des notes")}</h3>
          {totalAvis === 0 ? (
            <div className="h-32 flex items-center justify-center text-[12px] text-[#AAAAAA]">
              {t("Aucune donnée disponible")}
            </div>
          ) : (
            <div className="space-y-3">
              {repartition.map(({ note, count }) => {
                const pct = totalAvis > 0 ? (count / totalAvis) * 100 : 0;
                return (
                  <div key={note} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-12 flex-shrink-0">
                      <span className="text-[13px] font-bold text-[#333]">{t(note)}</span>
                      <Star size={11} fill="#F5A623" stroke="none" />
                    </div>
                    <div className="flex-1 bg-[#F5F5F7] rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: NOTE_COLORS[note] }} />
                    </div>
                    <div className="w-16 text-right flex-shrink-0">
                      <span className="text-[13px] font-bold text-[#333]">{count}</span>
                      <span className="text-[11px] text-[#CCCCCC] ml-1">({Math.round(pct)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bannière modération ── */}
      {nonApprouves > 0 && (
        <Alerte ton="attention"
          titre={<>{nonApprouves} avis{" "}{t("en attente de modération — approuvez-les pour qu'ils soient visibles sur votre boutique.")}</>} />
      )}

      {/* ── Liste ── */}
      <div className="ax-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F3F3F3] flex items-center gap-2">
          <MessageSquare size={15} className="text-[#AAAAAA]" />
          <h2 className="text-[13px] font-semibold text-[#111111]">{t("Tous les avis")}</h2>
          {totalAvis > 0 && (
            <span className="ml-auto text-[11px] font-bold text-[#888] bg-[#F5F5F7] border border-[#EBEBEB] px-2 py-0.5 rounded-full">
              {totalAvis}
            </span>
          )}
        </div>

        {avis.length === 0 ? (
          <EtatVide className="border-0" icone={<Star />} titre={t("Aucun avis client")}
            texte={t("Les avis apparaîtront ici dès que vos clients auront évalué leurs achats.")} />
        ) : (
          <div className="divide-y divide-[#F9F9F9]">
            {avis.map(a => (
              <div key={a.id} className="p-5 hover:bg-[#FAFAFA] transition-colors">
                <div className="flex items-start gap-3">
                  <Avatar nom={a.client.nom} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1.5">
                      <span className="text-[13px] font-semibold text-[#222]">{t(a.client.nom)}</span>
                      {a.verifie && <Badge ton="succes" icone={<ShieldCheck aria-hidden />}>{t("Achat vérifié")}</Badge>}
                      <Badge ton={a.approuve ? "succes" : "attention"}>{a.approuve ? t("Approuvé") : t("En attente")}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Stars note={a.note} />
                      <span className="text-[11px] text-[#AAAAAA]">{t(a.note)}/5</span>
                    </div>
                    {a.titre && (
                      <p className="text-[13px] font-semibold text-[#333] mb-1">{t(a.titre)}</p>
                    )}
                    {a.commentaire && (
                      <p className="text-[12.5px] text-[#666666] leading-relaxed break-words">{t(a.commentaire)}</p>
                    )}
                    <p className="text-[11px] text-[#CCCCCC] mt-2">
                      {a.produit?.nom && (
                        <><span className="text-[#AAAAAA]">{t(a.produit.nom)}</span> · </>
                      )}
                      {formatDate(a.createdAt)}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <form action={moderer}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="approuve" value={a.approuve ? "0" : "1"} />
                      <Bouton type="submit" taille="compact" variante={a.approuve ? "fantome" : "secondaire"}
                        icone={a.approuve ? undefined : <CheckCircle2 className="size-4 text-succes" aria-hidden />}>
                        {a.approuve ? t("Masquer") : t("Approuver")}
                      </Bouton>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {nbPages > 1 && (
          <div className="px-5 py-3 border-t border-[#F3F3F3] flex items-center justify-between text-[12px] font-semibold">
            {page > 1 ? <Bouton variante="fantome" taille="compact" href={`/dashboard/avis?page=${page - 1}`}>← {t("Précédent")}</Bouton> : <span />}
            <span className="text-doux">{page} / {nbPages}</span>
            {page < nbPages ? <Bouton variante="fantome" taille="compact" href={`/dashboard/avis?page=${page + 1}`}>{t("Suivant")} →</Bouton> : <span />}
          </div>
        )}
      </div>
    </div>
  );
}
