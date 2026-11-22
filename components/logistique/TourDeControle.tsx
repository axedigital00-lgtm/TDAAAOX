"use client";
// Tour de contrôle AXSO : ce qui se passe, ce qui demande attention, ce qui a été fait.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Badge, Carte, EtatVide, GrilleKpi, Note } from "@/components/command-center/ui";
import { DOCUMENTS, STATUTS_COURSE, VERIFICATION } from "@/lib/logistique/libelles";
import { formatMontant } from "@/lib/utils";
import { JumeauNumerique } from "./JumeauNumerique";
import { PilotageLogistique } from "./PilotageLogistique";

const TON: Record<string, "good" | "bad" | "warn" | "info" | "neutre"> = { success: "good", critical: "bad", warning: "warn", info: "info", neutral: "neutre" };
const post = async (b: object) => {
  const r = await fetch("/api/admin/logistique", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "Action impossible");
  return d;
};
const ONGLETS = [["jumeau", "Jumeau numérique"], ["reseau", "Réseau"], ["verification", "Vérification"], ["incidents", "Incidents"], ["finance", "Finance"], ["intelligence", "Prévisions"], ["pilotage", "Confiance et modèles"], ["simulation", "Simulation"], ["regles", "Règles"], ["journal", "Journal"]] as const;

export function TourDeControle() {
  const t = useT();
  const [d, setD] = useState<any>(null);
  const [onglet, setOnglet] = useState<(typeof ONGLETS)[number][0]>("jumeau");
  const [sim, setSim] = useState({ nom: "Hausse de la demande", demandePct: 50, capacitePct: 0, coutPct: 0, fournisseurIndisponible: "", nouveauxFournisseurs: 0 });
  const [res, setRes] = useState<any>(null);
  const [pol, setPol] = useState({ delaiAcceptationS: 300, tentativesMax: 3, preferVerifie: true, noteMinAuto: 60, valeurApprobation: 200000 as number | null, valeurMaxEssai: 25000 as number | null, deploiementPct: 100, pause: false });
  const [droit, setDroit] = useState({ plan: "palier1", creditsMensuels: 0, montantMaxCourse: "", poidsMaxKg: "", actif: false });
  const charger = useCallback(async () => {
    const r = await fetch("/api/admin/logistique");
    const x = await r.json().catch(() => ({}));
    if (!r.ok) return void toast.error(t(x.error ?? "Chargement impossible"));
    setD(x);
    if (x.politique?.config) setPol((p) => ({ ...p, ...x.politique.config }));
  }, [t]);
  useEffect(() => { charger(); const i = setInterval(() => { if (!document.hidden) charger(); }, 30_000); return () => clearInterval(i); }, [charger]);
  const agir = async (b: object, ok = "Action enregistrée") => { try { const r = await post(b); toast.success(t(ok)); charger(); return r; } catch (e: any) { toast.error(t(e.message)); } };
  if (!d) return <Carte><p className="cc-faint text-[13px]">{t("Chargement…")}</p></Carte>;
  const k = d.kpis, m = (v: number) => formatMontant(v, "XAF"), peut = d.peutAgir;
  const kpis: [string, string][] = [["Courses actives", String(k.actives)], ["Taux de réussite", k.tauxReussite == null ? "—" : `${Math.round(k.tauxReussite * 100)} %`], ["Délai moyen", k.delaiMoyenMin == null ? "—" : `${k.delaiMoyenMin} min`], ["Sociétés", String(k.societes)], ["Livreurs", String(k.livreurs)], ["Disponibles", String(k.disponibles)]];
  const attention = d.documents.length + d.incidents.length + d.alertesProposees.length;

  return <div className="space-y-4">
    <GrilleKpi colonnes={6}>{kpis.map(([l, v]) => <div key={l} className="cc-card px-4 py-3"><p className="cc-faint text-[12px]">{t(l)}</p><p className="text-[22px] font-semibold cc-num">{v}</p></div>)}</GrilleKpi>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <Carte titre={t("Que se passe-t-il ?")}><p className="text-[13px]">{k.actives ? t("{0} livraison(s) en cours, {1} transporteur(s) disponible(s).", String(k.actives), String(k.disponibles)) : t("Aucune livraison en cours.")}</p></Carte>
      <Carte titre={t("Que va-t-il se passer ?")}><p className="text-[13px]">{d.prevision.disponible ? (d.prevision.publiable ? `${t("Demande attendue demain : {0} à {1} courses.", String(d.prevision.horizon[0].bas), String(d.prevision.horizon[0].haut))}${d.prevision.confiance === "faible" ? ` ${t("Estimation de faible confiance.")}` : ""}` : t("Le modèle ne bat pas encore la référence : prévision non publiée.")) : t("Données insuffisantes : {0} jour(s) sur {1} nécessaires.", String(d.prevision.joursObserves), "7")}</p></Carte>
      <Carte titre={t("Qu'est-ce qui demande attention ?")}><p className="text-[13px]">{attention ? t("{0} document(s), {1} incident(s), {2} alerte(s).", String(d.documents.length), String(d.incidents.length), String(d.alertesProposees.length)) : t("Rien à traiter.")}</p></Carte>
      <Carte titre={t("Que recommande AXSO ?")}><p className="text-[13px]">{d.alertesProposees[0] ? d.alertesProposees[0].action : t("Aucune recommandation pour le moment.")}</p></Carte>
      <Carte titre={t("Qu'est-ce qui a été exécuté ?")}><p className="text-[13px]">{d.journal[0] ? `${d.journal[0].action} · ${new Date(d.journal[0].createdAt).toLocaleTimeString(t.loc, { hour: "2-digit", minute: "2-digit" })}` : t("Aucune action récente.")}</p></Carte>
    </div>
    <div className="flex gap-1 overflow-x-auto" role="tablist">{ONGLETS.map(([id, l]) => <button key={id} type="button" role="tab" aria-selected={onglet === id} className={`cc-btn cc-btn-sm ${onglet === id ? "cc-btn-primary" : ""}`} onClick={() => setOnglet(id)}>{t(l)}</button>)}</div>

    {onglet === "jumeau" && <JumeauNumerique />}

    {onglet === "reseau" && <div className="grid gap-3 xl:grid-cols-2">
      <Carte titre={t("Transporteurs")} pad={false}>{!d.fournisseurs.length ? <div className="p-4"><EtatVide titre={t("Aucun transporteur")} explication={t("Ils apparaîtront ici dès leur inscription.")} /></div> : <div className="overflow-x-auto"><table className="w-full text-[13px]"><tbody>{d.fournisseurs.map((f: any) => <tr key={f.id} className="border-t cc-sep"><td className="px-4 py-2"><b>{f.nom}</b><div className="cc-faint text-[11.5px]">{t(f.type === "societe" ? "Société" : "Livreur")} · {f.zones.join(", ")}</div></td><td><Badge ton={f.statutLegal === "verifie" ? "good" : "warn"}>{t(VERIFICATION[f.statutLegal])}</Badge></td><td className="cc-num">{f.probation ? t("Essai") : f.scoreGlobal}</td><td className="px-3 text-right">{peut && <button type="button" className="cc-btn cc-btn-sm" onClick={() => { if (f.suspendu) agir({ action: "suspendre", id: f.id, suspendu: false }); else { const motif = window.prompt(t("Motif de la suspension")); if (motif) agir({ action: "suspendre", id: f.id, suspendu: true, motif }); } }}>{t(f.suspendu ? "Rétablir" : "Suspendre")}</button>}</td></tr>)}</tbody></table></div>}</Carte>
      <Carte titre={t("Courses actives")} pad={false}>{!d.actives.length ? <div className="p-4"><EtatVide titre={t("Aucune course active")} explication={t("Les livraisons en cours s'affichent ici.")} /></div> : <ul>{d.actives.map((c: any) => <li key={c.id} className="flex justify-between gap-2 px-4 py-2 border-t cc-sep text-[13px]"><span>{c.reference} · {c.ville ?? "—"}</span><Badge ton={TON[STATUTS_COURSE[c.statut]?.tone]}>{t(STATUTS_COURSE[c.statut]?.l ?? c.statut)}</Badge></li>)}</ul>}</Carte>
    </div>}

    {onglet === "verification" && <Carte titre={t("Documents à vérifier")} pad={false}>{!d.documents.length ? <div className="p-4"><EtatVide titre={t("File vide")} explication={t("Aucun document en attente.")} /></div> : <ul>{d.documents.map((x: any) => <li key={x.id} className="flex flex-wrap items-center gap-2 px-4 py-3 border-t cc-sep text-[13px]"><span className="flex-1 min-w-[180px]"><b>{t(DOCUMENTS[x.type] ?? x.type)}</b> · {d.fournisseurs.find((f: any) => f.id === x.fournisseurId)?.nom}<div className="cc-faint text-[11.5px]">{x.nomFichier}</div></span>{peut && <><a className="cc-btn cc-btn-sm" href={`/api/admin/logistique/documents/${x.id}`} target="_blank" rel="noopener noreferrer">{t("Consulter")}</a><button type="button" className="cc-btn cc-btn-sm cc-btn-primary" onClick={() => agir({ action: "document", id: x.id, statut: "verifie" })}>{t("Valider")}</button><button type="button" className="cc-btn cc-btn-sm" onClick={() => { const motif = window.prompt(t("Motif du rejet")); if (motif) agir({ action: "document", id: x.id, statut: "rejete", motif }); }}>{t("Rejeter")}</button></>}</li>)}</ul>}</Carte>}

    {onglet === "incidents" && <Carte titre={t("Incidents et litiges")} pad={false}>{!d.incidents.length ? <div className="p-4"><EtatVide titre={t("Aucun incident ouvert")} explication={t("Tout est calme.")} /></div> : <ul>{d.incidents.map((i: any) => <li key={i.id} className="px-4 py-3 border-t cc-sep text-[13px]"><div className="flex gap-2 items-center"><Badge ton={i.severite === "CRITICAL" ? "bad" : "warn"}>{t(i.type)}</Badge><span className="cc-faint">{new Date(i.createdAt).toLocaleString(t.loc)}</span></div><p className="my-1">{i.description}</p>{peut && <div className="flex gap-2 flex-wrap">{[["fournisseur", "Imputer au transporteur"], ["marchand", "Imputer au marchand"], ["client", "Imputer au client"], ["externe", "Cause externe"]].map(([r, l]) => <button key={r} type="button" className="cc-btn cc-btn-sm" onClick={() => { const resolution = window.prompt(t("Motivez la décision")); if (resolution) agir({ action: "incident", id: i.id, statut: "resolu", resolution, responsable: r }); }}>{t(l)}</button>)}<button type="button" className="cc-btn cc-btn-sm cc-btn-ghost" onClick={() => { const resolution = window.prompt(t("Motif du rejet")); if (resolution) agir({ action: "incident", id: i.id, statut: "rejete", resolution }); }}>{t("Rejeter")}</button></div>}</li>)}</ul>}</Carte>}

    {onglet === "finance" && <div className="grid gap-3 xl:grid-cols-2">
      <Carte titre={t("Économie des livraisons")}><dl className="space-y-1.5 text-[13px]">{[["Versements transporteurs", d.finance.versements], ["Commissions AXSO", d.finance.commissions], ["Subvention par crédits", d.finance.subvention], ["Contribution des marchands", d.finance.contributionMarchands], ["Contribution nette AXSO", d.finance.contributionNette]].map(([l, v]) => <div key={l as string} className="flex justify-between"><dt className="cc-muted">{t(l as string)}</dt><dd className="cc-num font-semibold">{m(v as number)}</dd></div>)}</dl></Carte>
      <Carte titre={t("Lots de règlement")}>
        {peut && <div className="flex gap-2 mb-3"><select id="axl-lot" aria-label={t("Transporteur")} className="cc-btn flex-1 min-w-0">{d.fournisseurs.map((f: any) => <option key={f.id} value={f.id}>{f.nom}</option>)}</select><button type="button" className="cc-btn cc-btn-primary" onClick={() => { const id = (document.getElementById("axl-lot") as HTMLSelectElement | null)?.value; if (id) agir({ action: "lot", fournisseurId: id }, "Lot préparé"); }}>{t("Préparer")}</button></div>}
        {!d.lots.length ? <p className="cc-faint text-[13px]">{t("Aucun lot.")}</p> : <ul className="space-y-2 text-[13px]">{d.lots.map((l: any) => <li key={l.id} className="flex justify-between items-center gap-2"><span>{d.fournisseurs.find((f: any) => f.id === l.fournisseurId)?.nom} · {formatMontant(l.total, l.devise)}</span>{l.statut === "prepare" && peut ? <button type="button" className="cc-btn cc-btn-sm" onClick={() => { const reference = window.prompt(t("Référence du paiement Mobile Money")); if (reference) agir({ action: "payer", id: l.id, reference }, "Lot marqué payé"); }}>{t("Marquer payé")}</button> : <Badge ton={l.statut === "paye" ? "good" : "neutre"}>{t(l.statut === "paye" ? "Payé" : "En préparation")}</Badge>}</li>)}</ul>}
      </Carte>
    </div>}

    {onglet === "intelligence" && <div className="grid gap-3 xl:grid-cols-2">
      <Carte titre={t("Prévision de la demande")} sousTitre={d.prevision.confiance === "faible" ? t("Historique court : estimation de faible confiance") : t("Comparée à une prévision naïve")}>{d.prevision.disponible ? <ul className="space-y-1 text-[13px]">{d.prevision.horizon.map((h: any) => <li key={h.jour} className="flex justify-between"><span>J+{h.jour}</span><span className="cc-num">{h.bas} – {h.haut}</span></li>)}</ul> : <EtatVide titre={t("Données insuffisantes")} explication={t(d.prevision.motif)} />}</Carte>
      <Carte titre={t("Alertes proposées")} sousTitre={t("Signaux calculés sur les zones actives")}>{!d.alertesProposees.length ? <p className="cc-faint text-[13px]">{t("Aucune alerte.")}</p> : <ul className="space-y-2 text-[13px]">{d.alertesProposees.map((a: any) => <li key={a.cle}><Badge ton={a.severite === "WARNING" ? "warn" : "bad"}>{a.severite}</Badge> {a.explication}<div className="cc-faint">{a.action} · {t("confiance")} {t(a.confiance)}</div></li>)}</ul>}</Carte>
    </div>}

    {onglet === "pilotage" && <PilotageLogistique peutAgir={d.peutAgir} />}

    {onglet === "simulation" && <Carte titre={t("Studio de simulation")} sousTitre={t("Aucune donnée réelle n'est modifiée")}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-[13px]">
        <label className="grid gap-1">{t("Scénario")}<input className="cc-btn" value={sim.nom} onChange={(e) => setSim({ ...sim, nom: e.target.value })} /></label>
        {[["demandePct", "Demande (%)"], ["capacitePct", "Capacité (%)"], ["coutPct", "Coût (%)"], ["nouveauxFournisseurs", "Nouveaux transporteurs"]].map(([k2, l]) => <label key={k2} className="grid gap-1">{t(l)}<input type="number" className="cc-btn" value={(sim as any)[k2]} onChange={(e) => setSim({ ...sim, [k2]: Number(e.target.value) || 0 })} /></label>)}
        <label className="grid gap-1">{t("Transporteur indisponible")}<select className="cc-btn" value={sim.fournisseurIndisponible} onChange={(e) => setSim({ ...sim, fournisseurIndisponible: e.target.value })}><option value="">{t("Aucun")}</option>{d.fournisseurs.map((f: any) => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></label>
      </div>
      <button type="button" className="cc-btn cc-btn-primary mt-3" onClick={async () => { const r = await agir({ action: "simuler", ...sim, fournisseurIndisponible: sim.fournisseurIndisponible || null }, "Simulation calculée"); if (r?.resultats) setRes(r.resultats); }}>{t("Lancer la simulation")}</button>
      {res && <div className="mt-3"><Note>{t("Résultat simulé, pas une donnée réelle.")}</Note><dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3 text-[13px]">{[["Demande / jour", res.demande], ["Capacité / jour", res.capacite], ["Utilisation", res.utilisation == null ? "—" : `${res.utilisation} %`], ["Non servie", res.demandeNonServie], ["Coût / jour", m(res.coutJour)], ["Délai estimé", res.delaiEstimeMin == null ? "—" : `${res.delaiEstimeMin} min`], ["Capacité manquante", res.capaciteManquante]].map(([l, v]) => <div key={l as string}><dt className="cc-faint">{t(l as string)}</dt><dd className="font-semibold cc-num">{v as string}</dd></div>)}</dl><p className="text-[13px] mt-2">{res.recommandations.join(" ")}</p></div>}
    </Carte>}

    {onglet === "regles" && <div className="grid gap-3 xl:grid-cols-2">
      <Carte titre={t("Politique de dispatch")} sousTitre={d.politique ? `Version ${d.politique.version}` : t("Valeurs par défaut")}><div className="grid gap-2 text-[13px]">
        {[["delaiAcceptationS", "Délai d'acceptation (s)"], ["tentativesMax", "Tentatives maximum"], ["noteMinAuto", "Note minimale en automatique"], ["valeurApprobation", "Approbation dès (FCFA)"], ["valeurMaxEssai", "Autonomie en essai jusqu'à (FCFA)"], ["deploiementPct", "Boutiques en autonomie (%)"]].map(([k2, l]) => <label key={k2} className="flex justify-between items-center gap-3">{t(l)}<input type="number" className="cc-btn w-32" value={(pol as any)[k2] ?? ""} onChange={(e) => setPol({ ...pol, [k2]: Number(e.target.value) })} /></label>)}
        <label className="flex gap-2"><input type="checkbox" checked={pol.preferVerifie} onChange={(e) => setPol({ ...pol, preferVerifie: e.target.checked })} />{t("Préférer les sociétés vérifiées")}</label>
        <label className="flex gap-2"><input type="checkbox" checked={pol.pause} onChange={(e) => setPol({ ...pol, pause: e.target.checked })} />{t("Pause globale de l'automatisation")}</label>
        <div><button type="button" className="cc-btn cc-btn-primary" onClick={() => agir({ action: "politique", config: pol }, "Nouvelle version publiée")}>{t("Publier une version")}</button></div>
      </div></Carte>
      <Carte titre={t("Crédits par forfait")} sousTitre={t("Désactivés tant qu'un modèle économique n'est pas validé")}><div className="grid gap-2 text-[13px]">
        <label className="flex justify-between items-center gap-3">{t("Forfait")}<select className="cc-btn w-32" value={droit.plan} onChange={(e) => { const x = d.droits.find((r: any) => r.plan === e.target.value); setDroit({ plan: e.target.value, creditsMensuels: x?.creditsMensuels ?? 0, montantMaxCourse: x?.montantMaxCourse ?? "", poidsMaxKg: x?.poidsMaxKg ?? "", actif: !!x?.actif }); }}><option value="palier1">Pro</option><option value="palier2">Illimité</option></select></label>
        <label className="flex justify-between items-center gap-3">{t("Crédits par mois (FCFA)")}<input type="number" className="cc-btn w-32" value={droit.creditsMensuels} onChange={(e) => setDroit({ ...droit, creditsMensuels: Number(e.target.value) || 0 })} /></label>
        <label className="flex justify-between items-center gap-3">{t("Maximum par course")}<input type="number" className="cc-btn w-32" value={droit.montantMaxCourse} onChange={(e) => setDroit({ ...droit, montantMaxCourse: e.target.value })} /></label>
        <label className="flex gap-2"><input type="checkbox" checked={droit.actif} onChange={(e) => setDroit({ ...droit, actif: e.target.checked })} />{t("Activer")}</label>
        <div><button type="button" className="cc-btn cc-btn-primary" onClick={() => agir({ action: "droit", plan: droit.plan, creditsMensuels: droit.creditsMensuels, montantMaxCourse: droit.montantMaxCourse === "" ? null : Number(droit.montantMaxCourse), poidsMaxKg: droit.poidsMaxKg === "" ? null : Number(droit.poidsMaxKg), actif: droit.actif })}>{t("Enregistrer")}</button></div>
      </div></Carte>
    </div>}

    {onglet === "journal" && <Carte titre={t("Journal d'audit")} pad={false}><ul>{d.journal.map((j: any) => <li key={j.id} className="flex justify-between gap-3 px-4 py-2 border-t cc-sep text-[12.5px]"><span><b>{j.action}</b> · {j.entite}</span><span className="cc-faint">{j.acteurType} · {new Date(j.createdAt).toLocaleString(t.loc)}</span></li>)}</ul></Carte>}
  </div>;
}
