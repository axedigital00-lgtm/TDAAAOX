// Libellés et couleurs des statuts de boutique (liste et fiche du Command Center).
import type { Ton } from "@/components/command-center/ui";

export const NOM_STATUT_BOUTIQUE: Record<string, string> = { active: "Active", brouillon: "Non publiée", suspendu: "Suspendue", supprime: "Supprimée" };
export const TON_STATUT_BOUTIQUE: Record<string, Ton> = { active: "good", brouillon: "neutre", suspendu: "warn", supprime: "bad" };
