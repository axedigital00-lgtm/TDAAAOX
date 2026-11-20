"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, X } from "lucide-react";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { useT } from "@/components/I18nProvider";

// Produits → Collections : les catégories de la boutique et, pour chacune,
// les options de variantes proposées dans le formulaire produit
// (ex. Jeans → Taille 28/30/32, Couleur Bleu/Noir).
type Option = { nom: string; valeurs: string[] };
type Categorie = { id: string; nom: string; options: Option[]; ordre: number; nbProduits: number };

const SUGGESTIONS = ["Taille", "Couleur", "Pointure", "Matière", "Contenance", "Poids", "Modèle", "Parfum"];
const INPUT = "axd-input";

export default function CategoriesPage() {
  const t = useT();
  const [categories, setCategories] = useState<Categorie[] | null>(null);
  const [edition, setEdition] = useState<string | "nouvelle" | null>(null);

  const charger = () => fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories ?? [])).catch(() => setCategories([]));
  useEffect(() => { charger(); }, []);

  const supprimer = async (c: Categorie) => {
    if (!confirm(`Supprimer la catégorie « ${c.nom} » ?${c.nbProduits ? `\n\n${c.nbProduits} produit(s) resteront en ligne, sans catégorie.` : ""}`)) return;
    const r = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
    if (!r.ok) return void toast.error(t((await r.json()).error) ?? t("Suppression impossible"));
    toast.success(t("Catégorie supprimée")); charger();
  };
  const deplacer = async (i: number, sens: -1 | 1) => {
    if (!categories) return;
    const liste = [...categories]; const [x] = liste.splice(i, 1); liste.splice(i + sens, 0, x);
    setCategories(liste);
    await Promise.all(liste.map((c, ordre) => c.ordre !== ordre && fetch(`/api/categories/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ordre }) })));
    charger();
  };

  return (
    <Page width="narrow">
      <PageHeader icon="tag" title={t("Collections")} backHref="/dashboard/produits"
        primaryAction={{ content: t("Créer une collection"), onAction: () => setEdition("nouvelle"), disabled: edition === "nouvelle" }} />

      <div className="axd-stack">
        {edition === "nouvelle" && <Editeur onFini={() => { setEdition(null); charger(); }} />}

        {!categories ? (
          <div className="axd-card"><p className="axd-fichiers__etat">{t("Chargement…")}</p></div>
        ) : !categories.length && edition !== "nouvelle" ? (
          <div className="axd-card"><div className="axd-empty">
            <h3>{t("Regroupez vos produits en collections")}</h3>
            <p>{t("Jeans, Chemises, Accessoires… Elles servent de filtres dans votre catalogue, et chacune propose ses options (tailles, couleurs, pointures).")}</p>
            <div className="axd-empty__actions"><Button variant="primary" onClick={() => setEdition("nouvelle")}>{t("Créer une collection")}</Button></div>
          </div></div>
        ) : categories.length > 0 && (
          <div className="axd-card" style={{ overflow: "hidden" }}>
            <table className="axd-ix">
              <thead><tr><th style={{ width: 64 }}>{t("Ordre")}</th><th>{t("Collection")}</th><th className="axd-ix-hide-m">{t("Options des produits")}</th><th className="axd-ix-num">{t("Produits")}</th><th /></tr></thead>
              <tbody>
                {categories.map((c, i) => edition === c.id ? (
                  <tr key={c.id}><td colSpan={5} style={{ whiteSpace: "normal", padding: 0 }}><Editeur categorie={c} onFini={() => { setEdition(null); charger(); }} /></td></tr>
                ) : (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", gap: 2 }}>
                        <button type="button" className="axd-icon-btn" onClick={() => deplacer(i, -1)} disabled={i === 0} aria-label={t("Monter")}><ArrowUp size={14} /></button>
                        <button type="button" className="axd-icon-btn" onClick={() => deplacer(i, 1)} disabled={i === categories.length - 1} aria-label={t("Descendre")}><ArrowDown size={14} /></button>
                      </div>
                    </td>
                    <td className="axd-ix-primary">{t(c.nom)}</td>
                    <td className="axd-ix-hide-m" style={{ whiteSpace: "normal" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {c.options.length ? c.options.map((o) => (
                          <Badge key={o.nom}>{t(o.nom)}{o.valeurs.length ? ` · ${o.valeurs.slice(0, 4).join(", ")}${o.valeurs.length > 4 ? "…" : ""}` : ""}</Badge>
                        )) : <span className="axd-muted">{t("Aucune option")}</span>}
                      </div>
                    </td>
                    <td className="axd-ix-num">{c.nbProduits.toLocaleString(t.loc)}</td>
                    <td style={{ textAlign: "right" }}>
                      <Button size="sm" variant="plain" onClick={() => setEdition(c.id)}>{t("Modifier")}</Button>
                      <Button size="sm" variant="plain" onClick={() => supprimer(c)}>{t("Supprimer")}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  );
}

function Editeur({ categorie, onFini }: { categorie?: Categorie; onFini: () => void }) {
  const t = useT();
  const [nom, setNom] = useState(categorie?.nom ?? "");
  const [options, setOptions] = useState<Option[]>(categorie?.options ?? []);
  const [saisie, setSaisie] = useState<Record<number, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const maj = (i: number, patch: Partial<Option>) => setOptions((l) => l.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const ajouterValeur = (i: number) => {
    const v = (saisie[i] ?? "").trim();
    if (v && !options[i].valeurs.includes(v)) maj(i, { valeurs: [...options[i].valeurs, v] });
    setSaisie((s) => ({ ...s, [i]: "" }));
  };

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    setEnvoi(true);
    try {
      const r = await fetch(categorie ? `/api/categories/${categorie.id}` : "/api/categories", {
        method: categorie ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: nom.trim(), options: options.filter((o) => o.nom.trim()) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(categorie ? t("Catégorie modifiée") : t("Catégorie créée"));
      onFini();
    } catch (err) { toast.error(err instanceof Error && err.message ? t(err.message) : t("Enregistrement impossible")); } finally { setEnvoi(false); }
  };

  return (
    <form onSubmit={enregistrer} className="axd-card axd-card--pad" style={{ display: "grid", gap: "var(--space-400)", boxShadow: "var(--shadow-card), inset 0 0 0 2px var(--color-border-strong)" }}>
      <label style={{ display: "block" }}>
        <span className="axd-field__label" style={{ display: "block", marginBottom: 6 }}>{t("Nom de la collection")}</span>
        <input autoFocus value={nom} onChange={(e) => setNom(e.target.value)} placeholder={t("Ex : Jeans")} maxLength={60} className={INPUT} />
        {categorie && categorie.nbProduits > 0 && nom.trim() !== categorie.nom && <span className="axd-field__help" style={{ display: "block" }}>{t("Les")}{" "}{t(categorie.nbProduits)}{" "}{t("produit(s) de cette catégorie seront renommés aussi.")}</span>}
      </label>

      <div style={{ display: "grid", gap: 10 }}>
        <p className="axd-field__label" style={{ margin: 0 }}>{t("Options des produits")}{" "}<span className="axd-muted" style={{ fontWeight: 400 }}>{t("— proposées au moment de créer les variantes")}</span></p>
        {options.map((o, i) => (
          <div key={i} style={{ borderRadius: "var(--radius-lg)", background: "var(--color-surface-secondary)", padding: 12, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={o.nom} onChange={(e) => maj(i, { nom: e.target.value })} placeholder={t("Nom de l'option (ex : Taille)")} maxLength={40} className={`${INPUT}`} />
              <Button size="sm" variant="plain" onClick={() => setOptions((l) => l.filter((_, j) => j !== i))}>{t("Retirer")}</Button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {o.valeurs.map((v) => (
                <span key={v} className="axd-chip" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--color-surface)", boxShadow: "inset 0 0 0 1px var(--color-border)" }}>
                  {t(v)}<button type="button" onClick={() => maj(i, { valeurs: o.valeurs.filter((x) => x !== v) })} aria-label={t("Retirer {0}", v)} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", display: "grid", color: "var(--color-icon)" }}><X size={12} /></button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={saisie[i] ?? ""} onChange={(e) => setSaisie((s) => ({ ...s, [i]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); ajouterValeur(i); } }}
                placeholder={t("Ajouter une valeur (ex : XL) puis Entrée")} className={`${INPUT}`} />
              <Button onClick={() => ajouterValeur(i)}>{t("Ajouter")}</Button>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SUGGESTIONS.filter((s) => !options.some((o) => o.nom.toLowerCase() === s.toLowerCase())).map((s) => (
            <button key={s} type="button" onClick={() => setOptions((l) => [...l, { nom: s, valeurs: [] }])}
              className="axd-chip">+ {t(s)}</button>
          ))}
          <button type="button" onClick={() => setOptions((l) => [...l, { nom: "", valeurs: [] }])}
            className="axd-chip">{t("+ Autre option")}</button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onFini}>{t("Annuler")}</Button>
        <Button variant="primary" type="submit" disabled={!nom.trim()} loading={envoi}>{t("Enregistrer")}</Button>
      </div>
    </form>
  );
}
