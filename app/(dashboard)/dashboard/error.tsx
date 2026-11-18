"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, RefreshCw, LifeBuoy } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { lienSignalement, CLE_DERNIERE_ERREUR } from "@/lib/signalements";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  const pathname = usePathname();
  useEffect(() => {
    console.error("[Dashboard Error]", error);
    // Gardée pour « Signaler un problème » : jointe automatiquement au signalement.
    const texte = [error.message, error.digest && `#${error.digest}`].filter(Boolean).join(" ").slice(0, 2000);
    try { sessionStorage.setItem(CLE_DERNIERE_ERREUR, JSON.stringify({ texte, date: Date.now() })); } catch {}
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="w-16 h-16 rounded-2xl bg-erreur-fond border border-erreur-bordure flex items-center justify-center">
        <AlertTriangle size={28} className="text-erreur" />
      </div>
      <div className="text-center max-w-md">
        <h1 className="text-xl font-bold text-encre mb-2">
          {t("Cette page n'a pas pu s'afficher")}
        </h1>
        <p className="text-doux text-sm leading-relaxed">
          {t("Tes données ne sont pas perdues. Réessaie ; si la page ne revient pas, recharge-la ou signale le problème (le détail ci-dessous est joint automatiquement).")}
        </p>
        {/* Texte exact de l'erreur : à envoyer au support (capture d'écran). */}
        {(error.message || error.digest) && (
          <p className="text-xs text-doux mt-3 break-words">
            <span className="font-semibold">{t("Détail pour le support :")}</span>{" "}
            <span className="font-mono">{error.message}{error.digest ? ` #${error.digest}` : ""}</span>
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="flex min-h-11 items-center gap-2 px-6 bg-primaire text-sur-primaire font-semibold rounded-controle hover:bg-primaire-hover transition-colors"
      >
        <RefreshCw size={15} />
        {t("Réessayer d'afficher la page")}
      </button>
      {/* Nouvelle version mise en ligne pendant que la page était ouverte : seul un vrai rechargement récupère ses fichiers. */}
      <button onClick={() => window.location.reload()} className="min-h-10 text-sm text-doux underline hover:text-encre">
        {t("Recharger la page")}
      </button>
      <Link href={lienSignalement(pathname)} className="flex min-h-10 items-center gap-1.5 text-sm text-doux underline hover:text-encre">
        <LifeBuoy size={14} />{t("Signaler ce problème")}
      </Link>
    </div>
  );
}
