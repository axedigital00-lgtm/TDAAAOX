"use client";
import { useEffect, useState } from "react";
import { Plus, Star, Package, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Card, Field, Toggle } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";

const ENTREPOTS_TUTORIAL_STEPS = [
  { Icon: Plus,      titre: "Ajoute un entrepôt",           description: "Renseigne le nom, la ville et l'adresse pour créer un nouveau point de stockage." },
  { Icon: Star,      titre: "Définis l'entrepôt principal", description: "Marque un entrepôt comme principal — c'est celui utilisé par défaut pour ton stock." },
  { Icon: Package,   titre: "Suis le stock par site",       description: "Chaque entrepôt affiche le nombre de SKUs qui y sont stockés." },
  { Icon: Warehouse, titre: "Active ou désactive",          description: "Désactive temporairement un entrepôt sans perdre son historique de stock." },
];

interface Entrepot {
  id: string;
  nom: string;
  adresse: string | null;
  ville: string | null;
  pays: string;
  principal: boolean;
  actif: boolean;
  _count: { stocks: number };
}

const EMPTY = { nom: "", adresse: "", ville: "", pays: "Cameroun", principal: false };

export default function EntrepotsPage() {
  const t = useT();
  const [entrepots, setEntrepots] = useState<Entrepot[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/entrepots").then(r => r.json());
    setEntrepots(r.entrepots ?? []);
  }
  useEffect(() => { load(); }, []);

  // Un refus du serveur (entrepôt non vide, magasin rattaché…) s'affiche tel quel.
  async function envoyer(url: string, method: string, body?: unknown) {
    const r = await fetch(url, { method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
    if (!r.ok) toast.error(t((await r.json().catch(() => null))?.error ?? "Cette action n'a pas pu être enregistrée."));
    return r.ok;
  }

  async function save() {
    setLoading(true);
    const method = editId ? "PATCH" : "POST";
    const body = editId ? { ...form, id: editId } : form;
    if (await envoyer("/api/entrepots", method, body)) {
      setForm({ ...EMPTY });
      setEditId(null);
    }
    await load();
    setLoading(false);
  }

  async function toggleActif(e: Entrepot) {
    await envoyer("/api/entrepots", "PATCH", { id: e.id, actif: !e.actif });
    load();
  }

  async function setPrincipal(e: Entrepot) {
    await envoyer("/api/entrepots", "PATCH", { id: e.id, principal: true });
    load();
  }

  async function del(id: string) {
    if (!confirm(t("Supprimer cet entrepôt ?"))) return;
    await envoyer(`/api/entrepots?id=${id}`, "DELETE");
    load();
  }

  function startEdit(e: Entrepot) {
    setEditId(e.id);
    setForm({ nom: e.nom, adresse: e.adresse ?? "", ville: e.ville ?? "", pays: e.pays, principal: e.principal });
  }

  return (
    <Page width="narrow">
      <ModuleTutorial moduleKey="entrepots" titre={t("Entrepôts")} sousTitre={t("Tes points de stockage")} steps={ENTREPOTS_TUTORIAL_STEPS} />
      <PageHeader icon="box" backHref="/dashboard/logistique"
        title={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{t("Entrepôts")}<BoutonRevoirTutoriel moduleKey="entrepots" /></span>}
        extraActions={<AgentActiveIndicator label={t("Agent Stock actif")} />} />

      <div className="axd-grid axd-g3" style={{ marginBottom: "var(--space-400)" }}>
        {[
          { label: "Entrepôts", v: entrepots.length },
          { label: "Actifs", v: entrepots.filter(e => e.actif).length },
          { label: "Références stockées", v: entrepots.reduce((s, e) => s + e._count.stocks, 0) },
        ].map(s => (
          <div key={s.label} className="axd-card axd-card--pad">
            <div className="axd-kpi__t">{t(s.label)}</div>
            <div className="axd-kpi__v" style={{ marginBottom: 0 }}>{s.v.toLocaleString(t.loc)}</div>
          </div>
        ))}
      </div>

      <div className="axd-stack">
        <Card title={editId ? t("Modifier l'entrepôt") : t("Nouvel entrepôt")}>
          <div className="axd-grid axd-g2" style={{ gap: "var(--space-300)" }}>
            <Field label={t("Nom")}>{(p) => <input {...p} className="axd-input" placeholder={t("ex : Entrepôt Douala")} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />}</Field>
            <Field label={t("Ville")}>{(p) => <input {...p} className="axd-input" value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} />}</Field>
            <Field label={t("Adresse")}>{(p) => <input {...p} className="axd-input" value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} />}</Field>
            <Field label={t("Pays")}>{(p) => <input {...p} className="axd-input" value={form.pays} onChange={e => setForm(f => ({ ...f, pays: e.target.value }))} />}</Field>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "var(--space-300) 0" }}>
            <Toggle checked={form.principal} onChange={(v) => setForm(f => ({ ...f, principal: v }))} label={t("Entrepôt principal")} />
            <span>{t("Entrepôt principal")}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="primary" onClick={save} disabled={!form.nom} loading={loading}>{editId ? t("Enregistrer") : t("Créer l’entrepôt")}</Button>
            {editId && <Button onClick={() => { setEditId(null); setForm({ ...EMPTY }); }}>{t("Annuler")}</Button>}
          </div>
        </Card>

        <div className="axd-card" style={{ overflow: "hidden" }}>
          {!entrepots.length ? (
            <div className="axd-empty"><h3>{t("Aucun entrepôt")}</h3><p>{t("Créez votre premier entrepôt pour gérer le stock sur plusieurs sites.")}</p></div>
          ) : entrepots.map(e => (
            <div key={e.id} className="axd-livreur" style={e.actif ? undefined : { opacity: .6 }}>
              <div className="axd-livreur__ligne" style={{ flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <b style={{ color: "var(--color-text-strong)" }}>{t(e.nom)}</b>
                    {e.principal && <Badge tone="info">{t("Principal")}</Badge>}
                    {!e.actif && <Badge>{t("Inactif")}</Badge>}
                  </div>
                  <div className="axd-muted" style={{ fontSize: 12 }}>{[e.adresse, e.ville, e.pays].filter(Boolean).join(", ")} · {e._count.stocks.toLocaleString(t.loc)} {t("référence(s)")}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {!e.principal && <Button size="sm" variant="plain" onClick={() => setPrincipal(e)}>{t("Définir principal")}</Button>}
                  <Button size="sm" variant="plain" onClick={() => startEdit(e)}>{t("Modifier")}</Button>
                  <Button size="sm" variant="plain" onClick={() => toggleActif(e)}>{e.actif ? t("Désactiver") : t("Activer")}</Button>
                  <Button size="sm" variant="plain" onClick={() => del(e.id)}>{t("Supprimer")}</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}
