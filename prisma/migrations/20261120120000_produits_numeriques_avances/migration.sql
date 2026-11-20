-- AlterTable
ALTER TABLE "Formation" ADD COLUMN     "accesDureeJours" INTEGER,
ADD COLUMN     "bandeAnnonceUrl" TEXT,
ADD COLUMN     "certifProjetsRequis" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "competences" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'autonome',
ADD COLUMN     "objectifs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "prerequisTexte" TEXT,
ADD COLUMN     "publicCible" TEXT,
ADD COLUMN     "questionsActives" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sousTitre" TEXT;

-- AlterTable
ALTER TABLE "Lecon" ADD COLUMN     "chapitresVideo" JSONB,
ADD COLUMN     "documentUrl" TEXT,
ADD COLUMN     "dureeEstimeeMin" INTEGER,
ADD COLUMN     "grilleEvaluation" JSONB,
ADD COLUMN     "integrationUrl" TEXT,
ADD COLUMN     "resume" TEXT,
ADD COLUMN     "transcription" TEXT;

-- AlterTable
ALTER TABLE "AccesFormation" ADD COLUMN     "expireAt" TIMESTAMP(3),
ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "RenduDevoir" ADD COLUMN     "evaluation" JSONB,
ADD COLUMN     "fichiers" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "SessionFormation" (
    "id" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),
    "places" INTEGER,
    "inscrits" INTEGER NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'ouverte',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionFormation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionLecon" (
    "id" TEXT NOT NULL,
    "leconId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "apprenant" TEXT NOT NULL,
    "auteurNom" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "parentId" TEXT,
    "parFormateur" BOOLEAN NOT NULL DEFAULT false,
    "resolue" BOOLEAN NOT NULL DEFAULT false,
    "masquee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionLecon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceProduit" (
    "id" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'rendez_vous',
    "seances" INTEGER NOT NULL DEFAULT 1,
    "dureeMin" INTEGER NOT NULL DEFAULT 60,
    "lieu" TEXT NOT NULL DEFAULT 'visio',
    "lienVisio" TEXT,
    "adresse" TEXT,
    "fuseau" TEXT NOT NULL DEFAULT 'Africa/Douala',
    "disponibilites" JSONB NOT NULL DEFAULT '[]',
    "indisponibilites" JSONB NOT NULL DEFAULT '[]',
    "tamponMin" INTEGER NOT NULL DEFAULT 15,
    "preavisHeures" INTEGER NOT NULL DEFAULT 24,
    "horizonJours" INTEGER NOT NULL DEFAULT 60,
    "maxParJour" INTEGER,
    "validationManuelle" BOOLEAN NOT NULL DEFAULT false,
    "delaiLivraisonJours" INTEGER,
    "revisionsIncluses" INTEGER NOT NULL DEFAULT 1,
    "brief" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceProduit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandeService" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientNom" TEXT NOT NULL,
    "clientTelephone" TEXT,
    "token" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'brief_attendu',
    "briefReponses" JSONB,
    "echeance" TIMESTAMP(3),
    "revisionsUtilisees" INTEGER NOT NULL DEFAULT 0,
    "livrables" JSONB NOT NULL DEFAULT '[]',
    "messages" JSONB NOT NULL DEFAULT '[]',
    "noteClient" INTEGER,
    "avisClient" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandeService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeanceService" (
    "id" TEXT NOT NULL,
    "commandeServiceId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL DEFAULT 1,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'confirmee',
    "compteRendu" TEXT,
    "rappelEnvoyeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeanceService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbonnementProduit" (
    "id" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "periodeJours" INTEGER NOT NULL DEFAULT 30,
    "essaiJours" INTEGER NOT NULL DEFAULT 0,
    "graceJours" INTEGER NOT NULL DEFAULT 0,
    "rappelJours" INTEGER NOT NULL DEFAULT 3,
    "avantages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "remiseMembresPct" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbonnementProduit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContenuAbonnement" (
    "id" TEXT NOT NULL,
    "abonnementId" TEXT NOT NULL,
    "produitInclusId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContenuAbonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adhesion" (
    "id" TEXT NOT NULL,
    "abonnementId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientNom" TEXT,
    "token" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fin" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'active',
    "renouvellements" INTEGER NOT NULL DEFAULT 0,
    "commandeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rappelEnvoyeAt" TIMESTAMP(3),
    "expirationTraiteeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Adhesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParcoursProduit" (
    "id" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "ordreImpose" BOOLEAN NOT NULL DEFAULT true,
    "certificatFinal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParcoursProduit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtapeParcours" (
    "id" TEXT NOT NULL,
    "parcoursId" TEXT NOT NULL,
    "formationProduitId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "obligatoire" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EtapeParcours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionFormation_formationId_debut_idx" ON "SessionFormation"("formationId", "debut");

-- CreateIndex
CREATE INDEX "QuestionLecon_leconId_createdAt_idx" ON "QuestionLecon"("leconId", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionLecon_tenantId_resolue_idx" ON "QuestionLecon"("tenantId", "resolue");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProduit_produitId_key" ON "ServiceProduit"("produitId");

-- CreateIndex
CREATE UNIQUE INDEX "CommandeService_token_key" ON "CommandeService"("token");

-- CreateIndex
CREATE INDEX "CommandeService_tenantId_statut_idx" ON "CommandeService"("tenantId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "CommandeService_commandeId_produitId_key" ON "CommandeService"("commandeId", "produitId");

-- CreateIndex
CREATE INDEX "SeanceService_serviceId_debut_idx" ON "SeanceService"("serviceId", "debut");

-- CreateIndex
CREATE UNIQUE INDEX "AbonnementProduit_produitId_key" ON "AbonnementProduit"("produitId");

-- CreateIndex
CREATE UNIQUE INDEX "ContenuAbonnement_abonnementId_produitInclusId_key" ON "ContenuAbonnement"("abonnementId", "produitInclusId");

-- CreateIndex
CREATE UNIQUE INDEX "Adhesion_token_key" ON "Adhesion"("token");

-- CreateIndex
CREATE INDEX "Adhesion_tenantId_statut_fin_idx" ON "Adhesion"("tenantId", "statut", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "Adhesion_abonnementId_clientEmail_key" ON "Adhesion"("abonnementId", "clientEmail");

-- CreateIndex
CREATE UNIQUE INDEX "ParcoursProduit_produitId_key" ON "ParcoursProduit"("produitId");

-- CreateIndex
CREATE UNIQUE INDEX "EtapeParcours_parcoursId_formationProduitId_key" ON "EtapeParcours"("parcoursId", "formationProduitId");

-- AddForeignKey
ALTER TABLE "SessionFormation" ADD CONSTRAINT "SessionFormation_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionLecon" ADD CONSTRAINT "QuestionLecon_leconId_fkey" FOREIGN KEY ("leconId") REFERENCES "Lecon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProduit" ADD CONSTRAINT "ServiceProduit_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeService" ADD CONSTRAINT "CommandeService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceProduit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeanceService" ADD CONSTRAINT "SeanceService_commandeServiceId_fkey" FOREIGN KEY ("commandeServiceId") REFERENCES "CommandeService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbonnementProduit" ADD CONSTRAINT "AbonnementProduit_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContenuAbonnement" ADD CONSTRAINT "ContenuAbonnement_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "AbonnementProduit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContenuAbonnement" ADD CONSTRAINT "ContenuAbonnement_produitInclusId_fkey" FOREIGN KEY ("produitInclusId") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adhesion" ADD CONSTRAINT "Adhesion_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "AbonnementProduit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcoursProduit" ADD CONSTRAINT "ParcoursProduit_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtapeParcours" ADD CONSTRAINT "EtapeParcours_parcoursId_fkey" FOREIGN KEY ("parcoursId") REFERENCES "ParcoursProduit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtapeParcours" ADD CONSTRAINT "EtapeParcours_formationProduitId_fkey" FOREIGN KEY ("formationProduitId") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

