-- CreateTable
CREATE TABLE "CommandeProvisoire" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "clientId" TEXT,
    "clientNom" TEXT NOT NULL,
    "clientTelephone" TEXT NOT NULL,
    "clientEmail" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "pays" TEXT,
    "lignes" JSONB NOT NULL DEFAULT '[]',
    "remise" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "livraison" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "factureEnvoyeeLe" TIMESTAMP(3),
    "commandeId" TEXT,
    "convertieLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandeProvisoire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanierAbandonne" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "nom" TEXT,
    "telephone" TEXT NOT NULL,
    "ville" TEXT,
    "lignes" JSONB NOT NULL DEFAULT '[]',
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "devise" TEXT NOT NULL,
    "relanceLe" TIMESTAMP(3),
    "commandeId" TEXT,
    "recupereLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanierAbandonne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommandeProvisoire_commandeId_key" ON "CommandeProvisoire"("commandeId");

-- CreateIndex
CREATE INDEX "CommandeProvisoire_tenantId_createdAt_idx" ON "CommandeProvisoire"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommandeProvisoire_tenantId_numero_key" ON "CommandeProvisoire"("tenantId", "numero");

-- CreateIndex
CREATE INDEX "PanierAbandonne_tenantId_updatedAt_idx" ON "PanierAbandonne"("tenantId", "updatedAt");

-- CreateIndex
CREATE INDEX "PanierAbandonne_tenantId_telephone_idx" ON "PanierAbandonne"("tenantId", "telephone");

-- CreateIndex
CREATE UNIQUE INDEX "PanierAbandonne_tenantId_cle_key" ON "PanierAbandonne"("tenantId", "cle");

