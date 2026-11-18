import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Clock, CheckCircle, Truck, TrendingUp, Package, ChevronRight, ArrowUpRight, X,
} from "lucide-react";
import { Badge, Bouton, EnTetePage, EtatVide } from "@/components/ui";
import { STATUTS_A_TRAITER, statutCommande, statutPaiement, libelleMethodePaiement } from "./statuts";
import { CommandesExport } from "@/components/dashboard/CommandesExport";
import { BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { CommandesTutorial } from "@/components/dashboard/tutorials/CommandesTutorial";
import { formatMontant, dateRelative } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { PAIEMENT } from "@/lib/commandes";

const AVATAR_COLORS = [
  ["#FFF8EC","#F5A623"],["#EFF6FF","#3B82F6"],["#F0FDF4","#16A34A"],
  ["#FAF5FF","#7C3AED"],["#FFF1F2","#E11D48"],["#ECFEFF","#0891B2"],
];

async function Avatar({ nom }: { nom: string }) {
  const t = await getT();
  const hash = (nom ?? "?").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const [bg, text] = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const initiales = (nom ?? "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
      style={{ background: bg, color: text, border: `1px solid ${text}20` }}>
      {t(initiales)}
    </div>
  );
}

// Libellés au pluriel des onglets ; « À traiter » regroupe les commandes qui attendent le marchand.
const FILTER_TABS = [
  { key: "all",               label: "Toutes"             },
  { key: STATUTS_A_TRAITER.join(","), label: "À traiter"  },
  { key: "en_attente",        label: "En attente"         },
  { key: "confirmee",         label: "Confirmées"         },
  { key: "en_preparation",    label: "En préparation"     },
  { key: "expediee",          label: "En livraison"       },
  { key: "tentative_echouee", label: "Livraison échouée"  },
  { key: "livree",            label: "Livrées"            },
  { key: "annulee",           label: "Annulées"           },
];

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; page?: string }>;
}) {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "commandes");
  const { statut: filtreStatut, page: pageParam } = await searchParams;

  const tenantId = (session.user as any)?.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

  // Pagination + statistiques calculées en base (pas sur la page affichée)
  const PAR_PAGE = 50;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const filtre = filtreStatut && filtreStatut !== "all" ? filtreStatut : undefined;
  // Plusieurs statuts possibles (« à expédier » du Tableau de bord : statut=confirmee,en_preparation).
  const statutsFiltre = filtre?.split(",") ?? [];

  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
  const devise = tenant?.devise || "XOF";

  const [commandes, parStatut, caMois] = await Promise.all([
    prisma.commande.findMany({
      where: { tenantId, ...(filtre ? { statut: { in: statutsFiltre } } : {}) },
      include: { lignes: { select: { nom: true, quantite: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
    }),
    prisma.commande.groupBy({ by: ["statut"], where: { tenantId }, _count: { _all: true } }),
    prisma.commande.aggregate({
      where: { tenantId, paiementStatut: PAIEMENT.PAYE, createdAt: { gte: debutMois } },
      _sum: { montantTotal: true },
    }),
  ]);

  const compte = (st: string) => parStatut.find(g => g.statut === st)?._count._all ?? 0;
  const totalToutes = parStatut.reduce((s, g) => s + g._count._all, 0);
  const totalFiltre = filtre ? statutsFiltre.reduce((s, st) => s + compte(st), 0) : totalToutes;
  const nbPages = Math.max(1, Math.ceil(totalFiltre / PAR_PAGE));
  const lienPage = (p: number) =>
    `/dashboard/commandes?${new URLSearchParams({ ...(filtre ? { statut: filtre } : {}), page: String(p) })}`;

  const aTraiter = STATUTS_A_TRAITER.reduce((s, st) => s + compte(st), 0);
  const ongletActif = FILTER_TABS.find(tab => tab.key === (filtre ?? "all"));
  const libelleFiltre = filtre ? (ongletActif?.label ?? statutsFiltre.map(st => statutCommande(st).label).join(", ")) : null;

  const statCards = [
    { label: "Ventes payées ce mois", value: formatMontant(caMois._sum.montantTotal ?? 0, devise), Icon: TrendingUp, iconBg: "#FFF8EC", iconColor: "#F5A623", accent: true },
    { label: "À traiter",    value: aTraiter,              Icon: Clock,       iconBg: "#FFFBEB", iconColor: "#D97706" },
    { label: "En livraison", value: compte("expediee"),    Icon: Truck,       iconBg: "#EEF2FF", iconColor: "#4338CA" },
    { label: "Livrées",      value: compte("livree"),      Icon: CheckCircle, iconBg: "#F0FDF4", iconColor: "#16A34A" },
  ];

  // Produits de la commande en une ligne : « Robe wax ×2 + 1 autre ».
  const resumeProduits = (lignes: { nom: string; quantite: number }[]) => {
    if (!lignes.length) return "—";
    const [l] = lignes;
    const reste = lignes.length - 1;
    return `${t(l.nom)}${l.quantite > 1 ? ` ×${l.quantite}` : ""}${reste > 0 ? ` + ${reste} ${t(reste > 1 ? "autres" : "autre")}` : ""}`;
  };
  const reference = (c: { numero: string | null; id: string }) => `#${c.numero?.slice(-6) ?? c.id.slice(-6).toUpperCase()}`;

  return (
    <div className="space-y-5"
      style={{ fontFamily: "'Poppins','Century Gothic',system-ui,sans-serif" }}>
      <CommandesTutorial />

      <EnTetePage
        className="mb-0 pt-1"
        titre={t("Commandes")}
        description={t("Confirmez, expédiez et suivez les commandes de votre boutique.")}
        indicateurs={<>
          <BoutonRevoirTutoriel moduleKey="commandes" />
          <Badge>{totalToutes}</Badge>
          {aTraiter > 0 && (
            <Link href={`/dashboard/commandes?statut=${STATUTS_A_TRAITER.join(",")}`} className="rounded-full focus-visible:outline-2 focus-visible:outline-focus">
              <Badge ton="attention" icone={<Clock aria-hidden />}>{aTraiter}{" "}{t("à traiter")}</Badge>
            </Link>
          )}
        </>}
        actions={<CommandesExport total={totalToutes} />}
      />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s, i) => {
          const Icon = s.Icon;
          return (
            <div key={i} className={`ax-card p-4 sm:p-5 relative overflow-hidden group cursor-default ${s.accent ? "border-[#F5A623]/20" : ""}`}>
              {s.accent && (
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px]"
                  style={{ background: "linear-gradient(90deg, #F5A623, #FFD280, #F5A623)" }} />
              )}
              <div className="flex items-start justify-between gap-2 mb-4">
                <span className="ax-label">{t(s.label)}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: s.iconBg, border: `1px solid ${s.iconColor}20` }}>
                  <Icon size={14} style={{ color: s.iconColor }} strokeWidth={1.8} aria-hidden />
                </div>
              </div>
              <p className="text-[18px] sm:text-[24px] [overflow-wrap:anywhere] font-bold text-encre leading-none tabular-nums tracking-tight">
                {s.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Filtres par statut ── */}
      <nav aria-label={t("Filtrer par statut")} className="flex items-center gap-1.5 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-0.5" style={{ scrollbarWidth: "none" }}>
        {FILTER_TABS.map(tab => {
          const isActive = (filtre ?? "all") === tab.key;
          const count = tab.key === "all" ? totalToutes : tab.key.split(",").reduce((s, st) => s + compte(st), 0);
          return (
            <Link
              key={tab.key}
              href={tab.key === "all" ? "/dashboard/commandes" : `/dashboard/commandes?statut=${tab.key}`}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-1.5 min-h-10 sm:min-h-8 px-3 rounded-full border text-[12px] font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${isActive ? "bg-secondaire text-carte border-secondaire" : "bg-carte text-doux border-bordure hover:text-encre hover:border-bordure-forte"}`}
            >
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

      {/* ── Liste / état vide ── */}
      {commandes.length === 0 ? (
        filtre ? (
          <EtatVide
            icone={<Package />}
            titre={t("Aucune commande « {0} »", t(libelleFiltre ?? ""))}
            texte={t("Aucune commande ne correspond à ce filtre pour le moment.")}
          >
            <Bouton variante="secondaire" href="/dashboard/commandes">{t("Voir toutes les commandes")}</Bouton>
          </EtatVide>
        ) : (
          <EtatVide
            icone={<Package />}
            titre={t("Aucune commande pour l'instant")}
            texte={t("Les commandes passées dans votre boutique ou en caisse apparaîtront ici. Partagez le lien de votre boutique pour recevoir les premières.")}
          >
            <Bouton variante="primaire" href="/dashboard/boutique" icone={<ArrowUpRight className="size-4" aria-hidden />}>{t("Voir ma boutique")}</Bouton>
          </EtatVide>
        )
      ) : (
        <div className="ax-card overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-bordure flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-semibold text-encre">
                {totalFiltre}{" "}{t(totalFiltre > 1 ? "commandes" : "commande")}
              </p>
              {libelleFiltre && (
                <Link href="/dashboard/commandes" aria-label={t("Retirer le filtre « {0} »", t(libelleFiltre))}
                  className="inline-flex items-center gap-1 min-h-8 rounded-full border border-bordure bg-carte-2 pl-2.5 pr-2 text-[12px] font-medium text-encre hover:border-bordure-forte">
                  {t(libelleFiltre)} <X className="size-3.5 text-doux" aria-hidden />
                </Link>
              )}
            </div>
            <p className="ax-aide">{t("Les plus récentes en premier")}{nbPages > 1 ? ` · ${t("Page")} ${page}/${nbPages}` : ""}</p>
          </div>

          {/* Ordinateur : tableau */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-bordure">
                  {["Référence", "Client", "Produits", "Montant", "Paiement", "Statut", "Date", ""].map((label, i) => (
                    <th key={i} scope="col" className={`px-4 py-3 ax-label ${label === "Montant" ? "text-right" : ""}`}>
                      {label ? t(label) : <span className="sr-only">{t("Ouvrir")}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commandes.map(c => {
                  const st = statutCommande(c.statut);
                  const pay = statutPaiement(c.paiementStatut);
                  return (
                    <tr key={c.id} className="border-b border-bordure last:border-0 hover:bg-carte-2 transition-colors">
                      <td className="px-4 py-3.5">
                        <Link href={`/dashboard/commandes/${c.id}`} className="text-[12.5px] font-mono font-bold text-encre underline-offset-2 hover:underline">
                          {reference(c)}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar nom={c.clientNom ?? "?"} />
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-encre leading-tight truncate max-w-[180px]">{c.clientNom}</p>
                            {(c.ville || c.pays) && (
                              <p className="ax-aide mt-0.5 truncate max-w-[180px]">{[c.ville, c.pays].filter(Boolean).join(", ")}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[12.5px] text-encre">
                        <span className="line-clamp-2 max-w-[220px]">{resumeProduits(c.lignes)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-[13.5px] font-bold text-encre whitespace-nowrap tabular-nums">
                        {formatMontant(c.montantTotal, c.devise)}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[12px] text-doux mb-1 whitespace-nowrap">{t(libelleMethodePaiement(c.methodePaiement))}</p>
                        <Badge ton={pay.ton}>{t(pay.label)}</Badge>
                      </td>
                      <td className="px-4 py-3.5"><Badge ton={st.ton}>{t(st.label)}</Badge></td>
                      <td className="px-4 py-3.5 text-[12px] text-doux whitespace-nowrap">{dateRelative(c.createdAt)}</td>
                      <td className="px-2 py-3.5">
                        <Link href={`/dashboard/commandes/${c.id}`} aria-label={t("Ouvrir la commande {0}", reference(c))}
                          className="w-9 h-9 rounded-controle border border-bordure flex items-center justify-center hover:border-bordure-forte hover:bg-carte-2 transition-colors">
                          <ChevronRight size={14} className="text-doux" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Téléphone et tablette : cartes empilées, toutes les informations essentielles */}
          <ul className="md:hidden divide-y divide-bordure">
            {commandes.map(c => {
              const st = statutCommande(c.statut);
              const pay = statutPaiement(c.paiementStatut);
              return (
                <li key={c.id}>
                  <Link href={`/dashboard/commandes/${c.id}`} className="block px-4 py-3.5 hover:bg-carte-2 active:bg-carte-2 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-mono font-bold text-encre">{reference(c)} <span className="font-sans font-normal text-doux">· {dateRelative(c.createdAt)}</span></p>
                        <p className="text-[14px] font-semibold text-encre truncate mt-0.5">{c.clientNom}</p>
                      </div>
                      <p className="text-[14px] font-bold text-encre whitespace-nowrap tabular-nums">{formatMontant(c.montantTotal, c.devise)}</p>
                    </div>
                    <p className="text-[12.5px] text-doux mt-1 line-clamp-1">{resumeProduits(c.lignes)}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge ton={st.ton}>{t(st.label)}</Badge>
                      <Badge ton={pay.ton}>{t(pay.label)}</Badge>
                      <span className="text-[11.5px] text-doux">{t(libelleMethodePaiement(c.methodePaiement))}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {nbPages > 1 && (
            <nav aria-label={t("Pagination")} className="px-4 sm:px-6 py-2 border-t border-bordure flex items-center justify-between gap-2">
              {page > 1
                ? <Bouton variante="fantome" taille="compact" href={lienPage(page - 1)}>← {t("Précédent")}</Bouton>
                : <span />}
              <span className="ax-aide">{page} / {nbPages}</span>
              {page < nbPages
                ? <Bouton variante="fantome" taille="compact" href={lienPage(page + 1)}>{t("Suivant")} →</Bouton>
                : <span />}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
