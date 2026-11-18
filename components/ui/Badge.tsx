// Badge d'état court (« Payée », « En attente », « Rupture »). La couleur ne porte
// jamais seule le sens : le texte suffit à comprendre, l'icône est un plus.
// Tons nommés comme les jetons (succes, attention, erreur, info). Kit caisse :
// positif = succes, danger = erreur. Utilisable côté serveur.
import { cn } from "@/lib/utils";

export type Ton = "neutre" | "accent" | "succes" | "attention" | "erreur" | "info";

export const TONS: Record<Ton, string> = {
  /** Information sans jugement : « Nouveau », « Brouillon ». */
  neutre: "bg-carte-2 text-doux border-bordure",
  /** Mise en avant marque : « VIP », « Recommandé ». */
  accent: "bg-primaire-fond text-attention border-attention-bordure",
  /** Fait, payé, en ligne. */
  succes: "bg-succes-fond text-succes border-succes-bordure",
  /** À surveiller ou à faire : « En attente », « Stock bas ». */
  attention: "bg-attention-fond text-attention border-attention-bordure",
  /** Échec, bloqué, rupture. */
  erreur: "bg-erreur-fond text-erreur border-erreur-bordure",
  /** Information neutre mais notable : « Expédiée ». */
  info: "bg-info-fond text-info border-info-bordure",
};

export function Badge({ ton = "neutre", icone, className, children }: { ton?: Ton; icone?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold leading-5 [&>svg]:size-3 [&>svg]:shrink-0", TONS[ton], className)}>
      {icone}{children}
    </span>
  );
}
