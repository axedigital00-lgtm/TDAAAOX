// Sections du Tableau de bord (/dashboard/accueil), dans l'ordre de la page. Composants serveur :
// les données arrivent déjà calculées par la page (aucun chiffre sans source).
import Link from "next/link";
import {
  ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronRight, Clock, Globe, MapPin, MessageCircle,
  Package, PackageX, RotateCcw, ShieldCheck, ShoppingBag, Truck, Users, Wallet, ArrowUpFromLine,
} from "lucide-react";
import { getT } from "@/lib/i18n/serveur";
import { dateRelative } from "@/lib/utils";
import { LIBELLES_PERIODE, PERIODES, type Periode } from "@/lib/tableau-de-bord";
import { BoutonQrBoutique } from "@/components/dashboard/BoutonQrBoutique";
import { BoutonPublier } from "@/components/dashboard/BoutonPublier";
import { Badge, Bouton, EtatVide, classesBouton } from "@/components/ui";
import { CopierLien } from "./CopierLien";

type Montant = (v: number) => string;

const titre = "ax-titre-section";
const sousTitre = "ax-aide mt-0.5";
const lienSection = "inline-flex min-h-10 items-center gap-0.5 rounded-controle text-sm font-semibold text-encre hover:underline whitespace-nowrap";

/* ── 1. Barre d'état + période ──────────────────────────────────────────── */

export async function BarreEtat({ statut, url, nomBoutique }: { statut: string; url: string | null; nomBoutique: string }) {
  const t = await getT();
  const enLigne = statut === "active";
  const etat = enLigne ? { label: "En ligne", ton: "succes" as const }
    : statut === "suspendu" ? { label: "Suspendue", ton: "erreur" as const }
    : { label: "Non publiée", ton: "attention" as const };
  return (
    <div className="rounded-carte bg-secondaire text-white px-4 py-4 sm:px-5 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Badge ton={etat.ton} className="flex-shrink-0">{t(etat.label)}</Badge>
        {url && <span className="text-sm text-white/80 truncate" title={url}>{url.replace(/^https?:\/\//, "")}</span>}
      </div>
      {url && (
        <div className="flex items-center gap-2 flex-wrap">
          <CopierLien url={url} />
          <BoutonQrBoutique url={url} nomBoutique={nomBoutique} />
          {statut === "brouillon"
            ? <BoutonPublier variante="compact" />
            : enLigne && (
              <a href={url} target="_blank" rel="noopener noreferrer" className={classesBouton({ variante: "primaire", taille: "compact" })}>
                <Globe className="size-3.5" aria-hidden />{t("Voir ma boutique")}<ArrowUpRight className="size-3" aria-hidden />
              </a>
            )}
        </div>
      )}
    </div>
  );
}

export async function SelecteurPeriode({ periode }: { periode: Periode }) {
  const t = await getT();
  return (
    <nav aria-label={t("Période")} className="flex gap-1 p-1 rounded-controle bg-carte-2 border border-bordure w-full sm:w-auto">
      {PERIODES.map((p) => (
        <Link key={p} href={`/dashboard/accueil?periode=${p}`} scroll={false} aria-current={p === periode ? "page" : undefined}
          className={`flex-1 sm:flex-none inline-flex min-h-10 items-center justify-center whitespace-nowrap text-sm font-semibold rounded-controle px-2.5 sm:px-3.5 transition-colors ${
            p === periode ? "bg-carte text-encre shadow-sm" : "text-doux hover:text-encre"}`}>
          {t(LIBELLES_PERIODE[p])}
        </Link>
      ))}
    </nav>
  );
}

/* ── 2. Indicateurs clés ────────────────────────────────────────────────── */

const COMPARAISON: Record<Periode, string> = {
  jour: "vs hier à la même heure", "7j": "vs les 7 jours d'avant", "30j": "vs les 30 jours d'avant", mois: "vs le mois dernier à la même date",
};

async function Evolution({ v, periode }: { v: number | null; periode: Periode }) {
  const t = await getT();
  if (v === null) return <p className="ax-aide">{t("Pas de comparaison possible")}</p>;
  const haut = v >= 0;
  return (
    <p className="flex flex-wrap items-center gap-1 ax-aide">
      <Badge ton={haut ? "succes" : "erreur"} icone={haut ? <ArrowUpRight aria-hidden /> : <ArrowDownRight aria-hidden />}>
        {v > 0 ? "+" : ""}{v} %
      </Badge>
      {t(COMPARAISON[periode])}
    </p>
  );
}

export interface CarteIndicateur { cle: string; label: string; valeur: string; evolution: number | null; aide?: string }

export async function Indicateurs({ cartes, periode }: { cartes: CarteIndicateur[]; periode: Periode }) {
  const t = await getT();
  const [principale, ...autres] = cartes;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      <div className="col-span-2 rounded-carte border border-attention-bordure bg-primaire-fond shadow-carte p-5">
        <p className="ax-label flex items-center gap-1.5"><ShoppingBag className="size-3.5 text-primaire" aria-hidden />{t(principale.label)}</p>
        <p className="text-[40px] font-black text-encre leading-none tabular-nums tracking-tight mt-3 mb-2">{principale.valeur}</p>
        <Evolution v={principale.evolution} periode={periode} />
      </div>
      {autres.map((c) => (
        <div key={c.cle} className="ax-card p-4 min-w-0">
          <p className="ax-label">{t(c.label)}</p>
          <p className="text-[20px] sm:text-[22px] font-extrabold text-encre leading-tight tabular-nums tracking-tight mt-2 mb-1.5 break-words">{c.valeur}</p>
          {c.aide ? <p className="ax-aide">{t(c.aide)}</p> : <Evolution v={c.evolution} periode={periode} />}
        </div>
      ))}
    </div>
  );
}

/* ── 3. À traiter maintenant ────────────────────────────────────────────── */

export interface LigneATraiter { cle: string; nombre: number; label: string; href: string; action: string }
const ICONES_A_TRAITER: Record<string, any> = { confirmer: Clock, expedier: Truck, retours: RotateCcw, ruptures: PackageX, faible: Package, messages: MessageCircle };

export async function ATraiter({ lignes }: { lignes: LigneATraiter[] }) {
  const t = await getT();
  const actives = lignes.filter((l) => l.nombre > 0);
  return (
    <section className="ax-card p-5" aria-labelledby="a-traiter">
      <h2 id="a-traiter" className={titre}>{t("À traiter maintenant")}</h2>
      {actives.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-succes">
          <CheckCircle2 className="size-4" aria-hidden />{t("Rien à traiter, tout est à jour.")}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-bordure">
          {actives.map((l) => {
            const Icone = ICONES_A_TRAITER[l.cle] ?? Clock;
            return (
              <li key={l.cle}>
                <Link href={l.href} className="flex min-h-12 items-center gap-3 py-3 group">
                  <span className="w-9 h-9 rounded-controle bg-attention-fond flex items-center justify-center flex-shrink-0" aria-hidden>
                    <Icone className="size-4 text-attention" />
                  </span>
                  <span className="text-xl font-extrabold text-encre tabular-nums w-10 text-center flex-shrink-0">{l.nombre}</span>
                  <span className="flex-1 min-w-0 text-sm text-encre">{t(l.label)}</span>
                  <span className="flex items-center gap-0.5 text-sm font-semibold text-encre whitespace-nowrap group-hover:underline">
                    <span className="hidden sm:inline">{t(l.action)}</span><ChevronRight className="size-4" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ── 4. Ventes en cours ─────────────────────────────────────────────────── */

export interface GroupeEnCours {
  statut: string; nb: number; total: number;
  commandes: { id: string; numero: string; clientNom: string; montantTotal: number; payee: boolean }[];
}
const LIBELLE_STATUT: Record<string, string> = { confirmee: "Confirmées", en_preparation: "En préparation", expediee: "En livraison" }; // même libellé que commandes/statuts.ts

export async function VentesEnCours({ groupes, montant }: { groupes: GroupeEnCours[]; montant: Montant }) {
  const t = await getT();
  const nb = groupes.reduce((s, g) => s + g.nb, 0);
  const total = groupes.reduce((s, g) => s + g.total, 0);
  return (
    <section className="ax-card p-5" aria-labelledby="ventes-en-cours">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="ventes-en-cours" className={titre}>{t("Ventes en cours")}</h2>
          <p className={sousTitre}>{t("Commandes confirmées, pas encore livrées.")}</p>
        </div>
        {nb > 0 && <p className="ax-texte-secondaire">{t("{0} commande(s) · {1}", nb, montant(total))}</p>}
      </div>
      {nb === 0 ? (
        <EtatVide compact className="mt-4" icone={<Truck />} titre={t("Aucune vente en cours")}
          texte={t("Les commandes confirmées apparaîtront ici jusqu'à leur livraison.")}>
          <Bouton variante="secondaire" taille="compact" href="/dashboard/commandes">{t("Voir les commandes")}</Bouton>
        </EtatVide>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {groupes.map((g) => (
            <div key={g.statut} className="rounded-carte border border-bordure p-3.5 min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-encre">{t(LIBELLE_STATUT[g.statut])} <span className="text-doux font-normal">· {g.nb}</span></p>
                <p className="text-sm font-bold text-encre tabular-nums">{montant(g.total)}</p>
              </div>
              {g.nb === 0 ? <p className="ax-aide">{t("Aucune")}</p> : (
                <ul className="space-y-1">
                  {g.commandes.map((c) => (
                    <li key={c.id}>
                      <Link href={`/dashboard/commandes/${c.id}`} className="flex min-h-10 items-center gap-2 rounded-controle px-1.5 py-1.5 -mx-1.5 hover:bg-carte-2">
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-encre truncate">{c.clientNom}</span>
                          <span className="block text-xs text-doux font-mono">{c.numero}</span>
                        </span>
                        <span className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          <span className="text-sm font-semibold tabular-nums">{montant(c.montantTotal)}</span>
                          <Badge ton={c.payee ? "succes" : "attention"}>{c.payee ? t("Payée") : t("À encaisser")}</Badge>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {g.nb > g.commandes.length && (
                <Link href={`/dashboard/commandes?statut=${g.statut}`} className={`mt-2 ${lienSection}`}>
                  {t("Voir les {0}", g.nb)}<ChevronRight className="size-3.5" aria-hidden />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
      {nb > 0 && <p className="mt-3 ax-aide">{t("« À encaisser » : paiement à la livraison, compté comme payé une fois la commande livrée.")}</p>}
    </section>
  );
}

/* ── 6. Derniers clients ────────────────────────────────────────────────── */

export interface ClientRecent { id: string; nom: string; ville: string | null; totalCommandes: number; totalDepense: number; derniere: Date; whatsapp: string | null }

export async function DerniersClients({ clients, montant }: { clients: ClientRecent[]; montant: Montant }) {
  const t = await getT();
  return (
    <section className="ax-card overflow-hidden" aria-labelledby="derniers-clients">
      <div className="px-5 pt-5 pb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="derniers-clients" className={titre}>{t("Derniers clients")}</h2>
          <p className={sousTitre}>{t("Les 20 clients qui ont commandé le plus récemment.")}</p>
        </div>
        <Link href="/dashboard/clients" className={lienSection}>{t("Voir tous les clients")}</Link>
      </div>
      {clients.length === 0 ? (
        <div className="px-5 pb-5">
          <EtatVide compact icone={<Users />} titre={t("Aucun client pour l'instant")}
            texte={t("Ils apparaîtront ici dès leur première commande.")} />
        </div>
      ) : (
        <ul className="divide-y divide-bordure">
          {clients.map((c) => (
            <li key={c.id} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0 grid sm:grid-cols-[1.4fr_1fr_0.8fr_1fr_1fr] sm:items-center gap-x-3">
                <p className="text-sm font-semibold text-encre truncate">{c.nom}</p>
                <p className="text-xs text-doux truncate">
                  {c.ville || t("Ville inconnue")}
                  <span className="sm:hidden"> · {t("{0} commande(s)", c.totalCommandes)} · {montant(c.totalDepense)}</span>
                </p>
                <p className="hidden sm:block text-sm text-doux tabular-nums">{t("{0} commande(s)", c.totalCommandes)}</p>
                <p className="hidden sm:block text-sm font-semibold text-encre tabular-nums">{montant(c.totalDepense)}</p>
                <p className="text-xs text-doux">{t(dateRelative(c.derniere))}</p>
              </div>
              {c.whatsapp ? (
                <a href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label={t("Écrire à {0} sur WhatsApp", c.nom)}
                  className="w-10 h-10 rounded-controle flex items-center justify-center flex-shrink-0 bg-succes-fond text-succes hover:brightness-95">
                  <MessageCircle className="size-4" aria-hidden />
                </a>
              ) : <span className="w-10 flex-shrink-0" />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── 7. Top produits + villes ───────────────────────────────────────────── */

export async function TopProduitsVilles({ produits, villes, montant }: {
  produits: { nom: string; qte: number; revenu: number; img: string | null }[];
  villes: { ville: string; nb: number }[];
  montant: Montant;
}) {
  const t = await getT();
  const maxVille = villes[0]?.nb ?? 1;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="ax-card p-5 lg:col-span-2" aria-labelledby="top-produits">
        <h2 id="top-produits" className={titre}>{t("Produits les plus vendus")}</h2>
        <p className={sousTitre}>{t("Commandes payées sur la période.")}</p>
        {produits.length === 0 ? <p className="mt-4 ax-texte-secondaire">{t("Aucune vente payée sur cette période.")}</p> : (
          <ol className="mt-4 space-y-3">
            {produits.map((p, i) => (
              <li key={p.nom + i} className="flex items-center gap-3">
                {p.img ? <img src={p.img} alt="" className="w-9 h-9 rounded-controle object-cover flex-shrink-0 border border-bordure" />
                  : <span className="w-9 h-9 rounded-controle bg-carte-2 flex items-center justify-center text-sm font-bold text-doux flex-shrink-0">{i + 1}</span>}
                <span className="flex-1 min-w-0 text-sm text-encre truncate">{p.nom}</span>
                <span className="text-right flex-shrink-0">
                  <span className="block text-sm font-bold tabular-nums">{montant(p.revenu)}</span>
                  <span className="block text-xs text-doux">{t("{0} vendu(s)", p.qte)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section className="ax-card p-5" aria-labelledby="top-villes">
        <h2 id="top-villes" className={`${titre} flex items-center gap-1.5`}><MapPin className="size-4 text-doux" aria-hidden />{t("Villes principales")}</h2>
        <p className={sousTitre}>{t("Nombre de commandes sur la période.")}</p>
        {villes.length === 0 ? <p className="mt-4 ax-texte-secondaire">{t("Aucune commande sur cette période.")}</p> : (
          <ul className="mt-4 space-y-3">
            {villes.map((v, i) => (
              <li key={v.ville + i}>
                <div className="flex justify-between gap-2 mb-1">
                  <span className="text-sm text-encre truncate">{v.ville || t("Ville inconnue")}</span>
                  <span className="text-sm font-bold tabular-nums">{v.nb}</span>
                </div>
                <div className="h-1.5 bg-carte-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${i === 0 ? "bg-primaire" : "bg-bordure-forte"}`} style={{ width: `${Math.round((v.nb / maxVille) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ── 8. Mon argent ──────────────────────────────────────────────────────── */

export async function MonArgent({ disponible, enAttente, prochaineLiberation, montant, indisponible }: {
  disponible: number; enAttente: number; prochaineLiberation: Date | null; montant: Montant;
  /** Le solde n'a pas pu être lu : on n'affiche pas 0 à la place d'un vrai montant. */
  indisponible?: boolean;
}) {
  const t = await getT();
  const valeur = (v: number) => (indisponible ? "—" : montant(v));
  return (
    <section className="ax-card p-5" aria-labelledby="mon-argent">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h2 id="mon-argent" className="ax-label flex items-center gap-1.5"><Wallet className="size-3.5 text-primaire" aria-hidden />{t("Mon argent · Disponible")}</h2>
            <p className="text-[26px] font-black text-encre tabular-nums leading-tight mt-1">{valeur(disponible)}</p>
            <p className="ax-aide">{indisponible ? t("Solde momentanément indisponible. Ouvre Mon argent pour le voir.") : t("Tu peux le retirer maintenant.")}</p>
          </div>
          <div>
            <p className="ax-label flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-info" aria-hidden />{t("En attente (séquestre)")}</p>
            <p className="text-[20px] font-extrabold text-doux tabular-nums leading-tight mt-1.5">{valeur(enAttente)}</p>
            <p className="ax-aide">
              {prochaineLiberation
                ? t("Prochaine libération le {0}.", prochaineLiberation.toLocaleString(t.loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))
                : t("Chaque vente payée en ligne reste 48 h en attente.")}
            </p>
          </div>
        </div>
        <Bouton variante="sombre" href="/dashboard/wallet?retrait=1" icone={<ArrowUpFromLine className="size-4" aria-hidden />}>
          {t("Retirer mon argent")}
        </Bouton>
      </div>
    </section>
  );
}
