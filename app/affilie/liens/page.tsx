// Mes liens : un partenariat par boutique, avec son lien, ses clics, ses ventes et ses commissions.
import Link from "next/link";
import { compteAffilie } from "@/app/affilie/session";
import { prisma } from "@/lib/prisma";
import { lienAffiliation } from "@/lib/affiliation";
import { formatMontant } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { Initiale } from "@/components/affilie/EspaceAffilieShell";
import { Partager } from "@/components/affilie/Actions";
import { ArrowRight } from "lucide-react";
import { MascotteAxso } from "@/components/affilie/MascotteAxso";
import { Badge, type Ton } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUT: Record<string, { label: string; ton: Ton }> = {
  actif: { label: "Actif", ton: "succes" },
  en_attente: { label: "En attente de validation", ton: "attention" },
  suspendu: { label: "Suspendu", ton: "erreur" },
};

export default async function MesLiens() {
  const t = await getT();
  const compte = await compteAffilie();
  const partenariats = await prisma.affilie.findMany({
    where: { userId: compte.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, codeParrainage: true, statut: true, clics: true, conversions: true, commissionTotal: true,
      tenant: { select: { nomBoutique: true, logoUrl: true, devise: true, _count: { select: { produits: { where: { actif: true, affiliationActive: true } } } } } },
    },
  });

  return (
    <>
      <div className="mb-4">
        <h1 className="text-[20px] md:text-[24px] font-bold">{t("Mes liens")}</h1>
        <p className="text-[12.5px] text-[#888]">{t("Un lien par boutique (vers sa vitrine). Pour un produit précis, prenez son lien dans le catalogue : les ventes comptent pour le même partenariat.")}</p>
      </div>

      {partenariats.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-14 px-6 text-center">
          <MascotteAxso hauteur={64} />
          <p className="text-[13px] text-[#888] mb-4">{t("Vous n'avez pas encore de lien. Choisissez un produit dans le catalogue pour obtenir le vôtre.")}</p>
          <Link href="/affilie/catalogue" className="inline-flex items-center gap-2 px-4 min-h-[40px] rounded-xl bg-[#F5A623] text-[#111] text-[13px] font-bold">
            {t("Parcourir le catalogue")}<ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {partenariats.map((p) => {
            const s = STATUT[p.statut] ?? { label: p.statut, ton: "neutre" as Ton };
            const lien = lienAffiliation(p.codeParrainage);
            return (
              <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Initiale nom={p.tenant.nomBoutique} logoUrl={p.tenant.logoUrl} taille={38} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold truncate">{p.tenant.nomBoutique}</p>
                    <p className="text-[11px] text-[#AAA]">{t("Code")} {p.codeParrainage} · {t("{0} produit(s) ouverts", p.tenant._count.produits)}</p>
                  </div>
                  <Badge ton={s.ton}>{t(s.label)}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  {[
                    { label: "Clics", v: p.clics.toLocaleString(t.loc) },
                    { label: "Ventes", v: p.conversions.toLocaleString(t.loc) },
                    { label: "Commissions", v: formatMontant(p.commissionTotal, p.tenant.devise) },
                  ].map((k) => (
                    <div key={k.label} className="rounded-xl bg-[#F7F7F7] py-2 min-w-0">
                      <p className="text-[13.5px] font-bold truncate px-1">{k.v}</p>
                      <p className="text-[10.5px] text-[#999]">{t(k.label)}</p>
                    </div>
                  ))}
                </div>
                {p.statut === "actif" ? (
                  <>
                    <p className="rounded-xl bg-[#F7F7F7] px-3 py-2 text-[11.5px] font-mono text-[#555] break-all select-all mb-2">{lien}</p>
                    <Partager lien={lien} nom={p.tenant.nomBoutique} />
                  </>
                ) : (
                  <p className="text-[12px] text-[#888]">{p.statut === "suspendu"
                    ? t("La boutique a suspendu ce partenariat : ce lien ne rapporte plus de commission.")
                    : t("La boutique doit valider votre demande. Votre lien apparaîtra ici.")}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
