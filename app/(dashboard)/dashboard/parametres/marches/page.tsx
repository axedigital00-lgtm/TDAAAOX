"use client";
// Marchés : pays où la boutique vend, devise affichée, taux et arrondi (lib/commerce/marches.ts).
// L'encaissement reste dans la devise de la boutique ; « Aperçu » montre le prix vu par un acheteur du marché.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Card, Field, Toggle } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { DEVISES, DEVISE_PAYS, prixMarche, type Marche } from "@/lib/commerce/marches";

const ARRONDIS: { v: Marche["arrondi"]; l: string }[] = [
  { v: "aucun", l: "Aucun" }, { v: "unite", l: "À l'unité" }, { v: "dizaine", l: "À la dizaine" },
  { v: "centaine", l: "À la centaine" }, { v: "99", l: "Terminaison en 99" },
];

const MODELES: Omit<Marche, "id">[] = [
  { nom: "Afrique centrale (CEMAC)", pays: ["CM", "GA", "CG", "TD", "CF", "GQ"], devise: "XAF", ajustementPct: 0, arrondi: "aucun", actif: true },
  { nom: "Afrique de l'Ouest (UEMOA)", pays: ["SN", "CI", "BJ", "TG", "BF", "ML", "NE"], devise: "XOF", ajustementPct: 0, arrondi: "aucun", actif: true },
  { nom: "Nigeria", pays: ["NG"], devise: "NGN", ajustementPct: 0, arrondi: "centaine", actif: true },
  { nom: "Europe", pays: ["FR", "BE", "DE"], devise: "EUR", ajustementPct: 0, arrondi: "99", actif: true },
];

const nouvelId = () => Math.random().toString(36).slice(2, 10);

export default function MarchesPage() {
  const t = useT();
  const [devise, setDevise] = useState("XAF");
  const [marches, setMarches] = useState<Marche[] | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [exemple, setExemple] = useState(10000);

  useEffect(() => {
    fetch("/api/tenant/marches").then((r) => r.json()).then((d) => {
      setDevise(d.devise ?? "XAF");
      setMarches(d.marches ?? []);
    }).catch(() => setMarches([]));
  }, []);

  function maj(i: number, champ: Partial<Marche>) {
    setMarches((ms) => ms!.map((m, j) => (j === i ? { ...m, ...champ } : m)));
  }

  async function enregistrer() {
    setEnvoi(true);
    const r = await fetch("/api/tenant/marches", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ marches }) });
    const d = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) return void toast.error(t(d.error ?? "Enregistrement impossible"));
    setMarches(d.marches);
    toast.success(t("Marchés enregistrés"));
  }

  const dejaPris = new Set((marches ?? []).flatMap((m) => m.pays));

  return (
    <Page width="narrow">
      <PageHeader icon="globe" title={t("Marchés")} backHref="/dashboard/parametres"
        primaryAction={{ content: t("Enregistrer"), onAction: enregistrer, loading: envoi, disabled: !marches }} />
      <div className="axd-stack">
        <Banner>{t("Regroupez des pays dans un marché pour y afficher les prix dans la devise locale, avec le taux et l'arrondi de votre choix. Le paiement reste encaissé dans la devise de votre boutique ({0}).").replace("{0}", devise)}</Banner>

        {marches === null ? (
          <Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement…")}</p></Card>
        ) : (
          <>
            {marches.map((m, i) => {
              const apercu = prixMarche(exemple, devise, { ...m, ajustementPct: 0, actif: true });
              return (
                <Card key={m.id} title={m.nom || t("Marché sans nom")}
                  actions={<Badge tone={m.actif ? "success" : undefined}>{m.actif ? t("Actif") : t("Inactif")}</Badge>}>
                  <div style={{ display: "grid", gap: "var(--space-300)" }}>
                    <Field label={t("Nom")}>{(p) => <input {...p} className="axd-input" value={m.nom} onChange={(e) => maj(i, { nom: e.target.value })} />}</Field>
                    <Field label={t("Pays (codes ISO séparés par des virgules)")} help={t("Exemple : SN, CI, BJ. Un pays ne peut appartenir qu'à un seul marché.")}>
                      {(p) => <input {...p} className="axd-input" value={m.pays.join(", ")}
                        onChange={(e) => maj(i, { pays: e.target.value.toUpperCase().split(/[\s,;]+/).filter((x) => /^[A-Z]{2}$/.test(x)) })} />}
                    </Field>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-300)" }}>
                      <Field label={t("Devise affichée")}>
                        {(p) => <select {...p} className="axd-input" value={m.devise} onChange={(e) => maj(i, { devise: e.target.value, taux: undefined })}>{DEVISES.map((d) => <option key={d}>{d}</option>)}</select>}
                      </Field>
                      <Field label={t("Arrondi")}>
                        {(p) => <select {...p} className="axd-input" value={m.arrondi} onChange={(e) => maj(i, { arrondi: e.target.value as Marche["arrondi"] })}>{ARRONDIS.map((a) => <option key={a.v} value={a.v}>{t(a.l)}</option>)}</select>}
                      </Field>
                      <Field label={t("Taux pour 1 EUR (facultatif)")} help={t("Vide = taux de référence")}>
                        {(p) => <input {...p} type="number" min={0} step="any" className="axd-input" value={m.taux ?? ""} onChange={(e) => maj(i, { taux: Number(e.target.value) > 0 ? Number(e.target.value) : undefined })} />}
                      </Field>
                    </div>
                    <p className="axd-muted" style={{ margin: 0, fontSize: 13 }}>
                      {t("Aperçu")} : {exemple.toLocaleString("fr-FR")} {devise} → <strong>{apercu.montant.toLocaleString("fr-FR")} {apercu.devise}</strong>
                    </p>
                    <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
                      <Toggle checked={m.actif} onChange={(v) => maj(i, { actif: v })} label={t("Marché actif")} />
                      <Button variant="plain" onClick={() => setMarches((ms) => ms!.filter((_, j) => j !== i))}>{t("Supprimer ce marché")}</Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            <Card title={t("Ajouter un marché")}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {MODELES.filter((mo) => !mo.pays.some((p) => dejaPris.has(p))).map((mo) => (
                  <Button key={mo.nom} onClick={() => setMarches((ms) => [...ms!, { ...mo, id: nouvelId() }])}>{t(mo.nom)}</Button>
                ))}
                <Button variant="plain" onClick={() => setMarches((ms) => [...ms!, { id: nouvelId(), nom: t("Nouveau marché"), pays: [], devise: DEVISE_PAYS.CM, ajustementPct: 0, arrondi: "aucun", actif: true }])}>{t("Marché personnalisé")}</Button>
              </div>
              <Field label={t("Prix d'exemple pour l'aperçu ({0})").replace("{0}", devise)}>
                {(p) => <input {...p} type="number" min={1} className="axd-input" style={{ maxWidth: 200, marginTop: 12 }} value={exemple} onChange={(e) => setExemple(Number(e.target.value) || 0)} />}
              </Field>
            </Card>
          </>
        )}
      </div>
    </Page>
  );
}
