"use client";
// Briques d'interface communes aux pages AXSO Sourcing, branchées sur le kit
// du tableau de bord (components/ui) : mêmes jetons, mêmes boutons, mêmes états.
import { useCallback, useEffect, useState } from "react";
import { Info } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import {
  Alerte, Badge, Bouton as BoutonUi, EnTetePage, EtatChargement, EtatVide as EtatVideUi, CLASSE_SAISIE, type Ton as TonUi,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const ERREUR_RESEAU = "Connexion impossible. Vérifie ta connexion internet puis réessaie.";
const ERREUR_INCONNUE = "L'opération n'a pas abouti. Réessaie dans un instant.";

export const POLICE = { fontFamily: "'Poppins','Century Gothic',system-ui,sans-serif" } as const;

/** Lecture d'une route /api/sourcing : données, chargement, erreur, rechargement. */
export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(!!url);
  const recharger = useCallback(async () => {
    if (!url) return;
    setChargement(true);
    try {
      const r = await fetch(url).catch(() => { throw new Error(ERREUR_RESEAU); });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? d.message ?? ERREUR_INCONNUE);
      setData(d); setErreur(null);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }, [url]);
  useEffect(() => { recharger(); }, [recharger]);
  return { data, setData, erreur, chargement, recharger };
}

/** Appel d'écriture : renvoie le JSON, ou lève l'erreur renvoyée par l'API (message en français). */
export async function envoyer<T = any>(url: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })
    .catch(() => { throw new Error(ERREUR_RESEAU); });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? d.message ?? ERREUR_INCONNUE);
  return d as T;
}

/** Remonte au dossier produit (en haut de /dashboard/sourcing), là où se rattache un fournisseur et se renseignent les coûts. */
export const versDossier = () => document.getElementById("dossier-en-cours")?.scrollIntoView({ behavior: "smooth", block: "start" });

export function Page({ children, etroite }: { children: React.ReactNode; etroite?: boolean }) {
  return <div className={`space-y-5 ${etroite ? "max-w-3xl mx-auto" : ""}`} style={POLICE}>{children}</div>;
}

export function Entete({ badge, titre, sousTitre, actions }: { badge?: string; titre: string; sousTitre?: string; actions?: React.ReactNode }) {
  const t = useT();
  return (
    <EnTetePage className="mb-0" titre={t(titre)} description={sousTitre ? t(sousTitre) : undefined}
      indicateurs={badge ? <Badge ton="accent">{t(badge)}</Badge> : undefined} actions={actions} />
  );
}

export function Carte({ titre, aide, actions, children, className = "" }: { titre?: string; aide?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const t = useT();
  return (
    <section className={cn("rounded-carte border border-bordure bg-carte p-4 shadow-carte sm:p-5", className)}>
      {(titre || actions) && (
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            {titre && <h2 className="ax-titre-section">{t(titre)}</h2>}
            {aide && <p className="mt-0.5 ax-aide">{t(aide)}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

// Tons historiques du sourcing → tons du kit (« attention » était rouge : il reste rouge).
const TONS = { neutre: "neutre", accent: "accent", positif: "succes", attention: "erreur", info: "info" } as const satisfies Record<string, TonUi>;
export type Ton = keyof typeof TONS;

export function Pastille({ ton = "neutre", children }: { ton?: Ton; children: React.ReactNode }) {
  return <Badge ton={TONS[ton]}>{children}</Badge>;
}

/** Statut d'une intégration : ne jamais laisser croire qu'un service non branché fonctionne. */
export function PastilleIntegration({ statut }: { statut: "actif" | "sandbox" | "a_connecter" }) {
  const t = useT();
  return statut === "actif" ? <Pastille ton="positif">{t("Actif")}</Pastille>
    : statut === "sandbox" ? <Pastille ton="info">{t("Sandbox — données fictives")}</Pastille>
    : <Pastille ton="neutre">{t("À connecter")}</Pastille>;
}

/** Étiquette obligatoire à côté de tout chiffre qui n'est pas mesuré. */
export function Estimation({ children }: { children?: React.ReactNode }) {
  const t = useT();
  return <Pastille ton="accent"><Info aria-hidden />{children ?? t("Estimation")}</Pastille>;
}

export function Bouton({ children, onClick, href, variante = "primaire", disabled, charge, type = "button", petit }: {
  children: React.ReactNode; onClick?: () => void; href?: string; variante?: "primaire" | "secondaire" | "discret";
  disabled?: boolean; charge?: boolean; type?: "button" | "submit"; petit?: boolean;
}) {
  return (
    <BoutonUi variante={variante === "discret" ? "fantome" : variante} taille={petit ? "compact" : "normal"}
      href={href} onClick={onClick} disabled={disabled} charge={charge} type={type}>
      {children}
    </BoutonUi>
  );
}

export const CLASSE_CHAMP = CLASSE_SAISIE;

export function Champ({ label, aide, children }: { label: string; aide?: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <label className="block">
      <span className="ax-libelle">{t(label)}</span>
      <div className="mt-1.5">{children}</div>
      {aide && <span className="mt-1 block ax-aide">{t(aide)}</span>}
    </label>
  );
}

/** Champ numérique ; vide = « non renseigné » (undefined), pour laisser jouer la valeur par défaut. */
export function ChampNombre({ label, aide, valeur, onChange, suffixe, placeholder, pas }: {
  label: string; aide?: string; valeur: number | undefined; onChange: (v: number | undefined) => void; suffixe?: string; placeholder?: string; pas?: number;
}) {
  return (
    <Champ label={label} aide={aide}>
      <div className="flex items-center gap-2">
        <input type="number" inputMode="decimal" min={0} step={pas ?? "any"} value={valeur ?? ""} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)))} className={`${CLASSE_CHAMP} min-w-0`} />
        {suffixe && <span className="whitespace-nowrap text-sm text-doux">{suffixe}</span>}
      </div>
    </Champ>
  );
}

/** Champ en pourcentage adossé à une part (0,3 ↔ 30 %). */
export function ChampPourcent({ label, aide, valeur, onChange, placeholder }: { label: string; aide?: string; valeur: number | undefined; onChange: (v: number | undefined) => void; placeholder?: string }) {
  return <ChampNombre label={label} aide={aide} suffixe="%" placeholder={placeholder}
    valeur={valeur === undefined ? undefined : Math.round(valeur * 1000) / 10}
    onChange={(v) => onChange(v === undefined ? undefined : Math.min(95, v) / 100)} />;
}

export function EtatVide({ titre, texte, children }: { titre: string; texte?: string; children?: React.ReactNode }) {
  const t = useT();
  return <EtatVideUi titre={t(titre)} texte={texte ? t(texte) : undefined}>{children}</EtatVideUi>;
}

export function Chargement() {
  return <EtatChargement />;
}

/** Échec d'un chargement ou d'une action : le message de l'API, en français, dit quoi faire. */
export function Erreur({ message }: { message: string }) {
  const t = useT();
  return <Alerte ton="erreur" titre={t(message)} />;
}

export function Onglets<T extends string>({ onglets, actif, onChange }: { onglets: { cle: T; libelle: string; nombre?: number }[]; actif: T; onChange: (c: T) => void }) {
  const t = useT();
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {onglets.map((o) => (
        <button key={o.cle} type="button" onClick={() => onChange(o.cle)}
          aria-pressed={actif === o.cle}
          className={cn("min-h-10 whitespace-nowrap rounded-controle px-3 text-sm font-semibold transition-colors sm:min-h-9",
            actif === o.cle ? "bg-secondaire text-carte" : "bg-carte-2 text-doux hover:text-encre")}>
          {t(o.libelle)}{o.nombre !== undefined ? ` · ${o.nombre}` : ""}
        </button>
      ))}
    </div>
  );
}

/** Tuile de chiffre clé. */
export function Kpi({ libelle, valeur, detail, ton }: { libelle: string; valeur: string; detail?: string; ton?: "positif" | "attention" }) {
  const t = useT();
  return (
    <div className="rounded-carte border border-bordure bg-carte p-4 shadow-carte">
      <p className="ax-aide font-semibold">{t(libelle)}</p>
      <p className={cn("mt-1 break-words text-xl font-bold leading-tight tabular-nums", ton === "positif" ? "text-succes" : ton === "attention" ? "text-erreur" : "text-encre")}>{valeur}</p>
      {detail && <p className="mt-0.5 ax-aide">{t(detail)}</p>}
    </div>
  );
}

export const pourcent = (n: number | null | undefined, decimales = 0) => (n === null || n === undefined ? "—" : `${(n * 100).toFixed(decimales)} %`);
