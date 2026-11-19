// Recette : graphiques (§7.8) et illustrations (§4.3), données de démo locales (D4 : jamais hors recette).
import { CohortHeatmap, DonutChart, FunnelChart, HorizontalBar, LineChart, Sparkline, StackedBar } from "@/components/ui/graphiques";
import * as Ill from "@/components/ui/illustrations";

const JOURS = Array.from({ length: 30 }, (_, i) => `${i + 1} nov.`);
const VENTES = [180, 210, 195, 240, 260, 230, 290, 310, 280, 300, 340, 320, 360, 390, 370, 410, 400, 430, 470, 450, 480, 520, 500, 540, 560, 530, 580, 610, 590, 640].map((v) => v * 1000);
const VENTES_AVANT = VENTES.map((v, i) => Math.round(v * (0.8 + ((i * 7) % 5) / 20)));

const Carte = ({ titre, children }: { titre: string; children: React.ReactNode }) => (
  <div className="rounded-(--radius-xl) bg-(--color-surface) p-4 shadow-(--shadow-card)">
    <div className="mb-2 font-[550] text-(--color-text-strong)">{titre}</div>
    {children}
  </div>
);

export function DemoGraphiques() {
  return (
    <section className="space-y-4">
      <h2 className="text-[16px] font-[650] text-(--color-text-strong)">Graphiques</h2>
      <Carte titre="Sparkline">
        <div className="flex items-center gap-3"><span className="font-[550]">6,47 M FCFA</span><Sparkline data={VENTES} /></div>
      </Carte>
      <Carte titre="LineChart — aire + comparaison (survol ou ← →)">
        <LineChart serie={VENTES} comparaison={VENTES_AVANT} libelles={JOURS} area format="montant" devise="XAF"
          ariaLabel="Ventes totales sur 30 jours" legende={{ serie: "1–30 nov. 2026", comparaison: "2–31 oct. 2026" }} />
      </Carte>
      <div className="grid gap-4 md:grid-cols-3">
        <Carte titre="DonutChart">
          <DonutChart devise="XAF" ariaLabel="Ventes par canal" segments={[
            { libelle: "WhatsApp", valeur: 109_100 }, { libelle: "Boutique en ligne", valeur: 62_900 }, { libelle: "Caisse", valeur: 37_800 },
          ]} />
        </Carte>
        <Carte titre="HorizontalBar">
          <HorizontalBar format="compact" lignes={[
            { libelle: "Robe pagne wax", valeur: 94_000 }, { libelle: "Sac en raphia", valeur: 67_000 }, { libelle: "Savon karité", valeur: 55_000 }, { libelle: "Sandales cuir", valeur: 25_000 },
          ]} />
        </Carte>
        <Carte titre="StackedBar">
          <StackedBar ariaLabel="Nouveaux clients 12, récurrents 2" segments={[{ libelle: "Nouveaux", valeur: 12 }, { libelle: "Récurrents", valeur: 2, couleur: "var(--chart-violet)" }]} />
        </Carte>
      </div>
      <Carte titre="FunnelChart">
        <FunnelChart ariaLabel="Entonnoir de conversion" etapes={[{ libelle: "Sessions", valeur: 7960 }, { libelle: "Ajouts au panier", valeur: 1210 }, { libelle: "Commandes", valeur: 414 }]} />
      </Carte>
      <Carte titre="CohortHeatmap">
        <CohortHeatmap titreLignes="Cohorte" colonnes={["Mois 0", "Mois 1", "Mois 2", "Mois 3"]} lignes={[
          { libelle: "août 2026", valeurs: [100, 24, 14, 9] }, { libelle: "sept. 2026", valeurs: [100, 21, 12, null] },
          { libelle: "oct. 2026", valeurs: [100, 27, null, null] }, { libelle: "nov. 2026", valeurs: [100, null, null, null] },
        ]} />
      </Carte>

      <h2 className="pt-4 text-[16px] font-[650] text-(--color-text-strong)">Illustrations — états vides (200×150)</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {([
          ["Brouillons", Ill.IllustrationBrouillons], ["Bons de commande", Ill.IllustrationBonsDeCommande], ["Transferts", Ill.IllustrationTransferts],
          ["Campagnes", Ill.IllustrationCampagnes], ["Commandes", Ill.IllustrationCommandes], ["Produits", Ill.IllustrationProduits],
          ["Clients", Ill.IllustrationClients], ["Fichiers", Ill.IllustrationFichiers], ["Réductions", Ill.IllustrationReductions], ["Générique", Ill.IllustrationGenerique],
        ] as const).map(([nom, C]) => (
          <figure key={nom} className="rounded-(--radius-xl) bg-(--color-surface) p-2 text-center shadow-(--shadow-card)">
            <C className="mx-auto h-auto max-w-full" /><figcaption className="text-[12px] text-(--color-text-secondary)">{nom}</figcaption>
          </figure>
        ))}
      </div>
      <h2 className="pt-4 text-[16px] font-[650] text-(--color-text-strong)">Illustrations — vignettes du fil (280×140)</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {([
          ["Conversion", Ill.VignetteConversion], ["Livraison", Ill.VignetteLivraison], ["WhatsApp", Ill.VignetteWhatsApp],
          ["Applications", Ill.VignetteApplications], ["Cartons", Ill.VignetteCartons],
        ] as const).map(([nom, C]) => (
          <figure key={nom} className="overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)">
            <div className="h-[140px]"><C /></div><figcaption className="p-2 text-[12px] text-(--color-text-secondary)">{nom}</figcaption>
          </figure>
        ))}
        <figure className="overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)">
          <div className="h-[140px]"><Ill.VignetteDomaine domaine="maboutique.com" /></div><figcaption className="p-2 text-[12px] text-(--color-text-secondary)">Domaine</figcaption>
        </figure>
      </div>
    </section>
  );
}
