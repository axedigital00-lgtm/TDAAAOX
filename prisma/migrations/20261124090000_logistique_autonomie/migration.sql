-- Autonomie, preuves chiffrées, versements automatiques et contrats des transporteurs. Ajouts uniquement.
ALTER TABLE "PreferenceLogistique" ALTER COLUMN "mode" SET DEFAULT 'autonome';
ALTER TABLE "PreferenceLogistique" ADD COLUMN "autoCourses" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PreuveLivraison" ADD COLUMN "photoChiffree" TEXT;

ALTER TABLE "LotReglement" ADD COLUMN "idVersement" TEXT;
ALTER TABLE "LotReglement" ADD COLUMN "erreurVersement" TEXT;
ALTER TABLE "LotReglement" ADD COLUMN "tentativesVersement" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "LotReglement_idVersement_key" ON "LotReglement"("idVersement");

CREATE TABLE "ContratTransporteur" (
    "id" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "conditions" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,
    "tauxCommission" DOUBLE PRECISION NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'signe',
    "autoVersement" BOOLEAN NOT NULL DEFAULT false,
    "signataireNom" TEXT NOT NULL,
    "signataireId" TEXT NOT NULL,
    "signeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoqueLe" TIMESTAMP(3),
    CONSTRAINT "ContratTransporteur_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContratTransporteur_fournisseurId_version_key" ON "ContratTransporteur"("fournisseurId", "version");
CREATE INDEX "ContratTransporteur_fournisseurId_statut_idx" ON "ContratTransporteur"("fournisseurId", "statut");
ALTER TABLE "ContratTransporteur" ADD CONSTRAINT "ContratTransporteur_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "FournisseurLogistique"("id") ON DELETE CASCADE ON UPDATE CASCADE;
