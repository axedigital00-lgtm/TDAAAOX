-- Devis, comptes entreprises, workflows du marchand et lancements planifiés. Additif.
ALTER TABLE "Commande" ADD COLUMN IF NOT EXISTS "bonCommande" TEXT;
ALTER TABLE "Commande" ADD COLUMN IF NOT EXISTS "conditionsPaiement" TEXT;
ALTER TABLE "Commande" ADD COLUMN IF NOT EXISTS "echeancePaiement" TIMESTAMP(3);
ALTER TABLE "Commande" ADD COLUMN IF NOT EXISTS "compteEntrepriseId" TEXT;

CREATE TABLE IF NOT EXISTS "Devis" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "numero" TEXT NOT NULL, "token" TEXT NOT NULL,
  "statut" TEXT NOT NULL DEFAULT 'brouillon', "entrepriseId" TEXT, "clientNom" TEXT NOT NULL, "clientEmail" TEXT,
  "clientTelephone" TEXT NOT NULL, "adresse" TEXT, "ville" TEXT, "pays" TEXT, "lignes" JSONB NOT NULL,
  "remise" DOUBLE PRECISION NOT NULL DEFAULT 0, "livraison" DOUBLE PRECISION NOT NULL DEFAULT 0, "total" DOUBLE PRECISION NOT NULL,
  "devise" TEXT NOT NULL DEFAULT 'XAF', "conditions" TEXT NOT NULL DEFAULT 'comptant', "bonCommande" TEXT, "note" TEXT,
  "expireAt" TIMESTAMP(3), "commandeId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Devis_numero_key" ON "Devis"("numero");
CREATE UNIQUE INDEX IF NOT EXISTS "Devis_token_key" ON "Devis"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "Devis_commandeId_key" ON "Devis"("commandeId");
CREATE INDEX IF NOT EXISTS "Devis_tenantId_statut_createdAt_idx" ON "Devis"("tenantId", "statut", "createdAt");
CREATE INDEX IF NOT EXISTS "Devis_entrepriseId_idx" ON "Devis"("entrepriseId");

CREATE TABLE IF NOT EXISTS "CompteEntreprise" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "nom" TEXT NOT NULL, "contactNom" TEXT, "email" TEXT, "telephone" TEXT NOT NULL,
  "adresse" TEXT, "ville" TEXT, "pays" TEXT, "identifiantFiscal" TEXT, "conditions" TEXT NOT NULL DEFAULT 'comptant',
  "remisePct" DOUBLE PRECISION NOT NULL DEFAULT 0, "plafond" DOUBLE PRECISION, "actif" BOOLEAN NOT NULL DEFAULT true, "token" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompteEntreprise_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CompteEntreprise_token_key" ON "CompteEntreprise"("token");
CREATE INDEX IF NOT EXISTS "CompteEntreprise_tenantId_actif_idx" ON "CompteEntreprise"("tenantId", "actif");

CREATE TABLE IF NOT EXISTS "WorkflowBoutique" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "nom" TEXT NOT NULL, "actif" BOOLEAN NOT NULL DEFAULT true, "declencheur" TEXT NOT NULL,
  "conditions" JSONB NOT NULL DEFAULT '[]', "actions" JSONB NOT NULL DEFAULT '[]', "executions" INTEGER NOT NULL DEFAULT 0,
  "derniereExecution" TIMESTAMP(3), "dernierResultat" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkflowBoutique_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WorkflowBoutique_tenantId_declencheur_actif_idx" ON "WorkflowBoutique"("tenantId", "declencheur", "actif");

CREATE TABLE IF NOT EXISTS "LancementBoutique" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "nom" TEXT NOT NULL, "statut" TEXT NOT NULL DEFAULT 'planifie', "config" JSONB NOT NULL,
  "debut" TIMESTAMP(3) NOT NULL, "fin" TIMESTAMP(3), "versionAvant" INTEGER, "empreinte" TEXT, "erreur" TEXT, "auteur" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LancementBoutique_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LancementBoutique_tenantId_createdAt_idx" ON "LancementBoutique"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "LancementBoutique_statut_debut_idx" ON "LancementBoutique"("statut", "debut");
