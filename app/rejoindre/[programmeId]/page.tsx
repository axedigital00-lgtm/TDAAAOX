// Lien d'invitation d'une boutique : un affilié (compte Axso) rejoint son programme d'affiliation.
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { RejoindreForm } from "./RejoindreForm";

export default async function RejoindrePage({ params }: { params: Promise<{ programmeId: string }> }) {
  const { programmeId } = await params;
  const [programme, session] = await Promise.all([
    prisma.programmeAffiliation.findUnique({
      where: { id: programmeId },
      select: { id: true, actif: true, valeurCommission: true, tenantId: true, tenant: { select: { nomBoutique: true, logoUrl: true, statut: true } } },
    }),
    auth(),
  ]);
  const ouvert = !!programme?.actif && programme.tenant.statut === "active";
  return (
    <RejoindreForm
      programmeId={programmeId}
      ouvert={ouvert}
      connecte={!!session?.user}
      tenantId={programme?.tenantId ?? ""}
      boutique={programme?.tenant.nomBoutique ?? ""}
      logoUrl={programme?.tenant.logoUrl ?? null}
      taux={programme?.valeurCommission ?? 10}
    />
  );
}
