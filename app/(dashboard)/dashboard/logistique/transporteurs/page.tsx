"use client";
import { useEffect, useState } from "react";
import { Truck, ToggleRight, KeyRound, Settings } from "lucide-react";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";

import { useDevise } from "@/components/dashboard/DeviseProvider";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Field, Toggle } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
const TRANSPORTEURS_TUTORIAL_STEPS = [
  { Icon: Truck,        titre: "Tes partenaires de livraison", description: "Chaque transporteur est listé avec ses zones de couverture et son logo." },
  { Icon: ToggleRight,  titre: "Active un transporteur",       description: "Bascule l'interrupteur pour le rendre disponible lors de la création d'une livraison." },
  { Icon: KeyRound,     titre: "Configure la clé API",         description: "Ajoute la clé API du transporteur pour synchroniser le suivi des colis automatiquement." },
  { Icon: Settings,     titre: "Fixe un tarif",                description: "Renseigne un tarif fixe optionnel pour standardiser le coût de livraison de ce partenaire." },
];

type Transporteur = {
  code: string; nom: string; zones: string[]; logo: string;
  actif: boolean; apiKey: string; tarif: number | null;
};

export default function TransporteursPage() {
  const tr = useT();
  const { devise } = useDevise();
  const [liste, setListe] = useState<Transporteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [tarif, setTarif] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/transporteurs").then(r => r.json()).then(d => { setListe(d.transporteurs ?? []); setLoading(false); });
  }, []);

  async function toggle(code: string, current: boolean) {
    setSaving(true);
    await fetch("/api/transporteurs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, actif: !current }) });
    setListe(l => l.map(t => t.code === code ? { ...t, actif: !current } : t));
    setSaving(false);
  }

  async function saveConfig(code: string) {
    setSaving(true);
    await fetch("/api/transporteurs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, apiKey, tarif: tarif ? parseFloat(tarif) : null }) });
    setEditing(null); setApiKey(""); setTarif(""); setSaving(false);
    const d = await fetch("/api/transporteurs").then(r => r.json());
    setListe(d.transporteurs ?? []);
  }

  const entete = (
    <PageHeader icon="truck" backHref="/dashboard/logistique"
      title={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{tr("Transporteurs")}<BoutonRevoirTutoriel moduleKey="transporteurs" /></span>} />
  );
  if (loading) return <Page width="narrow">{entete}<div className="axd-card"><p className="axd-fichiers__etat">{tr("Chargement…")}</p></div></Page>;

  return (
    <Page width="narrow">
      <ModuleTutorial moduleKey="transporteurs" titre={tr("Transporteurs")} sousTitre={tr("Partenaires de livraison")} steps={TRANSPORTEURS_TUTORIAL_STEPS} />
      {entete}
      <div className="axd-card" style={{ overflow: "hidden" }}>
        <div className="axd-card__head" style={{ padding: "var(--space-300) var(--space-400)" }}>
          <div>
            <h2 className="axd-card__title">{tr("Partenaires de livraison")}</h2>
            <p className="axd-muted" style={{ margin: "2px 0 0", fontSize: 12 }}>{tr("Les transporteurs actifs sont proposés à la création d’une livraison.")}</p>
          </div>
        </div>
        {liste.map(t => (
          <div key={t.code} className="axd-livreur">
            <div className="axd-livreur__ligne">
              <span className="axd-thumb" aria-hidden style={{ fontSize: 18 }}>{t.logo}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <b style={{ color: "var(--color-text-strong)" }}>{tr(t.nom)}</b>
                  {t.actif && <Badge tone="success">{tr("Actif")}</Badge>}
                </div>
                <div className="axd-muted" style={{ fontSize: 12 }}>
                  {t.zones.join(", ")}{t.tarif ? ` · ${tr("Tarif fixe :")} ${t.tarif.toLocaleString(tr.loc)} ${devise === "XAF" ? "FCFA" : devise}` : ""}
                </div>
              </div>
              <Button size="sm" variant="plain" onClick={() => { setEditing(editing === t.code ? null : t.code); setApiKey(""); setTarif(t.tarif?.toString() ?? ""); }}>{tr("Configurer")}</Button>
              <Toggle checked={t.actif} onChange={() => toggle(t.code, t.actif)} disabled={saving} label={tr("Activer {0}", t.nom)} />
            </div>
            {editing === t.code && (
              <div className="axd-grid axd-g2" style={{ gap: "var(--space-300)", alignItems: "end" }}>
                <Field label={tr("Clé API")} help={tr("Laisser vide pour ne pas changer")}>{(p) => <input {...p} className="axd-input" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} />}</Field>
                <Field label={tr("Tarif fixe {0} (optionnel)", devise === "XAF" ? "FCFA" : devise)}>{(p) => <input {...p} className="axd-input" type="number" value={tarif} onChange={e => setTarif(e.target.value)} />}</Field>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button size="sm" variant="primary" onClick={() => saveConfig(t.code)} loading={saving}>{tr("Enregistrer")}</Button>
                  <Button size="sm" onClick={() => setEditing(null)}>{tr("Annuler")}</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Page>
  );
}
