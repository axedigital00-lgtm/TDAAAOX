-- Achats de packs de coins par paiement en ligne. Ajout uniquement.
CREATE TABLE "AchatCoins" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pack" TEXT NOT NULL,
    "coins" INTEGER NOT NULL,
    "montant" INTEGER NOT NULL,
    "devise" TEXT NOT NULL,
    "prestataire" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'cree',
    "motif" TEXT,
    "referenceOperateur" TEXT,
    "payeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AchatCoins_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AchatCoins_tenantId_createdAt_idx" ON "AchatCoins"("tenantId", "createdAt");
CREATE INDEX "AchatCoins_statut_createdAt_idx" ON "AchatCoins"("statut", "createdAt");
