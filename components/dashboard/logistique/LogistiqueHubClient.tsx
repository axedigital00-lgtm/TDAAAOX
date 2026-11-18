"use client";
import { useState } from "react";
import Link from "next/link";
import {
  LayoutGrid, Truck, Bike, RotateCcw, FileText, ShoppingCart,
  Warehouse, Bus, Wallet, ChevronRight,
} from "lucide-react";
import { LivraisonPanel } from "./LivraisonPanel";
import { LivreursPanel } from "./LivreursPanel";
import { RetoursPanel } from "./RetoursPanel";
import { FacturesPanel } from "./FacturesPanel";
import { POSPanel } from "./POSPanel";
import { useT } from "@/components/I18nProvider";
import { Alerte, Bouton, EnTetePage } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Stats {
  enCours: number;
  livreursActifs: number;
  retoursOuverts: number;
  echecs: number;
  codEnAttente: number;
  facturesEnAttente: number;
}

const TABS = [
  { id: "apercu",    label: "Vue d'ensemble", Icon: LayoutGrid   },
  { id: "livraison", label: "Livraison",      Icon: Truck        },
  { id: "livreurs",  label: "Livreurs",       Icon: Bike         },
  { id: "retours",   label: "Retours",        Icon: RotateCcw    },
  { id: "factures",  label: "Factures",       Icon: FileText     },
  { id: "pos",       label: "Caisse POS",     Icon: ShoppingCart },
];

export function LogistiqueHubClient({ initialTab, stats, caisseV2 = false }: { initialTab?: string; stats: Stats; caisseV2?: boolean }) {
  const tr = useT();
  const [onglet, setOnglet] = useState(TABS.some((t) => t.id === initialTab) ? initialTab! : "apercu");

  // Chaque carte dit ce que le chiffre compte (pas seulement le nom du module).
  const cartes = [
    { tab: "livraison", label: "Livraison", desc: "Commandes confirmées, en préparation ou expédiées", Icon: Truck, valeur: stats.enCours },
    { tab: "livreurs",  label: "Livreurs",  desc: "Livreurs actifs et disponibles maintenant",          Icon: Bike,  valeur: stats.livreursActifs },
    { tab: "retours",   label: "Retours",   desc: "Demandes de retour ouvertes ou en cours",            Icon: RotateCcw, valeur: stats.retoursOuverts },
    { tab: "factures",  label: "Factures",  desc: "Factures émises, en attente de paiement",            Icon: FileText, valeur: stats.facturesEnAttente },
  ];

  const liensExternes = [
    { href: "/dashboard/logistique/encaissements", label: "Encaissements à la livraison", desc: "Commandes livrées dont l'argent n'est pas encore remis", Icon: Wallet, valeur: stats.codEnAttente as number | null },
    { href: "/dashboard/logistique/entrepots", label: "Entrepôts", desc: "Vos lieux de stockage", Icon: Warehouse, valeur: null },
    { href: "/dashboard/logistique/transporteurs", label: "Transporteurs", desc: "Agences et partenaires de livraison", Icon: Bus, valeur: null },
  ];

  return (
    <div className="space-y-5 max-w-6xl">
      <EnTetePage
        titre={tr("Logistique")}
        description={tr("Livraison, livreurs, retours, factures et caisse — tout en un seul endroit")}
        className="mb-0"
      />

      {/* Onglets : défilent sur téléphone, l'onglet actif est marqué pour les lecteurs d'écran. */}
      <div role="tablist" aria-label={tr("Sections de la logistique")} className="-mx-1 flex gap-1 overflow-x-auto rounded-carte bg-carte-2 border border-bordure p-1">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={onglet === id} onClick={() => setOnglet(id)}
            className={cn("flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-controle px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-focus",
              onglet === id ? "bg-secondaire text-carte" : "text-doux hover:bg-carte hover:text-encre")}>
            <Icon className="size-4" aria-hidden />
            {tr(label)}
          </button>
        ))}
      </div>

      {onglet === "apercu" && (
        <div className="space-y-5">
          {stats.echecs > 0 && (
            <Alerte ton="erreur"
              titre={tr(stats.echecs > 1 ? "{0} livraisons ont échoué" : "{0} livraison a échoué", stats.echecs)}
              action={<Bouton variante="secondaire" taille="compact" onClick={() => setOnglet("livraison")}>{tr("Voir les livraisons")}</Bouton>}>
              {tr("Le client n'a pas été livré. Relance la livraison ou annule la commande depuis la colonne « Échec livraison ».")}
            </Alerte>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cartes.map((c) => (
              <button key={c.tab} type="button" onClick={() => setOnglet(c.tab)}
                className="group flex items-start gap-3 rounded-carte border border-bordure bg-carte p-carte text-left shadow-carte transition-colors hover:border-bordure-forte focus-visible:outline-2 focus-visible:outline-focus">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-controle bg-primaire-fond text-attention" aria-hidden>
                  <c.Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="ax-libelle font-semibold">{tr(c.label)}</span>
                    <span className="text-xl font-bold tabular-nums text-encre">{c.valeur}</span>
                  </span>
                  <span className="mt-0.5 block ax-aide">{tr(c.desc)}</span>
                </span>
              </button>
            ))}
          </div>

          <section>
            <h2 className="ax-titre-section mb-2">{tr("Autres modules")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {liensExternes.map((c) => (
                <Link key={c.href} href={c.href}
                  className="group flex items-start gap-3 rounded-carte border border-bordure bg-carte p-4 transition-colors hover:border-bordure-forte focus-visible:outline-2 focus-visible:outline-focus">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-controle bg-carte-2 text-doux" aria-hidden>
                    <c.Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-encre">{tr(c.label)}</span>
                      {c.valeur !== null && <span className="text-sm font-bold tabular-nums text-encre">{c.valeur}</span>}
                    </span>
                    <span className="mt-0.5 block ax-aide">{tr(c.desc)}</span>
                  </span>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-discret group-hover:text-encre" aria-hidden />
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      {onglet === "livraison" && <LivraisonPanel />}
      {onglet === "livreurs"  && <LivreursPanel />}
      {onglet === "retours"   && <RetoursPanel />}
      {onglet === "factures"  && <FacturesPanel />}
      {onglet === "pos"       && (caisseV2 ? (
        <div className="rounded-carte border border-bordure bg-carte p-6 text-center">
          <p className="ax-texte-secondaire">{tr("La nouvelle caisse est activée pour cette boutique : les ventes s'encaissent désormais depuis l'écran Caisse.")}</p>
          <Bouton href="/dashboard/pos/caisse" variante="sombre" icone={<ShoppingCart className="size-4" aria-hidden />} className="mt-4">{tr("Ouvrir la caisse")}</Bouton>
        </div>
      ) : <POSPanel />)}
    </div>
  );
}
