"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PCOnlyGate } from "@/components/dashboard/PCOnlyGate";
import { ApercuDesign, parametresApercu, fichierDuTheme, optionsChangementDesign } from "@/components/dashboard/ApercuDesign";
import { EtatChargement, EtatErreur, useConfirmation } from "@/components/ui";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui/adm";
import { IllustrationGenerique } from "@/components/ui/illustrations";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import {
  Palette, Trash2, Edit2,
  Sparkles,
} from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { urlBoutique } from "@/lib/utils";

const THEMES_TUTORIAL_STEPS = [
  { Icon: Palette,  titre: "Choisissez un design AXSO", description: "Des designs prêts à l'emploi, pensés pour différents univers : mode, artisanat, beauté... En choisir un branche directement vos vrais produits." },
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
  const [erreurChargement, setErreurChargement] = useState(false);
  const { confirmer, dialogue } = useConfirmation();

  const charger = () => {
    setLoading(true); setErreurChargement(false);
    Promise.all([
      fetch("/api/themes").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch("/api/tenants/moi").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch("/api/produits?limit=24&actif=true").then((r) => r.json()).catch(() => ({})),
    ]).then(([td, te, pr]) => {
      setThemes(td.themes || []);
      setTenant(te.tenant);
      setParams(parametresApercu(te.tenant, pr.produits ?? []));
    }).catch(() => setErreurChargement(true)).finally(() => setLoading(false));
  };
  useEffect(charger, []);

  // Thèmes perso (import manuel ou anciens thèmes créés avant la bibliothèque) —
  // un Theme existe déjà, on ne fait qu'assigner directement son id.
  async function activerCustom(id: string) {
    const nom = themes.find((t) => t.id === id)?.nom || tr("ce thème");
    if (!(await confirmer(optionsChangementDesign(nom, tr)))) return;
    setActivating(id);
    try {
      const res = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: id }),
      });
      if (!res.ok) throw new Error();
      setTenant((t: any) => ({ ...t, themeId: id }));
      toast.success(tr("Thème « {0} » activé sur votre boutique.", nom));
    } catch {
      toast.error(tr("Le thème n'a pas pu être activé. Vérifiez votre connexion et réessayez."));
    } finally {
      setActivating(null);
    }
  }

  // Bibliothèque AXSO Design — contrairement au thème perso ci-dessus (un id
  // déjà existant, assigné directement), chaque design de la bibliothèque
  // crée un vrai Theme propre à CE tenant (vos produits déjà branchés dans
  // la grille) — voir app/api/themes/provisionner.
  async function activerLibrairie(fichier: string, nom: string) {
    if (!(await confirmer(optionsChangementDesign(nom, tr)))) return;
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
      toast.success(tr("Design « {0} » activé sur votre boutique.", nom));
    } catch {
      toast.error(tr("Le design n'a pas pu être activé. Vérifiez votre connexion et réessayez."));
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
    const nom = themes.find((t) => t.id === id)?.nom || tr("Thème");
    if (!(await confirmer({ titre: tr("Supprimer ce thème ?"), objet: nom, description: tr("Il disparaît de « Mes thèmes ». Votre boutique n'est pas touchée : ce thème n'est pas celui qui est actif."), libelleConfirmer: tr("Supprimer le thème") }))) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/themes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setThemes((ts) => ts.filter((t) => t.id !== id));
      toast.success(tr("Thème « {0} » supprimé.", nom));
    } catch {
      toast.error(tr("Le thème n'a pas pu être supprimé. Réessayez dans un instant."));
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <EtatChargement texte={tr("Chargement des thèmes…")} />;
  if (erreurChargement) return (
    <div className="p-page">
      <EtatErreur titre={tr("Les thèmes n'ont pas pu être chargés.")} texte={tr("Vérifiez votre connexion puis réessayez.")} onReessayer={charger} />
    </div>
  );

  const librairie = themes.filter((t) => t.axsoDesign);
  const custom = themes.filter((t) => !t.builtin);

  return (
    <div className="h-screen flex flex-col bg-(--color-bg) overflow-hidden">
      {dialogue}
      <ModuleTutorial moduleKey="themes" titre={tr("Thèmes")} sousTitre={tr("Personnalisez l'apparence de votre boutique")} steps={THEMES_TUTORIAL_STEPS} />
      <PCOnlyGate label={tr("Theme Studio")} />

      {/* ── En-tête (§8.20 : bibliothèque de thèmes) ── */}
      <div className="flex-shrink-0 border-b border-(--color-border) bg-(--color-surface) px-3">
        <PageHeader icon="grid" title={tr("Thèmes")} backHref="/dashboard/boutique"
          titleMeta={tenant ? <Badge tone="info">{tr("Thème actif :")} {tr(themes.find((t) => t.id === tenant.themeId || t.slug === tenant.themeId)?.nom) || tr(tenant.themeId)}</Badge> : undefined}
          primaryAction={tenant ? { content: tr("Créer un thème"), icon: "plus", onAction: () => router.push("/dashboard/themes/creer") } : undefined}
          secondaryActions={tenant?.slug ? [{ content: tr("Voir la boutique"), icon: "external", onAction: () => window.open(urlBoutique(tenant), "_blank", "noopener") }] : []}
          overflowActions={[{ content: tr("Revoir le tutoriel"), onAction: () => window.dispatchEvent(new CustomEvent("axso:ouvrir-tutoriel", { detail: "themes" })) }]} />
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">

        {/* Bibliothèque AXSO Design */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-attention" aria-hidden />
            <h2 className="ax-titre-section">{tr("Bibliothèque AXSO Design")}</h2>
            <Badge tone="neutral">{librairie.length} {tr("designs")}</Badge>
          </div>
          {!librairie.length && <EmptyState image={<IllustrationGenerique />} title={tr("Aucun design disponible pour le moment.")} actions={<Button variant="primary" href="/dashboard/themes/creer">{tr("Créer un thème")}</Button>}>{tr("Vous pouvez créer ou importer votre propre thème.")}</EmptyState>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {librairie.map((t) => (
              <SimpleThemeCard
                key={t.id}
                theme={t}
                actif={isLibrairieActive(t.fichier)}
                activating={activating === t.fichier}
                onActivate={() => activerLibrairie(t.fichier, t.nom)}
                fichier={t.fichier}
                params={params}
              />
            ))}
          </div>
        </section>

        {/* Thèmes perso */}
        {custom.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-attention" aria-hidden />
              <h2 className="ax-titre-section">{tr("Mes thèmes")}</h2>
              <Badge tone="neutral">{custom.length}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {custom.map((t) => (
                <SimpleThemeCard
                  key={t.id}
                  theme={t}
                  actif={tenant?.themeId === t.id}
                  activating={activating === t.id}
                  deleting={deleting === t.id}
                  onActivate={() => activerCustom(t.id)}
                  onDelete={tenant?.themeId === t.id ? undefined : () => supprimer(t.id)} // jamais le thème actif : la boutique n'en aurait plus
                  fichier={fichierDuTheme(t.slug)}
                  params={params}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Preview mini d'un thème ─────────────────────────────────────────────────
function ThemePreview({ colors, radius }: { colors: ThemeColors; radius: string }) {
  const r = parseInt(radius) || 12;
  const rSm = `${Math.min(r, 8)}px`;
  const rMd = `${Math.min(r, 12)}px`;
  return (
    <div className="h-48 p-3 flex flex-col gap-2" style={{ backgroundColor: colors.fond }}>
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

// ─── Carte simple (thèmes custom) ────────────────────────────────────────────
function SimpleThemeCard({
  theme, actif, activating, deleting, onActivate, onEdit, onDelete, fichier, params,
}: {
  theme: any; actif: boolean; activating: boolean;
  deleting?: boolean; onActivate: () => void; onEdit?: () => void;
  onDelete?: () => void;
  fichier?: string | null; params?: string; // design AXSO : vrai aperçu au lieu de la vignette schématique
}) {
  const tr = useT();
  const colors: ThemeColors = {
    fond:    theme.config?.colors?.fond    || "#fff8f0",
    accent:  theme.config?.colors?.accent  || "#F5A623",
    texte:   theme.config?.colors?.texte   || "#111111",
    surface: theme.config?.colors?.surface || "#fef3e8",
  };

  return (
    <div className={`rounded-carte border-2 overflow-hidden transition-all ${actif ? "border-primaire shadow-carte" : "border-bordure hover:border-bordure-forte"}`}>
      {fichier ? <ApercuDesign fichier={fichier} fond={colors.fond} params={params} /> : <ThemePreview colors={colors} radius={theme.config?.radius || "12px"} />}
      <div className="bg-carte p-3.5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-encre">{tr(theme.nom)}</h3>
          <div className="flex gap-1" aria-hidden>
            {[colors.fond, colors.accent, colors.texte].map((c, i) => (
              <div key={i} className="w-3.5 h-3.5 rounded-full border border-(--color-border)" style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        {theme.description && <p className="ax-aide mb-3">{tr(theme.description)}</p>}
        <div className="flex gap-2">
          {actif ? (
            <div className="flex-1 flex items-center justify-center min-h-10"><Badge tone="success">{tr("Thème actif")}</Badge></div>
          ) : (
            <Button variant="default" size="sm" className="flex-1" onClick={onActivate} loading={activating}>
              {tr("Activer ce thème")}
            </Button>
          )}
          {onEdit && (
            <Button aria-label={tr("Modifier le thème")} title={tr("Modifier le thème")} className="px-0! w-[30px] sm:size-8 sm:min-h-8" variant="default" onClick={onEdit}>
              <Edit2 size={14} aria-hidden />
            </Button>
          )}
          {onDelete && (
            <Button aria-label={`${tr("Supprimer le thème")} ${theme.nom}`} title={`${tr("Supprimer le thème")} ${theme.nom}`} className="px-0! w-[30px] sm:size-8 sm:min-h-8" variant="default" onClick={onDelete} loading={deleting}>
              <Trash2 size={14} aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
