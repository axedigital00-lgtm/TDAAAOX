"use client";
import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Bouton } from "@/components/ui";

interface Props {
  total?: number;
}

export function CommandesExport({ total }: Props) {
  const t = useT();
  const [loading, setLoading] = useState<"mois" | "tout" | null>(null);

  const exporter = async (filtre: "mois" | "tout") => {
    setLoading(filtre);
    try {
      const params = new URLSearchParams();
      if (filtre === "mois") {
        const debut = new Date();
        debut.setDate(1);
        params.set("depuis", debut.toISOString());
      }
      const res = await fetch(`/api/commandes/export?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur export");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `commandes-axso-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(filtre === "mois" ? t("Commandes du mois téléchargées (fichier Excel).") : t("Toutes les commandes téléchargées (fichier Excel)."));
    } catch (e) {
      console.error(e);
      toast.error(t("Le fichier n'a pas pu être créé. Vérifiez votre connexion puis réessayez."));
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <Bouton variante="secondaire" taille="compact" onClick={() => exporter("mois")} disabled={loading !== null} charge={loading === "mois"}
        icone={<FileSpreadsheet className="size-4" aria-hidden />}>
        {t("Exporter ce mois")}
      </Bouton>
      <Bouton variante="secondaire" taille="compact" onClick={() => exporter("tout")} disabled={loading !== null} charge={loading === "tout"}
        icone={<Download className="size-4" aria-hidden />}>
        {t("Exporter tout")}{total != null ? ` (${total})` : ""}
      </Bouton>
    </>
  );
}
