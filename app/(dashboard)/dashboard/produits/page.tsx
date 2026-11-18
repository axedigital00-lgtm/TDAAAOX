import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Plus, Package, Search, TrendingUp, Tag, AlertTriangle,
  Star, ChevronRight, Eye, EyeOff, X,
} from "lucide-react";
import { formatMontant } from "@/lib/utils";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { ProduitsTutorial } from "@/components/dashboard/tutorials/ProduitsTutorial";
import { getT } from "@/lib/i18n/serveur";
import { ImportProduitsExcel } from "@/components/dashboard/ImportProduitsExcel";
import { ActiverExemple } from "./ActiverExemple";
import { Badge, Bouton, EnTetePage, EtatVide } from "@/components/ui";

const FILTER_TABS = [
  { key: "all",      label: "Tous"         },
  { key: "actif",    label: "En ligne"     },
  { key: "inactif",  label: "Hors ligne"   },
  { key: "faible",   label: "Stock faible" },
  { key: "epuise",   label: "En rupture"   },
];

// Mêmes seuils que les filtres : rupture = 0, faible = 1 à 5 (physique seulement : un produit numérique n'a pas de stock).
async function StockBadge({ stock, type }: { stock: number; type: string }) {
  const t = await getT();
  if (type !== "physique") return <Badge>{t("Sans stock à gérer")}</Badge>;
  if (stock === 0) return <Badge ton="erreur">{t("Rupture")}</Badge>;
  if (stock <= 5) return <Badge ton="attention">{t("Stock faible : {0}", stock)}</Badge>;
  return <Badge ton="succes">{stock}{" "}{t("en stock")}</Badge>;
}

export default async function ProduitsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtre?: string; page?: string }>;
}) {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "produits");
  const { q, filtre, page: pageParam } = await searchParams;
  const PAR_PAGE = 60;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const tenantId = (session.user as any)?.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const devise = tenant?.devise || "XOF";

  // Compteurs en base + page de produits (au lieu de charger tout le catalogue)
  const base = { tenantId };
  const FILTRES: Record<string, object> = {
    actif:   { actif: true },
    inactif: { actif: false },
    // Mêmes règles que « À traiter » du Tableau de bord (accueil/page.tsx) : un produit numérique n'a pas de stock.
    faible:  { actif: true, type: "physique", stock: { gt: 0, lte: 5 } },
    epuise:  { actif: true, type: "physique", stock: 0 },
  };
  const where = {
    ...base,
    ...(filtre && FILTRES[filtre] ? FILTRES[filtre] : {}),
    ...(q ? { nom: { contains: q, mode: "insensitive" as const } } : {}),
  };
  const [totalTous, totalActifs, stockFaible, stockEpuise, ventes, totalFiltre, produits] = await Promise.all([
    prisma.produit.count({ where: base }),
    prisma.produit.count({ where: { ...base, actif: true } }),
    prisma.produit.count({ where: { ...base, ...FILTRES.faible } }),
    prisma.produit.count({ where: { ...base, ...FILTRES.epuise } }),
    prisma.produit.aggregate({ where: base, _sum: { ventes: true } }),
    prisma.produit.count({ where }),
    prisma.produit.findMany({
      where,
      include: { _count: { select: { avis: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
    }),
  ]);
  const totalVentes = ventes._sum.ventes ?? 0;
  const nbPages = Math.max(1, Math.ceil(totalFiltre / PAR_PAGE));
  const libelleFiltre = filtre && filtre !== "all" ? FILTER_TABS.find(f => f.key === filtre)?.label ?? null : null;
  const lienFiltres = (p: { q?: string; filtre?: string }) => {
    const params = new URLSearchParams({ ...(p.filtre && p.filtre !== "all" ? { filtre: p.filtre } : {}), ...(p.q ? { q: p.q } : {}) }).toString();
    return `/dashboard/produits${params ? `?${params}` : ""}`;
  };
  const lienPage = (n: number) =>
    `/dashboard/produits?${new URLSearchParams({ ...(filtre ? { filtre } : {}), ...(q ? { q } : {}), page: String(n) })}`;

  const statCards = [
    { label: "Produits en ligne", value: totalActifs,    iconBg: "#F0FDF4", iconColor: "#16A34A", Icon: Package     },
    { label: "Ventes totales",   value: totalVentes,    iconBg: "#FFF8EC", iconColor: "#F5A623", Icon: TrendingUp, accent: true },
    { label: "Stock faible",     value: stockFaible,    iconBg: "#FFFBEB", iconColor: "#D97706", Icon: AlertTriangle },
    { label: "En rupture",       value: stockEpuise,    iconBg: "#FEF2F2", iconColor: "#DC2626", Icon: AlertTriangle },
  ];

  return (
    <div className="space-y-5"
      style={{ fontFamily: "'Poppins','Century Gothic',system-ui,sans-serif" }}>
      <ProduitsTutorial />

      <EnTetePage
        className="mb-0 pt-1"
        titre={<span className="inline-flex items-center gap-2">{t("Produits")}{" "}<AgentActiveIndicator label={t("Agent Produits actif")} /></span>}
        description={t("Gérez votre catalogue, vos prix et votre stock.")}
        indicateurs={<>
          <BoutonRevoirTutoriel moduleKey="produits" />
          <Badge>{totalTous}</Badge>
          {stockFaible + stockEpuise > 0 && (
            <Link href={`/dashboard/produits?filtre=${stockEpuise > 0 ? "epuise" : "faible"}`} className="rounded-full focus-visible:outline-2 focus-visible:outline-focus">
              <Badge ton={stockEpuise > 0 ? "erreur" : "attention"} icone={<AlertTriangle aria-hidden />}>
                {stockEpuise > 0 ? t("{0} en rupture", stockEpuise) : t("{0} en stock faible", stockFaible)}
              </Badge>
            </Link>
          )}
        </>}
        actions={<>
          <ImportProduitsExcel />
          <Bouton variante="primaire" href="/dashboard/produits/nouveau" icone={<Plus className="size-4" aria-hidden />}>{t("Ajouter un produit")}</Bouton>
        </>}
      />

      {/* ── Stat cards — défilement horizontal sur mobile, grille au-delà ── */}
      {totalTous > 0 && (
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory sm:overflow-visible"
          style={{ scrollbarWidth: "none" }}>
          {statCards.map((s, i) => {
            const Icon = s.Icon;
            return (
              <div key={i} className={`ax-card p-4 sm:p-5 relative overflow-hidden group cursor-default flex-shrink-0 w-[42%] min-w-[130px] sm:w-auto snap-start ${s.accent ? "border-[#F5A623]/20" : ""}`}>
                {s.accent && (
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px]"
                    style={{ background: "linear-gradient(90deg, #F5A623, #FFD280, #F5A623)" }} />
                )}
                <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                  <span className="ax-label leading-tight">{t(s.label)}</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ background: s.iconBg, border: `1px solid ${s.iconColor}20` }}>
                    <Icon size={13} style={{ color: s.iconColor }} strokeWidth={1.8} />
                  </div>
                </div>
                <p className="text-[20px] sm:text-[24px] font-bold text-[#111111] leading-none tabular-nums tracking-tight">
                  {t(s.value)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Recherche + filtres (filtre actif visible et retirable) ── */}
      <div className="flex flex-col gap-3">
        <form action="/dashboard/produits" method="GET" role="search" className="flex gap-2">
          {filtre && filtre !== "all" && <input type="hidden" name="filtre" value={filtre} />}
          <label className="flex-1 flex items-center gap-2.5 min-h-11 bg-carte border border-bordure rounded-controle px-3.5 focus-within:border-bordure-forte focus-within:outline-2 focus-within:outline-focus transition-colors">
            <Search size={15} className="text-doux flex-shrink-0" aria-hidden />
            <span className="sr-only">{t("Rechercher un produit par son nom")}</span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t("Rechercher un produit par son nom")}
              className="bg-transparent text-[14px] text-encre placeholder:text-doux outline-none flex-1 min-w-0"
            />
          </label>
          <Bouton type="submit" variante="secondaire">{t("Rechercher")}</Bouton>
        </form>

        <nav aria-label={t("Filtrer les produits")} className="flex items-center gap-1.5 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }}>
          {FILTER_TABS.map(tab => {
            const isActive = (filtre ?? "all") === tab.key;
            const count = tab.key === "all" ? totalTous
              : tab.key === "actif"   ? totalActifs
              : tab.key === "inactif" ? totalTous - totalActifs
              : tab.key === "faible"  ? stockFaible
              : stockEpuise;
            const params = new URLSearchParams({ ...(tab.key !== "all" ? { filtre: tab.key } : {}), ...(q ? { q } : {}) }).toString();
            return (
              <Link key={tab.key} href={`/dashboard/produits${params ? `?${params}` : ""}`}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-1.5 min-h-10 sm:min-h-8 px-3 rounded-full border text-[12px] font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${isActive ? "bg-secondaire text-carte border-secondaire" : "bg-carte text-doux border-bordure hover:text-encre hover:border-bordure-forte"}`}>
                {t(tab.label)}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/15" : "bg-carte-2"}`}>
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {(q || libelleFiltre) && (
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-doux">
            <span>{totalFiltre}{" "}{t(totalFiltre > 1 ? "résultats" : "résultat")}</span>
            {q && (
              <Link href={lienFiltres({ filtre })} aria-label={t("Retirer la recherche « {0} »", q)}
                className="inline-flex items-center gap-1 min-h-8 rounded-full border border-bordure bg-carte-2 pl-2.5 pr-2 font-medium text-encre hover:border-bordure-forte">
                « {q} » <X className="size-3.5 text-doux" aria-hidden />
              </Link>
            )}
            {libelleFiltre && (
              <Link href={lienFiltres({ q })} aria-label={t("Retirer le filtre « {0} »", t(libelleFiltre))}
                className="inline-flex items-center gap-1 min-h-8 rounded-full border border-bordure bg-carte-2 pl-2.5 pr-2 font-medium text-encre hover:border-bordure-forte">
                {t(libelleFiltre)} <X className="size-3.5 text-doux" aria-hidden />
              </Link>
            )}
            {q && libelleFiltre && (
              <Link href="/dashboard/produits" className="min-h-8 inline-flex items-center font-semibold text-encre underline underline-offset-2">{t("Tout effacer")}</Link>
            )}
          </div>
        )}
      </div>

      {/* ── Grid ── */}
      {produits.length === 0 ? (
        q || libelleFiltre ? (
          <EtatVide icone={<Search />}
            titre={q ? t("Aucun produit ne correspond à « {0} »", q) : t("Aucun produit « {0} »", t(libelleFiltre ?? ""))}
            texte={q ? t("Vérifiez l'orthographe ou essayez un autre mot.") : t("Aucun produit n'est dans ce cas pour le moment.")}>
            <Bouton variante="secondaire" href="/dashboard/produits">{t("Voir tous les produits")}</Bouton>
          </EtatVide>
        ) : (
          <EtatVide icone={<Package />} titre={t("Vous n'avez pas encore de produit")}
            texte={t("Ajoutez votre premier produit pour commencer à vendre, ou importez votre catalogue depuis un fichier Excel.")}>
            <Bouton variante="primaire" href="/dashboard/produits/nouveau" icone={<Plus className="size-4" aria-hidden />}>{t("Ajouter un produit")}</Bouton>
          </EtatVide>
        )
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
          {produits.map(p => (
            <div key={p.id} className="flex flex-col gap-1.5">
            <Link href={`/dashboard/produits/${p.id}`} className="group block flex-1">
              <div className="ax-card overflow-hidden h-full flex flex-col hover:shadow-[0_4px_24px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 transition-all duration-200">

                {/* Image */}
                <div className="aspect-square bg-[#F5F5F7] relative overflow-hidden flex-shrink-0">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.nom}
                      className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={28} className="text-[#CCCCCC]" />
                    </div>
                  )}

                  {/* Inactive overlay — exemple d'Axia : jamais visible des clients tant qu'il n'est pas activé */}
                  {!p.actif && (
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                      <span className="flex items-center gap-1 text-white text-[9px] sm:text-[10px] font-bold bg-black/50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full backdrop-blur-sm">
                        <EyeOff size={9} />{" "}{p.exempleAxia ? t("Exemple · Préparé par Axia") : t("Inactif")}
                      </span>
                    </div>
                  )}

                  {/* Category badge — masqué sur les cartes très étroites (mobile), la place manque */}
                  {(p as any).categorie && (
                    <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 hidden sm:block">
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-white/95 text-[#666] border border-[#E8E8E8]">
                        <Tag size={7.5} />
                        {t((p as any).categorie)}
                      </span>
                    </div>
                  )}

                  {/* Stock overlay badge (pas sur un exemple : son stock est à saisir à l'activation) */}
                  {p.type === "physique" && p.stock === 0 && !p.exempleAxia && (
                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
                      <span className="text-[8.5px] sm:text-[9.5px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-erreur-fond text-erreur border border-erreur-bordure">{t("Rupture")}</span>
                    </div>
                  )}

                  {/* Quick view icon on hover — souris uniquement */}
                  <div className="absolute inset-0 hidden sm:flex items-end justify-end p-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-xl bg-white/95 border border-[#E8E8E8] flex items-center justify-center shadow-sm">
                      <Eye size={13} className="text-[#666]" />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2.5 sm:p-4 flex flex-col flex-1">
                  <h3 className="text-[12px] sm:text-[13px] font-semibold text-[#111111] mb-1.5 sm:mb-2.5 line-clamp-2 leading-snug">
                    {t(p.nom)}
                  </h3>

                  <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2 flex-wrap">
                    <span className="text-[13.5px] sm:text-[16px] font-bold text-encre"
                      style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatMontant(p.prix, devise)}
                    </span>
                    {!p.exempleAxia && <StockBadge stock={p.stock} type={p.type} />}
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-2 sm:pt-3 border-t border-[#F5F5F7]">
                    <div className="flex items-center gap-1 text-[#BBBBBB] text-[10px] sm:text-[11px]">
                      <TrendingUp size={9} className="text-[#CCCCCC] flex-shrink-0" />
                      <span className="truncate">{t(p.ventes)} vente{p.ventes !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
                      {p._count.avis > 0 && (
                        <div className="flex items-center gap-1 text-[#BBBBBB] text-[10px] sm:text-[11px]">
                          <Star size={9} className="text-[#F5A623]" fill="#F5A623" />
                          <span>{t(p._count.avis)}</span>
                        </div>
                      )}
                      <div className="hidden sm:flex w-6 h-6 rounded-lg border border-[#EBEBEB] items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={11} className="text-[#999]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            {p.type === "physique" && p.stock <= 5 && !p.exempleAxia && (
              <Bouton variante={p.stock === 0 ? "secondaire" : "fantome"} taille="compact" large href={`/dashboard/produits/${p.id}#stock`}>
                {t("Mettre à jour le stock")}
              </Bouton>
            )}
            {p.exempleAxia && !p.actif && (
              <ActiverExemple id={p.id} nom={p.nom} prix={p.prix} image={p.images?.[0]} digital={p.type === "digital"} />
            )}
            </div>
          ))}
        </div>
      )}

      {nbPages > 1 && (
        <div className="flex items-center justify-between text-[12px] font-semibold">
          {page > 1 ? <Link href={lienPage(page - 1)} className="text-[#111] hover:underline">← {t("Précédent")}</Link> : <span />}
          <span className="text-[#AAAAAA]">{page} / {nbPages}</span>
          {page < nbPages ? <Link href={lienPage(page + 1)} className="text-[#111] hover:underline">{t("Suivant")} →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
