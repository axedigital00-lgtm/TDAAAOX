-- Paiements et versements Mobile Money par pawaPay. Ajout uniquement.
CREATE TABLE "PaiementPawapay" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'abonnement',
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "plan" TEXT,
    "jours" INTEGER,
    "commandeId" TEXT,
    "montant" INTEGER NOT NULL,
    "devise" TEXT NOT NULL,
    "pays" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'cree',
    "motifEchec" TEXT,
    "referenceOperateur" TEXT,
    "parrainTraite" BOOLEAN NOT NULL DEFAULT false,
    "payeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaiementPawapay_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PaiementPawapay_statut_createdAt_idx" ON "PaiementPawapay"("statut", "createdAt");
CREATE INDEX "PaiementPawapay_tenantId_createdAt_idx" ON "PaiementPawapay"("tenantId", "createdAt");
CREATE UNIQUE INDEX "PaiementPawapay_commandeId_key" ON "PaiementPawapay"("commandeId");

ALTER TABLE "Retrait" ADD COLUMN "payoutId" TEXT;
ALTER TABLE "Retrait" ADD COLUMN "frais" DOUBLE PRECISION NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "Retrait_payoutId_key" ON "Retrait"("payoutId");
