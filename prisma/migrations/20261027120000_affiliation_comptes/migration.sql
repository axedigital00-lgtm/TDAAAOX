-- Refonte affiliation : compte Axso de l'affilié, commission prélevée à la vente, retraits versés par Axso.
-- AlterTable
ALTER TABLE "Affilie" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "CommissionAffilie" ADD COLUMN     "devise" TEXT,
ADD COLUMN     "retraitId" TEXT;

-- CreateTable
CREATE TABLE "RetraitAffilie" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL,
    "destinataire" TEXT NOT NULL,
    "operateur" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetraitAffilie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetraitAffilie_userId_createdAt_idx" ON "RetraitAffilie"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RetraitAffilie_statut_idx" ON "RetraitAffilie"("statut");

-- CreateIndex
CREATE INDEX "Affilie_userId_idx" ON "Affilie"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionAffilie_commandeId_key" ON "CommissionAffilie"("commandeId");

-- AddForeignKey
ALTER TABLE "Affilie" ADD CONSTRAINT "Affilie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetraitAffilie" ADD CONSTRAINT "RetraitAffilie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

