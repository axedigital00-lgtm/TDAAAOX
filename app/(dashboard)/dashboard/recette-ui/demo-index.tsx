"use client";
// Recette : IndexFilters + IndexTable + MetricsStrip + EmptyState (§7.5–7.7). Données de démo locales (D4 : jamais hors recette).
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Badge, Button, EmptyState, IndexFilters, IndexTable, MetricsStrip, Thumbnail, badgeCommande, badgePaiement,
  lireTri, trier, useColonnesMasquees, type Column,
} from "@/components/ui/adm";
import { IllustrationBrouillons } from "@/components/ui/illustrations";

type Ligne = { id: string; numero: string; date: string; client: string; total: number; statut: string; paiement: string; ville: string };

const VILLES = ["Douala", "Yaoundé", "Bafoussam", "Garoua"];
const STATUTS = ["en_attente", "confirmee", "en_livraison", "livree", "tentative_echouee", "annulee"];
const CLIENTS = ["Awa Ndiaye", "Jean Mbarga", "Fatou Diallo", "Paul Etoga", "Mireille Ngo", "Ibrahim Sow"];
const LIGNES: Ligne[] = Array.from({ length: 23 }, (_, i) => ({
  id: `c${i}`, numero: `#${1042 - i}`, date: `2026-11-${String(19 - (i % 18)).padStart(2, "0")}`,
  client: CLIENTS[i % 6], total: 8_500 + ((i * 7_300) % 61_000), statut: STATUTS[i % 6], paiement: i % 3 ? "en_attente" : "paye", ville: VILLES[i % 4],
}));
const fcfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(n)} FCFA`;

const COLONNES: Column<Ligne>[] = [
  { id: "numero", header: "Commande", cell: (r) => r.numero, mobilePrimary: true, sortable: true },
  { id: "date", header: "Date", cell: (r) => new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), sortable: true },
  { id: "client", header: "Client", cell: (r) => r.client, sortable: true },
  { id: "total", header: "Total", cell: (r) => fcfa(r.total), numeric: true, sortable: true },
  { id: "paiement", header: "Paiement", cell: (r) => { const b = badgePaiement(r.paiement, "cod"); return <Badge tone={b.tone} progress={b.progress}>{b.label}</Badge>; } },
  { id: "statut", header: "Statut", cell: (r) => { const b = badgeCommande(r.statut); return <Badge tone={b.tone} progress={b.progress}>{b.label}</Badge>; } },
  { id: "ville", header: "Ville", cell: (r) => r.ville, hideOnMobile: true },
];

function Liste() {
  const params = useSearchParams();
  const [masquees, setMasquees] = useColonnesMasquees("recette-commandes");
  const [page, setPage] = useState(0);
  const [chargement, setChargement] = useState(false);
  const q = (params.get("q") ?? "").toLowerCase();
  const statut = params.get("statut");
  const vue = params.get("vue");
  const tri = lireTri(params.get("tri")) ?? { colonne: "date", ordre: "desc" as const };
  let lignes = LIGNES.filter((l) =>
    (!q || `${l.numero} ${l.client}`.toLowerCase().includes(q)) && (!statut || l.statut === statut) &&
    (vue !== "a-traiter" || l.statut === "en_attente" || l.statut === "confirmee"));
  lignes = trier(lignes, (l) => l[tri.colonne as keyof Ligne], tri.ordre);
  const parPage = 10;
  const pageLignes = lignes.slice(page * parPage, page * parPage + parPage);

  return (
    <div className="overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)">
      <IndexFilters
        views={[{ id: "toutes", label: "Toutes" }, { id: "a-traiter", label: "À traiter" }]}
        filters={[{ key: "statut", label: "Statut", options: STATUTS.map((s) => ({ value: s, label: badgeCommande(s).label })) }]}
        sortOptions={COLONNES.filter((c) => c.sortable).map((c) => ({ id: c.id, label: c.header }))}
        columns={COLONNES.map((c) => ({ id: c.id, header: c.header }))} hiddenColumns={masquees} onHiddenColumnsChange={setMasquees}
      />
      <IndexTable label="Commandes" rows={pageLignes} columns={COLONNES} getId={(r) => r.id} hiddenColumns={masquees}
        selectable loading={chargement} onRowClick={(r) => alert(`Ouvrir ${r.numero}`)}
        sort={tri}
        promotedBulkActions={[{ content: "Marquer comme traitées" }, { content: "Imprimer les bons de livraison" }]}
        bulkActions={[{ content: "Archiver" }, { content: "Annuler les commandes", destructive: true }]}
        emptyState={<div className="p-6 text-center text-(--color-text-secondary)">Aucune commande ne correspond à ces filtres.</div>}
        pagination={{
          hasPrevious: page > 0, hasNext: (page + 1) * parPage < lignes.length,
          label: `${lignes.length ? page * parPage + 1 : 0}-${Math.min((page + 1) * parPage, lignes.length)}`,
          onPrevious: () => setPage(page - 1), onNext: () => setPage(page + 1),
        }}
      />
      <div className="border-t border-(--color-border-secondary) p-2">
        <Button size="sm" onClick={() => { setChargement(true); setTimeout(() => setChargement(false), 1500); }}>Voir le chargement</Button>
      </div>
    </div>
  );
}

export function DemoIndex() {
  const [periode, setPeriode] = useState("aujourdhui");
  const periodes = [
    { id: "aujourdhui", label: "Aujourd'hui" }, { id: "hier", label: "Hier" }, { id: "7j", label: "7 jours" },
    { id: "30j", label: "30 jours" }, { id: "90j", label: "90 jours" },
  ];
  return (
    <section className="space-y-4">
      <h2 className="text-[16px] font-[650] text-(--color-text-strong)">Listes et indicateurs</h2>
      <MetricsStrip period={periodes.find((p) => p.id === periode)!.label} periods={periodes} onPeriodChange={setPeriode} metrics={[
        { id: "cmd", label: "Commandes", definition: "Commandes passées sur la période, toutes sources", value: "14", delta: 75, sparkline: [2, 3, 2, 5, 4, 6, 8] },
        { id: "art", label: "Articles commandés", value: "19", delta: 58, sparkline: [3, 4, 3, 6, 5, 7, 9] },
        { id: "ret", label: "Retours", value: "0 FCFA", sparkline: [0, 0, 0, 0, 0, 0] },
        { id: "liv", label: "Commandes livrées", definition: "Commandes au statut « Livrée » sur la période", value: "4", delta: -7, sparkline: [3, 2, 4, 3, 2, 3, 2] },
      ]} />
      <Suspense fallback={null}><Liste /></Suspense>
      <div className="flex items-center gap-3">
        <Thumbnail alt="Produit sans photo" /> <span className="text-(--color-text-secondary)">Vignette 40 px (sans image)</span>
      </div>
      <EmptyState title="Créer manuellement des commandes et des factures" image={<IllustrationBrouillons />}
        actions={<><Button>Importer</Button><Button variant="primary">Créer une commande</Button></>}
        learnMore={{ topic: "commandes provisoires", href: "/dashboard/support" }}>
        Prenez les commandes reçues par téléphone ou WhatsApp et envoyez une facture au client.
      </EmptyState>
    </section>
  );
}
