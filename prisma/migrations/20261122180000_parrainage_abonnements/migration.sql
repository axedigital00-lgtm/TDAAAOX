-- Parrainage des abonnements (20 % des paiements des filleuls). Additif.
CREATE TABLE IF NOT EXISTS "CodeParrain" (
  "userId" TEXT NOT NULL, "code" TEXT NOT NULL, "clics" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CodeParrain_pkey" PRIMARY KEY ("userId")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CodeParrain_code_key" ON "CodeParrain"("code");

CREATE TABLE IF NOT EXISTS "Parrainage" (
  "id" TEXT NOT NULL, "parrainUserId" TEXT NOT NULL, "filleulTenantId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Parrainage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Parrainage_filleulTenantId_key" ON "Parrainage"("filleulTenantId");
CREATE INDEX IF NOT EXISTS "Parrainage_parrainUserId_createdAt_idx" ON "Parrainage"("parrainUserId", "createdAt");

CREATE TABLE IF NOT EXISTS "CommissionParrainage" (
  "id" TEXT NOT NULL, "parrainageId" TEXT NOT NULL, "parrainUserId" TEXT NOT NULL, "filleulTenantId" TEXT NOT NULL, "reference" TEXT NOT NULL,
  "montantAbonnement" DOUBLE PRECISION NOT NULL, "taux" DOUBLE PRECISION NOT NULL, "montant" DOUBLE PRECISION NOT NULL, "devise" TEXT NOT NULL,
  "statut" TEXT NOT NULL DEFAULT 'pending', "disponibleLe" TIMESTAMP(3) NOT NULL, "retraitId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommissionParrainage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CommissionParrainage_reference_key" ON "CommissionParrainage"("reference");
CREATE INDEX IF NOT EXISTS "CommissionParrainage_parrainUserId_createdAt_idx" ON "CommissionParrainage"("parrainUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "CommissionParrainage_filleulTenantId_idx" ON "CommissionParrainage"("filleulTenantId");
CREATE INDEX IF NOT EXISTS "CommissionParrainage_retraitId_idx" ON "CommissionParrainage"("retraitId");

DO $$ BEGIN
  ALTER TABLE "CodeParrain" ADD CONSTRAINT "CodeParrain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CommissionParrainage" ADD CONSTRAINT "CommissionParrainage_parrainageId_fkey" FOREIGN KEY ("parrainageId") REFERENCES "Parrainage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
