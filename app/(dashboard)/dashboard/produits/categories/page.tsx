"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { useConfirmation } from "@/components/ui";
import { Badge, Button, Card, EmptyState, IconButton, PageHeader, SkeletonCard, TextField } from "@/components/ui/adm";
import { IllustrationGenerique } from "@/components/ui/illustrations";

// Produits › Collections (D25 : libellé « Collections », données = catégories de la boutique) :
// pour chacune, les options de variantes proposées dans le formulaire produit
// (ex. Jeans → Taille 28/30/32, Couleur Bleu/Noir).
type Option = { nom: string; valeurs: string[] };
type Categorie = { id: string; nom: string; options: Option[]; ordre: number; nbProduits: number };

const SUGGESTIONS = ["Taille", "Couleur", "Pointure", "Matière", "Contenance", "Poids", "Modèle", "Parfum"];

export default function CategoriesPage() {
  const t = useT();
  const { confirmer, dialogue } = useConfirmation();
  const [categories, setCategories] = useState<Categorie[] | null>(null);
  const [edition, setEdition] = useState<string | "nouvelle" | null>(null);

  const charger = () => fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories ?? [])).catch(() => setCategories([]));
  useEffect(() => { charger(); }, []);

  const supprimer = async (c: Categorie) => {
    const ok = await confirmer({
      titre: t("Supprimer cette collection ?"), objet: t(c.nom), libelleConfirmer: t("Supprimer la collection"),
      description: c.nbProduits ? t("{0} produit(s) resteront en ligne, sans collection.", c.nbProduits) : undefined,
    });
    if (!ok) return;
    const r = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
    if (!r.ok) return void toast.error(t((await r.json()).error) ?? t("Suppression impossible"));
    toast.success(t("Collection supprimée")); charger();
  };
  const deplacer = async (i: number, sens: -1 | 1) => {
    if (!categories) return;
    const liste = [...categories]; const [x] = liste.splice(i, 1); liste.splice(i + sens, 0, x);
    setCategories(liste);
    await Promise.all(liste.map((c, ordre) => c.ordre !== ordre && fetch(`/api/categories/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ordre }) })));
    charger();
  };

  return (
    <div className="mx-auto w-full max-w-[800px] space-y-4">
      <PageHeader icon="folder" title={t("Collections")} backHref="/dashboard/produits"
        primaryAction={{ content: t("Créer une collection"), icon: "plus", disabled: edition === "nouvelle", onAction: () => setEdition("nouvelle") }} />
      <p className="m-0 text-(--color-text-secondary)">{t("Les collections de votre boutique (filtres du catalogue) et les options proposées pour leurs produits : tailles, couleurs, pointures…")}</p>

      {edition === "nouvelle" && <Editeur onFini={() => { setEdition(null); charger(); }} />}

      {!categories ? (
        <SkeletonCard />
      ) : !categories.length && edition !== "nouvelle" ? (
        <EmptyState title={t("Aucune collection pour l'instant")} image={<IllustrationGenerique />}
          actions={<Button variant="primary" icon="plus" onClick={() => setEdition("nouvelle")}>{t("Créer une collection")}</Button>}>
          {t("Créez vos collections (Jeans, Chemises…) : elles serviront de filtres dans votre catalogue.")}
        </EmptyState>
      ) : categories.length > 0 && (
        <Card padding="none">
          <ul className="m-0 list-none p-0">
            {categories.map((c, i) => edition === c.id ? (
              <li key={c.id} className="border-t border-(--color-border-secondary) first:border-t-0"><Editeur categorie={c} onFini={() => { setEdition(null); charger(); }} /></li>
            ) : (
              <li key={c.id} className="flex items-start gap-3 border-t border-(--color-border-secondary) px-4 py-3 first:border-t-0">
                <div className="flex shrink-0 flex-col">
                  <IconButton icon="arrowUp" aria-label={t("Monter")} disabled={i === 0} onClick={() => deplacer(i, -1)} />
                  <IconButton icon="arrowUp" className="rotate-180" aria-label={t("Descendre")} disabled={i === categories.length - 1} onClick={() => deplacer(i, 1)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate font-[600] text-(--color-text-strong)">{t(c.nom)}</p>
                  <p className="m-0 text-xs text-(--color-text-secondary)">{t(c.nbProduits)} {t(c.nbProduits > 1 ? "produits" : "produit")}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.options.length ? c.options.map((o) => (
                      <Badge key={o.nom} tone="neutral">
                        {`${t(o.nom)}${o.valeurs.length ? ` · ${o.valeurs.slice(0, 4).join(", ")}${o.valeurs.length > 4 ? "…" : ""}` : ""}`}
                      </Badge>
                    )) : <span className="text-xs text-(--color-text-subdued)">{t("Aucune option")}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <IconButton icon="pen" aria-label={t("Modifier {0}", c.nom)} onClick={() => setEdition(c.id)} />
                  <Button size="sm" variant="plain" onClick={() => supprimer(c)} aria-label={t("Supprimer {0}", c.nom)}>{t("Supprimer")}</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {dialogue}
    </div>
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
      toast.success(categorie ? t("Collection modifiée") : t("Collection créée"));
      onFini();
    } catch (err) { toast.error(err instanceof Error && err.message ? t(err.message) : t("Enregistrement impossible")); } finally { setEnvoi(false); }
  };

  const formulaire = (
    <form onSubmit={enregistrer} className="space-y-4 p-4">
      <TextField label={t("Nom de la collection")} autoFocus value={nom} onChange={(e) => setNom(e.target.value)} placeholder={t("Ex : Jeans")} maxLength={60}
        helpText={categorie && categorie.nbProduits > 0 && nom.trim() !== categorie.nom ? t("Les {0} produit(s) de cette collection seront mis à jour aussi.", categorie.nbProduits) : undefined} />

      <div className="space-y-2.5">
        <p className="m-0 font-[550] text-(--color-text-strong)">{t("Options des produits")}{" "}<span className="font-normal text-(--color-text-secondary)">{t("— proposées au moment de créer les variantes")}</span></p>
        {options.map((o, i) => (
          <div key={i} className="space-y-2 rounded-(--radius-lg) bg-(--color-surface-secondary) p-3">
            <div className="flex items-end gap-2">
              <TextField className="min-w-0 flex-1" label={t("Nom de l'option")} labelHidden value={o.nom} onChange={(e) => maj(i, { nom: e.target.value })} placeholder={t("Nom de l'option (ex : Taille)")} maxLength={40} />
              <IconButton icon="x" aria-label={t("Retirer l'option")} onClick={() => setOptions((l) => l.filter((_, j) => j !== i))} />
            </div>
            {o.valeurs.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {o.valeurs.map((v) => (
                  <span key={v} className="inline-flex items-center gap-1 rounded-(--radius-md) bg-(--color-surface) py-0.5 pr-0.5 pl-2 shadow-(--shadow-card)">
                    {t(v)}<IconButton icon="x" className="size-5" aria-label={t("Retirer {0}", v)} onClick={() => maj(i, { valeurs: o.valeurs.filter((x) => x !== v) })} />
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <TextField className="min-w-0 flex-1" label={t("Ajouter une valeur")} labelHidden value={saisie[i] ?? ""} onChange={(e) => setSaisie((s) => ({ ...s, [i]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); ajouterValeur(i); } }}
                placeholder={t("Ajouter une valeur (ex : XL) puis Entrée")} />
              <Button onClick={() => ajouterValeur(i)}>{t("Ajouter")}</Button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.filter((s) => !options.some((o) => o.nom.toLowerCase() === s.toLowerCase())).map((s) => (
            <Button key={s} size="sm" variant="tint" icon="plus" onClick={() => setOptions((l) => [...l, { nom: s, valeurs: [] }])}>{t(s)}</Button>
          ))}
          <Button size="sm" variant="tint" icon="plus" onClick={() => setOptions((l) => [...l, { nom: "", valeurs: [] }])}>{t("Autre option")}</Button>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={onFini}>{t("Annuler")}</Button>
        <Button type="submit" variant="primary" disabled={!nom.trim()} loading={envoi}>{t("Enregistrer")}</Button>
      </div>
    </form>
  );
  // Nouvelle collection : sa propre carte ; modification : dans la ligne de la liste.
  return categorie ? formulaire : <Card padding="none">{formulaire}</Card>;
}
