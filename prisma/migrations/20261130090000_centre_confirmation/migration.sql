-- Centre de confirmation Commande Express : suivi des appels. Ajout uniquement.
ALTER TABLE "CommandeExpress" ADD COLUMN "tentatives" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CommandeExpress" ADD COLUMN "rappelA" TIMESTAMP(3);
ALTER TABLE "CommandeExpress" ADD COLUMN "noteConfirmation" TEXT;
ALTER TABLE "CommandeExpress" ADD COLUMN "confirmeeAt" TIMESTAMP(3);

CREATE TABLE "AppelConfirmation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commandeExpressId" TEXT NOT NULL,
    "agentId" TEXT,
    "agentNom" TEXT,
    "resultat" TEXT NOT NULL,
    "note" TEXT,
    "rappelA" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppelConfirmation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AppelConfirmation_tenantId_createdAt_idx" ON "AppelConfirmation"("tenantId", "createdAt");
CREATE INDEX "AppelConfirmation_commandeExpressId_idx" ON "AppelConfirmation"("commandeExpressId");
