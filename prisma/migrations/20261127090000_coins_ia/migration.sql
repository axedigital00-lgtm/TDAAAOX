-- Coins IA (crédits prépayés) et suivi des coûts IA. Ajouts uniquement.
CREATE TABLE "EcritureCoins" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "action" TEXT,
    "reference" TEXT NOT NULL,
    "motif" TEXT,
    "creePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EcritureCoins_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EcritureCoins_reference_key" ON "EcritureCoins"("reference");
CREATE INDEX "EcritureCoins_tenantId_createdAt_idx" ON "EcritureCoins"("tenantId", "createdAt");
CREATE INDEX "EcritureCoins_type_createdAt_idx" ON "EcritureCoins"("type", "createdAt");

CREATE TABLE "DepenseIa" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "action" TEXT NOT NULL,
    "fournisseur" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "entree" INTEGER NOT NULL DEFAULT 0,
    "sortie" INTEGER NOT NULL DEFAULT 0,
    "images" INTEGER NOT NULL DEFAULT 0,
    "coutUsd" DECIMAL(12,6) NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'ok',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DepenseIa_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DepenseIa_createdAt_idx" ON "DepenseIa"("createdAt");
CREATE INDEX "DepenseIa_tenantId_createdAt_idx" ON "DepenseIa"("tenantId", "createdAt");

CREATE TABLE "ReglageIa" (
    "id" TEXT NOT NULL,
    "budgetMensuelUsd" DOUBLE PRECISION,
    "alertePct" INTEGER NOT NULL DEFAULT 80,
    "plafondDur" BOOLEAN NOT NULL DEFAULT true,
    "tauxXaf" DOUBLE PRECISION NOT NULL DEFAULT 600,
    "actionsActives" BOOLEAN NOT NULL DEFAULT true,
    "alerteMois" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReglageIa_pkey" PRIMARY KEY ("id")
);
