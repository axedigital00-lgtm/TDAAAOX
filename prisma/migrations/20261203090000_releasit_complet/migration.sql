-- Releasit COD AXSO phases 6 à 9 : éditeur, test A/B, relances, pixels serveur, abandons, statistiques. Ajout uniquement.
ALTER TABLE "ReglagesCommandeExpress" ADD COLUMN "formulaire" JSONB;
ALTER TABLE "ReglagesCommandeExpress" ADD COLUMN "abTest" JSONB;
ALTER TABLE "ReglagesCommandeExpress" ADD COLUMN "relances" JSONB;
ALTER TABLE "ReglagesCommandeExpress" ADD COLUMN "pixelsServeur" JSONB;
ALTER TABLE "CommandeExpress" ADD COLUMN "champs" JSONB;
ALTER TABLE "CommandeExpress" ADD COLUMN "variante" TEXT;
ALTER TABLE "CommandeExpress" ADD COLUMN "pixels" JSONB;

CREATE TABLE "AbandonReleasit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "nom" TEXT,
    "produitId" TEXT,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "montant" DOUBLE PRECISION,
    "relances" INTEGER NOT NULL DEFAULT 0,
    "derniereRelance" TIMESTAMP(3),
    "recupereeCommandeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AbandonReleasit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AbandonReleasit_cle_key" ON "AbandonReleasit"("cle");
CREATE INDEX "AbandonReleasit_tenantId_createdAt_idx" ON "AbandonReleasit"("tenantId", "createdAt");
CREATE INDEX "AbandonReleasit_tenantId_telephone_idx" ON "AbandonReleasit"("tenantId", "telephone");

CREATE TABLE "StatReleasitJour" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jour" TEXT NOT NULL,
    "variante" TEXT NOT NULL DEFAULT 'A',
    "affichages" INTEGER NOT NULL DEFAULT 0,
    "ouvertures" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "StatReleasitJour_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StatReleasitJour_tenantId_jour_variante_key" ON "StatReleasitJour"("tenantId", "jour", "variante");
