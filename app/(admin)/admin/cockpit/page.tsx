// Cockpit : la vue immersive du Command Center. Mêmes données, filtres et droits que les autres pages.
import Link from "next/link";
import { contexteCC, analyser } from "@/lib/command-center/serveur";
import { donneesCockpit } from "@/lib/command-center/cockpit";
import { CENTROIDE, statsPays } from "@/lib/command-center/geographie";
import { scoreAxso } from "@/lib/command-center/insights";
import { mesurer } from "@/lib/command-center/moteur";
import { lien } from "@/lib/command-center/contexte";
import { formats } from "@/lib/command-center/format";
import { peutVoir, sectionDe } from "@/lib/command-center/rbac";
import { getT } from "@/lib/i18n/serveur";
import { Carte, EnTetePage, Fraicheur, GrilleKpi, Kpi, Note } from "@/components/command-center/ui";
import { Barres, Courbes } from "@/components/command-center/graphiques";
import { Anneau, Cohortes, Entonnoir, ExportCsv, GlobeCockpit, Heatmap, Radar, Relief3D, Sankey, Treemap, type PointGlobe } from "@/components/command-center/Cockpit3D";

const KPIS = ["gmv", "commandes", "marchands_actifs", "nouveaux_marchands", "mrr", "churn"];

export default async function CockpitPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const c = await contexteCC("cc", searchParams);
  const t = await getT();
  const { formatValeur, dateCourte } = formats(t);
  const { vue: v, fen: f, filtres, session, reglages } = c;
  // Le GMV relève de sa section : un rôle qui ne la voit pas n'en reçoit aucune valeur, même dans le navigateur.
  const argent = peutVoir(session.role, sectionDe(mesurer(v, "gmv", f.cur, f.cur, 1).page));
  const d = donneesCockpit(v, f.cur, { argent });
  const a = analyser(c, t);
  const score = scoreAxso(v, f, a.stats, reglages.poids_sante, t);
  const kpis = KPIS.filter((id) => peutVoir(session.role, sectionDe(mesurer(v, id, f.cur, f.cur, 1).page)));
  const pays = statsPays(v, f);
  const points: PointGlobe[] = pays.filter((p) => CENTROIDE[p.pays]).map((p) => ({
    iso: p.pays, nom: p.nom, lat: CENTROIDE[p.pays][0], lng: CENTROIDE[p.pays][1], marchands: p.marchands, commandes: p.commandes,
    gmv: argent ? p.gmv : null, lien: lien("/admin/cockpit", filtres, { pays: p.pays }),
  }));
  const serie = d.jours.map((j) => ({ x: dateCourte(j.t), commandes: j.commandes, annulees: j.annulees, gmv: j.gmv }));
  const csv: (string | number)[][] = [["Pays", "Marchands", "Actifs", "Commandes", ...(argent ? ["GMV"] : [])], ...pays.map((p) => [p.nom, p.marchands, p.actifs, p.commandes, ...(argent ? [p.gmv] : [])])];
  const tauxPaiement = d.total ? Math.round((d.payees / d.total) * 100) : null;

  return <div className="space-y-4 ccx">
    <EnTetePage eyebrow="Axso Command Center" titre={t("Cockpit")} sousTitre={<>{t("Tout l'écosystème en une vue")} · <span className="cc-faint">{t(f.libelle)}{filtres.pays ? ` · ${filtres.pays}` : ""}</span></>}
      actions={<><Fraicheur genereA={c.ds.genereA} source={c.ds.source} erreur={c.erreur} /><ExportCsv nom="axso-pays" lignes={csv} />{filtres.pays && <Link className="cc-btn cc-btn-sm" href={lien("/admin/cockpit", filtres, { pays: null })}>{t("Tous les pays")}</Link>}</>} />
    {c.erreur && <Note ton="warn">{t(c.erreur)}</Note>}

    <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
      <Carte titre={t("Globe de l'activité")} sousTitre={t("Glissez pour tourner, Ctrl + molette pour zoomer, cliquez sur un pays pour filtrer")} pad={false}><GlobeCockpit points={points} argent={argent} /></Carte>
      <Carte titre={t("Relief de l'activité")} sousTitre={t("Commandes par jour et par heure, heure de Douala")}><Relief3D grille={d.heatmap} /></Carte>
    </div>

    {kpis.length > 0 && <GrilleKpi colonnes={6}>{kpis.map((id) => <Kpi key={id} m={mesurer(v, id, f.cur, f.prev, 12)} filtres={filtres} libelleComp={t(f.libelleComp)} />)}</GrilleKpi>}

    <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
      <Carte titre={t("Parcours des commandes")} sousTitre={t("Du canal au statut final · survolez un nœud")}><Sankey noeuds={d.flux.noeuds} liens={d.flux.liens} /></Carte>
      <Carte titre={t("Santé d'Axso")} sousTitre={score.global != null ? t("Score global : {0}/100", String(score.global)) : undefined}><Radar axes={score.sous.map((s) => ({ nom: s.nom, score: s.score }))} /></Carte>
    </div>

    <div className="grid gap-3 lg:grid-cols-2">
      <Carte titre={t("Commandes par jour")} sousTitre={t("Total et annulations")}><Courbes format="nombre" hauteur={230} donnees={serie.map(({ x, commandes, annulees }) => ({ x, commandes, annulees }))} series={[{ cle: "commandes", nom: t("Commandes") }, { cle: "annulees", nom: t("Annulées ou échouées") }]} /></Carte>
      {argent ? <Carte titre={t("GMV par jour")} sousTitre={t("Commandes payées")}><Barres format="xaf" hauteur={230} donnees={serie.map(({ x, gmv }) => ({ x, gmv }))} series={[{ cle: "gmv", nom: "GMV", couleur: "#EBA900" }]} /></Carte>
        : <Carte titre={t("Carte de chaleur")} sousTitre={t("Commandes par jour et par heure")}><Heatmap grille={d.heatmap} /></Carte>}
    </div>

    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
      <Carte titre={t("Entonnoir d'activation")} sousTitre={t("De l'inscription au premier paiement")}><Entonnoir etapes={d.entonnoir} /></Carte>
      <Carte titre={t("Répartition par forfait")}><Anneau items={d.plans} /></Carte>
      <Carte titre={t("Logistique")} sousTitre={d.delaiMoyenH != null ? t("Délai moyen : {0} h", d.delaiMoyenH.toFixed(1)) : t("Délai moyen indisponible")}><Anneau items={d.logistique} /></Carte>
    </div>

    <div className="grid gap-3 xl:grid-cols-[1fr_1.35fr]">
      <Carte titre={t("Secteurs")} sousTitre={argent ? t("Part du GMV payé") : t("Part des commandes payées")}><Treemap items={d.industries} argent={argent} /></Carte>
      <Carte titre={t("Rétention par cohorte")} sousTitre={t("Part des marchands avec une vente payée, mois après mois")}><Cohortes lignes={d.cohortes} /></Carte>
    </div>

    <div className="grid gap-3 lg:grid-cols-3">
      <Carte titre={t("Taux de paiement")}><p className="text-[38px] leading-none font-semibold cc-num">{tauxPaiement == null ? "—" : `${tauxPaiement} %`}</p><p className="cc-faint text-[12px] mt-2">{t("{0} commandes payées sur {1}", String(d.payees), String(d.total))}</p></Carte>
      <Carte titre={t("Concentration")}><p className="text-[38px] leading-none font-semibold cc-num">{d.concentration ? `${Math.round(d.concentration.part * 100)} %` : "—"}</p><p className="cc-faint text-[12px] mt-2">{d.concentration ? t("du volume vient de {0} marchand(s) sur {1}", String(d.concentration.top), String(d.concentration.total)) : t("Pas encore de vente sur la période")}</p></Carte>
      <Carte titre={t("Premier marché")}><p className="text-[30px] leading-tight font-semibold">{pays[0]?.nom ?? "—"}</p><p className="cc-faint text-[12px] mt-2">{pays[0] ? `${pays[0].marchands} ${t("marchands")} · ${pays[0].commandes} ${t("commandes")}${argent ? ` · ${formatValeur(pays[0].gmv, "xaf")}` : ""}` : ""}</p></Carte>
    </div>
  </div>;
}
