-- Offres Releasit COD AXSO (quantité, case à cocher, après achat, sortie). Ajout uniquement.
CREATE TABLE "OffreReleasit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "produitId" TEXT,
    "produitOffertId" TEXT,
    "codePromoId" TEXT,
    "titre" TEXT NOT NULL,
    "texte" TEXT,
    "paliers" JSONB,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "vues" INTEGER NOT NULL DEFAULT 0,
    "acceptations" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OffreReleasit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OffreReleasit_tenantId_type_idx" ON "OffreReleasit"("tenantId", "type");
CREATE INDEX "OffreReleasit_tenantId_produitId_idx" ON "OffreReleasit"("tenantId", "produitId");
