"use client";
// Recette du cadre (lot 5) : aperçus statiques des pièces du shell, pas de second shell imbriqué.
// Un conteneur avec `transform` retient les éléments `position: fixed` (dock, barre mobile) dans l'aperçu.
import { NavPrincipale, SettingsSidebar, type ShellProps } from "@/components/dashboard/shell/Sidebar";
import { BarreMobile, AxiaDock } from "@/components/dashboard/shell/AppShell";

const DEMO: ShellProps = {
  boutiqueNom: "Boutique Démo", boutiqueUrl: "https://demo.axsoafrica.com", nomCompte: "Awa Diallo", email: "awa@exemple.com",
  palier: "palier1", modePos: "simple", demarrage: { restantes: 3, hrefs: ["/dashboard/boutique?section=livraison"] },
};

function Cadre({ titre, children, className }: { titre: string; children: React.ReactNode; className: string }) {
  return (
    <figure className="space-y-2">
      <figcaption className="text-[12px] font-[550] text-(--color-text-secondary)">{titre}</figcaption>
      <div className={`overflow-hidden rounded-(--radius-xl) bg-(--color-frame) [transform:translateZ(0)] ${className}`}>{children}</div>
    </figure>
  );
}

export function DemoShell() {
  return (
    <section className="space-y-4">
      <h2 className="text-[20px] font-[650] text-(--color-text-strong)">Cadre de l'admin (lot 5)</h2>
      <div className="flex flex-wrap items-start gap-6">
        <Cadre titre="Barre latérale" className="flex h-[640px] w-[240px] flex-col pt-2.5 pr-2 pb-2 pl-3"><NavPrincipale {...DEMO} /></Cadre>
        <Cadre titre="Barre repliée (icônes)" className="flex h-[640px] w-[64px] flex-col pt-2.5 pr-2 pb-2 pl-3"><NavPrincipale {...DEMO} compact /></Cadre>
        <Cadre titre="Paramètres" className="h-[640px] w-[270px]"><SettingsSidebar {...DEMO} /></Cadre>
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <Cadre titre="Barre mobile (≤ 820 px)" className="w-[360px] [&>header]:flex"><BarreMobile boutiqueNom={DEMO.boutiqueNom} onMenu={() => {}} /></Cadre>
        <Cadre titre="Dock AXIA" className="relative h-20 w-[600px] max-w-full bg-(--color-surface-secondary)"><AxiaDock /></Cadre>
      </div>
    </section>
  );
}
