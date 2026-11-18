import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate, dateRelative } from "@/lib/utils";
import { Truck, MapPin, Bike, Car, Package, Navigation, UserCheck, ExternalLink, Search, X, Ban, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getAdminSession, getAdminSessionPour, estAdminComplet } from "@/lib/admin-auth";
import { changerActivationLivreur } from "@/lib/admin-actions";
import { revalidatePath } from "next/cache";
import { getT } from "@/lib/i18n/serveur";
import { EnTetePage, Carte, Badge, EtatVide, type Ton } from "@/components/command-center/ui";
import { BoutonConfirme } from "@/components/command-center/Confirmation";

// Valider (activer) ou suspendre un livreur. Un livreur qui s'inscrit seul
// arrive inactif et ne peut pas être assigné tant qu'un admin ne l'a pas validé.
async function basculerActif(formData: FormData) {
  "use server";
  if (!estAdminComplet(await getAdminSession())) return;
  const id = String(formData.get("id"));
  const livreur = await prisma.livreur.findUnique({ where: { id }, select: { actif: true } });
  if (!livreur) return;
  await changerActivationLivreur(id, !livreur.actif); // partagé avec AXIA admin
  revalidatePath("/admin/livreurs");
  revalidatePath("/admin");
}

const VEHICULES: Record<string, { label: string; icon: any }> = {
  moto: { label: "Moto", icon: Bike },
  voiture: { label: "Voiture", icon: Car },
  velo: { label: "Vélo", icon: Bike },
  a_pied: { label: "À pied", icon: Package }, // valeur enregistrée par /api/livreurs/inscription
  pied: { label: "À pied", icon: Package },
};

// Au-delà, la position n'est plus "en direct" (le GeoTracker envoie toutes les 30 s).
const POSITION_FRAICHE_MS = 5 * 60_000;
// Une course en ville dépasse rarement 1 h : au-delà, la ligne passe en rouge.
const LIVRAISON_LONGUE_MS = 60 * 60_000;

const PAR_PAGE = 50;
const FILTRES = { actif: "Actifs", en_attente: "En attente", suspendu: "Suspendus", dispo: "Disponibles" } as const;
type Filtre = keyof typeof FILTRES;

interface Props { searchParams: Promise<{ q?: string; statut?: string; page?: string }> }

export default async function AdminLivreursPage({ searchParams }: Props) {
  const t = await getT();
  const session = await getAdminSessionPour("livreurs");
  if (!session) redirect("/admin?refus=1");
  const peutModifier = estAdminComplet(session);
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const statut = (Object.keys(FILTRES) as Filtre[]).find((f) => f === sp.statut);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const enCoursWhere = { livreurId: { not: null }, statut: { in: ["expediee", "tentative_echouee"] } };
  const [livreurs, livrees, echecs, enCours, nbEnCours] = await Promise.all([
    prisma.livreur.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
        tenant: { select: { nomBoutique: true, slug: true } },
        _count: { select: { commandes: true } },
      },
    }),
    prisma.commande.groupBy({ by: ["livreurId"], where: { livreurId: { not: null }, statut: "livree" }, _count: true }),
    prisma.commande.groupBy({ by: ["livreurId"], where: { livreurId: { not: null }, echecCount: { gt: 0 } }, _sum: { echecCount: true } }),
    prisma.commande.findMany({
      where: enCoursWhere,
      orderBy: [{ expedieeAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      take: 100,
      select: {
        id: true, numero: true, statut: true, ville: true, createdAt: true, expedieeAt: true, echecCount: true,
        livreurPosition: true, trackingToken: true,
        tenant: { select: { nomBoutique: true, slug: true } },
        livreur: { select: { nom: true, telephone: true } },
      },
    }),
    // La liste est limitée à 100 lignes : le compteur, lui, compte tout.
    prisma.commande.count({ where: enCoursWhere }),
  ]);

  const nbLivrees = new Map(livrees.map(g => [g.livreurId, g._count]));
  const nbEchecs = new Map(echecs.map(g => [g.livreurId, g._sum.echecCount ?? 0]));

  const aValider = livreurs.filter(l => !l.actif && !l.valideAt);
  const independants = livreurs.filter(l => !l.tenantId);
  const disponibles = livreurs.filter(l => l.disponible && l.actif).length;

  // Statut affiché : mêmes libellés partout sur la page.
  const etat = (l: (typeof livreurs)[number]): { cle: "actif" | "en_attente" | "suspendu"; nom: string; ton: Ton } =>
    l.actif ? { cle: "actif", nom: "Actif", ton: "good" } : l.valideAt ? { cle: "suspendu", nom: "Suspendu", ton: "bad" } : { cle: "en_attente", nom: "En attente", ton: "warn" };

  // ponytail: filtre et pagination en mémoire (tous les livreurs sont déjà chargés pour les compteurs) ; passer en requête si la liste dépasse quelques milliers.
  const n = q?.toLowerCase();
  const filtres = livreurs.filter((l) =>
    (!n || [l.nom, l.user.email, l.telephone, l.zone, l.tenant?.nomBoutique].some((v) => v?.toLowerCase().includes(n))) &&
    (!statut || (statut === "dispo" ? l.disponible && l.actif : etat(l).cle === statut)));
  const compte: Record<Filtre, number> = {
    actif: livreurs.filter((l) => etat(l).cle === "actif").length,
    en_attente: livreurs.filter((l) => etat(l).cle === "en_attente").length,
    suspendu: livreurs.filter((l) => etat(l).cle === "suspendu").length,
    dispo: disponibles,
  };
  const pages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const tranche = filtres.slice((page - 1) * PAR_PAGE, page * PAR_PAGE);

  const url = (p: { q?: string | null; statut?: string | null; page?: number }) => {
    const u = new URLSearchParams();
    const vq = p.q === undefined ? q : p.q;
    const vs = p.statut === undefined ? statut : p.statut;
    if (vq) u.set("q", vq);
    if (vs) u.set("statut", vs);
    if (p.page && p.page > 1) u.set("page", String(p.page));
    return `/admin/livreurs${u.size ? `?${u}` : ""}#tous`;
  };

  const stats = [
    { label: "Total livreurs", value: livreurs.length, cls: "" },
    { label: "À valider", value: aValider.length, cls: aValider.length ? "cc-warn" : "" },
    { label: "Disponibles", value: disponibles, cls: "cc-good" },
    { label: "Livraisons en cours", value: nbEnCours, cls: "" },
    { label: "Indépendants", value: independants.length, cls: "" },
  ];

  const maintenant = Date.now();

  // Valider = action positive (sans confirmation) ; suspendre = action sensible, confirmée en nommant le livreur.
  const boutonActif = (l: (typeof livreurs)[number]) => peutModifier && (
    <form action={basculerActif}>
      <input type="hidden" name="id" value={l.id} />
      {l.actif ? (
        <BoutonConfirme className="cc-btn cc-btn-sm cc-bad h-10 sm:h-8"
          confirmation={{ titre: t("Suspendre le livreur {0} ?", l.nom), message: t("Il ne pourra plus recevoir de nouvelles livraisons tant qu'il n'est pas réactivé."), action: t("Suspendre le livreur"), danger: true }}>
          <Ban size={12} aria-hidden />{t("Suspendre")}
        </BoutonConfirme>
      ) : (
        <button type="submit" className="cc-btn cc-btn-sm cc-good h-10 sm:h-8" aria-label={l.valideAt ? t("Réactiver le livreur {0}", l.nom) : t("Valider le livreur {0}", l.nom)}>
          <CheckCircle2 size={12} aria-hidden />{l.valideAt ? t("Réactiver") : t("Valider")}
        </button>
      )}
    </form>
  );

  const vehicule = (l: (typeof livreurs)[number]) => VEHICULES[l.vehicule] || VEHICULES.moto;
  const position = (l: (typeof livreurs)[number]) => {
    const fraiche = l.positionAt && maintenant - l.positionAt.getTime() < POSITION_FRAICHE_MS;
    return l.latitude && l.longitude && l.positionAt ? (
      <a href={`https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}`} target="_blank" rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 text-[12px] hover:underline ${fraiche ? "cc-good" : "cc-warn"}`} aria-label={t("Voir la position de {0} sur la carte", l.nom)}>
        <MapPin size={11} aria-hidden />{dateRelative(l.positionAt)}
      </a>
    ) : <span className="text-[12px] cc-faint">{t("Non partagée")}</span>;
  };
  const rattachement = (l: (typeof livreurs)[number]) => l.tenant ? <Badge ton="accent">{l.tenant.nomBoutique}</Badge> : <Badge>{t("Plateforme")}</Badge>;
  const dispo = (l: (typeof livreurs)[number]) => <span className={`text-[11.5px] ${l.disponible ? "cc-good" : "cc-faint"}`}>{l.disponible ? t("Disponible") : t("Occupé")}</span>;

  return (
    <div className="space-y-5">
      <EnTetePage titre={t("Livreurs")} sousTitre={t(livreurs.length > 1 ? "{0} livreurs sur la plateforme" : "{0} livreur sur la plateforme", livreurs.length)} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <section key={s.label} className="cc-card p-4">
            <p className={`text-2xl font-semibold cc-num ${s.cls}`}>{s.value}</p>
            <p className="text-[12px] cc-muted mt-1">{t(s.label)}</p>
          </section>
        ))}
      </div>

      {/* Action : livreurs inscrits seuls, à valider avant toute assignation */}
      {aValider.length > 0 && (
        <Carte pad={false} titre={<span className="flex items-center gap-2"><UserCheck size={15} className="cc-warn" aria-hidden />{t("En attente de validation")} <Badge ton="warn">{aValider.length}</Badge></span>}
          sousTitre={t("Un livreur inscrit seul ne peut recevoir aucune livraison tant qu'il n'est pas validé.")}>
          <ul className="divide-y cc-sep border-t cc-sep">
            {aValider.map(l => (
              <li key={l.id} className="px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="min-w-[180px] flex-1">
                  <p className="font-medium text-[13px]">{l.nom}</p>
                  <p className="text-[12px] cc-muted [overflow-wrap:anywhere]">{l.user.email}</p>
                </div>
                <a href={`tel:${l.telephone}`} className="font-mono text-[12px] cc-muted hover:underline">{l.telephone}</a>
                <span className="text-[12px] cc-muted">{t(vehicule(l).label)}{l.zone ? ` · ${l.zone}` : ""}</span>
                <span className="text-[12px] cc-faint">{t("Inscrit")} {dateRelative(l.createdAt).toLowerCase()}</span>
                {boutonActif(l)}
              </li>
            ))}
          </ul>
        </Carte>
      )}

      {/* Supervision : livraisons en route */}
      <Carte pad={false} titre={<span className="flex items-center gap-2"><Navigation size={15} className="cc-warn" aria-hidden />{t("Livraisons en cours")}</span>}
        sousTitre={nbEnCours > enCours.length ? t("Les {0} plus anciennes sur {1}", enCours.length, nbEnCours) : undefined}>
        {enCours.length === 0 ? (
          <EtatVide titre={t("Aucune livraison en route pour le moment.")} explication={t("Les commandes expédiées avec un livreur assigné apparaissent ici.")} />
        ) : (
          <ul className="divide-y cc-sep border-t cc-sep">
            {enCours.map(c => {
              const pos = c.livreurPosition as { updatedAt?: string } | null;
              const majPos = pos?.updatedAt ? new Date(pos.updatedAt) : null;
              const fraiche = majPos && maintenant - majPos.getTime() < POSITION_FRAICHE_MS;
              const enRetard = c.statut === "expediee" && c.expedieeAt && maintenant - c.expedieeAt.getTime() > LIVRAISON_LONGUE_MS;
              return (
                <li key={c.id} className="px-4 py-3 grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center text-[12.5px]">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono">#{c.numero}</span>
                      {c.statut === "expediee" ? <Badge ton="accent">{t("En route")}</Badge> : <Badge ton="bad">{t("Échec ×{0}", c.echecCount)}</Badge>}
                      {enRetard && <Badge ton="bad">{t("Plus d'1 h")}</Badge>}
                    </p>
                    <p className="cc-muted [overflow-wrap:anywhere]">{c.tenant.nomBoutique}{c.ville ? ` · ${c.ville}` : ""}</p>
                  </div>
                  <div className="min-w-0">
                    <p>{c.livreur?.nom ?? "—"}</p>
                    {c.livreur?.telephone && <a href={`tel:${c.livreur.telephone}`} className="font-mono text-[11.5px] cc-muted hover:underline">{c.livreur.telephone}</a>}
                  </div>
                  <div className="min-w-0">
                    <p className={enRetard ? "cc-bad" : "cc-muted"}>{c.expedieeAt ? <>{t("Parti")} {dateRelative(c.expedieeAt).toLowerCase()}</> : t("Départ non renseigné")}</p>
                    <p className={majPos ? (fraiche ? "cc-good" : "cc-warn") : "cc-faint"}>{majPos ? <>{t("Position")} {dateRelative(majPos).toLowerCase()}</> : t("Position jamais partagée")}</p>
                  </div>
                  {c.trackingToken ? (
                    <a href={`/${c.tenant.slug}/tracking/${c.trackingToken}`} target="_blank" rel="noopener noreferrer" className="cc-btn cc-btn-sm h-10 sm:h-8 w-fit" aria-label={t("Voir le suivi de la commande {0}", c.numero)}>
                      {t("Voir le suivi")} <ExternalLink size={11} aria-hidden />
                    </a>
                  ) : <span />}
                </li>
              );
            })}
          </ul>
        )}
      </Carte>

      {/* Tous les livreurs : recherche, filtres retirables, pagination */}
      <section id="tous" className="space-y-2.5 scroll-mt-20">
        <h2 className="cc-h2 flex items-center gap-2"><Truck size={15} className="cc-warn" aria-hidden />{t("Tous les livreurs")}</h2>
        <form className="flex gap-2 max-w-md" role="search" action="/admin/livreurs#tous">
          {statut && <input type="hidden" name="statut" value={statut} />}
          <label className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 cc-faint" aria-hidden />
            <input name="q" defaultValue={q} placeholder={t("Nom, e-mail, téléphone, zone ou boutique…")} aria-label={t("Rechercher un livreur")} className="cc-input w-full pl-8 h-10 sm:h-8" />
          </label>
          <button className="cc-btn h-10 sm:h-8">{t("Rechercher")}</button>
        </form>
        <nav className="flex flex-wrap items-center gap-1.5" aria-label={t("Filtrer par statut")}>
          <Link href={url({ statut: null, page: 1 })} className="cc-btn cc-btn-sm" aria-current={!statut ? "true" : undefined} style={!statut ? { borderColor: "var(--cc-accent)", color: "var(--cc-accent-text)" } : undefined}>
            {t("Tous")} <span className="cc-faint cc-num">{livreurs.length}</span>
          </Link>
          {(Object.keys(FILTRES) as Filtre[]).map((f) => (
            <Link key={f} href={url({ statut: f, page: 1 })} className="cc-btn cc-btn-sm" aria-current={statut === f ? "true" : undefined} style={statut === f ? { borderColor: "var(--cc-accent)", color: "var(--cc-accent-text)" } : undefined}>
              {t(FILTRES[f])} <span className="cc-faint cc-num">{compte[f]}</span>
            </Link>
          ))}
        </nav>
        {(q || statut) && (
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="cc-faint">{t("Filtré :")}</span>
            {q && <Link href={url({ q: null, page: 1 })} className="cc-badge cc-badge-accent" aria-label={t("Retirer la recherche « {0} »", q)}>« {q} » <X size={11} aria-hidden /></Link>}
            {statut && <Link href={url({ statut: null, page: 1 })} className="cc-badge cc-badge-accent" aria-label={t("Retirer le filtre {0}", t(FILTRES[statut]))}>{t(FILTRES[statut])} <X size={11} aria-hidden /></Link>}
            <Link href="/admin/livreurs#tous" className="underline cc-muted">{t("Tout effacer")}</Link>
          </div>
        )}

        <Carte pad={false}>
          {!tranche.length ? (
            <EtatVide
              titre={q || statut ? t("Aucun livreur ne correspond à ces filtres.") : t("Aucun livreur inscrit pour l'instant.")}
              explication={q || statut ? t("Vérifiez l'orthographe ou retirez un filtre.") : t("Les livreurs apparaissent ici dès leur inscription ou leur ajout par une boutique.")}
              action={q || statut ? <Link href="/admin/livreurs#tous" className="cc-btn cc-btn-sm">{t("Voir tous les livreurs")}</Link> : undefined}
            />
          ) : (
            <>
              <ul className="md:hidden divide-y cc-sep">
                {tranche.map(l => {
                  const e = etat(l);
                  const nbEchec = nbEchecs.get(l.id) ?? 0;
                  return (
                    <li key={l.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-[13px]">{l.nom}</p>
                          <p className="text-[11.5px] cc-faint [overflow-wrap:anywhere]">{l.user.email}</p>
                        </div>
                        <Badge ton={e.ton}>{t(e.nom)}</Badge>
                      </div>
                      <dl className="grid grid-cols-3 gap-2 text-[12px]">
                        <div><dt className="cc-faint">{t("Livrées")}</dt><dd className="cc-num">{nbLivrees.get(l.id) ?? 0}</dd></div>
                        <div><dt className="cc-faint">{t("Échecs")}</dt><dd className={`cc-num ${nbEchec ? "cc-bad" : ""}`}>{nbEchec}</dd></div>
                        <div><dt className="cc-faint">{t("Véhicule")}</dt><dd>{t(vehicule(l).label)}</dd></div>
                      </dl>
                      <p className="flex flex-wrap items-center gap-2 text-[12px]">
                        <a href={`tel:${l.telephone}`} className="font-mono cc-muted hover:underline">{l.telephone}</a>
                        {rattachement(l)} {dispo(l)} {position(l)}
                      </p>
                      <p className="text-[11.5px] cc-faint">{l.zone ? `${l.zone} · ` : ""}{t("Inscrit le")} {formatDate(l.createdAt)}</p>
                      {boutonActif(l)}
                    </li>
                  );
                })}
              </ul>
              <div className="hidden md:block overflow-x-auto">
                <table className="cc-table">
                  <thead>
                    <tr>
                      {["Livreur", "Téléphone", "Véhicule", "Zone", "Rattachement", "Livrées", "Échecs", "Position", "Statut", "Inscrit le"].map((h, i) => (
                        <th key={h} className={i === 5 || i === 6 ? "r" : ""}>{t(h)}</th>
                      ))}
                      <th><span className="sr-only">{t("Actions")}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tranche.map(l => {
                      const V = vehicule(l);
                      const e = etat(l);
                      const nbEchec = nbEchecs.get(l.id) ?? 0;
                      return (
                        <tr key={l.id}>
                          <td><p className="font-medium">{l.nom}</p><p className="text-[11px] cc-faint">{l.user.email}</p></td>
                          <td className="font-mono text-[12px] cc-muted">{l.telephone}</td>
                          <td className="cc-muted"><span className="inline-flex items-center gap-1.5"><V.icon size={13} aria-hidden />{t(V.label)}</span></td>
                          <td className="cc-muted">{l.zone || "—"}</td>
                          <td>{rattachement(l)}</td>
                          <td className="r cc-num">{nbLivrees.get(l.id) ?? 0}</td>
                          <td className={`r cc-num ${nbEchec ? "cc-bad" : "cc-faint"}`}>{nbEchec}</td>
                          <td>{position(l)}</td>
                          <td><div className="flex flex-col gap-1 items-start"><Badge ton={e.ton}>{t(e.nom)}</Badge>{dispo(l)}</div></td>
                          <td className="cc-faint">{formatDate(l.createdAt)}</td>
                          <td>{boutonActif(l)}</td>
                        </tr>
                      );
                    })}
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
      </section>
    </div>
  );
}
