"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { scoreRecherche } from "@/lib/recherche-dashboard";
import type { BlockNode } from "@/lib/theme-config";
import { blocsDe, nomNoeud } from "./boutique/libelles";
import { elementsPrincipaux } from "./elements-arbre";
import { PAGES, type PageEditee } from "./pages/pages";
import { useT } from "@/components/I18nProvider";
import { SECTIONS_FICHE } from "@/lib/fiche-produit";

// Sections de la fiche produit, avec les mots qu'un marchand y cherche.
const MOTS_FICHE: Record<string, string> = {
  quantity: "Quantité, bouton Commander, Commander via WhatsApp",
  variants: "Variantes, tailles, couleurs, pointures",
  social: "Partage Facebook, WhatsApp, lien",
  gallery: "Photos, images, zoom", info: "Nom, prix, stock, fil d'Ariane",
  sizeguide: "Guide des tailles", reviews: "Avis, étoiles", similar: "Produits similaires",
};

// Synonymes cherchés en plus des libellés (non affichés) : réglages du thème, pages, types de blocs, éléments.
const SYNONYMES: Record<string, string> = {
  logo: "logo marque identité", couleurs: "couleur couleurs palette teinte fond thème",
  typo: "police polices font écriture typographie", layout: "mise en page largeur espacement grille colonnes cartes",
  boutons: "boutons menu navigation en-tête header barre", animations: "animation effets apparition mouvement",
  medias: "médias images photos vidéos bannière", "mode-achat": "panier mode d'achat commande directe commander acheter", avance: "css code personnalisé avancé",
  accueil: "accueil home bannière", catalogue: "catalogue produits collection", produit: "fiche produit article",
  commande: "panier mode d'achat checkout commander paiement formulaire", apropos: "à propos histoire présentation",
  contact: "contact coordonnées adresse whatsapp horaires",
  products: "produits grille catalogue", features: "avantages arguments", brands: "logos partenaires marques",
  "cta-band": "bannière appel à l'action", "social-proof": "confiance avis notes", heading: "titre", button: "bouton lien",
  "En-tête": "header menu navigation logo haut de page", "Pied de page": "footer bas de page liens", Menu: "navigation menu liens",
};

export type ResultatRecherche =
  | { kind: "noeud"; id: string }
  | { kind: "element"; embedId: string; index: number }
  | { kind: "reglage"; id: string }
  | { kind: "page"; page: PageEditee }
  | { kind: "fiche"; type: string };

interface Item { cle: string; label: string; sous?: string; r: ResultatRecherche }

const sansBalises = (html: unknown) => (typeof html === "string" ? html.replace(/<[^>]*>/g, " ") : "");
const textesConfig = (n: BlockNode) => {
  const c = n.config ?? {};
  return [c.texte, c.titre, c.label, c.nom, n.type === "embed-html" ? "" : sansBalises(c.html)].filter((t): t is string => typeof t === "string");
};

// Recherche globale du Constructeur (Ctrl+K / Cmd+K) : sections, blocs et
// éléments des designs de la page d'accueil, sections de la fiche produit,
// réglages du thème, pages.
export function RechercheConstructeur({ tree, reglages, onChoisir }: {
  tree: BlockNode[]; reglages: { id: string; label: string; desc: string }[]; onChoisir: (r: ResultatRecherche) => void;
}) {
  const tr = useT();
  const [q, setQ] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const champ = useRef<HTMLInputElement>(null);
  const liste = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      champ.current?.focus();
      champ.current?.select();
    };
    window.addEventListener("keydown", clavier);
    return () => window.removeEventListener("keydown", clavier);
  }, []);

  const groupes = useMemo(() => {
    if (!q.trim()) return [];
    // Sans accents, synonymes, petites fautes (même correspondance que la recherche du tableau de bord).
    const ok = (...textes: (string | undefined)[]) => scoreRecherche(q, textes.filter(Boolean).join(" ")) > 0;
    const sections: Item[] = [], blocs: Item[] = [], elements: Item[] = [];
    for (const s of tree) {
      const nomSection = tr(nomNoeud(s));
      if (ok(nomSection, s.type, SYNONYMES[s.type], ...textesConfig(s))) sections.push({ cle: s.id, label: nomSection, r: { kind: "noeud", id: s.id } });
      for (const b of blocsDe(s)) {
        if (b.type === "embed-html") {
          for (const el of elementsPrincipaux(b.config?.html || "")) {
            if (ok(tr(el.nom), el.nom, SYNONYMES[el.nom], el.texte)) elements.push({
              cle: `${b.id}-${el.index}`, label: el.texte.slice(0, 60) || tr(el.nom), sous: `${tr(el.nom)} · ${nomSection}`,
              r: { kind: "element", embedId: b.id, index: el.index },
            });
          }
        } else if (ok(tr(nomNoeud(b)), b.type, SYNONYMES[b.type], ...textesConfig(b))) {
          blocs.push({ cle: b.id, label: tr(nomNoeud(b)), sous: nomSection, r: { kind: "noeud", id: b.id } });
        }
      }
    }
    return [
      { titre: tr("Sections"), items: sections },
      { titre: tr("Blocs"), items: blocs },
      { titre: tr("Éléments"), items: elements },
      { titre: tr("Paramètres du thème"), items: reglages.filter((r) => ok(tr(r.label), tr(r.desc), r.label, SYNONYMES[r.id])).map((r): Item => ({ cle: r.id, label: tr(r.label), sous: tr(r.desc), r: { kind: "reglage", id: r.id } })) },
      { titre: tr("Fiche produit"), items: Object.entries(SECTIONS_FICHE).filter(([type, d]) => ok(tr(d.label), MOTS_FICHE[type] && tr(MOTS_FICHE[type])))
        .map(([type, d]): Item => ({ cle: `fiche-${type}`, label: tr(d.label), sous: MOTS_FICHE[type] ? tr(MOTS_FICHE[type]) : tr("Fiche produit"), r: { kind: "fiche", type } })) },
      { titre: tr("Pages"), items: PAGES.filter((p) => ok(tr(p.label), p.label, SYNONYMES[p.id])).map((p): Item => ({ cle: p.id, label: tr(p.label), r: { kind: "page", page: p.id } })) },
    ].map((g) => ({ ...g, items: g.items.slice(0, 8) })).filter((g) => g.items.length);
  }, [q, tree, reglages, tr]);
  const items = groupes.flatMap((g) => g.items);

  useEffect(() => setActif(0), [q]);
  useEffect(() => { liste.current?.querySelector('[data-actif="true"]')?.scrollIntoView({ block: "nearest" }); }, [actif]);

  const choisir = (item?: Item) => {
    if (!item) return;
    onChoisir(item.r);
    setOuvert(false);
    champ.current?.blur();
  };

  return (
    <div className="relative flex-1 min-w-0 max-w-[260px]">
      <label className="flex items-center gap-2 h-10 px-3 rounded-lg bg-[#F3F3F3] border border-transparent focus-within:bg-white focus-within:border-[#F5A623] focus-within:ring-2 focus-within:ring-[#F5A623]/20 transition-colors">
        <Search size={18} className="text-[#888888] flex-shrink-0" />
        <input ref={champ} value={q} placeholder={tr("Rechercher")} aria-label={tr("Rechercher dans la boutique")}
          role="combobox" aria-expanded={ouvert && !!q.trim()} aria-controls="recherche-constructeur"
          onChange={(e) => { setQ(e.target.value); setOuvert(true); }}
          onFocus={() => setOuvert(true)}
          onBlur={() => setOuvert(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActif((a) => Math.min(a + 1, items.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActif((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); choisir(items[actif]); }
            else if (e.key === "Escape") { setQ(""); champ.current?.blur(); }
          }}
          className="flex-1 min-w-0 text-[14px] text-[#111111] placeholder:text-[#999999] outline-none bg-transparent" />
        <kbd className="hidden 2xl:block text-[11px] font-sans text-[#999999] border border-[#DDDDDD] rounded px-1">Ctrl K</kbd>
      </label>

      {ouvert && q.trim() && (
        // onMouseDown empêché : le champ garde le focus jusqu'au clic.
        <div ref={liste} id="recherche-constructeur" role="listbox" onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-[380px] max-h-[60vh] overflow-y-auto scrollbar-thin p-2 bg-white rounded-xl border border-[#E8E8E8] shadow-[0_12px_40px_rgba(0,0,0,0.14)]">
          {groupes.map((g) => (
            <div key={g.titre} className="pb-1">
              <p className="px-2 pt-2 pb-1 text-[12px] font-semibold uppercase tracking-wide text-[#999999]">{g.titre}</p>
              {g.items.map((item) => {
                const estActif = items[actif] === item;
                return (
                  <button key={item.cle} role="option" aria-selected={estActif} data-actif={estActif} onClick={() => choisir(item)}
                    onMouseEnter={() => setActif(items.indexOf(item))}
                    className={`w-full flex flex-col justify-center min-h-10 px-2.5 py-1.5 rounded-lg text-left ${estActif ? "bg-[#FFF1D6]" : ""}`}>
                    <span className="block w-full text-[14px] text-[#111111] truncate">{item.label}</span>
                    {item.sous && <span className="block w-full text-[12.5px] text-[#888888] truncate">{item.sous}</span>}
                  </button>
                );
              })}
            </div>
          ))}
          {!items.length && (
            <div className="px-2 py-6 text-center">
              <p className="text-[14px] text-[#888888]">{tr("Aucun résultat pour « {0} »", q.trim())}</p>
              {/* Nouvel onglet : le constructeur reste ouvert, rien n'est perdu. */}
              <button type="button" onClick={() => window.open(`/dashboard?axia=${encodeURIComponent(tr("Dans le constructeur, où trouver « {0} » ?", q.trim()))}`, "_blank", "noopener")}
                className="mt-3 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold text-[#92400E] bg-[#FFF1D6] hover:bg-[#FFE7B8]">
                <Sparkles size={14} />{tr("Demander à Axia")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
