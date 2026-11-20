// Créneaux réservables d'un service (coaching, consultation) : fonction pure, sans base de données.
// Les disponibilités sont saisies en heure locale du prestataire (`fuseau`, ex. Africa/Douala) ;
// les créneaux sont rendus en instants UTC. Tient compte du préavis, de l'horizon, des congés,
// des séances déjà prises (avec la pause entre deux séances) et du maximum par jour.

export type Disponibilite = { jour: number; debut: string; fin: string }; // jour 0 = dimanche, heures "HH:MM"
export type Conge = { du: string; au: string }; // dates locales "AAAA-MM-JJ", bornes incluses
export type Occupe = { debut: Date; fin: Date };

export type ReglesCreneaux = {
  disponibilites: Disponibilite[];
  indisponibilites?: Conge[];
  dureeMin: number;
  tamponMin: number;
  preavisHeures: number;
  horizonJours: number;
  maxParJour?: number | null;
  fuseau: string;
  /** Pas entre deux débuts de créneau (défaut : 30 min). */
  pasMin?: number;
};

const HEURE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const minutes = (h: string) => { const m = HEURE.exec(h); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

/** Décalage (minutes) du fuseau à un instant donné : heure locale = UTC + décalage. */
export function decalageFuseau(instant: Date, fuseau: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: fuseau, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(instant);
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const local = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return Math.round((local - instant.getTime()) / 60000);
}

/** Date locale "AAAA-MM-JJ" et jour de la semaine d'un instant dans le fuseau. */
export function jourLocal(instant: Date, fuseau: string): { date: string; jour: number } {
  const local = new Date(instant.getTime() + decalageFuseau(instant, fuseau) * 60000);
  return { date: local.toISOString().slice(0, 10), jour: local.getUTCDay() };
}

/** Instant UTC correspondant à « date locale + minutes depuis minuit » dans le fuseau. */
export function instantLocal(date: string, minutesDepuisMinuit: number, fuseau: string): Date {
  const naif = Date.parse(`${date}T00:00:00Z`) + minutesDepuisMinuit * 60000;
  // Deux passes : le décalage dépend de l'instant (changements d'heure éventuels).
  let t = naif - decalageFuseau(new Date(naif), fuseau) * 60000;
  t = naif - decalageFuseau(new Date(t), fuseau) * 60000;
  return new Date(t);
}

function enConge(date: string, conges: Conge[]) {
  return conges.some((c) => c.du <= date && date <= c.au);
}

/** Disponibilités valides (heures bien formées, fin après début), triées. */
export function normaliserDisponibilites(liste: unknown): Disponibilite[] {
  if (!Array.isArray(liste)) return [];
  return liste
    .filter((d): d is Disponibilite => !!d && typeof d === "object" && Number.isInteger((d as Disponibilite).jour)
      && (d as Disponibilite).jour >= 0 && (d as Disponibilite).jour <= 6
      && minutes((d as Disponibilite).debut) !== null && minutes((d as Disponibilite).fin) !== null
      && minutes((d as Disponibilite).fin)! > minutes((d as Disponibilite).debut)!)
    .sort((a, b) => a.jour - b.jour || a.debut.localeCompare(b.debut));
}

/**
 * Créneaux libres entre `maintenant + préavis` et `maintenant + horizon`, au plus `limite`.
 * Un créneau est libre s'il tient dans une plage de disponibilité et ne chevauche aucune séance
 * existante élargie de la pause (`tamponMin`) de chaque côté.
 */
export function creneauxLibres(regles: ReglesCreneaux, occupes: Occupe[], maintenant = new Date(), limite = 200): { debut: Date; fin: Date }[] {
  const dispos = normaliserDisponibilites(regles.disponibilites);
  if (!dispos.length || regles.dureeMin <= 0) return [];
  const pas = Math.max(5, regles.pasMin ?? 30);
  const tampon = Math.max(0, regles.tamponMin) * 60000;
  const debutMin = maintenant.getTime() + Math.max(0, regles.preavisHeures) * 3600000;
  const finMax = maintenant.getTime() + Math.max(1, regles.horizonJours) * 86400000;
  const conges = regles.indisponibilites ?? [];
  const bloques = occupes.map((o) => ({ debut: o.debut.getTime() - tampon, fin: o.fin.getTime() + tampon }));
  const parJour = new Map<string, number>();
  for (const o of occupes) {
    const d = jourLocal(o.debut, regles.fuseau).date;
    parJour.set(d, (parJour.get(d) ?? 0) + 1);
  }

  const resultat: { debut: Date; fin: Date }[] = [];
  const premier = jourLocal(new Date(debutMin), regles.fuseau).date;
  for (let i = 0; i <= regles.horizonJours + 1 && resultat.length < limite; i++) {
    const date = new Date(Date.parse(`${premier}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10);
    if (enConge(date, conges)) continue;
    const jour = new Date(`${date}T00:00:00Z`).getUTCDay();
    const duJour = parJour.get(date) ?? 0;
    for (const d of dispos.filter((x) => x.jour === jour)) {
      const deb = minutes(d.debut)!, fin = minutes(d.fin)!;
      for (let m = deb; m + regles.dureeMin <= fin; m += pas) {
        if (regles.maxParJour && duJour >= regles.maxParJour) break;
        const debut = instantLocal(date, m, regles.fuseau);
        const finCreneau = new Date(debut.getTime() + regles.dureeMin * 60000);
        if (debut.getTime() < debutMin || debut.getTime() > finMax) continue;
        if (bloques.some((b) => debut.getTime() < b.fin && finCreneau.getTime() > b.debut)) continue;
        resultat.push({ debut, fin: finCreneau });
        if (resultat.length >= limite) break;
      }
      if (regles.maxParJour && duJour >= regles.maxParJour) break;
    }
  }
  return resultat;
}

/** Vrai si `debut` est exactement un créneau libre (contrôle serveur avant de réserver). */
export function creneauValide(regles: ReglesCreneaux, occupes: Occupe[], debut: Date, maintenant = new Date()): boolean {
  return creneauxLibres(regles, occupes, maintenant, 5000).some((c) => c.debut.getTime() === debut.getTime());
}
