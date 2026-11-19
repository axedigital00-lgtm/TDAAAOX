"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Target, Plus, TrendingUp, Pause } from "lucide-react";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import { useDevise } from "@/components/dashboard/DeviseProvider";
import { useT } from "@/components/I18nProvider";
import { useConfirmation } from "@/components/ui";
import { Badge, Banner, Button, Card, EmptyState, IconButton, PageHeader, SkeletonCard, TextField, type BadgeTone } from "@/components/ui/adm";

const OBJECTIFS_TUTORIAL_STEPS = [
  { Icon: Target,     titre: "4 types d'objectifs", description: "Chiffre d'affaires, commandes, nouveaux clients ou panier moyen : choisissez le type qui compte le plus pour votre boutique." },
  { Icon: Plus,       titre: "Fixez votre cible",   description: "Donnez un titre, une valeur à atteindre et une date limite, puis cliquez sur « Nouvel objectif »." },
  { Icon: TrendingUp, titre: "Progression en temps réel", description: "La barre de progression et le pourcentage se mettent à jour automatiquement en fonction de vos ventes." },
  { Icon: Pause,      titre: "Mettez en pause ou supprimez", description: "Un objectif atteint, dépassé ou plus pertinent ? Mettez-le en pause ou supprimez-le en un clic." },
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

const TYPE_LABEL: Record<TypeObjectif, string> = {
  ca: "Chiffre d'affaires",
  commandes: "Commandes",
  clients: "Nouveaux clients",
  panier_moyen: "Panier moyen",
};

const STATUT_META: Record<string, { label: string; tone: BadgeTone }> = {
  actif:   { label: "En cours", tone: "info" },
  atteint: { label: "Atteint",  tone: "success" },
  echoue:  { label: "Échoué",   tone: "critical" },
  pause:   { label: "En pause", tone: "neutral" },
};

function formatValeur(v: number, type: TypeObjectif, devise: string, loc: string) {
  if (type === "clients" || type === "commandes") return v.toLocaleString(loc);
  return `${v.toLocaleString(loc)} ${devise}`;
}

export default function ObjectifsPage() {
  const tr = useT();
  const { devise } = useDevise();
  const [objectifs, setObjectifs] = useState<Objectif[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "ca" as TypeObjectif, titre: "", cible: "", devise, deadline: "" });
  const [erreur, setErreur] = useState(false);
  const [tente, setTente] = useState(false);
  const { confirmer, dialogue } = useConfirmation();

  function charger() {
    setErreur(false);
    fetch("/api/objectifs").then(r => r.ok ? r.json() : Promise.reject()).then(d => setObjectifs(d.objectifs ?? [])).catch(() => setErreur(true));
  }
  useEffect(() => { charger(); }, []);

  async function creer(e?: React.FormEvent) {
    e?.preventDefault();
    setTente(true);
    if (!form.titre.trim() || !form.cible || !form.deadline) return;
    setSaving(true);
    try {
      const res = await fetch("/api/objectifs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, cible: Number(form.cible) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "");
      toast.success(tr("Objectif « {0} » créé.", form.titre));
      setShowForm(false); setTente(false);
      setForm({ type: "ca", titre: "", cible: "", devise, deadline: "" });
      charger();
    } catch (e: any) {
      toast.error(e?.message ? tr(e.message) : tr("L'objectif n'a pas été créé. Vérifiez les champs et réessayez."));
    } finally {
      setSaving(false);
    }
  }

  async function changerStatut(id: string, statut: string) {
    const res = await fetch(`/api/objectifs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    }).catch(() => null);
    if (!res?.ok) toast.error(tr("Le changement n'a pas été enregistré. Réessayez."));
    charger();
  }

  async function supprimer(o: Objectif) {
    if (!(await confirmer({ titre: tr("Supprimer cet objectif ?"), objet: o.titre, description: tr("Sa progression ne sera plus suivie. Vos ventes ne sont pas touchées."), libelleConfirmer: tr("Supprimer l'objectif") }))) return;
    const res = await fetch(`/api/objectifs/${o.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) toast.error(tr("L'objectif n'a pas été supprimé. Réessayez."));
    else toast.success(tr("Objectif « {0} » supprimé.", o.titre));
    charger();
  }

  const monetaire = form.type === "ca" || form.type === "panier_moyen";

  return (
    <div className="space-y-4 pb-[120px]">
      {dialogue}
      <ModuleTutorial moduleKey="objectifs" titre={tr("Objectifs")} sousTitre={tr("Fixez et suivez vos ambitions")} steps={OBJECTIFS_TUTORIAL_STEPS} />
      <PageHeader icon="gauge" title={tr("Objectifs")} backHref="/dashboard/analytics"
        primaryAction={showForm ? undefined : { content: tr("Nouvel objectif"), onAction: () => setShowForm(true) }}
        overflowActions={[{ content: tr("Revoir le tutoriel"), onAction: () => window.dispatchEvent(new CustomEvent("axso:ouvrir-tutoriel", { detail: "objectifs" })) }]} />
      <p className="text-(--color-text-secondary)">{tr("Fixez des objectifs pour votre boutique et suivez votre progression en temps réel")}</p>

      {showForm && (
        <Card title={tr("Nouvel objectif")} actions={<IconButton icon="x" aria-label={tr("Fermer le formulaire")} onClick={() => setShowForm(false)} />}>
          <form onSubmit={creer} noValidate className="space-y-4">
            <fieldset>
              <legend className="mb-1 font-[550] text-(--color-text-strong)">{tr("Type d'objectif")}</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TYPE_LABEL) as TypeObjectif[]).map(ty => (
                  <Button key={ty} size="sm" variant={form.type === ty ? "primary" : "default"} aria-pressed={form.type === ty}
                    onClick={() => setForm(f => ({ ...f, type: ty }))}>{tr(TYPE_LABEL[ty])}</Button>
                ))}
              </div>
            </fieldset>

            <TextField label={tr("Titre")} required value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
              placeholder={tr("Ex : Atteindre 1 000 000 {0} ce mois-ci", devise)}
              error={tente && !form.titre.trim() ? tr("Donnez un titre à votre objectif.") : undefined} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label={monetaire ? tr("Cible ({0})", devise) : tr("Cible")} required type="number" min="0" inputMode="numeric" value={form.cible}
                onChange={e => setForm(f => ({ ...f, cible: e.target.value }))} placeholder="1000000"
                error={tente && !form.cible ? tr("Indiquez la valeur à atteindre.") : undefined} />
              <TextField label={tr("Date limite")} required type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                min={new Date().toISOString().slice(0, 10)}
                error={tente && !form.deadline ? tr("Choisissez la date limite.") : undefined} />
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowForm(false)} disabled={saving}>{tr("Annuler")}</Button>
              <Button type="submit" variant="primary" loading={saving}>{tr("Créer l'objectif")}</Button>
            </div>
          </form>
        </Card>
      )}

      {erreur ? (
        <Banner tone="critical" title={tr("Vos objectifs n'ont pas pu être chargés")} action={{ content: tr("Réessayer"), onAction: charger }}>
          {tr("Vérifiez votre connexion et réessayez.")}
        </Banner>
      ) : objectifs === null ? (
        <div role="status" aria-label={tr("Chargement des objectifs…")} className="grid gap-4 sm:grid-cols-2"><SkeletonCard /><SkeletonCard /></div>
      ) : objectifs.length === 0 ? (
        !showForm && (
          <EmptyState title={tr("Aucun objectif pour le moment")}
            actions={<Button variant="primary" onClick={() => setShowForm(true)}>{tr("Nouvel objectif")}</Button>}>
            {tr("Créez-en un pour commencer à suivre votre progression.")}
          </EmptyState>
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {objectifs.map(o => {
            const st = STATUT_META[o.statut] ?? STATUT_META.actif;
            const pct = o.cible > 0 ? Math.min(100, Math.round((o.actuel / o.cible) * 100)) : 0;
            return (
              <Card key={o.id} title={tr(o.titre)} actions={<Badge tone={st.tone}>{tr(st.label)}</Badge>}>
                <p className="text-[12px] text-(--color-text-secondary)">{tr(TYPE_LABEL[o.type])} · {tr("échéance")} {new Date(o.deadline).toLocaleDateString(tr.loc)}</p>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="font-[650] text-(--color-text-strong) tabular">{formatValeur(o.actuel, o.type, o.devise, tr.loc)}</span>
                  <span className="text-[12px] text-(--color-text-secondary)">{tr("sur")} {formatValeur(o.cible, o.type, o.devise, tr.loc)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-(--color-surface-tertiary)" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={tr(o.titre)}>
                  <div className="h-full rounded-full bg-(--chart-primary)" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-[12px] text-(--color-text-secondary)">{pct}{tr("% atteint")}</p>
                <div className="mt-3 flex items-center gap-2">
                  {o.statut === "actif" && <Button size="sm" variant="ghost" onClick={() => changerStatut(o.id, "pause")}>{tr("Mettre en pause")}</Button>}
                  {o.statut === "pause" && <Button size="sm" variant="ghost" onClick={() => changerStatut(o.id, "actif")}>{tr("Reprendre")}</Button>}
                  <Button size="sm" variant="plain" className="ml-auto text-(--color-critical-text)" onClick={() => supprimer(o)}>{tr("Supprimer")}</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
