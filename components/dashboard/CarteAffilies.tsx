"use client";

// Carte « Affiliés » de Ma boutique (modèle Selar/Gumroad : le marchand ouvre ses produits).
// - Produits déjà cochés sans programme : confirmation unique (les proposer ou les retirer).
// - Rien d'ouvert : invitation, masquable sur cet appareil.
// - Programme en place : rien.
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Bouton } from "@/components/ui";

const CLE_MASQUEE = "axso_carte_affilies_masquee";

export function CarteAffilies() {
  const tr = useT();
  const [etat, setEtat] = useState<{ programme: boolean; produitsOuverts: number } | null>(null);
  const [masquee, setMasquee] = useState(true);
  const [envoi, setEnvoi] = useState<"oui" | "non" | null>(null);

  useEffect(() => {
    try { setMasquee(localStorage.getItem(CLE_MASQUEE) === "1"); } catch { setMasquee(false); }
    fetch("/api/affiliation/ouverture").then((r) => (r.ok ? r.json() : null)).then(setEtat).catch(() => {});
  }, []);

  async function choisir(choix: "oui" | "non") {
    setEnvoi(choix);
    const r = await fetch("/api/affiliation/ouverture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choix }) }).catch(() => null);
    setEnvoi(null);
    if (!r?.ok) return toast.error(tr("Ton choix n'a pas été enregistré. Vérifie ta connexion et réessaie."));
    toast.success(choix === "oui" ? tr("Tes produits sont proposés aux affiliés") : tr("Produits retirés de l'affiliation"));
    setEtat(choix === "oui" ? { programme: true, produitsOuverts: etat!.produitsOuverts } : { programme: false, produitsOuverts: 0 });
  }

  if (!etat || etat.programme) return null;

  if (etat.produitsOuverts > 0) {
    return (
      <div className="rounded-carte p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 border border-succes-bordure bg-succes-fond">
        <div className="w-10 h-10 rounded-controle bg-carte flex items-center justify-center flex-shrink-0" aria-hidden><Zap className="size-4 text-succes" /></div>
        <div className="flex-1 min-w-0">
          <p className="ax-libelle font-bold">{tr("Proposer tes produits aux affiliés ?")}</p>
          <p className="ax-texte-secondaire">
            {tr("{0} de tes produits sont cochés « ouverts aux affiliés », mais aucun affilié ne les voit encore. Si tu acceptes, des affiliés pourront les promouvoir : tu ne paies une commission que sur les ventes qu'ils t'apportent.", etat.produitsOuverts)}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Bouton variante="secondaire" disabled={envoi !== null} charge={envoi === "non"} onClick={() => choisir("non")}>{tr("Non, les retirer")}</Bouton>
          <Bouton variante="primaire" disabled={envoi !== null} charge={envoi === "oui"} onClick={() => choisir("oui")}>{tr("Oui, les proposer")}</Bouton>
        </div>
      </div>
    );
  }

  if (masquee) return null;
  return (
    <div className="ax-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="w-10 h-10 rounded-controle bg-primaire-fond flex items-center justify-center flex-shrink-0" aria-hidden><Zap className="size-4 text-attention" /></div>
      <div className="flex-1 min-w-0">
        <p className="ax-libelle font-bold">{tr("Laisse des affiliés vendre pour toi")}</p>
        <p className="ax-texte-secondaire">{tr("Ouvre un produit aux affiliés depuis sa fiche (« Ouvrir aux affiliés ») : ils le font connaître, et tu ne paies que sur les ventes réalisées.")}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Bouton variante="fantome" onClick={() => { setMasquee(true); try { localStorage.setItem(CLE_MASQUEE, "1"); } catch {} }}>{tr("Plus tard")}</Bouton>
        <Bouton variante="primaire" href="/dashboard/produits">{tr("Choisir mes produits")}</Bouton>
      </div>
    </div>
  );
}
