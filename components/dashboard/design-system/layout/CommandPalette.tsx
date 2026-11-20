"use client";
// Palette de commandes (MASTERPROMPT §11) : Ctrl/Cmd+K, le champ « Rechercher »
// de la sidebar ou de la barre mobile. Pages du menu (filtrées comme la
// sidebar), actions, et produits / commandes / clients via GET /api/recherche
// (droits du membre respectés côté serveur).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMontant } from "@/lib/utils";
import type { ModuleKey, Niveau } from "@/lib/permissions";
import type { Palier } from "@/lib/plans";
import { useT } from "@/components/I18nProvider";
import { Icon, type IconName } from "../icons/Icon";
import { Modal } from "../components/Modal";
import { pagesNavigables } from "./navigation";

const EVENEMENT = "axso:recherche";
/** Ouvre la palette depuis n'importe quel composant. */
export function ouvrirRecherche() { window.dispatchEvent(new Event(EVENEMENT)); }

type Resultats = {
  devise: string;
  produits: { id: string; nom: string; type: string; prix: number; image: string | null; actif: boolean }[];
  commandes: { id: string; numero: string; clientNom: string; montantTotal: number; devise: string; statut: string }[];
  clients: { id: string; nom: string; telephone: string | null; email: string | null }[];
};
type Ligne = { cle: string; groupe: string; titre: string; detail?: string; href: string; icon: IconName; image?: string | null };

const sansAccents = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const STATUTS: Record<string, string> = { en_attente: "En attente", confirmee: "Confirmée", en_preparation: "En préparation", expediee: "Expédiée", livree: "Livrée", annulee: "Annulée", tentative_echouee: "Tentative échouée" };
const ACTIONS: { titre: string; href: string; icon: IconName; moduleKey?: ModuleKey }[] = [
  { titre: "Ajouter un produit", href: "/dashboard/produits/nouveau", icon: "plus", moduleKey: "produits" },
  { titre: "Créer une réduction", href: "/dashboard/marketing/codes-promo", icon: "discount", moduleKey: "marketing" },
  { titre: "Ouvrir la caisse", href: "/dashboard/pos/caisse", icon: "monitor", moduleKey: "pos" },
  { titre: "Personnaliser la boutique", href: "/dashboard/builder", icon: "store", moduleKey: "boutique" },
];
const CLE_RECENTS = "axso:recherches-recentes";

function lireRecents(): Ligne[] {
  try { return JSON.parse(localStorage.getItem(CLE_RECENTS) || "[]").slice(0, 5); } catch { return []; }
}
function memoriser(l: Ligne) {
  try {
    const liste = [l, ...lireRecents().filter((x) => x.href !== l.href)].slice(0, 5);
    localStorage.setItem(CLE_RECENTS, JSON.stringify(liste));
  } catch { /* stockage indisponible */ }
}

export function CommandPalette({ permissions, palier }: { permissions?: Record<ModuleKey, Niveau>; palier?: Palier }) {
  const t = useT();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Resultats | null>(null);
  const [chargement, setChargement] = useState(false);
  const [actif, setActif] = useState(0);
  const [recents, setRecents] = useState<Ligne[]>([]);
  const liste = useRef<HTMLDivElement>(null);

  const ouvrir = useCallback(() => { setRecents(lireRecents()); setOuvert(true); }, []);
  const fermer = useCallback(() => { setOuvert(false); setQ(""); setRes(null); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ouvrir(); }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(EVENEMENT, ouvrir);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener(EVENEMENT, ouvrir); };
  }, [ouvrir]);

  // Données (anti-rebond 150 ms ; une réponse périmée n'écrase jamais la plus récente)
  useEffect(() => {
    const terme = q.trim();
    if (terme.length < 2) { setRes(null); setChargement(false); return; }
    setChargement(true);
    const ctrl = new AbortController();
    const minuterie = setTimeout(() => {
      fetch(`/api/recherche?q=${encodeURIComponent(terme)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setRes(d); })
        .catch(() => {}).finally(() => { if (!ctrl.signal.aborted) setChargement(false); });
    }, 150);
    return () => { clearTimeout(minuterie); ctrl.abort(); };
  }, [q]);

  const pages = useMemo(() => pagesNavigables(permissions, palier), [permissions, palier]);
  const lignes: Ligne[] = useMemo(() => {
    const terme = sansAccents(q.trim());
    const actions = ACTIONS.filter((a) => !permissions || !a.moduleKey || permissions[a.moduleKey] !== "aucun");
    if (!terme) {
      return [
        ...recents.map((r) => ({ ...r, cle: `r-${r.href}`, groupe: "Récents" })),
        ...pages.filter((p) => !p.groupe).slice(0, 6).map((p) => ({ cle: `p-${p.href}`, groupe: "Pages", titre: p.label, href: p.href, icon: p.icon })),
      ];
    }
    const l: Ligne[] = pages
      .filter((p) => sansAccents(`${p.label} ${p.groupe}`).includes(terme))
      .slice(0, 6)
      .map((p) => ({ cle: `p-${p.href}`, groupe: p.groupe === "Paramètres" ? "Paramètres" : "Pages", titre: p.label, detail: p.groupe || undefined, href: p.href, icon: p.icon }));
    if (res) {
      l.push(...res.commandes.map((c) => ({ cle: `c-${c.id}`, groupe: "Commandes", titre: `#${c.numero} · ${c.clientNom}`, detail: `${formatMontant(c.montantTotal, c.devise)} · ${STATUTS[c.statut] ?? c.statut}`, href: `/dashboard/commandes/${c.id}`, icon: "orders" as IconName })));
      l.push(...res.produits.map((p) => ({ cle: `pr-${p.id}`, groupe: "Produits", titre: p.nom, detail: `${formatMontant(p.prix, res.devise)}${p.actif ? "" : " · masqué"}`, href: `/dashboard/produits/${p.id}`, icon: "tag" as IconName, image: p.image })));
      l.push(...res.clients.map((c) => ({ cle: `cl-${c.id}`, groupe: "Clients", titre: c.nom, detail: [c.telephone, c.email].filter(Boolean).join(" · ") || undefined, href: `/dashboard/clients?q=${encodeURIComponent(c.nom)}`, icon: "user" as IconName })));
    }
    l.push(...actions.filter((a) => sansAccents(a.titre).includes(terme)).map((a) => ({ cle: `a-${a.href}`, groupe: "Actions", titre: a.titre, href: a.href, icon: a.icon })));
    // Groupes dans l'ordre §11 : Pages · Commandes · Produits · Clients · Paramètres · Actions.
    const ordre = ["Pages", "Commandes", "Produits", "Clients", "Paramètres", "Actions"];
    return l.sort((a, b) => ordre.indexOf(a.groupe) - ordre.indexOf(b.groupe));
  }, [q, res, pages, recents, permissions]);

  useEffect(() => setActif(0), [q, res]);
  useEffect(() => { liste.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" }); }, [actif]);

  const aller = (l: Ligne) => { memoriser({ ...l, groupe: "Récents" }); fermer(); router.push(l.href); };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActif((i) => Math.min(i + 1, lignes.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActif((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && lignes[actif]) { e.preventDefault(); aller(lignes[actif]); }
  };

  return (
    <Modal open={ouvert} onClose={fermer} className="axd-cmdk" scrimClassName="axd-cmdk-scrim" labelledBy="axd-cmdk-label">
      <div className="axd-cmdk__search">
        <Icon name="search" />
        <span id="axd-cmdk-label" className="sr-only">{t("Rechercher")}</span>
        <input data-autofocus type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
          placeholder={t("Rechercher des pages, commandes, produits, clients…")} autoComplete="off"
          role="combobox" aria-expanded aria-controls="axd-cmdk-res" aria-activedescendant={lignes[actif]?.cle} />
        <button type="button" className="axd-badge" onClick={fermer} style={{ border: 0, cursor: "pointer" }}>{t("Échap")}</button>
      </div>
      <div className="axd-cmdk__res" id="axd-cmdk-res" role="listbox" ref={liste} aria-live="polite">
        {lignes.map((l, i) => (
          <div key={l.cle}>
            {(i === 0 || lignes[i - 1].groupe !== l.groupe) && <div className="axd-cmdk__grp">{t(l.groupe)}</div>}
            <button type="button" id={l.cle} role="option" aria-selected={i === actif} className="axd-cmdk__item"
              onMouseEnter={() => setActif(i)} onClick={() => aller(l)}>
              {l.image ? <img src={l.image} alt="" /> : <span className="axd-cmdk__thumb"><Icon name={l.icon} /></span>}
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t(l.titre)}</span>
              {l.detail && <span className="axd-cmdk__detail">{t(l.detail)}</span>}
            </button>
          </div>
        ))}
        {q.trim().length >= 2 && !chargement && lignes.length === 0 && (
          <p className="axd-cmdk__empty">{t("Aucun résultat pour « {0} »", q.trim())}</p>
        )}
        {chargement && <p className="axd-cmdk__empty">{t("Recherche dans les produits, commandes et clients…")}</p>}
      </div>
    </Modal>
  );
}
