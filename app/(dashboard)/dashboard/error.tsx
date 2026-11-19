"use client";
// État d'erreur de l'espace marchand (masterprompt §12) : bannière critique + « Réessayer ».
// Le détail est gardé pour « Signaler un problème » (joint automatiquement au signalement).
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import { lienSignalement, CLE_DERNIERE_ERREUR } from "@/lib/signalements";
import { Banner, Button } from "@/components/ui/adm";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  const pathname = usePathname();
  useEffect(() => {
    console.error("[Dashboard Error]", error);
    const texte = [error.message, error.digest && `#${error.digest}`].filter(Boolean).join(" ").slice(0, 2000);
    try { sessionStorage.setItem(CLE_DERNIERE_ERREUR, JSON.stringify({ texte, date: Date.now() })); } catch {}
  }, [error]);

  return (
    <div className="mx-auto max-w-[620px] space-y-4 pt-8">
      <Banner tone="critical" title={t("Cette page n'a pas pu s'afficher")}>
        <p>{t("Vos données ne sont pas perdues. Réessayez ; si la page ne revient pas, rechargez-la ou signalez le problème (le détail ci-dessous est joint automatiquement).")}</p>
        {(error.message || error.digest) && (
          <p className="mt-2 text-xs break-words">
            <span className="font-[650]">{t("Détail pour le support :")}</span>{" "}
            <span className="font-mono">{error.message}{error.digest ? ` #${error.digest}` : ""}</span>
          </p>
        )}
      </Banner>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={reset}>{t("Réessayer")}</Button>
        {/* Nouvelle version mise en ligne pendant que la page était ouverte : seul un vrai rechargement récupère ses fichiers. */}
        <Button onClick={() => window.location.reload()}>{t("Recharger la page")}</Button>
        <Button variant="plain" href={lienSignalement(pathname)}>{t("Signaler ce problème")}</Button>
      </div>
    </div>
  );
}
