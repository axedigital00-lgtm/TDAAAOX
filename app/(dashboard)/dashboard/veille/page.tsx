"use client";
import { useState, useEffect } from "react";
import { Search, Plus, Loader2, X, Sparkles, Globe, Zap, Trash2, Eye, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { useT } from "@/components/I18nProvider";
import { useConfirmation } from "@/components/ui";
import { Button, PageHeader, buttonClasses } from "@/components/ui/adm";

interface VeilleItem {
  id: string;
  nomConcurrent: string;
  urlConcurrent?: string;
  categorie?: string;
  produitNom?: string;
  prixDetecte?: number;
  descriptionNote?: string;
  detectedAt: string;
}

export default function VeillePage() {
  const t = useT();
  const { confirmer, dialogue } = useConfirmation();
  const [items, setItems] = useState<VeilleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [rapport, setRapport] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nomConcurrent: "",
    urlConcurrent: "",
    categorie: "",
    produitNom: "",
    prixDetecte: "",
    descriptionNote: "",
    // IA
    promptAnalyse: "",
  });

  useEffect(() => { charger(); }, []);

  async function charger() {
    setLoading(true);
    try {
      const res = await fetch("/api/veille");
      const data = await res.json();
      setItems(data.items || []);
    } catch { }
    finally { setLoading(false); }
  }

  async function analyserAvecIA() {
    if (!form.promptAnalyse.trim()) { toast.error(t("Indique le nom ou le site du concurrent à analyser.")); return; }
    setAnalysing(true);
    setRapport("");
    try {
      // /api/ai/chat : texte seul, sans outils ni accès au web — l'IA ne voit pas le concurrent.
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Voici ce que je sais d'un concurrent/marché : "${form.promptAnalyse}".

Tu n'as AUCUN accès à son site, à ses prix ni à ses chiffres : tu ne connais que ma description ci-dessus. Formule uniquement des HYPOTHÈSES À VÉRIFIER, sans inventer de chiffres, de prix ni de faits sur ce concurrent, et commence par le rappeler en une ligne.

Fournis :
1. Points forts possibles du concurrent (à vérifier)
2. Opportunités possibles pour moi
3. Comment vérifier ces hypothèses (quoi regarder, où)
4. Pistes d'actions si elles se confirment
5. Mots-clés SEO à tester

Format: liste claire. Adapté marché africain.`,
          }],
        }),
      });
      const data = await res.json();
      setRapport(res.ok && data.reponse ? `Hypothèses IA à vérifier (non basées sur des données réelles du concurrent)\n\n${data.reponse}` : "");
    } catch { toast.error(t("L'analyse n'a pas pu être faite. Réessayez dans un instant.")); }
    finally { setAnalysing(false); }
  }

  async function sauvegarder() {
    if (!form.nomConcurrent) { toast.error(t("Renseigne le nom du concurrent.")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/veille", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomConcurrent: form.nomConcurrent,
          urlConcurrent: form.urlConcurrent || undefined,
          categorie: form.categorie || undefined,
          produitNom: form.produitNom || undefined,
          prixDetecte: form.prixDetecte ? parseFloat(form.prixDetecte) : undefined,
          descriptionNote: rapport || form.descriptionNote || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("{0} ajouté au radar.", form.nomConcurrent));
      setShowModal(false);
      setForm({ nomConcurrent: "", urlConcurrent: "", categorie: "", produitNom: "", prixDetecte: "", descriptionNote: "", promptAnalyse: "" });
      setRapport("");
      charger();
    } catch { toast.error(t("Le concurrent n'a pas été ajouté. Réessayez.")); }
    finally { setSaving(false); }
  }

  async function supprimer(id: string) {
    const nom = items.find(x => x.id === id)?.nomConcurrent ?? t("Concurrent");
    if (!(await confirmer({ titre: t("Retirer ce concurrent du radar ?"), objet: nom, description: t("Son suivi et ses analyses seront supprimés."), libelleConfirmer: t("Retirer du radar") }))) return;
    const res = await fetch(`/api/veille?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { toast.error(t("{0} n'a pas été retiré. Réessayez.", nom)); return; }
    setItems(i => i.filter(x => x.id !== id));
    toast.success(t("{0} retiré du radar.", nom));
  }

  return (
    <div className="space-y-6">
      {dialogue}
      <PageHeader icon="eye" title={t("Veille concurrentielle")} titleMeta={<AgentActiveIndicator label={t("Agent Veille actif")} />}
        primaryAction={{ content: t("Ajouter un concurrent"), icon: "plus", onAction: () => setShowModal(true) }} />
      <p className="m-0 -mt-2 max-w-3xl text-(--color-text-secondary)">{t("Surveillez vos concurrents, détectez les opportunités")}</p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Concurrents surveillés", val: items.length, icon: Eye, color: "var(--chart-violet)" },
          { label: "Analyses IA réalisées", val: items.filter(i => i.descriptionNote).length, icon: Sparkles, color: "var(--color-magic-text)" },
          { label: "Prix tracés", val: items.filter(i => i.prixDetecte).length, icon: BarChart2, color: "var(--badge-success-text)" },
        ].map(s => {
          const Icone = s.icon;
          return (
            <div key={s.label} className="ax-card p-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-surface-tertiary)" }}>
                  <Icone size={16} style={{ color: s.color }} />
                </div>
                <p className="text-[20px] font-bold text-(--color-text-strong) tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>{t(s.val)}</p>
              </div>
              <p className="text-[12px] text-(--color-text-subdued)">{t(s.label)}</p>
            </div>
          );
        })}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-(--color-text-subdued) animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="bg-(--color-surface-secondary) border border-dashed border-(--color-border) rounded-[20px] p-16 text-center">
          <Search size={40} className="text-(--color-text-subdued) mx-auto mb-4" />
          <h3 className="text-[14px] font-semibold text-(--color-text-strong) mb-2">{t("Aucun concurrent dans le radar")}</h3>
          <p className="text-[12.5px] text-(--color-text-subdued) mb-6">{t("L'IA analyse vos concurrents et identifie les opportunités de marché")}</p>
          <button onClick={() => setShowModal(true)}
            className={buttonClasses({ variant: "primary", className: "mx-auto gap-2" })}>
            <Sparkles size={15} />{" "}{t("Analyser un concurrent")}
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="ax-card p-5 hover:-translate-y-0.5 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-(--badge-critical-bg) flex items-center justify-center"><Eye size={20} className="text-(--color-critical-text)" /></div>
                  <div>
                    <p className="text-[13px] font-semibold text-(--color-text-strong)">{t(item.nomConcurrent)}</p>
                    {item.categorie && <p className="text-[11.5px] text-(--color-text-subdued)">{t(item.categorie)}</p>}
                  </div>
                </div>
                <Button aria-label={t("Retirer {0} du radar", item.nomConcurrent)} title={t("Retirer {0} du radar", item.nomConcurrent)} className="px-0! w-[30px] text-erreur" variant="ghost" onClick={() => supprimer(item.id)}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
              {item.produitNom && (
                <div className="flex items-center justify-between mb-3 bg-(--color-surface-secondary) rounded-xl px-3 py-2 border border-(--color-border-secondary)">
                  <span className="text-[12px] text-(--color-text-secondary)">{t(item.produitNom)}</span>
                  {item.prixDetecte && <span className="text-[12px] font-bold text-(--color-text-strong)">{item.prixDetecte.toLocaleString()} XOF</span>}
                </div>
              )}
              {item.urlConcurrent && (
                <a href={item.urlConcurrent} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-(--color-magic-text) hover:text-(--color-text-strong) mb-3">
                  <Globe size={11} /> {item.urlConcurrent.slice(0, 40)}…
                </a>
              )}
              {item.descriptionNote && (
                <p className="text-[12px] text-(--color-text-secondary) leading-relaxed line-clamp-4 bg-(--color-magic-bg) border border-(--color-magic-border) rounded-xl p-3">{t(item.descriptionNote)}</p>
              )}
              <p className="text-[10.5px] text-(--color-text-subdued) mt-3">{t("Ajouté le")}{" "}{new Date(item.detectedAt).toLocaleDateString(t.loc)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setRapport(""); } }}>
          <div className="bg-(--color-surface) rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-(--color-border-secondary)">
              <h2 className="text-[15px] font-bold text-(--color-text-strong)">{t("Analyser un concurrent")}</h2>
              <button onClick={() => { setShowModal(false); setRapport(""); }} className="text-(--color-text-subdued) hover:text-(--color-text)"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Analyse IA */}
              <div className="bg-(--color-surface-selected) border border-(--color-border-strong) rounded-xl p-4 space-y-3">
                <label className="text-sm font-semibold text-(--banner-warning-text) flex items-center gap-2">
                  <Sparkles size={14} className="text-(--color-magic-text)" />{" "}{t("Analyse IA du concurrent")}
                </label>
                <input value={form.promptAnalyse} onChange={e => setForm(f => ({ ...f, promptAnalyse: e.target.value }))}
                  placeholder={t("Ex: Boutique Wax & Co à Dakar, vendent des robes similaires, prix 15000-30000 XOF...")}
                  className="w-full bg-(--color-surface) border border-(--badge-warning-bg) rounded-xl px-4 py-3 text-(--color-text-strong) text-sm focus:outline-none" />
                <button onClick={analyserAvecIA} disabled={analysing || !form.promptAnalyse}
                  className={buttonClasses({ variant: "primary", className: "gap-2" })}>
                  {analysing ? <><Loader2 size={13} className="animate-spin" />{" "}{t("Analyse IA…")}</> : <><Zap size={13} />{" "}{t("Analyser")}</>}
                </button>
              </div>

              {rapport && (
                <div className="bg-(--color-surface-secondary) border border-(--color-border) rounded-xl p-4">
                  <p className="text-xs font-semibold text-(--color-text-secondary) mb-2 flex items-center gap-1"><BarChart2 size={12} />{" "}{t("Hypothèses IA à vérifier — l'IA n'a pas accès aux données du concurrent :")}</p>
                  <pre className="text-xs text-(--color-text) whitespace-pre-wrap leading-relaxed font-sans">{t(rapport)}</pre>
                </div>
              )}

              {/* Infos manuelles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Nom du concurrent *", field: "nomConcurrent", placeholder: "Boutique Wax & Co" },
                  { label: "URL / Réseaux", field: "urlConcurrent", placeholder: "https://instagram.com/..." },
                  { label: "Catégorie", field: "categorie", placeholder: "Mode, Cosmétiques..." },
                  { label: "Produit observé", field: "produitNom", placeholder: "Robe Ankara" },
                ].map(f => (
                  <div key={f.field}>
                    <label className="ax-label block mb-1">{t(f.label)}</label>
                    <input value={(form as any)[f.field]} onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-(--color-surface) border border-(--color-border) rounded-xl px-3 py-2.5 text-(--color-text-strong) text-[13px] outline-none focus:border-(--color-border-strong) focus:ring-2 focus:ring-(--color-focus-ring) transition-all placeholder:text-(--color-text-subdued)" />
                  </div>
                ))}
                <div>
                  <label className="ax-label block mb-1">{t("Prix observé (XOF)")}</label>
                  <input type="number" value={form.prixDetecte} onChange={e => setForm(f => ({ ...f, prixDetecte: e.target.value }))}
                    placeholder="25000"
                    className="w-full bg-(--color-surface) border border-(--color-border) rounded-xl px-3 py-2.5 text-(--color-text-strong) text-[13px] outline-none focus:border-(--color-border-strong) focus:ring-2 focus:ring-(--color-focus-ring) transition-all placeholder:text-(--color-text-subdued)" />
                </div>
              </div>

              <button onClick={sauvegarder} disabled={saving || !form.nomConcurrent}
                className={buttonClasses({ variant: "primary", fullWidth: true, className: "h-10! gap-2" })}>
                {saving ? <><Loader2 size={16} className="animate-spin" /></> : <><Plus size={16} />{" "}{t("Ajouter au radar")}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
