"use client";
// Réductions (masterprompt §8.14) — codes promo : vues et recherche dans l'URL, création en fenêtre.
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { useDevise } from "@/components/dashboard/DeviseProvider";
import {
  Badge, Button, EmptyState, IconButton, IndexFilters, IndexTable, Modal, PageHeader, Select, TextField,
  useColonnesMasquees, type Column,
} from "@/components/ui/adm";
import { IllustrationReductions } from "@/components/ui/illustrations";
import { ErreurChargement, useConfirmationAdm } from "../kit-marketing";
import { BADGE_STATUT, filtrerReductions, statutReduction, type CodeReduction } from "./regles";

const FORM_VIDE = { code: "", type: "pourcentage", valeur: 10, maxUtilisations: "" };

function Reductions() {
  const t = useT();
  const { fmt } = useDevise();
  const params = useSearchParams();
  const { confirmer, dialogue } = useConfirmationAdm();
  const [masquees, setMasquees] = useColonnesMasquees("reductions", []);
  const [codes, setCodes] = useState<CodeReduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);

  const charger = () => {
    setLoading(true); setErreur(false);
    fetch("/api/codes-promo")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCodes(Array.isArray(d) ? d : []))
      .catch(() => setErreur(true))
      .finally(() => setLoading(false));
  };
  useEffect(charger, []);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/codes-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, valeur: Number(form.valeur), maxUtilisations: form.maxUtilisations ? Number(form.maxUtilisations) : null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ? t(d.error) : t("Le code n'a pas été créé. Vérifiez les champs et réessayez."));
        return;
      }
      const nouveau = await res.json();
      setCodes((prev) => [nouveau, ...prev]);
      setShowForm(false);
      setForm(FORM_VIDE);
      toast.success(t("Code promo {0} créé.", nouveau.code ?? form.code));
    } catch {
      toast.error(t("Connexion impossible : le code n'a pas été créé. Réessayez."));
    } finally {
      setSaving(false);
    }
  }

  async function supprimer(code: CodeReduction) {
    if (!(await confirmer({
      titre: t("Supprimer ce code promo ?"), objet: code.code,
      description: t("Vos clients ne pourront plus l'utiliser. Les commandes déjà passées avec ce code ne changent pas."),
      libelleConfirmer: t("Supprimer le code"),
    }))) return;
    try {
      const res = await fetch(`/api/codes-promo/${code.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCodes((prev) => prev.filter((c) => c.id !== code.id));
      toast.success(t("Code {0} supprimé.", code.code));
    } catch {
      toast.error(t("Le code {0} n'a pas été supprimé. Réessayez.", code.code));
    }
  }

  const remise = (c: CodeReduction) => c.type === "pourcentage" ? t("{0} % de remise", c.valeur) : t("{0} de remise", fmt(c.valeur));
  const admissibilite = (c: CodeReduction) => [
    c.produitIds?.length ? t("Certains produits") : t("Toute la boutique"),
    c.minCommande ? t("dès {0}", fmt(c.minCommande)) : null,
  ].filter(Boolean).join(" · ");

  const colonnes: Column<CodeReduction>[] = [
    { id: "titre", header: t("Titre"), mobilePrimary: true,
      cell: (c) => <span className="block"><span className="font-mono">{c.code}</span><span className="block text-xs font-normal text-(--color-text-secondary)">{remise(c)}</span></span> },
    { id: "statut", header: t("Statut"), cell: (c) => { const b = BADGE_STATUT[statutReduction(c)]; return <Badge tone={b.tone}>{t(b.label)}</Badge>; } },
    { id: "methode", header: t("Méthode"), cell: () => t("Code"), hideOnMobile: true },
    { id: "admissibilite", header: t("Admissibilité"), cell: admissibilite, hideOnMobile: true },
    { id: "type", header: t("Type"), cell: (c) => c.type === "pourcentage" ? t("Pourcentage") : t("Montant fixe") },
    { id: "utilisations", header: t("Utilisations"), numeric: true, align: "end", cell: (c) => `${c.utilisations}/${c.maxUtilisations ?? "∞"}` },
    { id: "actions", header: "", align: "end",
      cell: (c) => <IconButton icon="x" aria-label={t("Supprimer le code {0}", c.code)} onClick={() => supprimer(c)} /> },
  ];
  const lignes = filtrerReductions(codes, params.get("vue"), params.get("q"));
  const ouvrir = () => setShowForm(true);

  return (
    <div className="space-y-4">
      {dialogue}
      <PageHeader icon="discount" title={t("Réductions")} backHref="/dashboard/marketing"
        primaryAction={{ content: t("Créer une réduction"), onAction: ouvrir }} />

      {erreur ? (
        <ErreurChargement titre={t("Les codes promo n'ont pas pu être chargés")} onReessayer={charger} />
      ) : !loading && codes.length === 0 ? (
        <EmptyState title={t("Gérez vos réductions")} image={<IllustrationReductions />}
          actions={<Button variant="primary" onClick={ouvrir}>{t("Créer une réduction")}</Button>}>
          {t("Un code promo offre une remise à vos clients au moment du paiement. Créez votre premier code pour lancer une offre.")}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)">
          <IndexFilters
            views={[{ id: "toutes", label: t("Toutes") }, { id: "actives", label: t("Actives") }, { id: "expirees", label: t("Expirées") }]}
            filters={[]}
            sortOptions={[]}
            columns={colonnes.filter((c) => !c.mobilePrimary && c.id !== "actions").map((c) => ({ id: c.id, header: c.header }))}
            hiddenColumns={masquees}
            onHiddenColumnsChange={setMasquees}
            searchPlaceholder={t("Rechercher un code")}
          />
          <IndexTable label={t("Réductions")} rows={lignes} columns={colonnes} getId={(c) => c.id} loading={loading} hiddenColumns={masquees}
            emptyState={<p className="border-t border-(--color-border-secondary) px-6 py-12 text-center text-sm text-(--color-text-secondary)">{t("Aucune réduction ne correspond à cette vue.")}</p>} />
        </div>
      )}

      <Modal open={showForm} onClose={() => !saving && setShowForm(false)} title={t("Nouveau code promo")} size="sm"
        footer={<>
          <Button onClick={() => setShowForm(false)} disabled={saving}>{t("Annuler")}</Button>
          <Button variant="primary" type="submit" form="form-reduction" disabled={!form.code || !form.valeur} loading={saving}>{t("Créer le code")}</Button>
        </>}>
        <form id="form-reduction" onSubmit={creer} className="space-y-3">
          <TextField label={t("Code")} required value={form.code} placeholder="SOLDES25" className="font-mono"
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} helpText={t("Ce que le client tape au paiement.")} />
          <Select label={t("Type")} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={[{ value: "pourcentage", label: t("Pourcentage (%)") }, { value: "fixe", label: t("Montant fixe") }]} />
          <TextField label={t("Valeur")} required type="number" min={1} value={form.valeur}
            onChange={(e) => setForm({ ...form, valeur: Number(e.target.value) })} />
          <TextField label={t("Nombre maximum d'utilisations (facultatif)")} type="number" min={1} value={form.maxUtilisations} placeholder="∞"
            onChange={(e) => setForm({ ...form, maxUtilisations: e.target.value })} helpText={t("Laissez vide pour un nombre illimité.")} />
        </form>
      </Modal>
    </div>
  );
}

export default function CodesPromoPage() {
  return <Suspense fallback={null}><Reductions /></Suspense>;
}
