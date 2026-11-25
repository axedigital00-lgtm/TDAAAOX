"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Field } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { Modal } from "@/components/dashboard/design-system/components/Modal";
import { toast } from "sonner";

import { useDevise } from "@/components/dashboard/DeviseProvider";
import { useT } from "@/components/I18nProvider";
import { iconePlateforme } from "@/components/brand/LogoPlateforme";
interface Campagne {
  id: string;
  plateforme: string;
  nom: string;
  objectif: string;
  budget: number;
  budgetJour?: number;
  devise: string;
  statut: string;
  depense: number;
  impressions: number;
  clics: number;
  conversions: number;
  cpc: number;
  cpa: number;
  roas: number;
  titreAd?: string;
  descriptionAd?: string;
  imageAdUrl?: string;
  dateDebut?: string;
  dateFin?: string;
  ciblePays: string[];
  cibleAge: string;
  cibleInterets: string[];
  createdAt: string;
}

const PLATEFORMES = [
  { id: "meta",   label: "Meta Ads",   Icon: iconePlateforme("meta"), color: "#1877F2", desc: "Facebook + Instagram" },
  { id: "google", label: "Google Ads", Icon: iconePlateforme("google-ads"), color: "#4285F4", desc: "Search + Display + YouTube" },
  { id: "tiktok", label: "TikTok Ads", Icon: iconePlateforme("tiktok"), color: "#010101", desc: "Short-form video ads" },
];

const OBJECTIFS = [
  { id: "conversions", label: "Ventes" },
  { id: "trafic",      label: "Trafic" },
  { id: "notoriete",   label: "Notoriété" },
  { id: "leads",       label: "Contacts" },
];

const STATUT_CONFIG: Record<string, { label: string; tone: "neutral" | "success" | "attention" }> = {
  brouillon: { label: "Brouillon", tone: "neutral" },
  active:    { label: "Active",    tone: "success" },
  pause:     { label: "En pause",  tone: "attention" },
  terminee:  { label: "Terminée",  tone: "neutral" },
};

const PAYS_AFRIQUE = ["SN", "CI", "CM", "GH", "NG", "KE", "MA", "TG", "BJ", "ML", "BF", "GN"];
const PAYS_LABELS: Record<string, string> = {
  SN:"SN · Sénégal", CI:"CI · Côte d'Ivoire", CM:"CM · Cameroun", GH:"GH · Ghana",
  NG:"NG · Nigeria", KE:"KE · Kenya", MA:"MA · Maroc", TG:"TG · Togo",
  BJ:"BJ · Bénin", ML:"ML · Mali", BF:"BF · Burkina Faso", GN:"GN · Guinée",
};

export default function PublicitePage() {
  const t = useT();
  const { devise, fmt } = useDevise();
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genIA, setGenIA] = useState(false);
  const [filterPlat, setFilterPlat] = useState("tous");

  const [form, setForm] = useState({
    plateforme: "meta",
    nom: "",
    objectif: "conversions",
    budget: "",
    budgetJour: "",
    devise,
    dateDebut: "",
    dateFin: "",
    ciblePays: [] as string[],
    cibleAge: "18-45",
    cibleInterets: [] as string[],
    titreAd: "",
    descriptionAd: "",
    imageAdUrl: "",
    urlDestination: "",
    promptIA: "",
  });

  useEffect(() => { charger(); }, []);

  async function charger() {
    setLoading(true);
    try {
      const res = await fetch("/api/campagnes");
      const data = await res.json();
      setCampagnes(data.campagnes || []);
      setStats(data.stats || {});
    } catch { toast.error(t("Erreur chargement")); }
    finally { setLoading(false); }
  }

  async function genererCreatifIA() {
    if (!form.promptIA || !form.plateforme) return;
    setGenIA(true);
    try {
      const res = await fetch("/api/ai/universal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Génère un créatif publicitaire ${form.plateforme} pour : "${form.promptIA}".
Réponds en JSON :
{
  "titre": "titre accrocheur max 40 chars",
  "description": "description engageante max 125 chars",
  "nom_campagne": "nom court de la campagne"
}
Adapté marché africain. UNIQUEMENT le JSON.`,
          }],
        }),
      });
      const data = await res.json();
      const json = (data.reponse || "").match(/\{[\s\S]*\}/);
      if (json) {
        const parsed = JSON.parse(json[0]);

        // Générer visuel IA
        const imgPrompt = `${form.promptIA}, ${form.plateforme} advertisement, professional marketing visual, African market, high quality`;
        const encoded = encodeURIComponent(imgPrompt);
        const imageAdUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1200&height=628&nologo=true&model=flux&seed=${Math.floor(Math.random()*999999)}`;

        setForm(f => ({
          ...f,
          titreAd: parsed.titre || "",
          descriptionAd: parsed.description || "",
          nom: parsed.nom_campagne || f.nom,
          imageAdUrl,
        }));
        toast.success(t("Créatif généré !"));
      }
    } catch { toast.error(t("Erreur IA")); }
    finally { setGenIA(false); }
  }

  async function creer() {
    if (!form.nom || !form.budget) { toast.error(t("Nom et budget requis")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/campagnes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateforme: form.plateforme,
          nom: form.nom,
          objectif: form.objectif,
          budget: parseFloat(form.budget),
          budgetJour: form.budgetJour ? parseFloat(form.budgetJour) : undefined,
          devise: form.devise,
          dateDebut: form.dateDebut || undefined,
          dateFin: form.dateFin || undefined,
          ciblePays: form.ciblePays,
          cibleAge: form.cibleAge,
          cibleInterets: form.cibleInterets,
          titreAd: form.titreAd || undefined,
          descriptionAd: form.descriptionAd || undefined,
          imageAdUrl: form.imageAdUrl || undefined,
          urlDestination: form.urlDestination || undefined,
        }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success(t("Campagne créée !"));
      setShowModal(false);
      setForm(f => ({ ...f, nom: "", budget: "", titreAd: "", descriptionAd: "", imageAdUrl: "", promptIA: "" }));
      charger();
    } catch { toast.error(t("Erreur sauvegarde")); }
    finally { setSaving(false); }
  }

  async function changerStatut(id: string, statut: string) {
    await fetch("/api/campagnes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, statut }) });
    setCampagnes(cs => cs.map(c => c.id === id ? { ...c, statut } : c));
    toast.success(t("Campagne {0}", statut === "active" ? "activée" : statut === "pause" ? "mise en pause" : "mise à jour"));
  }

  async function supprimer(id: string) {
    if (!confirm(t("Supprimer cette campagne ?"))) return;
    await fetch(`/api/campagnes?id=${id}`, { method: "DELETE" });
    setCampagnes(cs => cs.filter(c => c.id !== id));
    toast.success(t("Campagne supprimée"));
  }

  const campagnesFiltrees = campagnes.filter(c => filterPlat === "tous" || c.plateforme === filterPlat);

  const dev = (d: string) => (d === "XAF" ? "FCFA" : d);
  const kpis = [
    { l: "Dépensé", v: fmt(stats.totalDepense || 0) },
    { l: "Impressions", v: (stats.totalImpressions || 0).toLocaleString(t.loc) },
    { l: "Clics", v: (stats.totalClics || 0).toLocaleString(t.loc), sub: stats.totalImpressions ? `${t("Taux de clic")} ${((stats.totalClics / stats.totalImpressions) * 100).toFixed(2).replace(".", ",")} %` : undefined },
    { l: "Ventes", v: (stats.totalConversions || 0).toLocaleString(t.loc), sub: stats.roas > 0 ? `${t("Retour sur dépense")} ${stats.roas.toFixed(2).replace(".", ",")}×` : undefined },
  ];

  return (
    <Page>
      <PageHeader icon="gauge" backHref="/dashboard/marketing" title={t("Publicité")}
        secondaryActions={[{ content: t("Pixels et suivi"), href: "/dashboard/marketing/tracking" }]}
        primaryAction={{ content: t("Créer une campagne"), onAction: () => setShowModal(true) }} />

      <div className="axd-grid axd-g4" style={{ marginBottom: "var(--space-400)" }}>
        {kpis.map(k => (
          <div key={k.l} className="axd-card axd-card--pad">
            <div className="axd-kpi__t">{t(k.l)}</div>
            <div className="axd-kpi__v" style={{ marginBottom: k.sub ? 2 : 0 }}>{k.v}</div>
            {k.sub && <div className="axd-muted" style={{ fontSize: 12 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="axd-card" style={{ overflow: "hidden" }}>
        <div className="axd-ix-bar">
          <div className="axd-ix-tabs" role="tablist">
            <button type="button" role="tab" className="axd-ix-tab" aria-selected={filterPlat === "tous"} onClick={() => setFilterPlat("tous")}>{t("Toutes")}</button>
            {PLATEFORMES.map(p => (
              <button key={p.id} type="button" role="tab" className="axd-ix-tab" aria-selected={filterPlat === p.id} onClick={() => setFilterPlat(p.id)}><p.Icon size={14} />{t(p.label)}</button>
            ))}
          </div>
        </div>
        {loading ? <p className="axd-fichiers__etat">{t("Chargement…")}</p> : campagnesFiltrees.length === 0 ? (
          <div className="axd-empty">
            <h3>{t("Lancez votre première campagne")}</h3>
            <p>{t("Meta, Google ou TikTok : décrivez ce que vous vendez, Stella prépare le titre, le texte et le visuel.")}</p>
            <div className="axd-empty__actions"><Button variant="primary" onClick={() => setShowModal(true)}>{t("Créer une campagne")}</Button></div>
          </div>
        ) : (
          <div className="axd-ix-wrap">
            <table className="axd-ix">
              <thead><tr><th>{t("Campagne")}</th><th>{t("Statut")}</th><th className="axd-ix-num axd-ix-hide-m">{t("Dépensé / budget")}</th><th className="axd-ix-num axd-ix-hide-m">{t("Clics")}</th><th className="axd-ix-num">{t("Ventes")}</th><th /></tr></thead>
              <tbody>
                {campagnesFiltrees.map(c => {
                  const plat = PLATEFORMES.find(p => p.id === c.plateforme);
                  const st = STATUT_CONFIG[c.statut] || STATUT_CONFIG.brouillon;
                  return (
                    <tr key={c.id}>
                      <td className="axd-ix-primary">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {plat?.Icon && <span className="axd-thumb axd-thumb--32" style={{ background: "#fff" }}><plat.Icon size={18} /></span>}
                          <div style={{ minWidth: 0 }}>
                            {t(c.nom)}
                            <div className="axd-muted" style={{ fontWeight: 400, fontSize: 12 }}>{t(plat?.label)} · {t(OBJECTIFS.find(o => o.id === c.objectif)?.label ?? c.objectif)}{c.ciblePays?.length ? ` · ${c.ciblePays.join(", ")}` : ""}</div>
                          </div>
                        </div>
                      </td>
                      <td><Badge tone={st.tone}>{t(st.label)}</Badge></td>
                      <td className="axd-ix-num axd-ix-hide-m">{c.depense.toLocaleString(t.loc)} / {c.budget.toLocaleString(t.loc)} {dev(c.devise)}</td>
                      <td className="axd-ix-num axd-ix-hide-m">{c.clics.toLocaleString(t.loc)}</td>
                      <td className="axd-ix-num">{c.conversions.toLocaleString(t.loc)}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {(c.statut === "brouillon" || c.statut === "pause") && <Button size="sm" onClick={() => changerStatut(c.id, "active")}>{c.statut === "pause" ? t("Reprendre") : t("Activer")}</Button>}
                        {c.statut === "active" && <Button size="sm" onClick={() => changerStatut(c.id, "pause")}>{t("Mettre en pause")}</Button>}
                        <Button size="sm" variant="plain" onClick={() => supprimer(c.id)}>{t("Supprimer")}</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: "var(--space-400)" }}>
        <Banner>{t("Votre pixel de suivi AXSO est actif sur votre boutique. Consultez l’attribution des ventes dans")}{" "}<Link href="/dashboard/analytics" style={{ textDecoration: "underline" }}>{t("Analyses de données")}</Link>.</Banner>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t("Nouvelle campagne")} size="lg"
        footer={<><Button onClick={() => setShowModal(false)}>{t("Annuler")}</Button><Button variant="primary" onClick={creer} loading={saving} disabled={!form.nom || !form.budget}>{t("Créer la campagne")}</Button></>}>
        <div style={{ display: "grid", gap: "var(--space-400)", padding: "var(--space-400)" }}>
          <div>
            <p className="axd-field__label" style={{ margin: "0 0 6px" }}>{t("Plateforme")}</p>
            <div className="axd-grid axd-g3" style={{ gap: 6 }}>
              {PLATEFORMES.map(p => (
                <button key={p.id} type="button" className="axd-choix axd-choix--ligne" aria-pressed={form.plateforme === p.id} onClick={() => setForm(f => ({ ...f, plateforme: p.id }))} style={{ justifyContent: "flex-start", gap: 10 }}>
                  <p.Icon size={20} /><span style={{ display: "grid", color: "inherit", fontSize: 13 }}><b>{t(p.label)}</b><span style={{ color: "var(--color-text-subdued)", fontSize: 12 }}>{t(p.desc)}</span></span>
                </button>
              ))}
            </div>
          </div>

          <div className="axd-card axd-card--pad" style={{ background: "var(--color-surface-secondary)", boxShadow: "none", display: "grid", gap: 8 }}>
            <Field label={t("Préparer l’annonce avec Stella")}>{(p) => <input {...p} className="axd-input" value={form.promptIA} onChange={e => setForm(f => ({ ...f, promptIA: e.target.value }))} placeholder={t("Ex: Vendre mes robes wax premium aux femmes 25-40 ans à Dakar...")} />}</Field>
            <div><Button size="sm" onClick={genererCreatifIA} loading={genIA} disabled={!form.promptIA}>{t("Générer titre et visuel")}</Button></div>
          </div>

          <Field label={t("Nom de la campagne")}>{(p) => <input {...p} className="axd-input" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder={t("Ex: Soldes Ramadan 2024")} />}</Field>
          <div className="axd-grid axd-g2" style={{ gap: "var(--space-300)" }}>
            <Field label={t("Budget total")}>{(p) => <input {...p} type="number" className="axd-input" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="50000" />}</Field>
            <Field label={t("Budget par jour (optionnel)")}>{(p) => <input {...p} type="number" className="axd-input" value={form.budgetJour} onChange={e => setForm(f => ({ ...f, budgetJour: e.target.value }))} placeholder="5000" />}</Field>
          </div>

          <div>
            <p className="axd-field__label" style={{ margin: "0 0 6px" }}>{t("Objectif")}</p>
            <div className="axd-chips" style={{ margin: 0 }}>
              {OBJECTIFS.map(o => <button key={o.id} type="button" className="axd-chip" aria-pressed={form.objectif === o.id} onClick={() => setForm(f => ({ ...f, objectif: o.id }))}>{t(o.label)}</button>)}
            </div>
          </div>

          <div>
            <p className="axd-field__label" style={{ margin: "0 0 6px" }}>{t("Pays ciblés")}</p>
            <div className="axd-chips" style={{ margin: 0 }}>
              {PAYS_AFRIQUE.map(p => (
                <button key={p} type="button" className="axd-chip" aria-pressed={form.ciblePays.includes(p)}
                  onClick={() => setForm(f => ({ ...f, ciblePays: f.ciblePays.includes(p) ? f.ciblePays.filter(x => x !== p) : [...f.ciblePays, p] }))}>
                  {t(PAYS_LABELS[p])}
                </button>
              ))}
            </div>
          </div>

          {(form.titreAd || form.imageAdUrl) && (
            <div className="axd-grid axd-g2" style={{ gap: "var(--space-300)" }}>
              {form.imageAdUrl && <img src={form.imageAdUrl} alt={t("Créatif")} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: "var(--radius-lg)" }} />}
              <div style={{ display: "grid", gap: "var(--space-300)" }}>
                <Field label={t("Titre de l'annonce")}>{(p) => <input {...p} className="axd-input" value={form.titreAd} onChange={e => setForm(f => ({ ...f, titreAd: e.target.value }))} />}</Field>
                <Field label={t("Texte de l’annonce")}>{(p) => <textarea {...p} rows={3} className="axd-input" style={{ height: "auto", padding: "8px 12px" }} value={form.descriptionAd} onChange={e => setForm(f => ({ ...f, descriptionAd: e.target.value }))} />}</Field>
              </div>
            </div>
          )}

          <Field label={t("Lien de destination")}>{(p) => <input {...p} className="axd-input" value={form.urlDestination} onChange={e => setForm(f => ({ ...f, urlDestination: e.target.value }))} placeholder={t("https://axsoafrica.com/votre-boutique")} />}</Field>
        </div>
      </Modal>
    </Page>
  );
}
