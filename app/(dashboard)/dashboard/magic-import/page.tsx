"use client";
import { useState } from "react";
import { Wand2, Sparkles, Package, Download, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import { Alerte, Bouton, EnTetePage, ZoneTexte, classesBouton } from "@/components/ui";

interface ProduitGenere {
  nom: string;
  description: string;
  prix: number;
  prixCompare: number;
  categorie: string;
  tags: string[];
  imageUrl: string;
  imagePrompt: string;
  slug: string;
  stock: number;
  devise: string;
  selected: boolean;
}

const EXEMPLES = [
  "Robes africaines wax premium, bazins brodés, boubous et accessoires mode femme",
  "Cosmétiques naturels africains : savons au karité, huiles de baobab, crèmes au cacao",
  "Électronique & accessoires tech : écouteurs, chargeurs, coques, montres connectées",
  "Artisanat togolais : batiks, sculptures bois, bijoux bronze, sacs en raphia",
  "Épicerie fine africaine : épices, thés, tisanes, moringa, spiruline, superaliments",
];

export default function MagicImportPage() {
  const t = useT();
  const [description, setDescription] = useState("");
  const [nombreProduits, setNombreProduits] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [produits, setProduits] = useState<ProduitGenere[]>([]);
  const [importing, setImporting] = useState(false);
  const [phase, setPhase] = useState<"input" | "review" | "done">("input");
  const [importedCount, setImportedCount] = useState(0);
  const [erreurDescription, setErreurDescription] = useState("");

  async function generer() {
    if (!description.trim()) { setErreurDescription(t("Décrivez votre boutique ou vos produits en quelques mots.")); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/magic-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, nombreProduits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setProduits(data.produits.map((p: any) => ({ ...p, selected: true })));
      setPhase("review");
      toast.success(t("{0} produits générés par Gemini", data.total));
    } catch (err: any) {
      toast.error(t(err.message) || t("Le catalogue n'a pas pu être généré. Réessayez dans un instant ou reformulez la description."));
    } finally {
      setGenerating(false);
    }
  }

  function toggleSelect(i: number) {
    setProduits(prev => prev.map((p, idx) => idx === i ? { ...p, selected: !p.selected } : p));
  }

  async function importer() {
    const selected = produits.filter(p => p.selected);
    if (!selected.length) { toast.error(t("Sélectionnez au moins un produit à importer.")); return; }
    setImporting(true);
    try {
      const res = await fetch("/api/magic-import", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produits: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setImportedCount(data.created);
      setPhase("done");
    } catch (err: any) {
      toast.error(t(err.message) || t("L'import n'a pas abouti. Vos produits n'ont pas été ajoutés ; réessayez dans un instant."));
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setPhase("input");
    setProduits([]);
    setDescription("");
    setImportedCount(0);
  }

  const selectedCount = produits.filter(p => p.selected).length;

  const libelleImport = selectedCount > 1 ? t("Importer {0} produits", selectedCount) : t("Importer {0} produit", selectedCount);

  return (
    <div className="space-y-section max-w-5xl">
      <EnTetePage
        className="mb-0"
        titre={t("Magic Import")}
        description={t("Gemini + Flux.1 génère votre catalogue complet avec images ultra HD en quelques secondes")}
        actions={phase === "review" ? (
          <Bouton variante="secondaire" onClick={reset} icone={<RefreshCw size={15} aria-hidden />}>{t("Recommencer")}</Bouton>
        ) : undefined}
      />

      {/* Phase input */}
      {phase === "input" && (
        <div className="space-y-section">
          <Alerte ton="info" titre={t("Comment ça marche")}>
            {t("Décrivez votre boutique en quelques mots →")}{" "}<strong>{t("Gemini")}</strong>{" "}{t("génère un catalogue complet avec descriptions, prix adaptés au marché africain, tags SEO et prompts optimisés pour")}
            <strong>{" "}{t("Flux.1-dev")}</strong>{t(". Les images Flux.1 ultra HD se chargent automatiquement. Sélectionnez vos produits et importez en 1 clic.")}
          </Alerte>

          <div className="bg-carte border border-bordure rounded-carte shadow-carte p-carte space-y-champs">
            <ZoneTexte
              label={t("Décrivez votre boutique ou votre niche de produits")}
              required
              rows={5}
              value={description}
              onChange={e => { setDescription(e.target.value.slice(0, 600)); setErreurDescription(""); }}
              placeholder={t("Ex: Je vends des robes africaines wax premium, des bazins brodés et des accessoires mode pour femmes au Sénégal. Gamme de prix 15 000 – 85 000 XOF.")}
              aide={`${description.length}/600`}
              erreur={erreurDescription || undefined}
            />

            {/* Nombre de produits */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="magic-nombre" className="ax-libelle">{t("Nombre de produits")}</label>
                <span className="text-xl font-black text-attention" aria-hidden>{t(nombreProduits)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <input id="magic-nombre" type="range" min={3} max={20} value={nombreProduits}
                  onChange={e => setNombreProduits(Number(e.target.value))}
                  className="flex-1 min-w-[10rem] accent-primaire h-2" />
                <div className="flex gap-1.5 flex-shrink-0" role="group" aria-label={t("Choix rapide du nombre")}>
                  {[5, 8, 12, 20].map(n => (
                    <button key={n} type="button" onClick={() => setNombreProduits(n)} aria-pressed={nombreProduits === n}
                      className={`size-10 sm:size-8 rounded-controle text-xs font-bold transition-all ${
                        nombreProduits === n ? "bg-primaire text-sur-primaire" : "bg-carte-2 text-doux hover:text-encre"
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Bouton taille="grand" large onClick={generer} charge={generating} texteCharge={t("Gemini génère votre catalogue...")} icone={<Wand2 size={18} aria-hidden />}>
              {t("Générer")}{" "}{t(nombreProduits)}{" "}{t("produits avec Flux.1-dev")}
            </Bouton>
          </div>

          {/* Exemples rapides */}
          <section className="space-y-2">
            <h2 className="ax-sous-titre">{t("Exemples rapides")}</h2>
            <p className="ax-aide">{t("Touchez un exemple pour le reprendre comme description.")}</p>
            <div className="space-y-2">
              {EXEMPLES.map(ex => (
                <button key={ex} type="button" onClick={() => { setDescription(ex); setErreurDescription(""); }}
                  className="w-full text-left text-sm bg-carte border border-bordure text-doux px-4 min-h-10 py-2.5 rounded-controle hover:border-primaire hover:text-encre hover:bg-primaire-fond transition-all flex items-center gap-2">
                  <Sparkles size={13} className="text-attention flex-shrink-0" aria-hidden />
                  {t(ex)}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Phase review */}
      {phase === "review" && produits.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-carte border border-bordure rounded-carte px-5 py-3 gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-encre" aria-live="polite">
                <span className="text-attention font-black">{selectedCount}</span> / {produits.length}{" "}{t("sélectionnés")}
              </span>
              <Bouton variante="fantome" taille="compact" onClick={() => setProduits(p => p.map(x => ({ ...x, selected: true })))}>{t("Tout sélectionner")}</Bouton>
              <Bouton variante="fantome" taille="compact" onClick={() => setProduits(p => p.map(x => ({ ...x, selected: false })))}>{t("Tout désélectionner")}</Bouton>
            </div>
            <Bouton variante="secondaire" onClick={importer} disabled={selectedCount === 0} charge={importing} icone={<Download size={14} aria-hidden />}>
              {libelleImport}
            </Bouton>
          </div>

          <p className="ax-aide">{t("Touchez un produit pour le sélectionner ou le retirer de l'import.")}</p>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4 lg:grid-cols-3">
            {produits.map((p, i) => (
              <button key={i} type="button" onClick={() => toggleSelect(i)} aria-pressed={p.selected}
                className={`text-left bg-carte border-2 rounded-carte overflow-hidden transition-all focus-visible:outline-2 focus-visible:outline-focus ${
                  p.selected ? "border-primaire shadow-carte" : "border-bordure hover:border-bordure-forte"
                }`}>
                <span className="relative block aspect-square overflow-hidden bg-carte-2">
                  <img src={p.imageUrl} alt={p.nom} className="w-full h-full object-cover" loading="lazy" />
                  <span aria-hidden className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${
                    p.selected ? "bg-primaire border-primaire" : "bg-carte/90 border-bordure-forte"
                  }`}>
                    {p.selected && <Check size={14} className="text-sur-primaire" />}
                  </span>
                  <span className="absolute bottom-2 left-2 text-xs font-semibold bg-black/55 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {t(p.categorie)}
                  </span>
                </span>

                <span className="block p-3.5">
                  <span className="block text-sm font-bold text-encre line-clamp-1 mb-0.5">{t(p.nom)}</span>
                  <span className="block text-xs text-doux line-clamp-2 leading-relaxed">{t(p.description)}</span>
                  <span className="flex items-baseline gap-2 mt-2.5">
                    <span className="text-[15px] font-black text-encre">{p.prix.toLocaleString(t.loc)}</span>
                    <span className="text-xs text-doux">{t(p.devise)}</span>
                    {p.prixCompare > p.prix && (
                      <span className="text-xs text-doux line-through ml-auto">{p.prixCompare.toLocaleString(t.loc)}</span>
                    )}
                  </span>
                  {p.tags?.length > 0 && (
                    <span className="flex gap-1 mt-2 flex-wrap">
                      {p.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs bg-primaire-fond text-attention px-1.5 py-0.5 rounded-md font-medium">
                          #{t(tag)}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>

          <div className="sticky bottom-20 md:bottom-4 pt-2">
            <Bouton taille="grand" large className="shadow-flottante" onClick={importer} disabled={selectedCount === 0} charge={importing}
              texteCharge={t("Importation en cours...")} icone={<Package size={18} aria-hidden />}>
              {libelleImport}{" "}{t("dans ma boutique")}
            </Bouton>
          </div>
        </div>
      )}

      {/* Phase done */}
      {phase === "done" && (
        <div className="flex flex-col items-center py-16 text-center" role="status">
          <div className="w-20 h-20 rounded-full bg-succes-fond flex items-center justify-center mb-5" aria-hidden>
            <Check size={38} className="text-succes" />
          </div>
          <h2 className="ax-titre-page mb-2">{t("Catalogue importé !")}</h2>
          <p className="ax-texte-secondaire mb-8 max-w-md">
            {importedCount} produit{importedCount > 1 ? "s" : ""}{" "}{t("ajouté")}{importedCount > 1 ? "s" : ""}{" "}{t("à votre boutique avec des images Flux.1 haute définition. Axia peut maintenant les enrichir et les promouvoir.")}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Bouton variante="secondaire" onClick={reset}>{t("Nouveau catalogue")}</Bouton>
            <Link href="/dashboard" className={classesBouton({ variante: "secondaire" })}>
              <Sparkles size={14} aria-hidden />{t("Demander à Axia de promouvoir")}
            </Link>
            <Bouton href="/dashboard/produits">{t("Voir les produits")}</Bouton>
          </div>
        </div>
      )}
    </div>
  );
}
