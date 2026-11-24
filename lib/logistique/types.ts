// Contrats partagés du réseau logistique AXSO. Les écrans consomment ces types sans les modifier.
export type TypeFournisseur = "societe" | "livreur";
export type Vehicule = "moto" | "velo" | "voiture" | "fourgon" | "camion" | "a_pied" | "autre";
export type StatutVerification = "en_attente" | "en_revue" | "verifie" | "rejete" | "expire" | "suspendu";
export type NiveauAxso = "elite" | "premium" | "verifie" | "standard";
export type Badge = "legal" | "assurance" | "identite" | "haute_performance" | "fiabilite" | "rapide" | "satisfaction";
export type ModeDispatch = "recommandation" | "semi_automatique" | "autonome";
export type CategorieReco = "meilleur_global" | "meilleure_societe" | "meilleur_prix" | "plus_rapide" | "plus_fiable" | "plus_proche";

export type StatutCourse =
  | "attente_fournisseur" | "fournisseur_assigne" | "attente_acceptation" | "acceptee" | "enlevement_planifie"
  | "enlevee" | "en_transit" | "proche_destination" | "livree" | "echec" | "retournee" | "annulee" | "litige";

export type Responsable = "fournisseur" | "marchand" | "client" | "externe" | "inconnu";

/** Une course terminée, telle que le moteur de score la lit. */
export type ResultatCourse = {
  date: number;
  issue: "livree" | "echec" | "annulee";
  responsable: Responsable;
  aTemps?: boolean | null;
  note?: number | null;
  incident?: boolean;
  /** Course écartée après contrôle (fraude, litige gagné) : ne compte jamais. */
  exclue?: boolean;
};

export type IndicateursScore = {
  legal: number;
  operationnel: number;
  fiabilite: number;
  satisfaction: number | null;
  global: number;
  niveau: NiveauAxso | null;
  confiance: "insuffisante" | "faible" | "moyenne" | "elevee";
  probation: boolean;
  volume: number;
  tauxReussite: number | null;
  tauxATemps: number | null;
  badges: Badge[];
};

export type Candidat = {
  id: string;
  type: TypeFournisseur;
  nom: string;
  societeParenteId?: string | null;
  statutLegal: StatutVerification;
  documentsObligatoiresValides: boolean;
  suspendu: boolean;
  couvreZone: boolean;
  disponible: boolean;
  capaciteRestante: number;
  chargeActive: number;
  vehicules: Vehicule[];
  poidsMaxKg?: number | null;
  score: IndicateursScore;
  prix: number | null;
  etaMinutes?: number | null;
  distanceKm?: number | null;
  certifie?: boolean;
};

export type BesoinLivraison = {
  poidsKg?: number | null;
  vehiculeRequis?: Vehicule | null;
  exclus?: string[];
  budgetMax?: number | null;
  exigerVerifie?: boolean;
};
