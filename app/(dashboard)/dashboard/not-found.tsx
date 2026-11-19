"use client";
// 404 de l'espace marchand (masterprompt §12) : « Cette page est introuvable » + retour à l'accueil.
// Aussi affichée par notFound() (ex. fiche d'une commande ou d'un client d'une autre boutique).
import { useT } from "@/components/I18nProvider";
import { Button, EmptyState } from "@/components/ui/adm";
import { IllustrationGenerique } from "@/components/ui/illustrations";

export default function DashboardNotFound() {
  const t = useT();
  return (
    <div className="pt-8">
      <EmptyState title={t("Cette page est introuvable")} image={<IllustrationGenerique />}
        actions={<Button variant="primary" icon="home" href="/dashboard/demarrer">{t("Retour à l'accueil")}</Button>}>
        {t("Le lien est peut-être erroné, ou l'élément a été supprimé.")}
      </EmptyState>
    </div>
  );
}
