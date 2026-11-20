"use client";
// Création rapide d'un service, d'un abonnement ou d'un parcours : nom et prix, puis le produit
// (brouillon) s'ouvre ; ses réglages avancés passent par /api/produits/digitaux/[id]/reglages.
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Card, Field } from "@/components/dashboard/design-system/components/primitives";
import { Button } from "@/components/dashboard/design-system/components/Button";

const TYPES: Record<string, { titre: string; aide: string }> = {
  service: { titre: "Nouveau service", aide: "Coaching, consultation ou prestation avec livrable. Après la création, réglez vos disponibilités, la durée des séances et le questionnaire de brief." },
  abonnement: { titre: "Nouvel abonnement", aide: "Accès prépayé pour une durée (30 jours par défaut), renouvelable. Choisissez ensuite les formations et fichiers inclus." },
  parcours: { titre: "Nouveau parcours", aide: "Plusieurs formations enchaînées, avec un certificat final. Choisissez ensuite les formations et leur ordre." },
};

export default function CreerTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const t = useT();
  const router = useRouter();
  const conf = TYPES[type];
  const [nom, setNom] = useState("");
  const [prix, setPrix] = useState("");
  const [envoi, setEnvoi] = useState(false);

  if (!conf) return <Page><PageHeader title={t("Type inconnu")} backHref="/dashboard/produits/digital/nouveau" /></Page>;

  async function creer() {
    setEnvoi(true);
    const r = await fetch("/api/produits/digitaux", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom: nom.trim(), prix: Number(prix), type }) });
    const d = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) return void toast.error(t(d.error ?? "Création impossible"));
    toast.success(t("Produit créé en brouillon"));
    router.push(`/dashboard/produits/${d.produit.id}`);
  }

  return (
    <Page width="thin">
      <PageHeader title={t(conf.titre)} backHref="/dashboard/produits/digital/nouveau" />
      <Card>
        <p className="axd-muted" style={{ marginTop: 0 }}>{t(conf.aide)}</p>
        <div style={{ display: "grid", gap: "var(--space-300)" }}>
          <Field label={t("Nom")}>{(p) => <input {...p} className="axd-input" value={nom} onChange={(e) => setNom(e.target.value)} />}</Field>
          <Field label={type === "abonnement" ? t("Prix par période (FCFA)") : t("Prix (FCFA)")}>{(p) => <input {...p} type="number" min={1} className="axd-input" value={prix} onChange={(e) => setPrix(e.target.value)} />}</Field>
          <div><Button variant="primary" onClick={creer} loading={envoi} disabled={!nom.trim() || !(Number(prix) > 0)}>{t("Créer")}</Button></div>
        </div>
      </Card>
    </Page>
  );
}
