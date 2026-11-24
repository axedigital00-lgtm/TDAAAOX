"use client";
// Espace logistique du marchand : il demande une livraison, AXSO s'occupe du reste.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Card, EmptyState, Field, Toggle } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { BADGES, EVENEMENTS, NIVEAUX, STATUTS_COURSE, VEHICULES, formatEta } from "@/lib/logistique/libelles";
import { formatMontant } from "@/lib/utils";
import { CarteLogistique, type PointCarte } from "./CarteLogistique";
import { useFluxCourse } from "./useFluxCourse";

const api = async (u: string, m = "GET", b?: unknown) => {
  const r = await fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "Action impossible");
  return d;
};
const grille = (min: number): React.CSSProperties => ({ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`, gap: "var(--space-300)" });
const CATEGORIES: Record<string, string> = { meilleur_global: "Meilleur choix", meilleure_societe: "Meilleure société vérifiée", meilleur_prix: "Meilleur prix", plus_rapide: "Plus rapide", plus_fiable: "Plus fiable", plus_proche: "Plus proche" };

export function ReseauMarchand() {
  const t = useT();
  const [d, setD] = useState<any>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [options, setOptions] = useState<any>(null);
  const [cmd, setCmd] = useState(""); const [poids, setPoids] = useState(""); const [vehicule, setVehicule] = useState(""); const [express, setExpress] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const charger = useCallback(() => api("/api/logistique/marchand").then(setD).catch((e) => toast.error(t(e.message))), [t]);
  const lire = useCallback(async (id: string) => { const r = await api(`/api/logistique/courses/${id}?options=1`); setCourse(r.course); setOptions(r.options ?? null); }, []);
  useEffect(() => { charger(); }, [charger]);
  const direct = useFluxCourse(sel, () => { if (sel) lire(sel).catch(() => {}); });
  useEffect(() => {
    if (!sel) return;
    lire(sel).catch(() => {});
    const i = setInterval(() => { if (!document.hidden) lire(sel).catch(() => {}); }, direct ? 30_000 : 10_000);
    return () => clearInterval(i);
  }, [sel, lire, direct]);

  const agir = async (f: () => Promise<unknown>, ok: string) => {
    setEnvoi(true);
    try { await f(); toast.success(t(ok)); await charger(); if (sel) await lire(sel); } catch (e: any) { toast.error(t(e.message)); } finally { setEnvoi(false); }
  };
  const demander = () => agir(async () => {
    const r = await api("/api/logistique/courses", "POST", { commandeId: cmd, poidsKg: poids ? Number(poids) : null, vehiculeRequis: vehicule || null, express });
    setCmd(""); setPoids(""); setExpress(false); setSel(r.id);
  }, "Livraison demandée");
  const majPref = (p: object) => agir(() => api("/api/logistique/marchand", "PATCH", p), "Réglages enregistrés");
  const posCourse = (c: any): PointCarte[] => [
    ...(c.suivi.depart ? [{ id: "d", ...c.suivi.depart, type: "depart" as const, libelle: t("Enlèvement") }] : []),
    ...(c.suivi.arrivee ? [{ id: "a", ...c.suivi.arrivee, type: "arrivee" as const, libelle: t("Destination") }] : []),
    ...(c.suivi.dernierePosition ? [{ id: "l", lat: c.suivi.dernierePosition.lat, lng: c.suivi.dernierePosition.lng, type: "livreur" as const, libelle: t("Dernière position"), perime: c.suivi.signal === "perime" }] : []),
  ];

  if (!d) return <Page><PageHeader icon="truck" title={t("Réseau de livraison")} backHref="/dashboard/logistique" /><Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement…")}</p></Card></Page>;
  const p = d.preferences, dev = d.courses[0]?.devise ?? "XAF", k = d.kpis;
  const kpi: [string, string][] = [["En cours", String(k.actives)], ["Livrées", String(k.livrees)], ["Échecs", String(k.echecs)], ["Taux de réussite", k.tauxReussite == null ? "—" : `${Math.round(k.tauxReussite * 100)} %`], ["Délai moyen", k.delaiMoyenMin == null ? "—" : `${k.delaiMoyenMin} min`], ["Dépenses", formatMontant(k.depenses, dev)]];

  return <Page>
    <PageHeader icon="truck" title={t("Réseau de livraison")} backHref="/dashboard/logistique" secondaryActions={[{ content: t("Voir les transporteurs"), href: "/dashboard/logistique/reseau/transporteurs" }]} />
    <div className="axd-stack">
      <div style={grille(150)}>{kpi.map(([l, v]) => <Card key={l}><p className="axd-muted" style={{ margin: 0, fontSize: 12 }}>{t(l)}</p><p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 650 }}>{v}</p></Card>)}</div>

      <div style={grille(340)}>
        <Card title={t("Demander une livraison")}>
          {d.commandes.length === 0 ? <p className="axd-muted" style={{ margin: 0 }}>{t("Aucune commande à livrer pour l'instant.")}</p> : <div style={{ display: "grid", gap: "var(--space-300)" }}>
            <Field label={t("Commande")}>{(f) => <select {...f} className="axd-input" value={cmd} onChange={(e) => setCmd(e.target.value)}><option value="">{t("Choisir")}</option>{d.commandes.map((c: any) => <option key={c.id} value={c.id}>#{c.numero} · {c.clientNom} · {c.ville}</option>)}</select>}</Field>
            <div style={grille(130)}>
              <Field label={t("Poids (kg)")}>{(f) => <input {...f} type="number" min={0} step="0.1" className="axd-input" value={poids} onChange={(e) => setPoids(e.target.value)} />}</Field>
              <Field label={t("Véhicule")}>{(f) => <select {...f} className="axd-input" value={vehicule} onChange={(e) => setVehicule(e.target.value)}><option value="">{t("Indifférent")}</option>{Object.entries(VEHICULES).map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}</select>}</Field>
            </div>
            <Toggle checked={express} onChange={setExpress} label={t("Livraison express")} />
            <div><Button variant="primary" onClick={demander} loading={envoi} disabled={!cmd}>{t("Trouver le meilleur livreur")}</Button></div>
          </div>}
        </Card>
        <Card title={t("Crédits de livraison")}>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 650 }}>{formatMontant(d.credits.disponible, "XAF")}</p>
          <p className="axd-muted" style={{ margin: "2px 0 12px", fontSize: 13 }}>{t("disponibles")}</p>
          <div style={grille(100)}>{[["Réservés", d.credits.reserve], ["Utilisés", d.credits.consomme], ["Expirés", d.credits.expire]].map(([l, v]) => <div key={l as string}><p className="axd-muted" style={{ margin: 0, fontSize: 12 }}>{t(l as string)}</p><b>{formatMontant(v as number, "XAF")}</b></div>)}</div>
          {d.credits.credite === 0 && <p className="axd-muted" style={{ margin: "12px 0 0", fontSize: 13 }}>{t("Aucun crédit inclus dans votre forfait pour le moment.")}</p>}
        </Card>
        <Card title={t("Préférences")}>
          <div style={{ display: "grid", gap: "var(--space-300)" }}>
            <Field label={t("Attribution")} help={t("Semi-automatique : AXSO assigne selon vos règles. Autonome : AXSO assigne et réassigne seul les livraisons à faible risque.")}>{(f) => <select {...f} className="axd-input" value={p?.mode ?? "recommandation"} onChange={(e) => majPref({ mode: e.target.value })}><option value="recommandation">{t("Je valide chaque livraison")}</option><option value="semi_automatique">{t("Semi-automatique")}</option><option value="autonome">{t("Autonome")}</option></select>}</Field>
            <Toggle checked={!!p?.exigerVerifie} onChange={(v) => majPref({ exigerVerifie: v })} label={t("Uniquement des transporteurs vérifiés")} />
            <Toggle checked={!!p?.autoCourses} onChange={(v) => majPref({ autoCourses: v })} label={t("Demander la livraison dès qu'une commande est confirmée")} />
            <Toggle checked={!!p?.pause} onChange={(v) => majPref({ pause: v })} label={t("Mettre l'automatisation en pause")} />
            <fieldset style={{ border: 0, margin: 0, padding: 0, display: "grid", gap: 6 }}><legend style={{ fontSize: 13, marginBottom: 6 }}>{t("Preuves exigées à la remise")}</legend>{[["otp", "Code du client"], ["photo", "Photo"], ["signature", "Signature"]].map(([v, l]) => { const liste: string[] = p?.preuves ?? ["otp"]; return <label key={v} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={liste.includes(v)} disabled={liste.length === 1 && liste.includes(v)} onChange={(e) => majPref({ preuves: e.target.checked ? [...liste, v] : liste.filter((x) => x !== v) })} />{t(l)}</label>; })}</fieldset>
            <div><p className="axd-muted" style={{ margin: "0 0 6px", fontSize: 13 }}>{p?.latEnlevement != null ? t("Point d'enlèvement enregistré") : t("Ajoutez votre point d'enlèvement pour calculer distances et itinéraires.")}</p><Button size="sm" onClick={() => { if (!("geolocation" in navigator)) return void toast.error(t("Localisation indisponible")); navigator.geolocation.getCurrentPosition((x) => majPref({ latEnlevement: x.coords.latitude, lngEnlevement: x.coords.longitude }), () => toast.error(t("Localisation refusée"))); }}>{t(p?.latEnlevement != null ? "Mettre à jour avec ma position" : "Utiliser ma position")}</Button></div>
          </div>
        </Card>
      </div>

      <div style={grille(420)}>
        <Card title={t("Livraisons")} padding="none">
          {d.courses.length === 0 ? <div style={{ padding: 16 }}><EmptyState heading={t("Aucune livraison")}>{t("Choisissez une commande : AXSO compare les transporteurs de la zone.")}</EmptyState></div> : <div style={{ overflowX: "auto" }}><table className="axd-ix"><thead><tr><th>{t("Référence")}</th><th>{t("Statut")}</th><th>{t("Transporteur")}</th><th style={{ textAlign: "right" }}>{t("Prix")}</th></tr></thead><tbody>
            {d.courses.map((c: any) => <tr key={c.id} onClick={() => setSel(c.id)} style={{ cursor: "pointer", background: sel === c.id ? "var(--color-bg-surface-selected, #f1f1f1)" : undefined }}><td className="axd-ix-primary"><button type="button" className="axd-btn axd-btn--plain axd-btn--sm" onClick={() => setSel(c.id)}>{c.reference}</button></td><td><Badge tone={STATUTS_COURSE[c.statut]?.tone}>{t(STATUTS_COURSE[c.statut]?.l ?? c.statut)}</Badge></td><td>{c.fournisseur ?? "—"}</td><td style={{ textAlign: "right" }}>{c.prixMarchand == null ? "—" : formatMontant(c.prixMarchand, c.devise)}</td></tr>)}
          </tbody></table></div>}
        </Card>
        {course ? <Card title={course.reference} actions={<Badge tone={STATUTS_COURSE[course.statut]?.tone}>{t(STATUTS_COURSE[course.statut]?.l ?? course.statut)}</Badge>}>
          <div style={{ display: "grid", gap: 14 }}>
            {options && (options.classes.length === 0 ? <Banner tone="warning">{t("Aucun transporteur éligible dans cette zone pour le moment.")}</Banner> : <div style={{ display: "grid", gap: 10 }}>{options.classes.slice(0, 4).map((o: any) => {
              const cats = Object.entries(options.categories).filter(([, id]) => id === o.id).map(([c]) => CATEGORIES[c]);
              return <div key={o.id} style={{ border: "1px solid var(--color-border, #e3e3e3)", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><a href={`/dashboard/logistique/reseau/transporteurs/${o.id}`} style={{ fontWeight: 650, color: "inherit" }}>{o.nom}</a><b>{formatMontant(o.prix, "XAF")}</b></div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "6px 0" }}>{o.certifie && <Badge tone="success">{t("Certifié AXSO")}</Badge>}{cats.map((c) => <Badge key={c} tone="success">{t(c)}</Badge>)}{o.probation ? <Badge>{t("Nouveau")}</Badge> : o.niveau && <Badge tone="info">{NIVEAUX[o.niveau]}</Badge>}{o.badges.slice(0, 2).map((b: string) => <Badge key={b}>{t(BADGES[b])}</Badge>)}</div>
                <p className="axd-muted" style={{ margin: "0 0 8px", fontSize: 12.5 }}>{o.raisons.join(" · ")}</p>
                {o.lignes.length > 0 && <p className="axd-muted" style={{ margin: "0 0 8px", fontSize: 12 }}>{o.lignes.map((l: any) => `${t(l.libelle)} ${l.montant.toLocaleString("fr-FR")}`).join(" + ")}</p>}
                <Button size="sm" variant="primary" loading={envoi} onClick={() => agir(() => api(`/api/logistique/courses/${course.id}`, "POST", { action: "assigner", fournisseurId: o.id, cle: crypto.randomUUID() }), "Transporteur sollicité")}>{t("Choisir")}</Button>
              </div>;
            })}</div>)}
            {course.explication && <p style={{ margin: 0, fontSize: 13 }}>{t(course.explication)}</p>}
            {(course.suivi.depart || course.suivi.arrivee || course.suivi.dernierePosition) && <CarteLogistique points={posCourse(course)} trace={course.suivi.trace} route={course.suivi.route} hauteur={240} />}
            <div style={grille(130)}>
              <div><p className="axd-muted" style={{ margin: 0, fontSize: 12 }}>{t("Arrivée estimée")}</p><b>{t(formatEta(course.suivi.eta, t.loc))}</b></div>
              <div><p className="axd-muted" style={{ margin: 0, fontSize: 12 }}>{t("Signal")}</p><b>{course.suivi.dernierePosition ? (course.suivi.signal === "perime" ? `${t("Interrompu, dernière position à")} ${new Date(course.suivi.dernierePosition.le).toLocaleTimeString(t.loc, { hour: "2-digit", minute: "2-digit" })}` : t(course.suivi.signal === "direct" ? "En direct" : "Récent")) : "—"}</b></div>
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>{course.chronologie.map((e: any) => <li key={e.id} style={{ marginBottom: 3 }}>{t(EVENEMENTS[e.type] ?? e.type)} <span className="axd-muted">· {new Date(e.le).toLocaleString(t.loc, { dateStyle: "short", timeStyle: "short" })}</span></li>)}</ol>
            {course.preuve?.photo && <a className="axd-btn axd-btn--plain axd-btn--sm" href={`/api/logistique/courses/${course.id}/preuve`} target="_blank" rel="noopener noreferrer">{t("Voir la photo de remise")}</a>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {course.statut === "attente_fournisseur" && <Button size="sm" loading={envoi} onClick={() => agir(() => api(`/api/logistique/courses/${course.id}`, "POST", { action: "relancer" }), "Recherche relancée")}>{t("Relancer")}</Button>}
              {["attente_acceptation", "acceptee", "enlevement_planifie"].includes(course.statut) && <Button size="sm" onClick={() => agir(() => api(`/api/logistique/courses/${course.id}`, "POST", { action: "statut", statut: "attente_fournisseur", motif: "Réassignation demandée" }), "Transporteur retiré")}>{t("Changer de transporteur")}</Button>}
              {["attente_fournisseur", "attente_acceptation", "acceptee", "enlevement_planifie"].includes(course.statut) && <Button size="sm" variant="plain" onClick={() => { if (window.confirm(t("Annuler cette livraison ?"))) agir(() => api(`/api/logistique/courses/${course.id}`, "POST", { action: "statut", statut: "annulee" }), "Livraison annulée"); }}>{t("Annuler")}</Button>}
              {course.fournisseur && <Button size="sm" variant="plain" onClick={() => { const description = window.prompt(t("Décrivez le problème")); if (description) agir(() => api(`/api/logistique/courses/${course.id}`, "POST", { action: "incident", type: "incident", description }), "Incident signalé"); }}>{t("Signaler un problème")}</Button>}
              {course.statut === "livree" && [5, 4, 3, 2, 1].map((n) => <Button key={n} size="sm" onClick={() => agir(() => api(`/api/logistique/courses/${course.id}`, "POST", { action: "noter", note: n }), "Merci pour votre avis")}>{n} ★</Button>)}
            </div>
          </div>
        </Card> : <Card><p className="axd-muted" style={{ margin: 0 }}>{t("Sélectionnez une livraison pour voir son suivi.")}</p></Card>}
      </div>
    </div>
  </Page>;
}
