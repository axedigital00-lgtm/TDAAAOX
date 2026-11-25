-- Commande Express AXSO : réglages par boutique et fiche de chaque commande express. Ajout uniquement.
CREATE TABLE "ReglagesCommandeExpress" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT false,
    "boutonCollant" BOOLEAN NOT NULL DEFAULT true,
    "texteBouton" TEXT NOT NULL DEFAULT 'Commander maintenant',
    "couleur" TEXT NOT NULL DEFAULT '#0A1A33',
    "demanderEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReglagesCommandeExpress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReglagesCommandeExpress_tenantId_key" ON "ReglagesCommandeExpress"("tenantId");

CREATE TABLE "CommandeExpress" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cleIdempotence" TEXT NOT NULL,
    "commandeId" TEXT,
    "produitId" TEXT,
    "quartier" TEXT,
    "repere" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "source" JSONB NOT NULL DEFAULT '{}',
    "statutConfirmation" TEXT NOT NULL DEFAULT 'a_confirmer',
    "agentId" TEXT,
    "montantEncaisse" DOUBLE PRECISION,
    "scoreRisque" INTEGER,
    "facteursRisque" JSONB,
    "reponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommandeExpress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommandeExpress_cleIdempotence_key" ON "CommandeExpress"("cleIdempotence");
CREATE UNIQUE INDEX "CommandeExpress_commandeId_key" ON "CommandeExpress"("commandeId");
CREATE INDEX "CommandeExpress_tenantId_createdAt_idx" ON "CommandeExpress"("tenantId", "createdAt");
CREATE INDEX "CommandeExpress_tenantId_statutConfirmation_idx" ON "CommandeExpress"("tenantId", "statutConfirmation");
