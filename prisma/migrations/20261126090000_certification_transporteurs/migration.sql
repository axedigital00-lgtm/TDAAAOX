-- Certification des transporteurs par AXSO. Ajout uniquement.
ALTER TABLE "FournisseurLogistique" ADD COLUMN "certifie" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FournisseurLogistique" ADD COLUMN "certifieLe" TIMESTAMP(3);
ALTER TABLE "FournisseurLogistique" ADD COLUMN "certifiePar" TEXT;
ALTER TABLE "FournisseurLogistique" ADD COLUMN "motifCertification" TEXT;
CREATE INDEX "FournisseurLogistique_certifie_idx" ON "FournisseurLogistique"("certifie");
