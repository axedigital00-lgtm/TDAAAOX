"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Target, Plus, X, Loader2, TrendingUp, ShoppingCart, Users, Wallet,
  Pause, Play, Trash2, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";

import { useDevise } from "@/components/dashboard/DeviseProvider";
import { useT } from "@/components/I18nProvider";
import { Badge, Bouton, BoutonIcone, EnTetePage, EtatErreur, EtatVide, Saisie, SqueletteListe, useConfirmation, type Ton } from "@/components/ui";
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

const TYPE_META: Record<TypeObjectif, { label: string; Icon: any; couleur: string }> = {
  ca:           { label: "Chiffre d'affaires", Icon: Wallet,       couleur: "#F5A623" },
  commandes:    { label: "Commandes",          Icon: ShoppingCart, couleur: "#3b82f6" },
  clients:      { label: "Nouveaux clients",   Icon: Users,        couleur: "#8b5cf6" },
  panier_moyen: { label: "Panier moyen",       Icon: TrendingUp,   couleur: "#10b981" },
};

const STATUT_META: Record<string, { label: string; couleur: string; Icon: any; ton: Ton }> = {
  actif:   { label: "En cours",  couleur: "#3b82f6", Icon: Clock,        ton: "info" },
  atteint: { label: "Atteint",   couleur: "#10b981", Icon: CheckCircle2, ton: "succes" },
  echoue:  { label: "Échoué",    couleur: "#ef4444", Icon: XCircle,      ton: "erreur" },
  pause:   { label: "En pause",  couleur: "#9ca3af", Icon: Pause,        ton: "neutre" },
};

function formatValeur(v: number, type: TypeObjectif, devise: string) {
  if (type === "clients" || type === "commandes") return v.toLocaleString("fr-FR");
  return `${v.toLocaleString("fr-FR")} ${devise}`;
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
      toast.error(e?.message ? tr(e.message) : tr("L'objectif n'a pas été créé. Vérifie les champs et réessaie."));
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
    if (!res?.ok) toast.error(tr("Le changement n'a pas été enregistré. Réessaie."));
    charger();
  }

  async function supprimer(o: Objectif) {
    if (!(await confirmer({ titre: tr("Supprimer cet objectif ?"), objet: o.titre, description: tr("Sa progression ne sera plus suivie. Tes ventes ne sont pas touchées."), libelleConfirmer: tr("Supprimer l'objectif") }))) return;
    const res = await fetch(`/api/objectifs/${o.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) toast.error(tr("L'objectif n'a pas été supprimé. Réessaie."));
    else toast.success(tr("Objectif « {0} » supprimé.", o.titre));
    charger();
  }

  return (
    <div className="space-y-6">
      {dialogue}
      <ModuleTutorial moduleKey="objectifs" titre={tr("Objectifs")} sousTitre={tr("Fixe et suis tes ambitions")} steps={OBJECTIFS_TUTORIAL_STEPS} />
      <EnTetePage className="mb-0"
        titre={<span className="inline-flex items-center gap-2"><Target className="size-5 text-attention" aria-hidden />{tr("Objectifs")}</span>}
        indicateurs={<BoutonRevoirTutoriel moduleKey="objectifs" />}
        description={tr("Fixez des objectifs pour votre boutique et suivez votre progression en temps réel")}
        actions={!showForm && <Bouton onClick={() => setShowForm(true)} icone={<Plus className="size-4" aria-hidden />}>{tr("Nouvel objectif")}</Bouton>} />

      {/* Formulaire de création */}
      {showForm && (
        <form onSubmit={creer} noValidate className="ax-card p-6 space-y-champs">
          <div className="flex items-center justify-between">
            <h2 className="ax-sous-titre">{tr("Nouvel objectif")}</h2>
            <BoutonIcone label={tr("Fermer le formulaire")} onClick={() => setShowForm(false)}><X className="size-5" aria-hidden /></BoutonIcone>
          </div>

          <fieldset>
            <legend className="ax-libelle mb-2">{tr("Type d'objectif")}</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(TYPE_META) as TypeObjectif[]).map(t => {
                const meta = TYPE_META[t];
                const active = form.type === t;
                return (
                  <button key={t} type="button" aria-pressed={active} onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-controle border-2 transition-colors ${active ? "border-primaire bg-primaire-fond" : "border-bordure hover:border-bordure-forte"}`}>
                    <meta.Icon size={16} aria-hidden style={{ color: active ? meta.couleur : undefined }} className={active ? "" : "text-doux"} />
                    <span className={`text-xs font-semibold text-center ${active ? "text-encre" : "text-doux"}`}>{tr(meta.label)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Saisie label={tr("Titre")} required value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
            placeholder={tr("Ex : Atteindre 1 000 000 {0} ce mois-ci", devise)}
            erreur={tente && !form.titre.trim() ? tr("Donne un titre à ton objectif.") : undefined} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Saisie label={tr("Cible")} required type="number" min="0" value={form.cible} onChange={e => setForm(f => ({ ...f, cible: e.target.value }))}
              placeholder="1000000" suffixe={form.type === "ca" || form.type === "panier_moyen" ? devise : undefined}
              erreur={tente && !form.cible ? tr("Indique la valeur à atteindre.") : undefined} />
            <Saisie label={tr("Date limite")} required type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              min={new Date().toISOString().slice(0, 10)}
              erreur={tente && !form.deadline ? tr("Choisis la date limite.") : undefined} />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Bouton variante="secondaire" onClick={() => setShowForm(false)} disabled={saving}>{tr("Annuler")}</Bouton>
            <Bouton type="submit" charge={saving} texteCharge={tr("Création…")}>{tr("Créer l'objectif")}</Bouton>
          </div>
        </form>
      )}

      {/* Liste */}
      {erreur ? (
        <EtatErreur titre={tr("Tes objectifs n'ont pas pu être chargés")} texte={tr("Vérifie ta connexion et réessaie.")} onReessayer={charger} />
      ) : objectifs === null ? (
        <SqueletteListe lignes={3} libelle={tr("Chargement des objectifs…")} />
      ) : objectifs.length === 0 ? (
        <EtatVide icone={<Target />} titre={tr("Aucun objectif pour le moment")}
          texte={tr("Créez-en un pour commencer à suivre votre progression.")}>
          {!showForm && <Bouton onClick={() => setShowForm(true)} icone={<Plus className="size-4" aria-hidden />}>{tr("Nouvel objectif")}</Bouton>}
        </EtatVide>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {objectifs.map(o => {
            const meta = TYPE_META[o.type];
            const sMeta = STATUT_META[o.statut] ?? STATUT_META.actif;
            const pct = Math.min(100, Math.round((o.actuel / o.cible) * 100));
            return (
              <div key={o.id} className="ax-card p-5 space-y-3.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${meta.couleur}15` }}>
                      <meta.Icon size={16} style={{ color: meta.couleur }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-encre truncate">{tr(o.titre)}</p>
                      <p className="ax-aide">{tr(meta.label)}{" "}{tr("· échéance")}{" "}{new Date(o.deadline).toLocaleDateString(tr.loc)}</p>
                    </div>
                  </div>
                  <Badge ton={sMeta.ton} icone={<sMeta.Icon aria-hidden />} className="flex-shrink-0">{tr(sMeta.label)}</Badge>
                </div>

                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm font-black text-encre">{formatValeur(o.actuel, o.type, o.devise)}</span>
                    <span className="ax-aide">{tr("sur")} {formatValeur(o.cible, o.type, o.devise)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-carte-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: sMeta.couleur }} />
                  </div>
                  <p className="ax-aide mt-1">{pct}{tr("% atteint")}</p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {o.statut === "actif" && (
                    <Bouton variante="fantome" taille="compact" onClick={() => changerStatut(o.id, "pause")} icone={<Pause className="size-3.5" aria-hidden />}>
                      {tr("Mettre en pause")}
                    </Bouton>
                  )}
                  {o.statut === "pause" && (
                    <Bouton variante="fantome" taille="compact" onClick={() => changerStatut(o.id, "actif")} icone={<Play className="size-3.5" aria-hidden />}>
                      {tr("Reprendre")}
                    </Bouton>
                  )}
                  <Bouton variante="danger" taille="compact" className="ml-auto" onClick={() => supprimer(o)} icone={<Trash2 className="size-3.5" aria-hidden />}>
                    {tr("Supprimer")}
                  </Bouton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
