import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatMontant, formatDate } from "@/lib/utils";
import { ExternalLink, BadgeCheck, Settings2, Search, X } from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getAdminSessionPour, estAdminComplet } from "@/lib/admin-auth";
import { PLATFORM_TENANT_SLUG } from "@/lib/wallet";
import { TenantStatutToggle } from "@/components/admin/TenantStatutToggle";
import { getT } from "@/lib/i18n/serveur";
import { convertirMontant } from "@/lib/devise-convert";
import { tauxDuJour } from "@/lib/taux-change";
import { NOM_PLAN, type PlanId } from "@/lib/command-center/types";
import { EnTetePage, Carte, Badge, EtatVide } from "@/components/command-center/ui";
import { NOM_STATUT_BOUTIQUE, TON_STATUT_BOUTIQUE } from "./statuts";

const PAR_PAGE = 50;
const FILTRES_STATUT = ["active", "brouillon", "suspendu", "supprime"] as const;

interface Props {
  searchParams: Promise<{ q?: string; statut?: string; page?: string }>;
}

export default async function AdminBoutiquesPage({ searchParams }: Props) {
  const t = await getT();
  const session = await getAdminSessionPour("boutiques");
  if (!session) redirect("/admin?refus=1");
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const statut = FILTRES_STATUT.find((s) => s === sp.statut);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const admin = estAdminComplet(session);

  const recherche: Prisma.TenantWhereInput = {
    slug: { not: PLATFORM_TENANT_SLUG },
    ...(q ? { OR: [{ nomBoutique: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const where: Prisma.TenantWhereInput = { ...recherche, ...(statut ? { statut } : {}) };

  const taux = await tauxDuJour();
  const [total, parStatut, boutiques] = await Promise.all([
    prisma.tenant.count({ where }),
    prisma.tenant.groupBy({ by: ["statut"], where: recherche, _count: true }),
    prisma.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
      include: {
        _count: { select: { produits: true, commandes: true, clients: true } },
        commissions: { where: { statut: "captured" }, select: { montantCommission: true, devise: true } },
      },
    }),
  ]);
  const compte = Object.fromEntries(parStatut.map((g) => [g.statut, g._count]));
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));

  // Lien qui conserve les autres filtres (retrait d'un filtre = lien sans lui).
  const url = (p: { q?: string | null; statut?: string | null; page?: number }) => {
    const u = new URLSearchParams();
    const vq = p.q === undefined ? q : p.q;
    const vs = p.statut === undefined ? statut : p.statut;
    if (vq) u.set("q", vq);
    if (vs) u.set("statut", vs);
    if (p.page && p.page > 1) u.set("page", String(p.page));
    return `/admin/boutiques${u.size ? `?${u}` : ""}`;
  };

  const lignes = boutiques.map((b) => ({
    b,
    revenu: b.commissions.reduce((s, c) => s + convertirMontant(c.montantCommission, c.devise, b.devise, taux), 0), // devise de la commission → devise actuelle de la boutique
    plan: t(NOM_PLAN[b.planType as PlanId] ?? b.planType),
    statut: <Badge ton={TON_STATUT_BOUTIQUE[b.statut] ?? "neutre"}>{t(NOM_STATUT_BOUTIQUE[b.statut] ?? b.statut)}</Badge>,
  }));

  const nomLien = (b: (typeof boutiques)[number]) => (
    <div className="min-w-0">
      <Link href={`/admin/boutiques/${b.id}`} className="font-medium inline-flex items-center gap-1.5 hover:underline [overflow-wrap:anywhere]" style={{ color: "var(--cc-text)" }}>
        {b.nomBoutique}
        {b.certifie && <BadgeCheck size={13} style={{ color: "var(--cc-accent)" }} aria-label={t("Boutique certifiée")} />}
      </Link>
      <a href={`/${b.slug}`} target="_blank" rel="noopener noreferrer" className="text-[11px] flex items-center gap-1 hover:underline w-fit" style={{ color: "var(--cc-accent-text)" }} aria-label={t("Voir la vitrine de {0}", b.nomBoutique)}>
        {b.slug} <ExternalLink size={9} aria-hidden />
      </a>
    </div>
  );

  const actions = (b: (typeof boutiques)[number]) => (
    <div className="flex items-center gap-1.5">
      <Link href={`/admin/boutiques/${b.id}`} className="cc-btn cc-btn-sm"><Settings2 size={12} aria-hidden />{t("Gérer")}</Link>
      {admin && <TenantStatutToggle tenantId={b.id} statutActuel={b.statut} nomBoutique={b.nomBoutique} />}
    </div>
  );

  const nbTotal = Object.values(compte).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-5">
      <EnTetePage
        titre={t("Boutiques")}
        sousTitre={t(total > 1 ? "{0} boutiques" : "{0} boutique", total.toLocaleString(t.loc)) + (q || statut ? t(" correspondent aux filtres") : t(" enregistrées sur la plateforme"))}
      />

      <div className="space-y-2.5">
        <form className="flex gap-2 max-w-md" role="search">
          {statut && <input type="hidden" name="statut" value={statut} />}
          <label className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 cc-faint" aria-hidden />
            <input name="q" defaultValue={q} placeholder={t("Nom, adresse de la boutique ou e-mail…")} aria-label={t("Rechercher une boutique")} className="cc-input w-full pl-8 h-10 sm:h-8" />
          </label>
          <button className="cc-btn h-10 sm:h-8">{t("Rechercher")}</button>
        </form>

        <nav className="flex flex-wrap items-center gap-1.5" aria-label={t("Filtrer par statut")}>
          <Link href={url({ statut: null, page: 1 })} className="cc-btn cc-btn-sm" aria-current={!statut ? "true" : undefined} style={!statut ? { borderColor: "var(--cc-accent)", color: "var(--cc-accent-text)" } : undefined}>
            {t("Toutes")} <span className="cc-faint cc-num">{nbTotal}</span>
          </Link>
          {FILTRES_STATUT.map((s) => (
            <Link key={s} href={url({ statut: s, page: 1 })} className="cc-btn cc-btn-sm" aria-current={statut === s ? "true" : undefined} style={statut === s ? { borderColor: "var(--cc-accent)", color: "var(--cc-accent-text)" } : undefined}>
              {t(NOM_STATUT_BOUTIQUE[s])} <span className="cc-faint cc-num">{compte[s] ?? 0}</span>
            </Link>
          ))}
        </nav>

        {(q || statut) && (
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="cc-faint">{t("Filtré :")}</span>
            {q && <Link href={url({ q: null, page: 1 })} className="cc-badge cc-badge-accent" aria-label={t("Retirer la recherche « {0} »", q)}>« {q} » <X size={11} aria-hidden /></Link>}
            {statut && <Link href={url({ statut: null, page: 1 })} className="cc-badge cc-badge-accent" aria-label={t("Retirer le filtre {0}", t(NOM_STATUT_BOUTIQUE[statut]))}>{t(NOM_STATUT_BOUTIQUE[statut])} <X size={11} aria-hidden /></Link>}
            <Link href="/admin/boutiques" className="underline cc-muted">{t("Tout effacer")}</Link>
          </div>
        )}
      </div>

      <Carte pad={false}>
        {!lignes.length ? (
          <EtatVide
            titre={q || statut ? t("Aucune boutique ne correspond à ces filtres.") : t("Aucune boutique inscrite pour l'instant.")}
            explication={q || statut ? t("Vérifiez l'orthographe ou retirez un filtre.") : t("Les boutiques apparaîtront ici dès la première inscription d'un marchand.")}
            action={q || statut ? <Link href="/admin/boutiques" className="cc-btn cc-btn-sm">{t("Voir toutes les boutiques")}</Link> : undefined}
          />
        ) : (
          <>
            {/* Mobile : cartes, toutes les actions restent visibles */}
            <ul className="md:hidden divide-y cc-sep">
              {lignes.map(({ b, revenu, plan, statut: badge }) => (
                <li key={b.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">{nomLien(b)}{badge}</div>
                  <dl className="grid grid-cols-3 gap-2 text-[12px]">
                    <div><dt className="cc-faint">{t("Plan")}</dt><dd>{plan}</dd></div>
                    <div><dt className="cc-faint">{t("Commandes")}</dt><dd className="cc-num">{b._count.commandes}</dd></div>
                    <div><dt className="cc-faint">{t("Revenus Axso")}</dt><dd className="cc-num cc-good">{formatMontant(revenu, b.devise)}</dd></div>
                  </dl>
                  <p className="text-[11.5px] cc-faint">{t(b.pays)} · {t("Créée le")} {formatDate(b.createdAt)}</p>
                  {actions(b)}
                </li>
              ))}
            </ul>

            <div className="hidden md:block overflow-x-auto">
              <table className="cc-table">
                <thead>
                  <tr>
                    {["Boutique", "Pays", "Plan", "Produits", "Commandes", "Clients", "Revenus Axso", "Statut", "Créée le"].map((h, i) => (
                      <th key={h} className={i >= 3 && i <= 6 ? "r" : ""}>{t(h)}</th>
                    ))}
                    <th><span className="sr-only">{t("Actions")}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map(({ b, revenu, plan, statut: badge }) => (
                    <tr key={b.id}>
                      <td>{nomLien(b)}</td>
                      <td className="cc-muted">{t(b.pays)}</td>
                      <td>{plan}</td>
                      <td className="r cc-num">{b._count.produits}</td>
                      <td className="r cc-num">{b._count.commandes}</td>
                      <td className="r cc-num">{b._count.clients}</td>
                      <td className="r cc-num cc-good">{formatMontant(revenu, b.devise)}</td>
                      <td>{badge}</td>
                      <td className="cc-faint">{formatDate(b.createdAt)}</td>
                      <td>{actions(b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Carte>

      {pages > 1 && (
        <nav className="flex items-center justify-end gap-2 text-[12px]" aria-label={t("Pagination")}>
          {page > 1 ? <Link href={url({ page: page - 1 })} className="cc-btn cc-btn-sm">{t("Précédent")}</Link> : <span className="cc-btn cc-btn-sm opacity-45" aria-disabled>{t("Précédent")}</span>}
          <span className="cc-faint">{t("Page {0} / {1}", page, pages)}</span>
          {page < pages ? <Link href={url({ page: page + 1 })} className="cc-btn cc-btn-sm">{t("Suivant")}</Link> : <span className="cc-btn cc-btn-sm opacity-45" aria-disabled>{t("Suivant")}</span>}
        </nav>
      )}
    </div>
  );
}
