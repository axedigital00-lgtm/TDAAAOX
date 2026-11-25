"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApercuDesign, parametresApercu, fichierDuTheme, CONFIRMER_CHANGEMENT } from "@/components/dashboard/ApercuDesign";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { VisiteGuidee } from "@/components/dashboard/VisiteGuidee";
import { Palette, Sparkles, X, Check } from "lucide-react";
import { Page, PageHeader, Card, Button, Badge } from "@/components/dashboard/design-system";
import { useT } from "@/components/I18nProvider";
import { urlBoutique } from "@/lib/utils";
import { FAMILLES_THEMES, famillesTheme } from "@/lib/themes-familles";

const THEMES_TUTORIAL_STEPS = [
  { Icon: Palette,  titre: "Choisissez un design AXSO", description: "15 designs prêts à l'emploi, pensés pour différents univers : mode, artisanat, beauté... En choisir un branche directement vos vrais produits." },
  { Icon: Sparkles, titre: "Importez votre propre design", description: "Envoyez un fichier HTML de référence — notre IA en extrait le style pour créer un thème AXSO personnalisé." },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface ThemeColors {
  fond: string;
  accent: string;
  texte: string;
  surface: string;
  texteMuted?: string;
  bordure?: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ThemesPage() {
  const tr = useT();
  const router = useRouter();
  const [themes, setThemes] = useState<any[]>([]);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [params, setParams] = useState(""); // aperçus avec les vrais nom, devise et produits
  // Aperçu plein écran d'un thème de la bibliothèque (toucher une carte).
  const [zoom, setZoom] = useState<{ fichier: string; nom: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/themes").then((r) => r.json()),
      fetch("/api/tenants/moi").then((r) => r.json()),
      fetch("/api/produits?limit=24&actif=true").then((r) => r.json()).catch(() => ({})),
    ]).then(([td, te, pr]) => {
      setThemes(td.themes || []);
      setTenant(te.tenant);
      setParams(parametresApercu(te.tenant, pr.produits ?? []));
      setLoading(false);
    });
  }, []);

  // Thèmes perso (import manuel ou anciens thèmes créés avant la bibliothèque) —
  // un Theme existe déjà, on ne fait qu'assigner directement son id.
  async function activerCustom(id: string) {
    if (!confirm(CONFIRMER_CHANGEMENT(themes.find((t) => t.id === id)?.nom || "ce thème"))) return;
    setActivating(id);
    try {
      await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: id }),
      });
      setTenant((t: any) => ({ ...t, themeId: id }));
      toast.success(tr("Thème activé !"));
    } catch {
      toast.error(tr("Erreur lors de l'activation"));
    } finally {
      setActivating(null);
    }
  }

  // Bibliothèque AXSO Design — contrairement au thème perso ci-dessus (un id
  // déjà existant, assigné directement), chaque design de la bibliothèque
  // crée un vrai Theme propre à CE tenant (vos produits déjà branchés dans
  // la grille) — voir app/api/themes/provisionner.
  async function activerLibrairie(fichier: string, nom: string) {
    if (!confirm(CONFIRMER_CHANGEMENT(nom))) return;
    setActivating(fichier);
    try {
      const res = await fetch("/api/themes/provisionner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fichier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setTenant((t: any) => ({ ...t, themeId: data.theme.id }));
      // Le nouveau Theme (propre à ce tenant) doit apparaître dans "custom"
      // pour que isLibrairieActive() le détecte.
      const td = await fetch("/api/themes").then((r) => r.json());
      setThemes(td.themes || []);
      toast.success(tr("Design \"{0}\" activé !", nom));
    } catch {
      toast.error(tr("Erreur lors de l'activation"));
    } finally {
      setActivating(null);
    }
  }

  function isLibrairieActive(fichier: string) {
    const actif = themes.find((t) => t.id === tenant?.themeId);
    // Slug posé au provisionnement : « axso-design-<fichier sans .html>-<horodatage> » (lib/axso-design-library.ts).
    return !!actif && typeof actif.slug === "string" && actif.slug.startsWith(`axso-design-${fichier.replace(/\.html$/, "")}-`);
  }

  async function supprimer(id: string) {
    if (!confirm(tr("Supprimer ce thème ?"))) return;
    setDeleting(id);
    try {
      await fetch(`/api/themes/${id}`, { method: "DELETE" });
      setThemes((ts) => ts.filter((t) => t.id !== id));
      toast.success(tr("Thème supprimé"));
    } catch {
      toast.error(tr("Erreur"));
    } finally {
      setDeleting(null);
    }
  }

  const librairie = themes.filter((t) => t.axsoDesign);
  const custom = themes.filter((t) => !t.builtin);
  const actif = themes.find((t) => t.id === tenant?.themeId || t.slug === tenant?.themeId);
  const ambiances = useMemo(() => FAMILLES_THEMES.map((f) => f.nom).filter((n) => librairie.some((t) => famillesTheme(t.description).includes(n))), [librairie]);
  const [filtre, setFiltre] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const visibles = librairie.filter((t) =>
    (!filtre || famillesTheme(t.description).includes(filtre)) &&
    (!recherche.trim() || `${t.nom} ${t.description || ""}`.toLowerCase().includes(recherche.trim().toLowerCase())));

  if (loading) {
    return (
      <Page>
        <PageHeader icon="store" title={tr("Thèmes")} />
        <Card><p style={{ color: "var(--color-text-subdued)" }}>{tr("Chargement...")}</p></Card>
      </Page>
    );
  }

  return (
    <Page>
      <ModuleTutorial moduleKey="themes" titre={tr("Thèmes")} sousTitre={tr("Personnalise l'apparence de ta boutique")} steps={THEMES_TUTORIAL_STEPS} />
      <VisiteGuidee cle="themes" etapes={[
        { cible: "theme-actuel", titre: "Votre thème actuel", texte: "C'est le design que voient vos clients en ce moment." },
        { cible: "theme-ambiances", titre: "Filtrez par style", texte: "Mode, beauté, artisanat… touchez un style pour ne voir que les thèmes qui vous ressemblent." },
        { cible: "theme-carte", titre: "Touchez un thème pour le voir en grand", texte: "Il s'ouvre en plein écran, avec vos vrais produits. Si vous l'aimez, touchez « Utiliser ce thème » en bas." },
        { cible: "theme-personnaliser", titre: "Ensuite, personnalisez", texte: "Ce bouton ouvre le Constructeur : changez les textes, les images et les couleurs." },
      ]} />
      <PageHeader
        icon="store"
        title={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{tr("Thèmes")}<BoutonRevoirTutoriel moduleKey="themes" /></span>}
        backHref="/dashboard/boutique"
        secondaryActions={tenant?.slug ? [{ content: tr("Voir la boutique"), href: urlBoutique(tenant), external: true, icon: "external" }] : []}
        primaryAction={{ content: tr("Importer un thème"), onAction: () => router.push("/dashboard/themes/creer") }}
      />

      <div style={{ display: "grid", gap: "var(--space-400)" }}>
        {/* ── Thème actuel ── */}
        <Card title={tr("Thème actuel")}>
          <div className="axd-theme-actuel" data-guide="theme-actuel">
            <div className="axd-theme-actuel__apercu">
              {actif && fichierDuTheme(actif.slug)
                ? <ApercuDesign fichier={fichierDuTheme(actif.slug)!} params={params} className="h-full" />
                : <ThemePreview colors={couleurs(actif)} radius={actif?.config?.radius || "12px"} />}
            </div>
            <div className="axd-theme-actuel__info">
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h3 className="axd-theme-actuel__nom">{tr(actif?.nom) || tr("Thème par défaut")}</h3>
                <Badge tone="success">{tr("En ligne")}</Badge>
              </div>
              {actif?.description && <p style={{ color: "var(--color-text-subdued)", margin: "4px 0 0" }}>{tr(actif.description)}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: "var(--space-400)", flexWrap: "wrap" }}>
                <span data-guide="theme-personnaliser" style={{ display: "inline-flex" }}><Button variant="primary" href="/dashboard/builder">{tr("Personnaliser")}</Button></span>
                {tenant?.slug && <Button href={urlBoutique(tenant)} external icon="external">{tr("Aperçu")}</Button>}
              </div>
            </div>
          </div>
        </Card>

        {/* ── Bibliothèque : thèmes déjà ajoutés à la boutique ── */}
        {custom.filter((t) => t.id !== actif?.id).length > 0 && (
          <Card title={tr("Bibliothèque de thèmes")} padding="none">
            <p style={{ color: "var(--color-text-subdued)", margin: "4px var(--space-400) var(--space-200)" }}>{tr("Thèmes ajoutés à votre boutique. Publiez-en un pour remplacer le thème actuel.")}</p>
            {custom.filter((t) => t.id !== actif?.id).map((t) => (
              <div key={t.id} className="axd-theme-ligne">
                <div className="axd-theme-ligne__img">
                  {fichierDuTheme(t.slug) ? <ApercuDesign fichier={fichierDuTheme(t.slug)!} params={params} className="h-full" /> : <ThemePreview colors={couleurs(t)} radius={t.config?.radius || "12px"} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--color-text-strong)" }}>{tr(t.nom)}</div>
                  {t.description && <div style={{ color: "var(--color-text-subdued)", fontSize: 13 }}>{tr(t.description)}</div>}
                </div>
                <Button size="sm" onClick={() => activerCustom(t.id)} loading={activating === t.id}>{tr("Publier")}</Button>
                <Button size="sm" variant="plain" onClick={() => supprimer(t.id)} loading={deleting === t.id}>{tr("Supprimer")}</Button>
              </div>
            ))}
          </Card>
        )}

        {/* ── Store des thèmes AXSO ── */}
        <Card>
          <div className="axd-store-head">
            <div>
              <h2 className="axd-store-head__titre">{tr("Thèmes AXSO")}</h2>
              <p style={{ color: "var(--color-text-subdued)", margin: "4px 0 0" }}>{tr("{0} thèmes prêts à vendre, inclus dans votre forfait. Vos produits s’affichent déjà dans chaque aperçu.", librairie.length)}</p>
            </div>
            <input className="axd-input" style={{ maxWidth: 280 }} type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={tr("Rechercher un thème")} aria-label={tr("Rechercher un thème")} />
          </div>
          <div className="axd-chips" data-guide="theme-ambiances" role="group" aria-label={tr("Filtrer par style")}>
            <button type="button" className="axd-chip" aria-pressed={!filtre} onClick={() => setFiltre(null)}>{tr("Tous")}</button>
            {ambiances.map((a) => <button key={a} type="button" className="axd-chip" aria-pressed={filtre === a} onClick={() => setFiltre(filtre === a ? null : a)}>{tr(a)}</button>)}
          </div>
          <div className="axd-store-grille">
            {visibles.map((t) => {
              const estActif = isLibrairieActive(t.fichier);
              return (
                <article key={t.id} className="axd-store-carte">
                  <button type="button" className="axd-store-carte__img" data-guide="theme-carte" onClick={() => setZoom({ fichier: t.fichier, nom: t.nom })} aria-label={tr("Voir le thème {0} en grand", tr(t.nom))}>
                    <ApercuDesign fichier={t.fichier} params={params} className="h-full" />
                    <span className="axd-store-carte__voir">{tr("Voir en grand")}</span>
                  </button>
                  <div className="axd-store-carte__corps">
                    <div style={{ minWidth: 0 }}>
                      <h3 className="axd-store-carte__nom">{tr(t.nom)}</h3>
                      <p className="axd-store-carte__meta">{tr("Inclus")} · {String(t.description || "").split(" · ").map((a: string) => tr(a)).join(", ")}</p>
                    </div>
                    {estActif
                      ? <Badge tone="success">{tr("Thème actuel")}</Badge>
                      : <Button size="sm" onClick={() => activerLibrairie(t.fichier, t.nom)} loading={activating === t.fichier}>{tr("Publier")}</Button>}
                  </div>
                </article>
              );
            })}
            {visibles.length === 0 && <p style={{ color: "var(--color-text-subdued)" }}>{tr("Aucun thème ne correspond à votre recherche.")}</p>}
          </div>
        </Card>
      </div>

      {zoom && (
        <div className="axd-theme-zoom" role="dialog" aria-modal="true" aria-label={tr(zoom.nom)}>
          <div className="axd-theme-zoom__barre">
            <button type="button" onClick={() => setZoom(null)} aria-label={tr("Fermer")}><X size={22} /></button>
            <div className="axd-theme-zoom__nom">{tr(zoom.nom)}<small>{tr("Aperçu avec vos produits")}</small></div>
          </div>
          <iframe className="axd-theme-zoom__cadre" title={tr("Aperçu du design")} sandbox="allow-same-origin allow-scripts"
            src={`/api/preview-theme?fichier=${encodeURIComponent(zoom.fichier)}${params}`} />
          <div className="axd-theme-zoom__pied">
            {isLibrairieActive(zoom.fichier)
              ? <span className="axd-theme-zoom__actuel"><Check size={18} />{tr("C'est votre thème actuel")}</span>
              : <button type="button" className="axd-theme-zoom__choisir" disabled={!!activating}
                  onClick={async () => { await activerLibrairie(zoom.fichier, zoom.nom); setZoom(null); }}>
                  {activating === zoom.fichier ? tr("Activation…") : tr("Utiliser ce thème")}
                </button>}
          </div>
        </div>
      )}
    </Page>
  );
}

function couleurs(theme: any): ThemeColors {
  return {
    fond: theme?.config?.colors?.fond || "#f6f6f6",
    accent: theme?.config?.colors?.accent || "#111111",
    texte: theme?.config?.colors?.texte || "#111111",
    surface: theme?.config?.colors?.surface || "#ffffff",
  };
}

// ─── Preview mini d'un thème ─────────────────────────────────────────────────
function ThemePreview({ colors, radius }: { colors: ThemeColors; radius: string }) {
  const r = parseInt(radius) || 12;
  const rSm = `${Math.min(r, 8)}px`;
  const rMd = `${Math.min(r, 12)}px`;
  return (
    <div className="h-full min-h-48 p-3 flex flex-col gap-2" style={{ backgroundColor: colors.fond }}>
      {/* Navbar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: colors.surface, borderRadius: rSm }}>
        <div className="h-2 w-14 rounded" style={{ backgroundColor: colors.accent, borderRadius: "4px" }} />
        <div className="flex gap-1">
          {[1,2,3].map(i => <div key={i} className="h-1.5 w-7 rounded-sm" style={{ backgroundColor: `${colors.texte}30` }} />)}
        </div>
        <div className="h-5 w-10 rounded-md" style={{ backgroundColor: colors.accent, borderRadius: rSm }} />
      </div>
      {/* Hero */}
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: `${colors.accent}18`, borderRadius: rMd, border: `1px solid ${colors.accent}30` }}
      >
        <div className="text-center px-2">
          <div className="h-3 w-24 rounded mx-auto mb-2" style={{ backgroundColor: colors.texte, opacity: 0.8, borderRadius: "4px" }} />
          <div className="h-1.5 w-32 rounded mx-auto mb-3" style={{ backgroundColor: colors.texte, opacity: 0.3, borderRadius: "4px" }} />
          <div className="h-6 w-16 rounded-lg mx-auto" style={{ backgroundColor: colors.accent, borderRadius: rSm }} />
        </div>
      </div>
      {/* Products */}
      <div className="grid grid-cols-4 gap-1.5">
        {[1,2,3,4].map(i => (
          <div key={i} style={{ backgroundColor: colors.surface, borderRadius: rSm, border: `1px solid ${colors.accent}18` }}>
            <div className="h-8" style={{ backgroundColor: `${colors.accent}25`, borderRadius: `${rSm} ${rSm} 0 0` }} />
            <div className="h-1.5 w-8 rounded mx-auto my-1" style={{ backgroundColor: `${colors.texte}30` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
