// Haut de l'accueil du Command Center : inscriptions, nouveaux marchands, chiffre d'affaires.
// Données réelles uniquement (agrégats Prisma + moteur du Command Center sur le jeu réel).
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Search, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PLATFORM_TENANT_SLUG } from "@/lib/wallet";
import { promoEnCours } from "@/lib/promo";
import type { T } from "@/lib/i18n";
import { chargerDataset, type ContexteCC } from "@/lib/command-center/serveur";
import { Vue, mesurer, METRIQUE } from "@/lib/command-center/moteur";
import { normPays } from "@/lib/command-center/reel";
import { nomPays, NOM_PLAN } from "@/lib/command-center/types";
import { formats } from "@/lib/command-center/format";
import { lien, avecQs } from "@/lib/command-center/contexte";
import { peutVoir } from "@/lib/command-center/rbac";
import { periodesCA, debutInscription, etatPlan, repartitionPlans, PERIODES_INSCRIPTION, ETATS_PLAN, type EtatPlan, type PeriodeInscription, type PeriodeCA } from "@/lib/command-center/accueil";
import { Carte, Badge, Delta, Progression, EtatVide, Note, Onglets, type Ton } from "@/components/command-center/ui";

const BASE = { slug: { not: PLATFORM_TENANT_SLUG }, statut: { not: "systeme" } } satisfies Prisma.TenantWhereInput;
const PAYANTS = ["palier1", "palier2"];
const TON_PLAN: Record<EtatPlan, Ton> = { essentiel: "neutre", pro: "info", illimite: "violet", essai: "warn" };

export async function AccueilDirect({ c, tx, sp }: { c: ContexteCC; tx: T; sp: Record<string, string | string[] | undefined> }) {
  const { formatValeur, dateCourte, ilYa } = formats(tx);
  const un = (k: string) => { const v = sp[k]; return (Array.isArray(v) ? v[0] : v)?.trim() || ""; };
  const insc: PeriodeInscription = PERIODES_INSCRIPTION.includes(un("insc") as PeriodeInscription) ? (un("insc") as PeriodeInscription) : "tout";
  const q = un("q").slice(0, 60);
  const role = c.session.role;
  const voirCA = peutVoir(role, "revenus");
  // Téléphones = données personnelles : seulement aux rôles qui ont accès aux fiches boutiques.
  const voirContacts = peutVoir(role, "boutiques");

  const now = new Date(), t = now.getTime();
  const depuis = (p: PeriodeInscription) => { const d = debutInscription(p, t); return d == null ? {} : { createdAt: { gte: new Date(d) } }; };
  const champs: Prisma.TenantWhereInput[] = ["nomBoutique", "categorie", "description", "pays", ...(voirContacts ? ["whatsapp"] : [])].map((k) => ({ [k]: { contains: q, mode: "insensitive" } }));

  const [boutiques, comptes, payes, essais, recents, vueCA] = await Promise.all([
    Promise.all(PERIODES_INSCRIPTION.map((p) => prisma.tenant.count({ where: { ...BASE, ...depuis(p) } }))),
    Promise.all(PERIODES_INSCRIPTION.map((p) => prisma.user.count({ where: { ...depuis(p), boutiques: { some: { tenant: BASE } } } }))),
    prisma.tenant.groupBy({ by: ["planType"], where: { ...BASE, ...depuis(insc), planType: { in: PAYANTS }, planExpiresAt: { gt: now } }, _count: { _all: true } }),
    prisma.tenant.count({ where: { ...BASE, ...depuis(insc), essaiFinLe: { gt: now }, NOT: { planType: { in: PAYANTS }, planExpiresAt: { gt: now } } } }),
    prisma.tenant.findMany({
      where: { ...BASE, ...(q && { OR: champs }) }, orderBy: { createdAt: "desc" }, take: 20,
      select: { id: true, nomBoutique: true, pays: true, categorie: true, description: true, whatsapp: true, whatsappNumero: true, telephone: true, createdAt: true, planType: true, planExpiresAt: true, essaiFinLe: true },
    }),
    // CA toujours sur le jeu RÉEL et sans segment (le haut de page vaut pour tout Axso).
    !voirCA ? null : c.ds.source === "reel" && !c.vue.filtreActif() ? c.vue : chargerDataset("reel").then((r) => new Vue(r.ds)),
  ]);

  const total = boutiques[PERIODES_INSCRIPTION.indexOf(insc)];
  const rep = repartitionPlans(total, payes.map((x) => ({ planType: x.planType, n: x._count._all })), essais);
  const promo = promoEnCours(c.reglages.promo.finLe, now);

  const NOM_PERIODE: Record<PeriodeInscription, string> = { jour: tx("Aujourd'hui"), "7j": tx("7 jours"), "30j": tx("30 jours"), tout: tx("Total") };
  const NOM_ETAT: Record<EtatPlan, string> = { essentiel: tx("Essentiel (gratuit)"), pro: tx("{0} · payé", NOM_PLAN.palier1), illimite: tx("{0} · payé", NOM_PLAN.palier2), essai: tx("Essai Illimité 7 j") };
  const NOM_CA: Record<PeriodeCA, [string, string]> = {
    jour: [tx("Aujourd'hui"), tx("vs hier à la même heure")], semaine: [tx("Cette semaine"), tx("vs même moment la semaine dernière")],
    mois: [tx("Ce mois"), tx("vs même moment le mois dernier")], annee: [tx("Cette année"), tx("vs même moment l'an dernier")],
  };
  const hrefInsc = (p: PeriodeInscription) => avecQs(lien("/admin#inscriptions", c.filtres), `?insc=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`);
  const tel = (r: (typeof recents)[number]) => r.whatsapp || r.whatsappNumero || r.telephone || "";
  const vendu = (r: (typeof recents)[number]) => [r.categorie, r.description].filter(Boolean).join(" — ");

  const lignes = recents.map((r) => ({
    ...r, etat: etatPlan(r, now), paysNom: nomPays(normPays(r.pays)), tel: voirContacts ? tel(r) : "",
    nom: voirContacts ? <Link href={`/admin/boutiques/${r.id}`} className="font-medium hover:underline">{r.nomBoutique}</Link> : <span className="font-medium">{r.nomBoutique}</span>,
  }));
  const Tel = ({ n }: { n: string }) => !n ? <span className="cc-faint">—</span> : (
    <a href={`https://wa.me/${n.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 cc-num whitespace-nowrap hover:underline"><MessageCircle size={12} aria-hidden />{n}</a>
  );

  return (
    <>
      <div className="grid gap-3 xl:grid-cols-2">
        <Carte id="inscriptions" titre={tx("Inscriptions")} sousTitre={tx("Boutiques créées sur Axso (hors boutiques internes) et comptes marchands qui les possèdent")}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PERIODES_INSCRIPTION.map((p, i) => (
              <div key={p} className="rounded-lg p-2.5" style={{ background: "var(--cc-surface-2)" }}>
                <p className="cc-faint text-[11px]">{NOM_PERIODE[p]}</p>
                <p className="text-[24px] leading-tight font-semibold cc-num">{formatValeur(boutiques[i], "nombre", true)}</p>
                <p className="cc-faint text-[11px]">{tx(boutiques[i] > 1 ? "boutiques" : "boutique")} · {tx(comptes[i] > 1 ? "{0} comptes" : "{0} compte", formatValeur(comptes[i], "nombre", true))}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t cc-sep">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="cc-eyebrow">{tx("Répartition par plan")} · {NOM_PERIODE[insc]}</p>
              <Onglets actif={insc} onglets={PERIODES_INSCRIPTION.map((p) => ({ id: p, nom: NOM_PERIODE[p], href: hrefInsc(p) }))} />
            </div>
            <ul className="space-y-2">
              {ETATS_PLAN.map((e) => (
                <li key={e}>
                  <div className="flex justify-between text-[12.5px] gap-2"><span>{NOM_ETAT[e]}</span><span className="cc-num"><strong>{rep[e]}</strong><span className="cc-faint"> · {total ? tx("{0} %", Math.round((rep[e] / total) * 100)) : "—"}</span></span></div>
                  <Progression valeur={total ? rep[e] / total : 0} />
                </li>
              ))}
            </ul>
            <p className="cc-faint text-[11px] mt-2">{tx("Payé = abonnement réglé et non échu sur la boutique. Essai = essai Illimité de 7 jours en cours, sans plan payé. Un plan échu retombe en Essentiel.")}</p>
            {promo && <div className="mt-2"><Note>{tx("Promo de lancement en cours jusqu'au {0} : toutes les boutiques profitent de l'Illimité pendant ce temps, quel que soit leur plan ci-dessus.", dateCourte(promo.getTime()))}</Note></div>}
          </div>
        </Carte>

        {vueCA ? (
          <Carte titre={tx("Chiffre d'affaires")} sousTitre={tx("Périodes calendaires à l'heure de Douala, données réelles de tout Axso")} actions={<Link href={lien("/admin/revenus", c.filtres)} className="cc-btn cc-btn-ghost cc-btn-sm">{tx("Détail")}</Link>}>
            {(["revenu", "gmv"] as const).map((id) => {
              const def = METRIQUE[id];
              return (
                <div key={id} className="mb-3 last:mb-0">
                  <p className="text-[13px] font-medium">{id === "revenu" ? tx("Revenu Axso") : tx("Ventes des boutiques (GMV)")}</p>
                  <p className="cc-faint text-[11.5px] mb-1.5">{tx(def.description)}.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {periodesCA(vueCA.maintenant).map((p) => {
                      const m = mesurer(vueCA, id, p.cur, p.prev, 0);
                      return (
                        <div key={p.id} className="rounded-lg p-2.5 min-w-0" style={{ background: "var(--cc-surface-2)" }}>
                          <p className="cc-faint text-[11px]">{NOM_CA[p.id][0]}</p>
                          <p className="text-[17px] leading-tight font-semibold cc-num truncate" title={formatValeur(m.valeur, "xaf", true)}>{formatValeur(m.valeur, "xaf")}</p>
                          <Delta variation={m.variation} format="xaf" petit />
                          <p className="cc-faint text-[10.5px] leading-snug">{NOM_CA[p.id][1]} · {formatValeur(m.precedente, "xaf")}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Carte>
        ) : null}
      </div>

      <Carte titre={tx("Nouveaux marchands")} sousTitre={q ? tx("{0} résultat(s) pour « {1} » (20 au plus)", recents.length, q) : tx("Les 20 inscriptions les plus récentes")} pad={false}
        actions={<form action="/admin#nouveaux" method="get" role="search" className="flex items-center gap-1.5">
          {insc !== "tout" && <input type="hidden" name="insc" value={insc} />}
          <input name="q" defaultValue={q} maxLength={60} placeholder={tx("Rechercher")} aria-label={tx("Rechercher une boutique")} className="cc-input w-[115px] sm:w-[200px]" />
          <button type="submit" className="cc-btn cc-btn-sm" aria-label={tx("Rechercher")}><Search size={13} aria-hidden /></button>
        </form>}>
        <div id="nouveaux" className="scroll-mt-20" />
        {!lignes.length ? <div className="px-4 pb-4"><EtatVide titre={q ? tx("Aucune boutique ne correspond") : tx("Aucune inscription pour l'instant")} /></div> : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="cc-table">
                <thead><tr><th>{tx("Boutique")}</th><th>{tx("Pays")}</th>{voirContacts && <th>{tx("WhatsApp")}</th>}<th>{tx("Ce qu'il vend")}</th><th>{tx("Inscription")}</th><th>{tx("Plan")}</th></tr></thead>
                <tbody>
                  {lignes.map((r) => (
                    <tr key={r.id}>
                      <td>{r.nom}</td>
                      <td className="whitespace-nowrap">{r.paysNom}</td>
                      {voirContacts && <td><Tel n={r.tel} /></td>}
                      <td className="max-w-[360px]"><span className="line-clamp-2 text-[12.5px]" title={vendu(r)}>{vendu(r) || "—"}</span></td>
                      <td className="whitespace-nowrap cc-num">{dateCourte(r.createdAt.getTime())} <span className="cc-faint text-[11px]">· {ilYa(r.createdAt.getTime(), t)}</span></td>
                      <td><Badge ton={TON_PLAN[r.etat]}>{NOM_ETAT[r.etat]}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="md:hidden divide-y cc-sep border-t cc-sep">
              {lignes.map((r) => (
                <li key={r.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-start justify-between gap-2"><span className="min-w-0 truncate">{r.nom}</span><Badge ton={TON_PLAN[r.etat]}>{NOM_ETAT[r.etat]}</Badge></div>
                  <p className="text-[12px] cc-muted">{r.paysNom} · {dateCourte(r.createdAt.getTime())} <span className="cc-faint">({ilYa(r.createdAt.getTime(), t)})</span></p>
                  {voirContacts && <p className="text-[12px]"><Tel n={r.tel} /></p>}
                  <p className="text-[12px] line-clamp-2">{vendu(r) || <span className="cc-faint">—</span>}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Carte>
    </>
  );
}
