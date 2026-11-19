"use client";
// En-tête de la liste des commandes : export Excel (ce mois / tout) et tutoriel.
// « Créer une commande » ouvre une commande provisoire (prise de commande par téléphone / WhatsApp, D28).
import { useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { PageHeader } from "@/components/ui/adm";

export function EnTeteCommandes({ total }: { total: number }) {
  const t = useT();
  const [enCours, setEnCours] = useState(false);

  const exporter = async (filtre: "mois" | "tout") => {
    setEnCours(true);
    try {
      const params = new URLSearchParams();
      if (filtre === "mois") {
        const debut = new Date();
        debut.setDate(1);
        params.set("depuis", debut.toISOString());
      }
      const res = await fetch(`/api/commandes/export?${params}`);
      if (!res.ok) throw new Error("Erreur export");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `commandes-axso-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(filtre === "mois" ? t("Commandes du mois téléchargées (fichier Excel).") : t("Toutes les commandes téléchargées (fichier Excel)."));
    } catch (e) {
      console.error(e);
      toast.error(t("Le fichier n'a pas pu être créé. Vérifiez votre connexion puis réessayez."));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <PageHeader
      icon="orders"
      title={t("Commandes")}
      primaryAction={{ content: t("Créer une commande"), href: "/dashboard/commandes/brouillons/nouveau" }}
      secondaryActions={[
        { content: t("Exporter ce mois"), icon: "export", disabled: enCours, onAction: () => exporter("mois") },
        { content: `${t("Exporter tout")} (${total})`, icon: "export", disabled: enCours || total === 0, onAction: () => exporter("tout") },
      ]}
      overflowActions={[
        { content: t("Revoir le tutoriel"), onAction: () => window.dispatchEvent(new CustomEvent("axso:ouvrir-tutoriel", { detail: "commandes" })) },
      ]}
    />
  );
}
