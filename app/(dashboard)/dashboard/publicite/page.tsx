"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { useDevise } from "@/components/dashboard/DeviseProvider";
import { useT } from "@/components/I18nProvider";
import {
  Badge, Banner, Button, EmptyState, IconButton, IndexTable, Modal, PageHeader, Tabs, TextField, Textarea, Thumbnail,
  type BadgeTone, type Column,
} from "@/components/ui/adm";
import { IllustrationCampagnes } from "@/components/ui/illustrations";
import { Chargement, Chiffres, useConfirmationAdm } from "../marketing/kit-marketing";
import { filtrer, pourcent } from "../marketing/regles-marketing";
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
  { id: "meta",   label: "Meta Ads",   desc: "Facebook + Instagram" },
  { id: "google", label: "Google Ads", desc: "Search + Display + YouTube" },
  { id: "tiktok", label: "TikTok Ads", desc: "Short-form video ads" },
];

const OBJECTIFS = [
  { id: "conversions", label: "Conversions" },
  { id: "trafic",      label: "Trafic" },
  { id: "notoriete",   label: "Notoriété" },
  { id: "leads",       label: "Leads" },
];

const STATUT_CONFIG: Record<string, { label: string; tone: BadgeTone }> = {
  brouillon: { label: "Brouillon", tone: "info" },
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
  const { confirmer, dialogue } = useConfirmationAdm();
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
    } catch { toast.error(t("Vos campagnes n'ont pas pu être chargées. Vérifiez votre connexion et actualisez la page.")); }
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
        toast.success(t("Créatif rédigé : relisez-le avant de l'utiliser."));
      }
    } catch { toast.error(t("Le créatif n'a pas pu être rédigé. Réessayez.")); }
    finally { setGenIA(false); }
  }

  async function creer() {
    if (!form.nom || !form.budget) { toast.error(t("Renseignez le nom de la campagne et son budget.")); return; }
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
      if (!res.ok) throw new Error();
      toast.success(t("Campagne « {0} » créée.", form.nom));
      setShowModal(false);
      setForm(f => ({ ...f, nom: "", budget: "", titreAd: "", descriptionAd: "", imageAdUrl: "", promptIA: "" }));
      charger();
    } catch { toast.error(t("La campagne n'a pas été enregistrée. Vérifiez les champs et réessayez.")); }
    finally { setSaving(false); }
  }

  async function changerStatut(id: string, statut: string) {
    const res = await fetch("/api/campagnes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, statut }) }).catch(() => null);
    if (!res?.ok) { toast.error(t("Le statut de la campagne n'a pas été modifié. Réessayez.")); return; }
    setCampagnes(cs => cs.map(c => c.id === id ? { ...c, statut } : c));
    toast.success(t("Campagne {0}", statut === "active" ? "activée" : statut === "pause" ? "mise en pause" : "mise à jour"));
  }

  async function supprimer(id: string) {
    const nom = campagnes.find(c => c.id === id)?.nom ?? t("Campagne");
    if (!(await confirmer({ titre: t("Supprimer cette campagne ?"), objet: nom, description: t("Elle et ses statistiques disparaissent d'Axso. Rien n'est modifié chez Meta, Google ou TikTok."), libelleConfirmer: t("Supprimer la campagne") }))) return;
    const res = await fetch(`/api/campagnes?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { toast.error(t("La campagne n'a pas été supprimée. Réessayez.")); return; }
    setCampagnes(cs => cs.filter(c => c.id !== id));
    toast.success(t("Campagne « {0} » supprimée.", nom));
  }

  const campagnesFiltrees = filtrer(campagnes, { plateforme: filterPlat });

  const choix = (on: boolean) => `rounded-(--radius-md) border p-2.5 text-left text-xs transition-colors ${on ? "border-(--color-border-strong) bg-(--color-surface-selected) font-semibold text-(--color-text-strong)" : "border-(--color-border) text-(--color-text-secondary) hover:bg-(--color-surface-secondary)"}`;
  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

  const colonnes: Column<Campagne>[] = [
    { id: "nom", header: t("Campagne"), mobilePrimary: true, cell: (c) => (
      <span className="flex items-center gap-2">
        {c.imageAdUrl && <Thumbnail src={c.imageAdUrl} alt={t("Créatif")} size={40} />}
        <span className="min-w-0">
          <span className="block truncate">{t(c.nom)}</span>
          <span className="block text-xs font-normal text-(--color-text-secondary)">{t(PLATEFORMES.find(p => p.id === c.plateforme)?.label ?? c.plateforme)} · {t(c.objectif)}</span>
        </span>
      </span>
    ) },
    { id: "statut", header: t("Statut"), cell: (c) => { const st = STATUT_CONFIG[c.statut] || STATUT_CONFIG.brouillon; return <Badge tone={st.tone}>{t(st.label)}</Badge>; } },
    { id: "impressions", header: t("Impressions"), numeric: true, align: "end", hideOnMobile: true, cell: (c) => c.impressions.toLocaleString(t.loc) },
    { id: "clics", header: t("Clics"), numeric: true, align: "end", cell: (c) => c.clics.toLocaleString(t.loc) },
    { id: "ctr", header: t("CTR"), numeric: true, align: "end", hideOnMobile: true, cell: (c) => pourcent(c.clics, c.impressions) },
    { id: "conversions", header: t("Conv."), numeric: true, align: "end", cell: (c) => c.conversions },
    { id: "roas", header: t("ROAS"), numeric: true, align: "end", hideOnMobile: true, cell: (c) => c.roas > 0 ? `${c.roas.toFixed(2)}x` : "—" },
    { id: "budget", header: t("Dépensé / budget"), numeric: true, align: "end", cell: (c) => `${c.depense.toLocaleString(t.loc)} / ${c.budget.toLocaleString(t.loc)} ${t(c.devise)}` },
    { id: "pays", header: t("Pays cibles"), hideOnMobile: true, cell: (c) => c.ciblePays?.join(", ") || "—" },
    { id: "actions", header: "", align: "end", cell: (c) => (
      <span className="inline-flex items-center gap-1">
        {c.statut === "brouillon" && <Button size="sm" onClick={() => changerStatut(c.id, "active")}>{t("Activer")}</Button>}
        {c.statut === "active" && <Button size="sm" onClick={() => changerStatut(c.id, "pause")}>{t("Pauser")}</Button>}
        {c.statut === "pause" && <Button size="sm" onClick={() => changerStatut(c.id, "active")}>{t("Reprendre")}</Button>}
        <IconButton icon="x" aria-label={t("Supprimer la campagne {0}", c.nom)} onClick={() => supprimer(c.id)} />
      </span>
    ) },
  ];

  return (
    <div className="space-y-4">
      {dialogue}
      <PageHeader icon="meta" title={t("Publicité")}
        primaryAction={{ content: t("Nouvelle campagne"), icon: "plus", onAction: () => setShowModal(true) }} />

      <Chiffres items={[
        { label: t("Total dépensé"), value: fmt(stats.totalDepense || 0) },
        { label: t("Impressions totales"), value: (stats.totalImpressions || 0).toLocaleString(t.loc) },
        { label: t("Clics totaux"), value: <>{(stats.totalClics || 0).toLocaleString(t.loc)}{stats.totalImpressions ? <span className="ml-1 text-xs font-normal text-(--color-text-secondary)">{t("CTR {0}", pourcent(stats.totalClics, stats.totalImpressions))}</span> : null}</> },
        { label: t("Conversions"), value: <>{stats.totalConversions || 0}{stats.roas > 0 ? <span className="ml-1 text-xs font-normal text-(--color-text-secondary)">{t("ROAS {0}x", stats.roas.toFixed(2))}</span> : null}</> },
      ]} />

      {loading ? <Chargement /> : campagnes.length === 0 ? (
        <EmptyState title={t("Aucune campagne")} image={<IllustrationCampagnes />}
          actions={<Button variant="primary" icon="sparkle" onClick={() => setShowModal(true)}>{t("Créer avec l'IA")}</Button>}>
          {t("Créez votre première campagne et laissez l'IA générer les créatifs")}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)">
          <Tabs className="px-3" label={t("Plateformes")} selected={filterPlat} onSelect={setFilterPlat}
            tabs={[{ id: "tous", label: t("Toutes") }, ...PLATEFORMES.map(p => ({ id: p.id, label: t(p.label) }))]} />
          <IndexTable label={t("Campagnes publicitaires")} rows={campagnesFiltrees} columns={colonnes} getId={(c) => c.id}
            emptyState={<p className="px-6 py-12 text-center text-(--color-text-secondary)">{t("Aucune campagne sur cette plateforme.")}</p>} />
        </div>
      )}

      <Banner tone="info" title={t("Pixel Tracking Axso")}>
        {t("Votre pixel de tracking est automatiquement actif sur votre boutique. Consultez l'attribution des ventes dans")}{" "}<a href="/dashboard/analytics">{t("Analytics")}</a>.
      </Banner>

      <Modal open={showModal} onClose={() => !saving && setShowModal(false)} locked={saving} size="lg" title={t("Nouvelle campagne")}
        footer={<>
          <Button onClick={() => setShowModal(false)} disabled={saving}>{t("Annuler")}</Button>
          <Button variant="primary" onClick={creer} disabled={!form.nom || !form.budget} loading={saving}>{t("Créer la campagne")}</Button>
        </>}>
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-1 font-semibold text-(--color-text-strong)">{t("Plateforme")}</legend>
            <div className="grid grid-cols-3 gap-2">
              {PLATEFORMES.map(p => (
                <button key={p.id} type="button" aria-pressed={form.plateforme === p.id} onClick={() => set({ plateforme: p.id })} className={choix(form.plateforme === p.id)}>
                  <span className="block text-[13px]">{t(p.label)}</span>
                  <span className="block font-normal text-(--color-text-secondary)">{t(p.desc)}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2 rounded-(--radius-lg) border border-(--color-magic-border) bg-(--color-magic-bg) p-3">
            <TextField label={t("Générer les créatifs avec l'IA")} value={form.promptIA} onChange={e => set({ promptIA: e.target.value })}
              placeholder={t("Ex: Vendre mes robes wax premium aux femmes 25-40 ans à Dakar...")} />
            <Button size="sm" icon="sparkle" onClick={genererCreatifIA} disabled={!form.promptIA} loading={genIA}>{t("Générer titre + visuel")}</Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField className="col-span-2" label={t("Nom de la campagne")} required value={form.nom} onChange={e => set({ nom: e.target.value })} placeholder={t("Ex: Soldes Ramadan 2024")} />
            <TextField label={t("Budget total")} required type="number" value={form.budget} onChange={e => set({ budget: e.target.value })} placeholder="50000" />
            <TextField label={t("Budget journalier")} type="number" value={form.budgetJour} onChange={e => set({ budgetJour: e.target.value })} placeholder="5000" />
          </div>

          <fieldset>
            <legend className="mb-1 font-semibold text-(--color-text-strong)">{t("Objectif")}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OBJECTIFS.map(o => (
                <button key={o.id} type="button" aria-pressed={form.objectif === o.id} onClick={() => set({ objectif: o.id })} className={choix(form.objectif === o.id)}>{t(o.label)}</button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1 font-semibold text-(--color-text-strong)">{t("Pays cibles")}</legend>
            <div className="flex flex-wrap gap-2">
              {PAYS_AFRIQUE.map(p => (
                <button key={p} type="button" aria-pressed={form.ciblePays.includes(p)} className={choix(form.ciblePays.includes(p))}
                  onClick={() => set({ ciblePays: form.ciblePays.includes(p) ? form.ciblePays.filter(x => x !== p) : [...form.ciblePays, p] })}>
                  {t(PAYS_LABELS[p])}
                </button>
              ))}
            </div>
          </fieldset>

          {(form.titreAd || form.imageAdUrl) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {form.imageAdUrl && <img src={form.imageAdUrl} alt={t("Créatif")} className="aspect-video w-full rounded-(--radius-lg) border border-(--color-border) object-cover" />}
              <div className="space-y-3">
                <TextField label={t("Titre de l'annonce")} value={form.titreAd} onChange={e => set({ titreAd: e.target.value })} />
                <Textarea label={t("Description")} rows={3} value={form.descriptionAd} onChange={e => set({ descriptionAd: e.target.value })} />
              </div>
            </div>
          )}

          <TextField label={t("URL de destination")} value={form.urlDestination} onChange={e => set({ urlDestination: e.target.value })} placeholder="https://axsoafrica.com/votre-boutique" />
        </div>
      </Modal>
    </div>
  );
}
