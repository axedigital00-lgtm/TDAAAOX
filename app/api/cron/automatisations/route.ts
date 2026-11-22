// Tâche planifiée des automatisations d'AXSO CONTROL : lance les automatisations horaires
// arrivées à échéance et reprend les exécutions en attente (délai écoulé, nouvel essai, accord
// du marchand donné ou refusé). Protégée par CRON_SECRET, comme les autres tâches (en-tête
// `x-cron-secret`, ou `Authorization: Bearer` que Vercel Cron envoie de lui-même).
//
// Faite pour passer toutes les 5 minutes. vercel.json ne la planifie qu'une fois par jour
// (comme les autres tâches du projet : plusieurs passages par jour demandent le plan Pro de
// Vercel) ; d'ici là, un planificateur externe l'appelle avec `x-cron-secret`, comme
// /api/cron/publications. Un passage en retard n'est jamais perdu, seulement décalé.
import { reprendreImportsEchus } from "@/lib/import-creations/pipeline";
import { NextResponse } from "next/server";
import { passeDuCron } from "@/lib/controle-ia/automatisations";
import { passeRelances } from "@/lib/relances";
import { reprendreLivraisons } from "@/lib/livraison-numerique";
import { passeRappelsLive } from "@/lib/live/service";
import { traiterTaches } from "@/lib/academie/studio";
import { synchroniserSousDomaines } from "@/lib/domaines";
import { passeRappelsEssai } from "@/lib/essai";
import { passeRappelsAbonnement } from "@/lib/abonnement-paiement";
import { passeRappelsSeances } from "@/lib/numerique/service";
import { passeAdhesions } from "@/lib/numerique/abonnement";
import { passeLancements } from "@/lib/commerce/lancements";

export const maxDuration = 60;

const taches = {
  automatisations: () => passeDuCron(),
  relances: () => passeRelances(),
  livraisons: () => reprendreLivraisons(),
  imports: () => reprendreImportsEchus(),
  rappelsLive: () => passeRappelsLive(),
  studio: () => traiterTaches({ demarrerAvant: Date.now() + 10_000, max: 2 }),
  sousDomaines: () => synchroniserSousDomaines(),
  rappelsEssai: () => passeRappelsEssai(),
  rappelsAbonnement: () => passeRappelsAbonnement(),
  rappelsSeances: () => passeRappelsSeances(),
  adhesions: () => passeAdhesions(),
  lancements: () => passeLancements(),
};
type Tache = keyof typeof taches;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !(req.headers.get("x-cron-secret") === secret || req.headers.get("authorization") === `Bearer ${secret}`)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const selection = new URL(req.url).searchParams.get("tache");
  if (selection !== null) {
    if (!Object.hasOwn(taches, selection)) return NextResponse.json({ error: "Tâche inconnue" }, { status: 400 });
    return NextResponse.json({ resultat: await taches[selection as Tache]() });
  }
  const { automatisations, ...autres } = taches;
  const [principal, rapports] = await Promise.all([
    automatisations(),
    Promise.all(Object.entries(autres).map(async ([nom, executer]) => {
      try { return [nom, await executer()] as const; }
      catch (e) { return [nom, { erreur: e instanceof Error ? e.message : String(e) }] as const; }
    })),
  ]);
  return NextResponse.json({ ...principal, ...Object.fromEntries(rapports) });
}

export const POST = GET;
