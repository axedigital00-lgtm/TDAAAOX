"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UserCheck, ChevronDown, Bike, Car, User, Check } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { livreurCouvre } from "@/lib/livraison-reglages";
import { Badge, Bouton } from "@/components/ui";
import { cn } from "@/lib/utils";

type Livreur = { id: string; nom: string; vehicule: string; zone: string | null; disponible?: boolean; coursesEnCours?: number };

interface Props {
  commandeId: string;
  livreurActuelId: string | null;
  livreurActuelNom?: string;
  livreurs: Livreur[];
  statut?: string;
  villeCommande?: string | null; // « Akwa, Douala » : les livreurs de la zone passent en tête
}

const VEHICULE_ICON: Record<string, any> = {
  moto: Bike, voiture: Car, velo: Bike, a_pied: User,
};

export function AssignerLivreur({ commandeId, livreurActuelId, livreurActuelNom, livreurs: tous, statut, villeCommande }: Props) {
  const livreurs = [...tous].sort((a, b) => Number(livreurCouvre(b.zone, villeCommande)) - Number(livreurCouvre(a.zone, villeCommande)));
  const t = useT();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [livreurId, setLivreurId] = useState(livreurActuelId);
  const [livreurNom, setLivreurNom] = useState(livreurActuelNom ?? tous.find((l) => l.id === livreurActuelId)?.nom);
  // Messages WhatsApp que l'envoi automatique n'a pas pu faire partir (boutique sans WhatsApp connecté)
  const [aEnvoyer, setAEnvoyer] = useState<{ livreur: string | null; client: string | null }>({ livreur: null, client: null });
  const zone = useRef<HTMLDivElement>(null);

  // Fermeture au clic à l'extérieur ou avec Échap.
  useEffect(() => {
    if (!open) return;
    const clic = (e: MouseEvent) => { if (!zone.current?.contains(e.target as Node)) setOpen(false); };
    const touche = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => { document.removeEventListener("mousedown", clic); document.removeEventListener("keydown", touche); };
  }, [open]);

  // Pas d'assignation possible si déjà livré ou annulé
  if (statut && ["livree", "annulee"].includes(statut)) {
    return livreurNom ? (
      <span className="flex items-center gap-1 text-sm text-succes">
        <UserCheck className="size-4" aria-hidden /> {t(livreurNom)}
      </span>
    ) : <span className="text-sm text-doux">—</span>;
  }

  if (livreurs.length === 0) {
    return (
      <p className="ax-aide">
        {t("Aucun livreur dans ton équipe.")}{" "}
        <a href="/dashboard/logistique?tab=livreurs" className="font-semibold text-encre underline">{t("Ajouter un livreur")}</a>
      </p>
    );
  }

  async function assigner(id: string | null, nom?: string) {
    setLoading(true);
    setOpen(false);
    try {
      const res = await fetch(`/api/commandes/${commandeId}/assigner`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ livreurId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setLivreurId(id);
      setLivreurNom(nom);
      setAEnvoyer({ livreur: data.whatsappLivreurUrl ?? null, client: data.whatsappClientUrl ?? null });
      toast.success(id ? t("Commande assignée à {0}.", nom) : t("Livreur retiré de la commande."));
    } catch (err: any) {
      toast.error(err?.message ? t(err.message) : t("Le livreur n'a pas pu être assigné. Réessaie."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={zone}>
      <Bouton variante="secondaire" large onClick={() => setOpen(!open)} charge={loading} texteCharge={t("Assignation…")}
        aria-expanded={open} aria-haspopup="listbox" className="justify-between">
        {livreurId ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <UserCheck className="size-4 shrink-0 text-succes" aria-hidden />
            <span className="truncate">{livreurNom ? t(livreurNom) : t("Livreur assigné")}</span>
          </span>
        ) : (
          <span>{t("Assigner un livreur")}</span>
        )}
        <ChevronDown className="size-4 shrink-0" aria-hidden />
      </Bouton>

      {(aEnvoyer.livreur || aEnvoyer.client) && (
        <div className="mt-2 flex flex-col gap-1">
          <p className="ax-aide">{t("WhatsApp n'est pas connecté : préviens-les toi-même.")}</p>
          {aEnvoyer.livreur && <a href={aEnvoyer.livreur} target="_blank" rel="noopener noreferrer" className="min-h-8 text-sm font-semibold text-succes underline">{t("Prévenir le livreur sur WhatsApp")}</a>}
          {aEnvoyer.client && <a href={aEnvoyer.client} target="_blank" rel="noopener noreferrer" className="min-h-8 text-sm font-semibold text-succes underline">{t("Prévenir le client sur WhatsApp")}</a>}
        </div>
      )}

      {open && (
        <div role="listbox" aria-label={t("Choisir un livreur")} className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 min-w-56 overflow-y-auto rounded-carte border border-bordure bg-carte shadow-flottante">
          {livreurId && (
            <button type="button" onClick={() => assigner(null)}
              className="min-h-11 w-full border-b border-bordure px-3 text-left text-sm font-semibold text-erreur hover:bg-erreur-fond">
              {t("Retirer le livreur")}
            </button>
          )}
          {livreurs.map((l) => {
            const V = VEHICULE_ICON[l.vehicule] ?? User;
            return (
              <button key={l.id} type="button" role="option" aria-selected={l.id === livreurId} onClick={() => assigner(l.id, l.nom)}
                className={cn("w-full px-3 py-2.5 text-left transition-colors hover:bg-carte-2", l.id === livreurId && "bg-primaire-fond")}>
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-encre">
                  <V className="size-4 shrink-0" aria-hidden />
                  {t(l.nom)}
                  {l.disponible !== undefined && <Badge ton={l.disponible ? "succes" : "neutre"}>{l.disponible ? t("Disponible") : t("Hors service")}</Badge>}
                  {livreurCouvre(l.zone, villeCommande) && <Badge ton="accent">{t("Même zone")}</Badge>}
                  {l.id === livreurId && <Check className="ml-auto size-4 text-attention" aria-label={t("Assigné")} />}
                </span>
                {(l.zone || l.coursesEnCours !== undefined) && (
                  <span className="ml-5 mt-0.5 block ax-aide">
                    {l.zone && t(l.zone)}
                    {l.zone && l.coursesEnCours !== undefined && " · "}
                    {l.coursesEnCours !== undefined && (
                      <span className={l.coursesEnCours >= 3 ? "font-semibold text-erreur" : ""}>
                        {l.coursesEnCours === 0 ? t("Libre") : t("{0} course(s) en cours", l.coursesEnCours)}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
