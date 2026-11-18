"use client";
// Panier de la vitrine (mode d'achat « panier », lib/mode-achat.ts) : il vit dans le navigateur
// (localStorage, par boutique), s'ouvre en panneau latéral depuis tout lien [data-axs-panier]
// (bouton Panier de l'en-tête, design ou classique) et se commande en une fois via
// /checkout?panier=… — la page de commande recalcule produits et prix depuis la base.
// Monté une seule fois par le layout de la vitrine ; rien n'est rendu en mode « direct ».
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { ajouterLigne, encoderPanier, type LignePanier } from "@/lib/mode-achat";
import { usePrix } from "@/components/storefront/DeviseVitrine";
import { useT } from "@/components/I18nProvider";

/** Ligne gardée dans le navigateur : de quoi l'afficher (prix dans la devise de la boutique, indicatif). */
export type LigneStockee = LignePanier & { nom: string; prix: number; image?: string | null; stock?: number | null };

const cle = (slug: string) => `axso-panier:${slug}`;
const EVT = "axs:panier";

export function lirePanier(slug: string): LigneStockee[] {
  try {
    const v = JSON.parse(localStorage.getItem(cle(slug)) || "[]");
    return Array.isArray(v) ? v.filter((l) => l && typeof l.produitId === "string" && Number(l.quantite) > 0) : [];
  } catch { return []; }
}

function ecrirePanier(slug: string, lignes: LigneStockee[]) {
  try {
    if (lignes.length) localStorage.setItem(cle(slug), JSON.stringify(lignes));
    else localStorage.removeItem(cle(slug));
  } catch { /* navigation privée, stockage bloqué : le panier ne survit pas à la page */ }
  window.dispatchEvent(new Event(EVT));
}

export const viderPanier = (slug: string) => ecrirePanier(slug, []);

/** Ajoute au panier (quantité plafonnée au stock connu) puis ouvre le panneau. */
export function ajouterAuPanier(slug: string, ligne: LigneStockee) {
  ecrirePanier(slug, ajouterLigne(lirePanier(slug), ligne, ligne.stock));
  window.dispatchEvent(new Event(`${EVT}-ouvrir`));
}

const lienCommande = (slug: string, lignes: LignePanier[]) => `/${slug}/checkout?panier=${encodeURIComponent(encoderPanier(lignes))}`;

function usePanier(slug: string) {
  const [lignes, setLignes] = useState<LigneStockee[]>([]);
  useEffect(() => {
    const maj = () => setLignes(lirePanier(slug));
    maj();
    window.addEventListener(EVT, maj);
    window.addEventListener("storage", maj); // autre onglet
    return () => { window.removeEventListener(EVT, maj); window.removeEventListener("storage", maj); };
  }, [slug]);
  return [lignes, (l: LigneStockee[]) => ecrirePanier(slug, l)] as const;
}

type Couleurs = { accent: string; fond: string; texte: string };
type Vitrine = { slug: string; devise: string; actif: boolean } & Couleurs;
const Ctx = createContext<Vitrine | null>(null);

/** Boutique et couleurs de la vitrine (null hors vitrine). */
export const useVitrine = () => useContext(Ctx);
/** Mode panier actif sur cette vitrine (null en mode direct ou hors vitrine). */
export const usePanierVitrine = () => { const v = useContext(Ctx); return v?.actif ? v : null; };

/** Liste du panier : panneau latéral et page /panier. */
export function ContenuPanier({ slug, devise, accent, texte, onNaviguer }: { slug: string; devise: string; onNaviguer?: () => void } & Omit<Couleurs, "fond">) {
  const t = useT();
  const { fmt } = usePrix();
  const [lignes, changer] = usePanier(slug);
  const total = lignes.reduce((s, l) => s + l.prix * l.quantite, 0);
  const qte = (i: number, q: number) => changer(q <= 0 ? lignes.filter((_, j) => j !== i) : lignes.map((l, j) => (j === i ? { ...l, quantite: Math.min(q, l.stock ?? 999, 999) } : l)));

  if (!lignes.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <ShoppingBag size={32} className="mx-auto opacity-30" />
        <p className="font-semibold">{t("Votre panier est vide")}</p>
        <p className="text-sm opacity-70">{t("Ajoutez des produits depuis le catalogue pour les commander en une seule fois.")}</p>
        <a href={`/${slug}/produits`} onClick={onNaviguer} className="inline-flex items-center justify-center min-h-11 px-5 rounded-xl text-sm font-semibold" style={{ background: accent, color: "#fff" }}>{t("Voir les produits")}</a>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <ul className="divide-y" style={{ borderColor: `${texte}15` }}>
        {lignes.map((l, i) => (
          <li key={`${l.produitId}-${l.variante ?? ""}`} className="flex gap-3 py-3">
            <a href={`/${slug}/produits/${l.produitId}`} onClick={onNaviguer} className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden" style={{ background: `${accent}12` }}>
              {l.image && <img src={l.image} alt="" className="w-full h-full object-cover" />}
            </a>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-semibold leading-snug line-clamp-2">{t(l.nom)}</p>
              {l.variante && <p className="text-xs opacity-70">{l.variante}</p>}
              {l.stock != null && l.quantite >= l.stock && <p className="text-xs opacity-70">{t("Quantité maximale disponible en stock")}</p>}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center border rounded-lg" style={{ borderColor: `${texte}25` }}>
                  <button type="button" onClick={() => qte(i, l.quantite - 1)} aria-label={t("Diminuer la quantité")} className="w-11 h-11 flex items-center justify-center"><Minus size={14} /></button>
                  <span className="w-7 text-center text-sm font-bold tabular-nums">{l.quantite}</span>
                  <button type="button" onClick={() => qte(i, l.quantite + 1)} disabled={l.quantite >= (l.stock ?? 999)} aria-label={t("Augmenter la quantité")} className="w-11 h-11 flex items-center justify-center disabled:opacity-30"><Plus size={14} /></button>
                </div>
                <span className="text-sm font-bold">{fmt(l.prix * l.quantite, devise)}</span>
              </div>
            </div>
            <button type="button" onClick={() => qte(i, 0)} aria-label={t("Retirer {0} du panier", t(l.nom))} className="w-11 h-11 flex items-center justify-center opacity-50 hover:opacity-100"><Trash2 size={15} /></button>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between font-bold">
        <span>{t("Sous-total")}</span><span>{fmt(total, devise)}</span>
      </div>
      <p className="text-xs opacity-70">{t("Frais de livraison et montant final calculés à l'étape suivante, selon votre adresse.")}</p>
      <a href={lienCommande(slug, lignes)} onClick={onNaviguer} className="flex items-center justify-center w-full min-h-12 rounded-xl font-bold" style={{ background: accent, color: "#fff" }}>
        {t("Passer la commande")}
      </a>
    </div>
  );
}

/** Fournit la boutique et le mode panier à la vitrine et ajoute le panneau latéral (ouvert par les liens [data-axs-panier]). */
export function PanierVitrine({ slug, devise, actif, accent, fond, texte, children }: { slug: string; devise: string; actif: boolean; children: ReactNode } & Couleurs) {
  const t = useT();
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const [lignes] = usePanier(slug);
  const nb = lignes.reduce((s, l) => s + l.quantite, 0);

  useEffect(() => {
    if (!actif) return;
    const ouvrir = () => setOuvert(true);
    const clic = (e: MouseEvent) => {
      const el = e.target as Element | null;
      // Carte produit d'un design (lib/vitrine-design.ts) : ajout direct, sans quitter la page.
      const ajout = el?.closest?.<HTMLElement>("[data-axs-ajout]");
      if (ajout) {
        e.preventDefault(); e.stopPropagation();
        const d = ajout.dataset;
        ajouterAuPanier(slug, { produitId: d.axsAjout!, quantite: 1, nom: d.nom ?? "", prix: Number(d.prix) || 0, image: d.image || null, stock: d.stock ? Number(d.stock) : null });
        return;
      }
      // Bouton Panier de l'en-tête : panneau latéral (la page /panier reste l'adresse du lien).
      if (el?.closest?.("a[data-axs-panier]") && !/\/panier$/.test(location.pathname)) { e.preventDefault(); setOuvert(true); }
    };
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    window.addEventListener(`${EVT}-ouvrir`, ouvrir);
    document.addEventListener("click", clic, true);
    document.addEventListener("keydown", echap);
    return () => { window.removeEventListener(`${EVT}-ouvrir`, ouvrir); document.removeEventListener("click", clic, true); document.removeEventListener("keydown", echap); };
  }, [actif, slug]);

  // Nombre d'articles sur les boutons Panier (en-tête du design ou classique).
  useEffect(() => {
    if (!actif) return;
    document.querySelectorAll("a[data-axs-panier]").forEach((a) => (nb ? a.setAttribute("data-axs-nb", nb > 99 ? "99+" : String(nb)) : a.removeAttribute("data-axs-nb")));
  }, [actif, nb, pathname]);

  useEffect(() => setOuvert(false), [pathname]);

  return (
    <Ctx.Provider value={{ slug, devise, actif, accent, fond, texte }}>
      {children}
      {actif && (
        <>
          <style>{`a[data-axs-panier]{position:relative}a[data-axs-panier][data-axs-nb]::after{content:attr(data-axs-nb);position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:${accent};color:#fff;font:700 10px/18px system-ui,sans-serif;text-align:center}`}</style>
          {ouvert && (
            <div className="fixed inset-0 z-[200] flex justify-end" style={{ background: "rgba(0,0,0,.45)" }} onClick={() => setOuvert(false)}>
              <aside role="dialog" aria-modal="true" aria-label={t("Panier")} onClick={(e) => e.stopPropagation()}
                className="h-full w-full max-w-md overflow-y-auto p-4 sm:p-6 shadow-2xl" style={{ background: fond, color: texte }}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold">{t("Panier")}{nb > 0 && ` (${nb})`}</h2>
                  <button type="button" onClick={() => setOuvert(false)} aria-label={t("Fermer")} className="w-11 h-11 flex items-center justify-center"><X size={18} /></button>
                </div>
                <ContenuPanier slug={slug} devise={devise} accent={accent} texte={texte} onNaviguer={() => setOuvert(false)} />
                {nb > 0 && <a href={`/${slug}/panier`} className="block text-center text-sm underline mt-3 opacity-70">{t("Voir le panier")}</a>}
              </aside>
            </div>
          )}
        </>
      )}
    </Ctx.Provider>
  );
}
