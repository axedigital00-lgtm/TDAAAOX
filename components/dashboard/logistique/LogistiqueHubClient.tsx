"use client";
import { useState } from "react";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Card, SettingsRow } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { LivraisonPanel } from "./LivraisonPanel";
import { LivreursPanel } from "./LivreursPanel";
import { RetoursPanel } from "./RetoursPanel";
import { FacturesPanel } from "./FacturesPanel";
import { POSPanel } from "./POSPanel";
import { useT } from "@/components/I18nProvider";

interface Stats {
  enCours: number;
  livreursActifs: number;
  retoursOuverts: number;
  echecs: number;
  codEnAttente: number;
  facturesEnAttente: number;
}

// Onglets synchronisés avec ?tab= (les sous-items de la barre latérale y mènent directement).
const TABS = [
  { id: "apercu",    label: "Vue d'ensemble", titre: "Livraisons" },
  { id: "livraison", label: "Livraison",      titre: "Livraisons" },
  { id: "livreurs",  label: "Livreurs",       titre: "Livreurs" },
  { id: "retours",   label: "Retours",        titre: "Retours" },
  { id: "factures",  label: "Factures",       titre: "Factures" },
  { id: "pos",       label: "Caisse",         titre: "Caisse" },
];

export function LogistiqueHubClient({ initialTab, stats, caisseV2 = false }: { initialTab?: string; stats: Stats; caisseV2?: boolean }) {
  const tr = useT();
  const [onglet, setOngletEtat] = useState(TABS.some((t) => t.id === initialTab) ? initialTab! : "apercu");
  const setOnglet = (id: string) => {
    setOngletEtat(id);
    const url = new URL(window.location.href);
    if (id === "apercu") url.searchParams.delete("tab"); else url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url.toString());
  };
  const courant = TABS.find((t) => t.id === onglet)!;

  const cartes = [
    { tab: "livraison", label: "Commandes en livraison", desc: "Confirmées, en préparation ou expédiées", valeur: stats.enCours },
    { tab: "livreurs",  label: "Livreurs disponibles",  desc: "Actifs et disponibles maintenant",        valeur: stats.livreursActifs },
    { tab: "retours",   label: "Retours ouverts",       desc: "Demandes de retour à traiter",            valeur: stats.retoursOuverts },
    { tab: "factures",  label: "Factures émises",       desc: "En attente de règlement",                 valeur: stats.facturesEnAttente },
  ];

  return (
    <Page>
      <PageHeader icon="truck" title={tr(courant.titre)}
        secondaryActions={[{ content: tr("Encaissements à la livraison"), href: "/dashboard/logistique/encaissements" }]}
        overflowActions={[{ content: tr("Entrepôts"), href: "/dashboard/logistique/entrepots" }, { content: tr("Transporteurs"), href: "/dashboard/logistique/transporteurs" }]}
      />

      <div className="axd-card" style={{ overflow: "hidden", marginBottom: "var(--space-400)" }}>
        <div className="axd-ix-bar" style={{ borderBottom: 0 }}>
          <div className="axd-ix-tabs" role="tablist">
            {TABS.map(({ id, label }) => (
              <button key={id} type="button" role="tab" aria-selected={onglet === id} className="axd-ix-tab" onClick={() => setOnglet(id)}>{tr(label)}</button>
            ))}
          </div>
        </div>
      </div>

      {onglet === "apercu" && (
        <div className="axd-stack">
          {stats.echecs > 0 && (
            <Banner tone="critical" action={<Button size="sm" onClick={() => setOnglet("livraison")}>{tr("Voir les livraisons")}</Button>}>
              {stats.echecs}{" "}{tr(stats.echecs > 1 ? "livraisons ont échoué et attendent une replanification" : "livraison a échoué et attend une replanification")}
            </Banner>
          )}

          <div className="axd-grid axd-g4">
            {cartes.map((c) => (
              <button key={c.tab} type="button" onClick={() => setOnglet(c.tab)} className="axd-card axd-card--pad axd-carte-lien">
                <span className="axd-kpi__t">{tr(c.label)}</span>
                <span className="axd-kpi__v" style={{ marginBottom: 2 }}>{c.valeur.toLocaleString(tr.loc)}</span>
                <span className="axd-muted" style={{ fontSize: 12 }}>{tr(c.desc)}</span>
              </button>
            ))}
          </div>

          <Card title={tr("Autres outils")} padding="none">
            <SettingsRow icon="money" title={tr("Encaissements à la livraison")} subtitle={tr("Argent à récupérer auprès de vos livreurs")}
              href="/dashboard/logistique/encaissements" right={stats.codEnAttente > 0 ? <Badge tone="attention">{stats.codEnAttente.toLocaleString(tr.loc)}</Badge> : undefined} />
            <SettingsRow icon="box" title={tr("Entrepôts")} subtitle={tr("Stock par emplacement")} href="/dashboard/logistique/entrepots" />
            <SettingsRow icon="truck" title={tr("Transporteurs")} subtitle={tr("Agences et partenaires de livraison")} href="/dashboard/logistique/transporteurs" />
          </Card>
        </div>
      )}

      {onglet === "livraison" && <LivraisonPanel />}
      {onglet === "livreurs"  && <LivreursPanel />}
      {onglet === "retours"   && <RetoursPanel />}
      {onglet === "factures"  && <FacturesPanel />}
      {onglet === "pos"       && (caisseV2 ? (
        <Card>
          <p style={{ margin: 0 }}>{tr("La nouvelle caisse est activée pour cette boutique : les ventes s'encaissent désormais depuis l'écran Caisse.")}</p>
          <div style={{ marginTop: 12 }}><Button variant="primary" href="/dashboard/pos/caisse">{tr("Ouvrir la caisse")}</Button></div>
        </Card>
      ) : <POSPanel />)}
    </Page>
  );
}
