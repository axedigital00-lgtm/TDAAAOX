"use client";
// Éditeur du formulaire Releasit COD AXSO : modèle, animation, ordre et libellés des champs (glisser-déposer
// sur ordinateur, flèches sur téléphone), champs personnalisés, messages, test A/B, aperçu en direct.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader, Card, Button, Banner, Toggle, Badge } from "@/components/dashboard/design-system";
import { OngletsCommandeExpress } from "@/components/dashboard/commande-express/OngletsApp";
import { useT } from "@/components/I18nProvider";

type Champ = { cle: string; libelle?: string; visible: boolean; requis: boolean };
type Perso = { id: string; libelle: string; type: "texte" | "liste" | "case"; options?: string[]; requis?: boolean };
type Formulaire = { modele: string; animation: string; titre?: string; sousTitre?: string; succes?: string; boutonEnvoi?: string; champs: Champ[]; perso: Perso[] };
type Modele = { id: string; nom: string; fond: string; texte: string; champ: string; bordure: string; rayon: number };
type Donnees = { formulaire: Formulaire; abTest: { actif?: boolean; texteB?: string }; reglages: { couleur: string; texteBouton: string }; modeles: Modele[]; libellesDefaut: Record<string, string> };

const FIXES = ["nom", "telephone", "ville"];
const REQUIS_POSSIBLE = ["email", "quartier", "repere"];

export default function EditeurFormulairePage() {
  const t = useT();
  const [d, setD] = useState<Donnees | null>(null);
  const [f, setF] = useState<Formulaire | null>(null);
  const [ab, setAb] = useState({ actif: false, texteB: "" });
  const [glisse, setGlisse] = useState<number | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const charger = useCallback(() => fetch("/api/commande-express/formulaire").then((r) => (r.ok ? r.json() : null)).then((x: Donnees | null) => {
    if (x) { setD(x); setF(x.formulaire); setAb({ actif: !!x.abTest.actif, texteB: x.abTest.texteB ?? "" }); }
  }), []);
  useEffect(() => { charger(); }, [charger]);

  if (!d || !f) return <Page><PageHeader icon="pen" title={t("Formulaire")} /><Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement...")}</p></Card></Page>;
  const m = d.modeles.find((x) => x.id === f.modele) ?? d.modeles[0];
  const majChamp = (i: number, maj: Partial<Champ>) => setF({ ...f, champs: f.champs.map((c, j) => (j === i ? { ...c, ...maj } : c)) });
  const deplacer = (de: number, vers: number) => {
    if (vers < 0 || vers >= f.champs.length || de === vers) return;
    const champs = [...f.champs]; const [c] = champs.splice(de, 1); champs.splice(vers, 0, c); setF({ ...f, champs });
  };
  const enregistrer = async () => {
    setEnvoi(true);
    try {
      const corps: Record<string, unknown> = { formulaire: { ...f, titre: f.titre || undefined, sousTitre: f.sousTitre || undefined, succes: f.succes || undefined, boutonEnvoi: f.boutonEnvoi || undefined, perso: f.perso.map((p) => ({ ...p, options: p.type === "liste" ? p.options : undefined })) } };
      if (ab.texteB.trim().length >= 2 || ab.actif) corps.abTest = ab;
      const r = await fetch("/api/commande-express/formulaire", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
      const x = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(x.error ?? "Enregistrement impossible");
      toast.success(t("Formulaire enregistré : il est en ligne sur vos fiches produits")); await charger();
    } catch (e) { toast.error(t(e instanceof Error ? e.message : "Enregistrement impossible")); }
    finally { setEnvoi(false); }
  };
  const libelle = (c: Champ) => c.libelle || t(d.libellesDefaut[c.cle] ?? c.cle);

  return (
    <Page>
      <PageHeader icon="pen" title={t("Formulaire")} backHref="/dashboard/commande-express" primaryAction={{ content: t("Enregistrer"), onAction: enregistrer, loading: envoi }} />
      <OngletsCommandeExpress />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-400)", marginTop: "var(--space-400)", alignItems: "start" }}>
        <div style={{ display: "grid", gap: "var(--space-400)" }}>
          <Card title={t("Modèle")}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
              {d.modeles.map((x) => (
                <button key={x.id} type="button" onClick={() => setF({ ...f, modele: x.id })} aria-pressed={f.modele === x.id}
                  style={{ textAlign: "left", padding: 10, borderRadius: 12, cursor: "pointer", background: x.fond, color: x.texte, border: f.modele === x.id ? `2px solid ${d.reglages.couleur}` : `1px solid ${x.bordure}` }}>
                  <div style={{ height: 10, borderRadius: x.rayon / 2, background: x.champ, border: `1px solid ${x.bordure}`, marginBottom: 6 }} />
                  <div style={{ height: 14, borderRadius: x.rayon / 2, background: d.reglages.couleur, marginBottom: 6 }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{t(x.nom)}</span>
                </button>
              ))}
            </div>
            <label style={{ display: "grid", gap: 6, marginTop: 14 }}><span style={{ fontWeight: 600, fontSize: 13.5 }}>{t("Animation du bouton")}</span>
              <select className="axd-input" value={f.animation} onChange={(e) => setF({ ...f, animation: e.target.value })}>
                <option value="pulse">{t("Pulsation")}</option><option value="shake">{t("Secousse")}</option><option value="glow">{t("Halo lumineux")}</option><option value="aucune">{t("Aucune")}</option>
              </select></label>
          </Card>

          <Card title={t("Champs")}>
            <p className="axd-muted" style={{ margin: "0 0 10px", fontSize: 13 }}>{t("Glissez les lignes pour changer l'ordre (ou utilisez les flèches). Nom, téléphone et ville sont toujours demandés.")}</p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {f.champs.map((c, i) => (
                <li key={c.cle} draggable onDragStart={() => setGlisse(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (glisse !== null) deplacer(glisse, i); setGlisse(null); }}
                  style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center", padding: 8, borderRadius: 10, border: "1px solid var(--color-border-secondary)", opacity: c.visible ? 1 : 0.55, background: glisse === i ? "var(--color-surface-secondary)" : undefined }}>
                  <span style={{ display: "grid" }}>
                    <button type="button" className="axd-icon-btn" aria-label={t("Monter")} onClick={() => deplacer(i, i - 1)} disabled={i === 0}>▲</button>
                    <button type="button" className="axd-icon-btn" aria-label={t("Descendre")} onClick={() => deplacer(i, i + 1)} disabled={i === f.champs.length - 1}>▼</button>
                  </span>
                  <input className="axd-input" value={c.libelle ?? ""} placeholder={t(d.libellesDefaut[c.cle] ?? c.cle)} maxLength={80} onChange={(e) => majChamp(i, { libelle: e.target.value })} aria-label={t("Libellé")} />
                  <span style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {!FIXES.includes(c.cle) && <span style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 12 }}>{t("Afficher")}<Toggle checked={c.visible} label={t("Afficher")} onChange={(v) => majChamp(i, { visible: v })} /></span>}
                    {REQUIS_POSSIBLE.includes(c.cle) && c.visible && <span style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 12 }}>{t("Obligatoire")}<Toggle checked={c.requis} label={t("Obligatoire")} onChange={(v) => majChamp(i, { requis: v })} /></span>}
                    {FIXES.includes(c.cle) && <Badge>{t("Toujours demandé")}</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={t("Champs personnalisés")}>
            <div style={{ display: "grid", gap: 10 }}>
              {f.perso.map((p, i) => (
                <div key={p.id} style={{ display: "grid", gap: 6, padding: 10, borderRadius: 10, border: "1px solid var(--color-border-secondary)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 130px auto", gap: 6 }}>
                    <input className="axd-input" value={p.libelle} maxLength={80} placeholder={t("Question posée au client")} onChange={(e) => setF({ ...f, perso: f.perso.map((x, j) => (j === i ? { ...x, libelle: e.target.value } : x)) })} />
                    <select className="axd-input" value={p.type} onChange={(e) => setF({ ...f, perso: f.perso.map((x, j) => (j === i ? { ...x, type: e.target.value as Perso["type"] } : x)) })}>
                      <option value="texte">{t("Texte")}</option><option value="liste">{t("Liste de choix")}</option><option value="case">{t("Case à cocher")}</option>
                    </select>
                    <button type="button" className="axd-icon-btn" aria-label={t("Retirer")} onClick={() => setF({ ...f, perso: f.perso.filter((_, j) => j !== i) })}>×</button>
                  </div>
                  {p.type === "liste" && <input className="axd-input" placeholder={t("Choix séparés par des virgules (ex. S, M, L, XL)")} value={(p.options ?? []).join(", ")} onChange={(e) => setF({ ...f, perso: f.perso.map((x, j) => (j === i ? { ...x, options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean).slice(0, 12) } : x)) })} />}
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}>{t("Obligatoire")}<Toggle checked={!!p.requis} label={t("Obligatoire")} onChange={(v) => setF({ ...f, perso: f.perso.map((x, j) => (j === i ? { ...x, requis: v } : x)) })} /></span>
                </div>
              ))}
              {f.perso.length < 6 && <div><Button size="sm" onClick={() => setF({ ...f, perso: [...f.perso, { id: `c${Date.now().toString(36).slice(-6)}`, libelle: "", type: "texte" }] })}>{t("Ajouter un champ")}</Button></div>}
            </div>
          </Card>

          <Card title={t("Textes")}>
            <div style={{ display: "grid", gap: 10 }}>
              {([["titre", "Titre du formulaire (par défaut : nom du produit)", 80], ["sousTitre", "Sous-titre (ex. Livraison gratuite à Douala)", 120], ["boutonEnvoi", "Bouton d'envoi (par défaut : Commander · paiement à la livraison)", 50], ["succes", "Message après la commande ({0} = n° de commande, {1} = total)", 300]] as const).map(([cle, aide, max]) => (
                <label key={cle} style={{ display: "grid", gap: 6 }}><span style={{ fontWeight: 600, fontSize: 13.5 }}>{t(aide)}</span>
                  <input className="axd-input" maxLength={max} value={f[cle] ?? ""} onChange={(e) => setF({ ...f, [cle]: e.target.value })} /></label>
              ))}
            </div>
          </Card>

          <Card title={t("Test A/B du bouton")}>
            <div style={{ display: "grid", gap: 10 }}>
              <p className="axd-muted" style={{ margin: 0, fontSize: 13.5 }}>{t("La moitié des visiteurs voit le texte A, l'autre moitié le texte B. Les résultats et le gagnant s'affichent dans Statistiques.")}</p>
              <div style={{ fontSize: 14 }}><span className="axd-muted">{t("Texte A (actuel)")} :</span> <b>{d.reglages.texteBouton}</b></div>
              <input className="axd-input" maxLength={40} placeholder={t("Texte B (ex. Je commande, je paie à la livraison)")} value={ab.texteB} onChange={(e) => setAb({ ...ab, texteB: e.target.value })} />
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 14 }}>{t("Test en cours")}<Toggle checked={ab.actif} label={t("Test en cours")} onChange={(v) => setAb({ ...ab, actif: v })} /></span>
            </div>
          </Card>
        </div>

        <div style={{ position: "sticky", top: 16 }}>
          <Card title={t("Aperçu")}>
            <div style={{ maxWidth: 340, margin: "0 auto", borderRadius: 28, padding: 10, background: "#111" }}>
              <div style={{ background: m.fond, color: m.texte, borderRadius: 20, padding: 16, display: "grid", gap: 8, fontSize: 13 }}>
                <b style={{ fontSize: 15 }}>{f.titre || t("Votre produit")}</b>
                {f.sousTitre && <span style={{ opacity: 0.75 }}>{f.sousTitre}</span>}
                {f.champs.filter((c) => c.visible).map((c) => c.cle === "position"
                  ? <div key={c.cle} style={{ height: 34, borderRadius: m.rayon, border: `1.5px dashed ${m.bordure}`, display: "grid", placeItems: "center", opacity: 0.8 }}>📍 {libelle(c)}</div>
                  : <div key={c.cle}><div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3 }}>{libelle(c)}{c.requis && !FIXES.includes(c.cle) ? " *" : ""}</div><div style={{ height: 34, borderRadius: m.rayon, background: m.champ, border: `1.5px solid ${m.bordure}` }} /></div>)}
                {f.perso.filter((p) => p.libelle).map((p) => <div key={p.id}><div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3 }}>{p.type === "case" ? "☐ " : ""}{p.libelle}{p.requis ? " *" : ""}</div>{p.type !== "case" && <div style={{ height: 34, borderRadius: m.rayon, background: m.champ, border: `1.5px solid ${m.bordure}` }} />}</div>)}
                <div style={{ height: 44, borderRadius: m.rayon, background: d.reglages.couleur, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, marginTop: 6 }}>{f.boutonEnvoi || t("Commander · paiement à la livraison")}</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}><Banner tone="info">{t("Les prix et le total sont toujours recalculés par AXSO à la commande.")}</Banner></div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
