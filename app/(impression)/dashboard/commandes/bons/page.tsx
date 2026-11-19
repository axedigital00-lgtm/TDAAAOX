// Bons de livraison des commandes sélectionnées (action groupée de la liste) : une page par
// commande, à imprimer. Hors du cadre de l'admin (groupe (impression)) pour une impression nette.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/serveur";
import { formatMontant } from "@/lib/utils";
import { PAIEMENT } from "@/lib/commandes";
import { BoutonImprimer } from "./BoutonImprimer";
import { inter } from "@/app/(dashboard)/police";

export const metadata = { title: "Bons de livraison" };

export default async function BonsLivraison({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "commandes");
  const tenantId = (session.user as any)?.tenantId;
  const t = await getT();
  const ids = ((await searchParams).ids ?? "").split(",").filter(Boolean).slice(0, 200);
  const [tenant, commandes] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { nomBoutique: true, whatsappNumero: true } }),
    prisma.commande.findMany({
      where: { tenantId, id: { in: ids } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, numero: true, createdAt: true, clientNom: true, clientTelephone: true, adresseLivraison: true, ville: true,
        mapsLienClient: true, noteClient: true, montantTotal: true, devise: true, paiementStatut: true,
        lignes: { select: { nom: true, variante: true, quantite: true } },
      },
    }),
  ]);

  return (
    <div className={`adm ${inter.variable} min-h-screen bg-(--color-bg)`}>
    <div className="mx-auto max-w-[720px] p-6 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <p>{t("{0} bon(s) de livraison", commandes.length)}</p>
        <BoutonImprimer />
      </div>
      {commandes.length === 0 && <p>{t("Aucune commande sélectionnée.")}</p>}
      {commandes.map((c) => (
        <section key={c.id} className="mb-8 break-after-page rounded-(--radius-xl) border border-(--color-border) p-5 print:mb-0 print:border-0">
          <header className="mb-4 flex items-start justify-between border-b border-(--color-border-secondary) pb-3">
            <div>
              <p className="text-[15px] font-semibold text-(--color-text-strong)">{t("Bon de livraison")} #{c.numero}</p>
              <p className="text-(--color-text-secondary)">{c.createdAt.toLocaleDateString("fr-FR")}</p>
            </div>
            <p className="text-right font-semibold text-(--color-text-strong)">{tenant?.nomBoutique}<br /><span className="font-normal text-(--color-text-secondary)">{tenant?.whatsappNumero}</span></p>
          </header>
          <dl className="mb-4 grid grid-cols-[140px_1fr] gap-y-1">
            <dt className="text-(--color-text-secondary)">{t("Client")}</dt><dd className="font-semibold">{c.clientNom}</dd>
            <dt className="text-(--color-text-secondary)">{t("Téléphone")}</dt><dd>{c.clientTelephone}</dd>
            <dt className="text-(--color-text-secondary)">{t("Adresse")}</dt><dd>{[c.adresseLivraison, c.ville].filter(Boolean).join(", ")}</dd>
            {c.mapsLienClient && <><dt className="text-(--color-text-secondary)">{t("Position")}</dt><dd className="break-all">{c.mapsLienClient}</dd></>}
            {c.noteClient && <><dt className="text-(--color-text-secondary)">{t("Note")}</dt><dd>{c.noteClient}</dd></>}
          </dl>
          <table className="mb-4 w-full border-collapse">
            <thead><tr className="border-b border-(--color-border) text-left text-xs text-(--color-text-secondary)"><th className="py-1.5 font-semibold">{t("Article")}</th><th className="py-1.5 text-right font-semibold">{t("Quantité")}</th></tr></thead>
            <tbody>
              {c.lignes.map((l, i) => (
                <tr key={i} className="border-b border-(--color-border-secondary)"><td className="py-1.5">{l.nom}{l.variante ? ` (${l.variante})` : ""}</td><td className="py-1.5 text-right tabular-nums">{l.quantite}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="text-right text-[14px] font-semibold text-(--color-text-strong)">
            {c.paiementStatut === PAIEMENT.PAYE ? t("Déjà payée") : `${t("À percevoir")} : ${formatMontant(c.montantTotal, c.devise)}`}
          </p>
          <p className="mt-10 text-(--color-text-secondary)">{t("Signature du client")} : ______________________</p>
        </section>
      ))}
    </div>
    </div>
  );
}
