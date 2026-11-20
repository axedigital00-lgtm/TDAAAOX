"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { Modal } from "@/components/dashboard/design-system/components/Modal";
import { Field, Toggle } from "@/components/dashboard/design-system/components/primitives";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { FulfillmentKanban } from "@/components/dashboard/logistique/FulfillmentKanban";
import { useT } from "@/components/I18nProvider";
import { PAYS_OPTIONS, GROUPES_PAYS } from "@/lib/devise-convert";
import { lireReglagesLivraison, trouverZone } from "@/lib/livraison-reglages";

interface ReglePort {
  id: string;
  nom: string;
  pays: string[];
  zone: string;
  poidsMin: number;
  poidsMax: number | null;
  montantMin: number | null;
  frais: number;
  fraisKg: number;
  delai: string;
  transporteur: string | null;
  gratuit: boolean;
  actif: boolean;
  modeLivraison: string;
}

const MODES_LIVRAISON = [
  { id: "livreur_local", label: "Livreur local (moto)" },
  { id: "agence_voyage", label: "Agence de voyage" },
  { id: "transporteur_intl", label: "Transporteur international" },
];

const AGENCES_SUGGEST = ["GEV", "Touristique Express", "Buca Voyages", "Vatican Express", "Finex Voyages"];

interface Commande {
  id: string;
  numero: string;
  clientNom: string;
  montantTotal: number;
  devise: string;
  statut: string;
  livraisonStatut: string;
  transporteur: string | null;
  numeroSuivi: string | null;
  createdAt: string;
}

const STATUT_LIVRAISON: Record<string, { label: string; tone: "neutral" | "attention" | "info" | "success" | "critical" }> = {
  non_expediee: { label: "Non expédiée", tone: "attention" },
  en_preparation: { label: "En préparation", tone: "info" },
  expediee: { label: "Expédiée", tone: "info" },
  livree: { label: "Livrée", tone: "success" },
  retour: { label: "Retour", tone: "critical" },
};

const NOM_PAYS = Object.fromEntries(PAYS_OPTIONS.map((p) => [p.code, p.nom]));

export function LivraisonPanel() {
  const tx = useT();
  const [tab, setTab] = useState<"commandes" | "regles">("commandes");
  const [vue, setVue] = useState<"kanban" | "table">("kanban");
  const [regles, setRegles] = useState<ReglePort[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nom: "", pays: [] as string[], zone: "", poidsMin: 0, poidsMax: "", montantMin: "",
    frais: 0, fraisKg: 0, delai: "3-5 jours", transporteur: "", gratuit: false,
    modeLivraison: "livreur_local",
  });
  const [zonesConfigurees, setZonesConfigurees] = useState<string[]>([]);
  const [paysBoutique, setPaysBoutique] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/livraison/regles").then((r) => r.json()),
      fetch("/api/commandes").then((r) => r.json()),
      fetch("/api/tenants/moi").then((r) => r.json()),
    ]).then(([{ regles }, data, tenantData]) => {
      setRegles(regles ?? []);
      setCommandes(data?.commandes ?? []);
      setZonesConfigurees(lireReglagesLivraison(tenantData?.tenant?.parametresLivraison).zones.map((z) => z.nom));
      const paysT = tenantData?.tenant?.pays ?? "";
      setPaysBoutique(paysT);
      if (paysT) setForm((f) => ({ ...f, pays: [paysT] }));
    }).finally(() => setLoading(false));
  }, []);

  const ajouterPays = (codes: string[]) => setForm((f) => ({ ...f, pays: [...new Set([...f.pays, ...codes])] }));
  const resumePays = (codes: string[]) => !codes.length ? tx("Tous les pays")
    : codes.length > 3 ? `${codes.slice(0, 3).map((c) => tx(NOM_PAYS[c] ?? c)).join(", ")} +${codes.length - 3}`
    : codes.map((c) => tx(NOM_PAYS[c] ?? c)).join(", ");

  async function saveRegle() {
    setSaving(true);
    const res = await fetch("/api/livraison/regles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        poidsMax: form.poidsMax ? Number(form.poidsMax) : null,
        montantMin: form.montantMin ? Number(form.montantMin) : null,
        frais: Number(form.frais),
        fraisKg: Number(form.fraisKg),
      }),
    });
    const data = await res.json();
    if (data.regle) {
      setRegles((prev) => [data.regle, ...prev]);
      setForm({ nom: "", pays: paysBoutique ? [paysBoutique] : [], zone: "", poidsMin: 0, poidsMax: "", montantMin: "", frais: 0, fraisKg: 0, delai: "3-5 jours", transporteur: "", gratuit: false, modeLivraison: "livreur_local" });
      setShowForm(false);
    }
    setSaving(false);
  }

  async function deleteRegle(id: string) {
    await fetch(`/api/livraison/regles?id=${id}`, { method: "DELETE" });
    setRegles((prev) => prev.filter((r) => r.id !== id));
  }

  async function toggleRegle(regle: ReglePort) {
    const res = await fetch("/api/livraison/regles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: regle.id, actif: !regle.actif }),
    });
    const data = await res.json();
    if (data.regle) setRegles((prev) => prev.map((r) => r.id === regle.id ? data.regle : r));
  }

  const stats = {
    enPrep: commandes.filter((c) => c.livraisonStatut === "en_preparation").length,
    expediees: commandes.filter((c) => c.livraisonStatut === "expediee").length,
    livrees: commandes.filter((c) => c.livraisonStatut === "livree").length,
    nonExpediees: commandes.filter((c) => c.livraisonStatut === "non_expediee").length,
  };

  if (loading) return <div className="axd-card"><p className="axd-fichiers__etat">{tx("Chargement…")}</p></div>;

  const champ = (label: string, contenu: (p: { id: string }) => React.ReactNode, aide?: string) => <Field label={label} help={aide}>{contenu}</Field>;

  return (
    <div className="axd-stack">
      <div className="axd-grid axd-g4">
        {[
          { label: "Non expédiées", value: stats.nonExpediees },
          { label: "En préparation", value: stats.enPrep },
          { label: "Expédiées", value: stats.expediees },
          { label: "Livrées", value: stats.livrees },
        ].map(({ label, value }) => (
          <div key={label} className="axd-card axd-card--pad">
            <div className="axd-kpi__t">{tx(label)}</div>
            <div className="axd-kpi__v" style={{ marginBottom: 0 }}>{value.toLocaleString(tx.loc)}</div>
          </div>
        ))}
      </div>

      <div className="axd-card" style={{ overflow: "hidden" }}>
        <div className="axd-ix-bar">
          <div className="axd-ix-tabs" role="tablist">
            <button type="button" role="tab" className="axd-ix-tab" aria-selected={tab === "commandes"} onClick={() => setTab("commandes")}>{tx("Commandes à livrer")}</button>
            <button type="button" role="tab" className="axd-ix-tab" aria-selected={tab === "regles"} onClick={() => setTab("regles")}>{tx("Tarifs de livraison")}</button>
          </div>
          <span style={{ flex: 1 }} />
          {tab === "commandes" ? (
            <span className="axd-seg">
              <button type="button" className="axd-btn axd-btn--sm" aria-current={vue === "kanban" ? "page" : undefined} onClick={() => setVue("kanban")}>{tx("Colonnes")}</button>
              <button type="button" className="axd-btn axd-btn--sm" aria-current={vue === "table" ? "page" : undefined} onClick={() => setVue("table")}>{tx("Liste")}</button>
            </span>
          ) : (
            <Button size="sm" onClick={() => setShowForm(true)}>{tx("Ajouter un tarif")}</Button>
          )}
          <AgentActiveIndicator label={tx("Agent Livraison actif")} />
        </div>

        {tab === "commandes" && vue === "kanban" && <div style={{ padding: "var(--space-400)" }}><FulfillmentKanban /></div>}

        {tab === "commandes" && vue === "table" && (commandes.length === 0 ? (
          <div className="axd-empty"><h3>{tx("Aucune commande à expédier")}</h3><p>{tx("Les commandes confirmées apparaissent ici, prêtes à être préparées et confiées à un livreur.")}</p></div>
        ) : (
          <div className="axd-ix-wrap">
            <table className="axd-ix">
              <thead><tr><th>{tx("Commande")}</th><th>{tx("Client")}</th><th>{tx("Livraison")}</th><th className="axd-ix-num">{tx("Total")}</th><th className="axd-ix-hide-m">{tx("Suivi")}</th></tr></thead>
              <tbody>
                {commandes.map((c) => {
                  const st = STATUT_LIVRAISON[c.livraisonStatut] ?? { label: c.livraisonStatut.replace(/_/g, " "), tone: "neutral" as const };
                  return (
                    <tr key={c.id} className="axd-ix-link" onClick={() => { window.location.href = `/dashboard/commandes/${c.id}`; }}>
                      <td className="axd-ix-primary">{c.numero}</td>
                      <td>{tx(c.clientNom)}</td>
                      <td><Badge tone={st.tone}>{tx(st.label)}</Badge></td>
                      <td className="axd-ix-num">{c.montantTotal.toLocaleString(tx.loc)} {c.devise === "XAF" ? "FCFA" : c.devise}</td>
                      <td className="axd-ix-hide-m">{c.numeroSuivi ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {tab === "regles" && (regles.length === 0 ? (
          <div className="axd-empty">
            <h3>{tx("Définissez vos tarifs de livraison")}</h3>
            <p>{tx("Par pays, ville ou quartier : frais fixes, frais au kilo, délai et livraison offerte dès un montant.")}</p>
            <div className="axd-empty__actions"><Button variant="primary" onClick={() => setShowForm(true)}>{tx("Ajouter un tarif")}</Button></div>
          </div>
        ) : (
          <div className="axd-ix-wrap">
            <table className="axd-ix">
              <thead><tr><th>{tx("Tarif")}</th><th className="axd-ix-hide-m">{tx("Zone")}</th><th className="axd-ix-hide-m">{tx("Délai")}</th><th className="axd-ix-num">{tx("Frais")}</th><th>{tx("Actif")}</th><th /></tr></thead>
              <tbody>
                {regles.map((r) => {
                  const zoneInconnue = r.zone.trim() && zonesConfigurees.length > 0 && (!r.pays.length || r.pays.includes(paysBoutique)) && !trouverZone(zonesConfigurees.map((nom) => ({ nom, frais: null, delai: "" })), r.zone);
                  return (
                    <tr key={r.id} style={r.actif ? undefined : { opacity: .55 }}>
                      <td className="axd-ix-primary" style={{ whiteSpace: "normal" }}>
                        {tx(r.nom)}{r.modeLivraison === "agence_voyage" && <> <Badge>{tx("Agence de voyage")}</Badge></>}
                        {r.transporteur && <div className="axd-muted" style={{ fontWeight: 400, fontSize: 12 }}>{r.transporteur}</div>}
                        {/* Dans le pays de la boutique, le client choisit sa zone dans la liste : un quartier absent n'est jamais choisi. */}
                        {zoneInconnue && <div style={{ fontWeight: 400, fontSize: 12, color: "var(--banner-warning-text)" }}>{tx("« {0} » n'est pas dans vos zones (Ma boutique → Livraison) : vos clients ne peuvent pas la choisir.", r.zone)}</div>}
                      </td>
                      <td className="axd-ix-hide-m">{resumePays(r.pays)}{r.zone ? ` · ${r.zone}` : ""}</td>
                      <td className="axd-ix-hide-m">{tx(r.delai)}</td>
                      <td className="axd-ix-num">
                        {r.gratuit ? tx("Gratuit") : `${r.frais.toLocaleString(tx.loc)}${r.fraisKg ? ` + ${r.fraisKg.toLocaleString(tx.loc)}/kg` : ""}`}
                        {r.montantMin ? <div className="axd-muted" style={{ fontSize: 12 }}>{tx("dès")} {r.montantMin.toLocaleString(tx.loc)}</div> : null}
                      </td>
                      <td><Toggle checked={r.actif} onChange={() => toggleRegle(r)} label={tx("Actif")} /></td>
                      <td style={{ textAlign: "right" }}><Button size="sm" variant="plain" onClick={() => { if (confirm(tx("Supprimer ce tarif ?"))) deleteRegle(r.id); }}>{tx("Supprimer")}</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={tx("Nouveau tarif de livraison")} size="lg"
        footer={<><Button onClick={() => setShowForm(false)}>{tx("Annuler")}</Button><Button variant="primary" onClick={saveRegle} loading={saving} disabled={!form.nom.trim()}>{tx("Enregistrer")}</Button></>}>
        <div style={{ display: "grid", gap: "var(--space-300)", padding: "var(--space-400)" }}>
          {champ(tx("Nom du tarif"), (p) => <input {...p} className="axd-input" placeholder={tx("ex: Standard Cameroun")} value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />)}
          <div className="axd-field">
            <span className="axd-field__label">{tx("Pays desservis")}</span>
            <div className="axd-chips" style={{ margin: 0 }}>
              {form.pays.length === 0 && <span className="axd-muted" style={{ fontSize: 13 }}>{tx("Tous les pays")}</span>}
              {form.pays.map((c) => (
                <button key={c} type="button" className="axd-chip" aria-pressed="true" onClick={() => setForm((f) => ({ ...f, pays: f.pays.filter((x) => x !== c) }))} aria-label={tx("Retirer {0}", tx(NOM_PAYS[c] ?? c))}>{tx(NOM_PAYS[c] ?? c)} ×</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              <select value="" onChange={(e) => e.target.value && ajouterPays([e.target.value])} className="axd-input" style={{ width: "auto", minWidth: 180 }} aria-label={tx("Ajouter un pays")}>
                <option value="">{tx("+ Ajouter un pays…")}</option>
                {PAYS_OPTIONS.filter((p) => !form.pays.includes(p.code)).map((p) => <option key={p.code} value={p.code}>{tx(p.nom)}</option>)}
              </select>
              {Object.entries(GROUPES_PAYS).map(([nom, codes]) => <Button key={nom} size="sm" onClick={() => ajouterPays(codes)}>+ {nom}</Button>)}
              <Button size="sm" variant="plain" onClick={() => setForm((f) => ({ ...f, pays: [] }))}>{tx("Tous les pays")}</Button>
            </div>
          </div>
          <div className="axd-grid axd-g2" style={{ gap: "var(--space-300)" }}>
            {champ(tx("Quartier / ville (facultatif)"), (p) => <><input {...p} list="zones-list" className="axd-input" placeholder={tx("Vide = tout le pays")} value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} /><datalist id="zones-list">{zonesConfigurees.map((z) => <option key={z} value={z} />)}</datalist></>,
              tx("Un tarif de quartier remplace le tarif du pays pour ce quartier."))}
            {champ(tx("Mode de livraison"), (p) => (
              <select {...p} className="axd-input" value={form.modeLivraison} onChange={(e) => setForm((f) => ({ ...f, modeLivraison: e.target.value }))}>
                {MODES_LIVRAISON.map((m) => <option key={m.id} value={m.id}>{tx(m.label)}</option>)}
              </select>
            ))}
            {champ(tx("Frais"), (p) => <input {...p} type="number" className="axd-input" value={form.frais} onChange={(e) => setForm((f) => ({ ...f, frais: Number(e.target.value) }))} />)}
            {champ(tx("Frais par kg supplémentaire"), (p) => <input {...p} type="number" className="axd-input" value={form.fraisKg} onChange={(e) => setForm((f) => ({ ...f, fraisKg: Number(e.target.value) }))} />)}
            {champ(tx("Délai estimé"), (p) => <input {...p} className="axd-input" value={form.delai} onChange={(e) => setForm((f) => ({ ...f, delai: e.target.value }))} />)}
            {champ(form.modeLivraison === "agence_voyage" ? tx("Agence de voyage") : tx("Transporteur (optionnel)"), (p) => (
              <><input {...p} list={form.modeLivraison === "agence_voyage" ? "agences-list" : undefined} className="axd-input"
                placeholder={form.modeLivraison === "agence_voyage" ? tx("GEV, Touristique Express...") : tx("Campost, DHL...")}
                value={form.transporteur} onChange={(e) => setForm((f) => ({ ...f, transporteur: e.target.value }))} />
              {form.modeLivraison === "agence_voyage" && <datalist id="agences-list">{AGENCES_SUGGEST.map((a) => <option key={a} value={a} />)}</datalist>}</>
            ))}
            {champ(tx("Montant de commande minimum (optionnel)"), (p) => <input {...p} type="number" className="axd-input" placeholder="0" value={form.montantMin} onChange={(e) => setForm((f) => ({ ...f, montantMin: e.target.value }))} />)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Toggle checked={form.gratuit} onChange={(v) => setForm((f) => ({ ...f, gratuit: v }))} label={tx("Livraison gratuite (ignorer les frais)")} />
            <span>{tx("Livraison gratuite (ignorer les frais)")}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
