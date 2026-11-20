"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Target, Plus, TrendingUp, Pause } from "lucide-react";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Field } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { Modal } from "@/components/dashboard/design-system/components/Modal";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";

import { useDevise } from "@/components/dashboard/DeviseProvider";
import { useT } from "@/components/I18nProvider";
const OBJECTIFS_TUTORIAL_STEPS = [
  { Icon: Target,     titre: "4 types d'objectifs", description: "Chiffre d'affaires, commandes, nouveaux clients ou panier moyen — choisis le type qui compte le plus pour ta boutique." },
  { Icon: Plus,       titre: "Fixe ta cible",        description: "Donne un titre, une valeur à atteindre et une date limite, puis clique \"Nouvel objectif\" pour te lancer." },
  { Icon: TrendingUp, titre: "Progression en temps réel", description: "La barre de progression et le pourcentage se mettent à jour automatiquement en fonction de tes ventes." },
  { Icon: Pause,      titre: "Mets en pause ou supprime", description: "Un objectif atteint, dépassé ou plus pertinent ? Mets-le en pause ou supprime-le en un clic." },
];

type TypeObjectif = "ca" | "commandes" | "clients" | "panier_moyen";

interface Objectif {
  id: string;
  type: TypeObjectif;
  titre: string;
  cible: number;
  actuel: number;
  devise: string;
  deadline: string;
  statut: "actif" | "pause" | "atteint" | "echoue";
  createdAt: string;
}

const TYPE_META: Record<TypeObjectif, { label: string }> = {
  ca:           { label: "Chiffre d'affaires" },
  commandes:    { label: "Commandes" },
  clients:      { label: "Nouveaux clients" },
  panier_moyen: { label: "Panier moyen" },
};

const STATUT_META: Record<string, { label: string; tone: "info" | "success" | "critical" | "neutral" }> = {
  actif:   { label: "En cours", tone: "info" },
  atteint: { label: "Atteint",  tone: "success" },
  echoue:  { label: "Échoué",   tone: "critical" },
  pause:   { label: "En pause", tone: "neutral" },
};

function formatValeur(v: number, type: TypeObjectif, devise: string) {
  if (type === "clients" || type === "commandes") return v.toLocaleString("fr-FR");
  return `${v.toLocaleString("fr-FR")} ${devise === "XAF" ? "FCFA" : devise}`;
}

export default function ObjectifsPage() {
  const tr = useT();
  const { devise } = useDevise();
  const [objectifs, setObjectifs] = useState<Objectif[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "ca" as TypeObjectif, titre: "", cible: "", devise, deadline: "" });

  function charger() {
    fetch("/api/objectifs").then(r => r.json()).then(d => setObjectifs(d.objectifs ?? []));
  }
  useEffect(() => { charger(); }, []);

  async function creer() {
    if (!form.titre.trim() || !form.cible || !form.deadline) {
      toast.error(tr("Remplissez tous les champs"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/objectifs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, cible: Number(form.cible) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success(tr("Objectif créé"));
      setShowForm(false);
      setForm({ type: "ca", titre: "", cible: "", devise, deadline: "" });
      charger();
    } catch (e: any) {
      toast.error(tr(e.message) ?? tr("Erreur lors de la création"));
    } finally {
      setSaving(false);
    }
  }

  async function changerStatut(id: string, statut: string) {
    await fetch(`/api/objectifs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    charger();
  }

  async function supprimer(id: string) {
    await fetch(`/api/objectifs/${id}`, { method: "DELETE" });
    charger();
  }

  return (
    <Page>
      <ModuleTutorial moduleKey="objectifs" titre={tr("Objectifs")} sousTitre={tr("Fixe et suis tes ambitions")} steps={OBJECTIFS_TUTORIAL_STEPS} />
      <PageHeader icon="flag" backHref="/dashboard/marketing"
        title={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{tr("Objectifs")}<BoutonRevoirTutoriel moduleKey="objectifs" /></span>}
        primaryAction={{ content: tr("Créer un objectif"), onAction: () => setShowForm(true) }} />

      {objectifs === null ? (
        <div className="axd-card"><p className="axd-fichiers__etat">{tr("Chargement…")}</p></div>
      ) : objectifs.length === 0 ? (
        <div className="axd-card"><div className="axd-empty">
          <h3>{tr("Fixez un cap à votre boutique")}</h3>
          <p>{tr("Chiffre d’affaires, commandes, nouveaux clients ou panier moyen : la progression se met à jour avec vos ventes.")}</p>
          <div className="axd-empty__actions"><Button variant="primary" onClick={() => setShowForm(true)}>{tr("Créer un objectif")}</Button></div>
        </div></div>
      ) : (
        <div className="axd-grid axd-g2">
          {objectifs.map(o => {
            const meta = TYPE_META[o.type];
            const sMeta = STATUT_META[o.statut] ?? STATUT_META.actif;
            const pct = Math.min(100, Math.round((o.actuel / o.cible) * 100));
            return (
              <div key={o.id} className="axd-card axd-card--pad" style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 650, color: "var(--color-text-strong)" }}>{tr(o.titre)}</div>
                    <div className="axd-muted" style={{ fontSize: 12 }}>{tr(meta.label)} · {tr("échéance")} {new Date(o.deadline).toLocaleDateString(tr.loc, { day: "numeric", month: "short", year: "numeric" })}</div>
                  </div>
                  <Badge tone={sMeta.tone}>{tr(sMeta.label)}</Badge>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                    <span className="axd-kpi__v" style={{ margin: 0 }}>{formatValeur(o.actuel, o.type, o.devise)}</span>
                    <span className="axd-muted" style={{ fontSize: 12 }}>{tr("sur")} {formatValeur(o.cible, o.type, o.devise)}</span>
                  </div>
                  <div className="axd-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={tr("Progression")}><span style={{ width: `${pct}%` }} /></div>
                  <div className="axd-muted" style={{ fontSize: 12, marginTop: 4 }}>{pct} % {tr("atteint")}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {o.statut === "actif" && <Button size="sm" variant="plain" onClick={() => changerStatut(o.id, "pause")}>{tr("Mettre en pause")}</Button>}
                  {o.statut === "pause" && <Button size="sm" variant="plain" onClick={() => changerStatut(o.id, "actif")}>{tr("Reprendre")}</Button>}
                  <span style={{ flex: 1 }} />
                  <Button size="sm" variant="plain" onClick={() => { if (confirm(tr("Supprimer cet objectif ?"))) supprimer(o.id); }}>{tr("Supprimer")}</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={tr("Nouvel objectif")}
        footer={<><Button onClick={() => setShowForm(false)}>{tr("Annuler")}</Button><Button variant="primary" onClick={creer} loading={saving}>{tr("Créer l'objectif")}</Button></>}>
        <div style={{ display: "grid", gap: "var(--space-300)", padding: "var(--space-400)" }}>
          <div>
            <p className="axd-field__label" style={{ margin: "0 0 6px" }}>{tr("Type d'objectif")}</p>
            <div className="axd-grid axd-g2" style={{ gap: 6 }}>
              {(Object.keys(TYPE_META) as TypeObjectif[]).map(t => (
                <button key={t} type="button" className="axd-choix" aria-pressed={form.type === t} onClick={() => setForm(f => ({ ...f, type: t }))}>{tr(TYPE_META[t].label)}</button>
              ))}
            </div>
          </div>
          <Field label={tr("Titre")}>{(p) => <input {...p} className="axd-input" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder={tr("Ex : Atteindre 1 000 000 {0} ce mois-ci", devise === "XAF" ? "FCFA" : devise)} />}</Field>
          <div className="axd-grid axd-g2" style={{ gap: "var(--space-300)" }}>
            <Field label={tr("Cible")}>{(p) => <input {...p} type="number" min="0" className="axd-input" value={form.cible} onChange={e => setForm(f => ({ ...f, cible: e.target.value }))} placeholder="1000000" />}</Field>
            <Field label={tr("Date limite")}>{(p) => <input {...p} type="date" className="axd-input" value={form.deadline} min={new Date().toISOString().slice(0, 10)} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />}</Field>
          </div>
        </div>
      </Modal>
    </Page>
  );
}
