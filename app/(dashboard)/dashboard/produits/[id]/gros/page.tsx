"use client";
// Vente aux grossistes d'un produit : prix dégressifs par quantité et règles de quantité.
// Appliqués côté serveur au checkout (app/api/commandes/whatsapp-creer).
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Card, Field } from "@/components/dashboard/design-system/components/primitives";
import { Button } from "@/components/dashboard/design-system/components/Button";

type Palier = { min: number; prix: number };
const nombre = (v: string) => (v.trim() === "" ? undefined : Math.max(Math.floor(Number(v)) || 0, 0) || undefined);

export default function VenteGrosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const [produit, setProduit] = useState<{ nom: string; prix: number } | null>(null);
  const [paliers, setPaliers] = useState<Palier[]>([]);
  const [min, setMin] = useState(""); const [max, setMax] = useState(""); const [multiple, setMultiple] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    fetch(`/api/produits/${id}/gros`).then((r) => r.json()).then((d) => {
      if (!d.produit) return;
      setProduit(d.produit);
      const g = d.produit.venteGros;
      if (g) { setPaliers(g.paliers ?? []); setMin(g.min ? String(g.min) : ""); setMax(g.max ? String(g.max) : ""); setMultiple(g.multiple ? String(g.multiple) : ""); }
    });
  }, [id]);

  async function envoyer(corps: unknown) {
    setEnvoi(true);
    const r = await fetch(`/api/produits/${id}/gros`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const d = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) return void toast.error(t(d.error ?? "Enregistrement impossible"));
    toast.success(t("Vente en gros enregistrée"));
  }

  const enregistrer = () => envoyer({ paliers: paliers.filter((p) => p.min >= 2 && p.prix > 0), min: nombre(min), max: nombre(max), multiple: nombre(multiple) });
  const desactiver = () => { setPaliers([]); setMin(""); setMax(""); setMultiple(""); envoyer({ desactiver: true }); };

  return (
    <Page width="narrow">
      <PageHeader icon="box" title={t("Vente en gros")} titleMeta={produit?.nom} backHref={`/dashboard/produits/${id}`}
        primaryAction={{ content: t("Enregistrer"), onAction: enregistrer, loading: envoi, disabled: !produit }} />
      <div className="axd-stack">
        <Banner>{t("Les prix dégressifs s'appliquent automatiquement au panier selon la quantité commandée. Le prix normal reste celui de la fiche produit.")}</Banner>

        <Card title={t("Prix dégressifs")}>
          <p className="axd-muted" style={{ marginTop: 0 }}>{t("Prix normal")} : <strong>{produit ? `${produit.prix.toLocaleString("fr-FR")} FCFA` : "…"}</strong></p>
          <div style={{ display: "grid", gap: 10 }}>
            {paliers.map((p, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
                <Field label={t("À partir de (unités)")}>{(f) => <input {...f} type="number" min={2} className="axd-input" value={p.min || ""} onChange={(e) => setPaliers((ps) => ps.map((x, j) => (j === i ? { ...x, min: Number(e.target.value) || 0 } : x)))} />}</Field>
                <Field label={t("Prix unitaire (FCFA)")}>{(f) => <input {...f} type="number" min={1} className="axd-input" value={p.prix || ""} onChange={(e) => setPaliers((ps) => ps.map((x, j) => (j === i ? { ...x, prix: Number(e.target.value) || 0 } : x)))} />}</Field>
                <Button variant="plain" onClick={() => setPaliers((ps) => ps.filter((_, j) => j !== i))}>{t("Retirer")}</Button>
              </div>
            ))}
            {paliers.length < 10 && (
              <div><Button onClick={() => setPaliers((ps) => [...ps, { min: (ps.at(-1)?.min ?? 0) + 10 || 10, prix: 0 }])}>{t("Ajouter un palier")}</Button></div>
            )}
          </div>
        </Card>

        <Card title={t("Règles de quantité")}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-300)" }}>
            <Field label={t("Minimum par commande")}>{(f) => <input {...f} type="number" min={1} className="axd-input" value={min} onChange={(e) => setMin(e.target.value)} />}</Field>
            <Field label={t("Maximum par commande")}>{(f) => <input {...f} type="number" min={1} className="axd-input" value={max} onChange={(e) => setMax(e.target.value)} />}</Field>
            <Field label={t("Vendu par multiples de")} help={t("Ex. 6 pour un carton de 6")}>{(f) => <input {...f} type="number" min={1} className="axd-input" value={multiple} onChange={(e) => setMultiple(e.target.value)} />}</Field>
          </div>
        </Card>

        <div><Button variant="plain" onClick={desactiver} disabled={envoi}>{t("Désactiver la vente en gros")}</Button></div>
      </div>
    </Page>
  );
}
