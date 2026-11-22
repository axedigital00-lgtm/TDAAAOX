"use client";
// Éditeur de workflows : QUAND un événement, SI des conditions, ALORS des actions.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Card, EmptyState, Field, Toggle } from "@/components/dashboard/design-system/components/primitives";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { ACTIONS_WORKFLOW, CHAMPS_WORKFLOW, DECLENCHEURS_WORKFLOW, type ActionWorkflow, type DeclencheurWorkflow } from "@/lib/commerce/regles";

type Cond = { champ: string; op: "<" | "<=" | ">" | ">=" | "=" | "!=" | "contient"; valeur: string | number };
type Workflow = { id: string; nom: string; actif: boolean; declencheur: DeclencheurWorkflow; conditions: Cond[]; actions: ActionWorkflow[]; executions: number; derniereExecution: string | null; dernierResultat: string | null };
type Brouillon = { id?: string; nom: string; actif: boolean; declencheur: DeclencheurWorkflow; conditions: Cond[]; actions: ActionWorkflow[] };

const OPS: { v: Cond["op"]; l: string; nombre?: boolean }[] = [
  { v: ">=", l: "au moins", nombre: true }, { v: ">", l: "supérieur à", nombre: true }, { v: "<=", l: "au plus", nombre: true }, { v: "<", l: "inférieur à", nombre: true },
  { v: "=", l: "égal à" }, { v: "!=", l: "différent de" }, { v: "contient", l: "contient" },
];
const MODELES: { titre: string; texte: string; w: Omit<Brouillon, "actif"> }[] = [
  { titre: "Clients VIP", texte: "Classe en VIP les clients d'une grosse commande payée.", w: { nom: "Clients VIP", declencheur: "order.paid", conditions: [{ champ: "total", op: ">=", valeur: 100000 }], actions: [{ type: "segment_client", segment: "vip" }, { type: "notifier", titre: "Nouveau client VIP", message: "{{client}} · commande #{{numero}}" }] } },
  { titre: "Rupture proche", texte: "Prévient et masque un produit presque épuisé.", w: { nom: "Rupture proche", declencheur: "inventory.low", conditions: [{ champ: "stock", op: "<=", valeur: 0 }], actions: [{ type: "masquer_produit" }, { type: "notifier", titre: "Produit masqué : {{nom}}", message: "Stock restant : {{stock}}" }] } },
  { titre: "Merci après livraison", texte: "Remercie le client une fois sa commande livrée.", w: { nom: "Merci après livraison", declencheur: "order.fulfilled", conditions: [], actions: [{ type: "email_client", sujet: "Merci pour votre commande", message: "Bonjour {{client}},\n\nVotre commande #{{numero}} est livrée. Merci de votre confiance !" }] } },
];
const actionVide = (type: ActionWorkflow["type"]): ActionWorkflow =>
  type === "notifier" ? { type, titre: "", message: "" } : type === "email_client" ? { type, sujet: "", message: "" } : type === "segment_client" ? { type, segment: "" } : { type };

export default function WorkflowsPage() {
  const t = useT();
  const [liste, setListe] = useState<Workflow[] | null>(null);
  const [b, setB] = useState<Brouillon | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const charger = () => fetch("/api/workflows").then((r) => r.json()).then((d) => setListe(d.workflows ?? [])).catch(() => setListe([]));
  useEffect(() => { charger(); }, []);

  async function enregistrer() {
    if (!b) return;
    setEnvoi(true);
    const { id, ...corps } = b;
    const r = await fetch(id ? `/api/workflows/${id}` : "/api/workflows", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const d = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) return void toast.error(t(d.error ?? "Enregistrement impossible"));
    toast.success(t("Workflow enregistré")); setB(null); charger();
  }
  async function basculer(w: Workflow, actif: boolean) {
    setListe((l) => l!.map((x) => (x.id === w.id ? { ...x, actif } : x)));
    const r = await fetch(`/api/workflows/${w.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actif }) });
    if (!r.ok) { toast.error(t("Action impossible")); charger(); }
  }
  async function supprimer(w: Workflow) {
    if (!window.confirm(t("Supprimer ce workflow ?"))) return;
    const r = await fetch(`/api/workflows/${w.id}`, { method: "DELETE" });
    if (r.ok) { toast.success(t("Workflow supprimé")); charger(); } else toast.error(t("Action impossible"));
  }

  const majCond = (i: number, c: Partial<Cond>) => setB((x) => x && ({ ...x, conditions: x.conditions.map((v, j) => (j === i ? { ...v, ...c } : v)) }));
  const majAction = (i: number, a: Partial<ActionWorkflow>) => setB((x) => x && ({ ...x, actions: x.actions.map((v, j) => (j === i ? ({ ...v, ...a } as ActionWorkflow) : v)) }));
  const champs = b ? CHAMPS_WORKFLOW[b.declencheur] : [];
  const actionsPermises = (Object.keys(ACTIONS_WORKFLOW) as ActionWorkflow["type"][]).filter((a) => (b?.declencheur === "inventory.low" ? a === "notifier" || a === "masquer_produit" : a !== "masquer_produit"));

  if (b) return (
    <Page width="narrow">
      <PageHeader icon="bolt" title={b.id ? b.nom : t("Nouveau workflow")} backHref="/dashboard/automation/workflows" primaryAction={{ content: t("Enregistrer"), onAction: enregistrer, loading: envoi }} secondaryActions={[{ content: t("Annuler"), onAction: () => setB(null) }]} />
      <div className="axd-stack">
        <Card><Field label={t("Nom du workflow")}>{(p) => <input {...p} className="axd-input" value={b.nom} onChange={(e) => setB({ ...b, nom: e.target.value })} />}</Field></Card>
        <Card title={t("Quand")}>
          <Field label={t("Déclencheur")}>{(p) => <select {...p} className="axd-input" value={b.declencheur} onChange={(e) => {
            const declencheur = e.target.value as DeclencheurWorkflow;
            setB({ ...b, declencheur, conditions: [], actions: [{ type: "notifier", titre: "", message: "" }] });
          }}>{Object.entries(DECLENCHEURS_WORKFLOW).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select>}</Field>
        </Card>
        <Card title={t("Si (facultatif)")}>
          <div style={{ display: "grid", gap: 8 }}>
            {b.conditions.map((c, i) => {
              const def = champs.find((x) => x.champ === c.champ);
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr)) auto", gap: 8, alignItems: "center" }}>
                  <select aria-label={t("Champ")} className="axd-input" value={c.champ} onChange={(e) => { const n = champs.find((x) => x.champ === e.target.value); majCond(i, { champ: e.target.value, op: n?.nombre ? ">=" : "=", valeur: n?.nombre ? 0 : "" }); }}>{champs.map((x) => <option key={x.champ} value={x.champ}>{t(x.label)}</option>)}</select>
                  <select aria-label={t("Comparaison")} className="axd-input" value={c.op} onChange={(e) => majCond(i, { op: e.target.value as Cond["op"] })}>{OPS.filter((o) => (def?.nombre ? o.v !== "contient" : !o.nombre)).map((o) => <option key={o.v} value={o.v}>{t(o.l)}</option>)}</select>
                  <input aria-label={t("Valeur")} type={def?.nombre ? "number" : "text"} className="axd-input" value={c.valeur} onChange={(e) => majCond(i, { valeur: def?.nombre ? Number(e.target.value) || 0 : e.target.value })} />
                  <Button variant="plain" onClick={() => setB({ ...b, conditions: b.conditions.filter((_, j) => j !== i) })}>{t("Retirer")}</Button>
                </div>
              );
            })}
            {b.conditions.length < 8 && <div><Button onClick={() => setB({ ...b, conditions: [...b.conditions, { champ: champs[0].champ, op: champs[0].nombre ? ">=" : "=", valeur: champs[0].nombre ? 0 : "" }] })}>{t("Ajouter une condition")}</Button></div>}
          </div>
        </Card>
        <Card title={t("Alors")}>
          <div style={{ display: "grid", gap: 14 }}>
            {b.actions.map((a, i) => (
              <div key={i} style={{ display: "grid", gap: 8, paddingBottom: 12, borderBottom: "1px solid var(--color-border, #e8e8e8)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select aria-label={t("Action")} className="axd-input" value={a.type} onChange={(e) => setB({ ...b, actions: b.actions.map((v, j) => (j === i ? actionVide(e.target.value as ActionWorkflow["type"]) : v)) })}>{actionsPermises.map((k) => <option key={k} value={k}>{t(ACTIONS_WORKFLOW[k])}</option>)}</select>
                  {b.actions.length > 1 && <Button variant="plain" onClick={() => setB({ ...b, actions: b.actions.filter((_, j) => j !== i) })}>{t("Retirer")}</Button>}
                </div>
                {a.type === "notifier" && <><input aria-label={t("Titre")} className="axd-input" placeholder={t("Titre de la notification")} value={a.titre} onChange={(e) => majAction(i, { titre: e.target.value })} /><input aria-label={t("Message")} className="axd-input" placeholder={t("Message")} value={a.message} onChange={(e) => majAction(i, { message: e.target.value })} /></>}
                {a.type === "email_client" && <><input aria-label={t("Sujet")} className="axd-input" placeholder={t("Sujet")} value={a.sujet} onChange={(e) => majAction(i, { sujet: e.target.value })} /><textarea aria-label={t("Message")} rows={4} className="axd-input" style={{ height: "auto", paddingTop: 8 }} value={a.message} onChange={(e) => majAction(i, { message: e.target.value })} /></>}
                {a.type === "segment_client" && <input aria-label={t("Segment")} className="axd-input" placeholder={t("Nom du segment, ex. vip")} value={a.segment} onChange={(e) => majAction(i, { segment: e.target.value })} />}
              </div>
            ))}
            {b.actions.length < 6 && <div><Button onClick={() => setB({ ...b, actions: [...b.actions, actionVide("notifier")] })}>{t("Ajouter une action")}</Button></div>}
            <p className="axd-muted" style={{ margin: 0, fontSize: 12 }}>{b.declencheur === "inventory.low" ? t("Variables : {{nom}}, {{stock}}") : t("Variables : {{client}}, {{numero}}, {{total}}, {{ville}}")}</p>
          </div>
        </Card>
      </div>
    </Page>
  );

  return (
    <Page>
      <PageHeader icon="bolt" title={t("Workflows")} backHref="/dashboard/automation" primaryAction={{ content: t("Créer un workflow"), onAction: () => setB({ nom: "", actif: true, declencheur: "order.paid", conditions: [], actions: [{ type: "notifier", titre: "", message: "" }] }) }} />
      <div className="axd-stack">
        {liste === null ? <Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement…")}</p></Card> : liste.length === 0 ? (
          <Card><EmptyState heading={t("Automatisez vos tâches répétitives")}>{t("Choisissez un événement, des conditions et les actions à lancer. Commencez avec un modèle ci-dessous.")}</EmptyState></Card>
        ) : liste.map((w) => (
          <Card key={w.id} title={w.nom} actions={<Toggle checked={w.actif} onChange={(v) => basculer(w, v)} label={t("Actif")} />}>
            <p className="axd-muted" style={{ margin: 0 }}>{t(DECLENCHEURS_WORKFLOW[w.declencheur])} · {w.conditions.length} {t("condition(s)")} · {w.actions.length} {t("action(s)")} · {w.executions} {t("exécution(s)")}</p>
            {w.dernierResultat && <p style={{ margin: "6px 0 0", fontSize: 13 }}>{t("Dernier passage")} : {w.dernierResultat}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}><Button size="sm" onClick={() => setB({ id: w.id, nom: w.nom, actif: w.actif, declencheur: w.declencheur, conditions: w.conditions, actions: w.actions })}>{t("Modifier")}</Button><Button size="sm" variant="plain" onClick={() => supprimer(w)}>{t("Supprimer")}</Button></div>
          </Card>
        ))}
        <Card title={t("Modèles")}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {MODELES.map((m) => (
              <div key={m.titre} style={{ border: "1px solid var(--color-border, #e8e8e8)", borderRadius: 10, padding: 12, display: "grid", gap: 8, alignContent: "space-between" }}>
                <div><strong>{t(m.titre)}</strong><p className="axd-muted" style={{ margin: "4px 0 0", fontSize: 13 }}>{t(m.texte)}</p></div>
                <div><Button size="sm" onClick={() => setB({ ...m.w, nom: t(m.w.nom), actif: true })}>{t("Utiliser")}</Button></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  );
}
