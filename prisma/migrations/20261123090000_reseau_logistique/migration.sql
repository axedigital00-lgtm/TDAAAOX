-- Réseau logistique AXSO. Additif.
-- CreateTable
CREATE TABLE "FournisseurLogistique" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "raisonSociale" TEXT,
    "registre" TEXT,
    "identifiantFiscal" TEXT,
    "adresseLegale" TEXT,
    "adresseOperation" TEXT,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "pays" TEXT NOT NULL DEFAULT 'CM',
    "devise" TEXT NOT NULL DEFAULT 'XAF',
    "statutLegal" TEXT NOT NULL DEFAULT 'en_attente',
    "assuranceVerifiee" BOOLEAN NOT NULL DEFAULT false,
    "identiteVerifiee" BOOLEAN NOT NULL DEFAULT false,
    "suspendu" BOOLEAN NOT NULL DEFAULT false,
    "motifSuspension" TEXT,
    "disponible" BOOLEAN NOT NULL DEFAULT false,
    "capaciteMax" INTEGER NOT NULL DEFAULT 3,
    "vehicules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "poidsMaxKg" DOUBLE PRECISION,
    "horaires" JSONB NOT NULL DEFAULT '{}',
    "reglement" TEXT,
    "societeParenteId" TEXT,
    "livreurId" TEXT,
    "proprietaireId" TEXT NOT NULL,
    "scoreGlobal" INTEGER NOT NULL DEFAULT 0,
    "score" JSONB NOT NULL DEFAULT '{}',
    "scoreCalculeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FournisseurLogistique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembreFournisseur" (
    "id" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembreFournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVerification" (
    "id" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_revue',
    "nomFichier" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "contenuChiffre" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3),
    "motifRejet" TEXT,
    "relecteurId" TEXT,
    "relueLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiculeFlotte" (
    "id" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "immatriculation" TEXT,
    "capaciteKg" DOUBLE PRECISION,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VehiculeFlotte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneService" (
    "id" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "pays" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "quartier" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ZoneService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegleTarifFournisseur" (
    "id" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "regle" JSONB NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegleTarifFournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreferenceLogistique" (
    "tenantId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'recommandation',
    "pause" BOOLEAN NOT NULL DEFAULT false,
    "budgetMax" DOUBLE PRECISION,
    "exigerVerifie" BOOLEAN NOT NULL DEFAULT false,
    "preuves" TEXT[] DEFAULT ARRAY['otp']::TEXT[],
    "adresseEnlevement" TEXT,
    "villeEnlevement" TEXT,
    "paysEnlevement" TEXT,
    "latEnlevement" DOUBLE PRECISION,
    "lngEnlevement" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreferenceLogistique_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "CourseLivraison" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'attente_fournisseur',
    "fournisseurId" TEXT,
    "devisId" TEXT,
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "poidsKg" DOUBLE PRECISION,
    "express" BOOLEAN NOT NULL DEFAULT false,
    "vehiculeRequis" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "ville" TEXT,
    "pays" TEXT,
    "quartier" TEXT,
    "latDepart" DOUBLE PRECISION,
    "lngDepart" DOUBLE PRECISION,
    "latArrivee" DOUBLE PRECISION,
    "lngArrivee" DOUBLE PRECISION,
    "preuvesRequises" TEXT[] DEFAULT ARRAY['otp']::TEXT[],
    "devise" TEXT NOT NULL DEFAULT 'XAF',
    "prixFournisseur" DECIMAL(14,2),
    "commission" DECIMAL(14,2),
    "versement" DECIMAL(14,2),
    "creditApplique" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "prixMarchand" DECIMAL(14,2),
    "responsableIssue" TEXT,
    "finPrevue" TIMESTAMP(3),
    "livreeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseLivraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevisLivraison" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "regleVersion" INTEGER NOT NULL,
    "detail" JSONB NOT NULL,
    "prixFournisseur" DECIMAL(14,2) NOT NULL,
    "commission" DECIMAL(14,2) NOT NULL,
    "versement" DECIMAL(14,2) NOT NULL,
    "creditApplique" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "prixMarchand" DECIMAL(14,2) NOT NULL,
    "devise" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevisLivraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignationCourse" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'proposee',
    "expireLe" TIMESTAMP(3) NOT NULL,
    "cleIdempotence" TEXT NOT NULL,
    "motif" TEXT,
    "decisionId" TEXT,
    "repondueLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignationCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvenementCourse" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT,
    "acteurType" TEXT NOT NULL,
    "acteurId" TEXT,
    "donnees" JSONB NOT NULL DEFAULT '{}',
    "survenuLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvenementCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreuveLivraison" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "otpValide" BOOLEAN NOT NULL DEFAULT false,
    "signature" TEXT,
    "photoUrl" TEXT,
    "confirmationClient" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "acteurId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreuveLivraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionCourse" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "captureLe" TIMESTAMP(3) NOT NULL,
    "recuLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "precisionM" DOUBLE PRECISION,
    "vitesseMs" DOUBLE PRECISION,
    "capDeg" DOUBLE PRECISION,
    "suspect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PositionCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentCourse" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fournisseurId" TEXT,
    "type" TEXT NOT NULL,
    "severite" TEXT NOT NULL DEFAULT 'WARNING',
    "statut" TEXT NOT NULL DEFAULT 'ouvert',
    "description" TEXT NOT NULL,
    "resolution" TEXT,
    "responsable" TEXT,
    "ouvertPar" TEXT,
    "resoluPar" TEXT,
    "resoluLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvisFournisseur" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvisFournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriqueScore" (
    "id" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "global" INTEGER NOT NULL,
    "score" JSONB NOT NULL,
    "motif" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DroitLivraisonPlan" (
    "plan" TEXT NOT NULL,
    "creditsMensuels" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montantMaxCourse" DOUBLE PRECISION,
    "poidsMaxKg" DOUBLE PRECISION,
    "actif" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DroitLivraisonPlan_pkey" PRIMARY KEY ("plan")
);

-- CreateTable
CREATE TABLE "EcritureCredit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "courseId" TEXT,
    "type" TEXT NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EcritureCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcritureFinanceCourse" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "fournisseurId" TEXT,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "devise" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EcritureFinanceCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotReglement" (
    "id" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'prepare',
    "total" DECIMAL(14,2) NOT NULL,
    "devise" TEXT NOT NULL,
    "referencePaiement" TEXT,
    "creePar" TEXT NOT NULL,
    "payePar" TEXT,
    "payeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotReglement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneReglement" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "LigneReglement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLogistique" (
    "id" TEXT NOT NULL,
    "acteurType" TEXT NOT NULL,
    "acteurId" TEXT,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT,
    "avant" JSONB,
    "apres" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalLogistique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvenementSortant" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "donnees" JSONB NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'attente',
    "essais" INTEGER NOT NULL DEFAULT 0,
    "prochainEssai" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvenementSortant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolitiqueDispatch" (
    "id" TEXT NOT NULL,
    "portee" TEXT NOT NULL DEFAULT 'global',
    "version" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creePar" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolitiqueDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionDispatch" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fournisseurId" TEXT,
    "explication" TEXT NOT NULL,
    "alternatives" JSONB NOT NULL DEFAULT '[]',
    "ecartes" JSONB NOT NULL DEFAULT '[]',
    "politiqueVersion" INTEGER NOT NULL,
    "shadow" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlerteLogistique" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severite" TEXT NOT NULL,
    "explication" TEXT NOT NULL,
    "preuves" JSONB NOT NULL DEFAULT '{}',
    "action" TEXT NOT NULL,
    "confiance" TEXT NOT NULL,
    "shadow" BOOLEAN NOT NULL DEFAULT true,
    "statut" TEXT NOT NULL DEFAULT 'ouverte',
    "resoluPar" TEXT,
    "resoluLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlerteLogistique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioSimulation" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "parametres" JSONB NOT NULL,
    "resultats" JSONB NOT NULL,
    "creePar" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioSimulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionModele" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "etat" TEXT NOT NULL DEFAULT 'shadow',
    "metriques" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersionModele_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FournisseurLogistique_slug_key" ON "FournisseurLogistique"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FournisseurLogistique_livreurId_key" ON "FournisseurLogistique"("livreurId");

-- CreateIndex
CREATE INDEX "FournisseurLogistique_statutLegal_suspendu_disponible_idx" ON "FournisseurLogistique"("statutLegal", "suspendu", "disponible");

-- CreateIndex
CREATE INDEX "FournisseurLogistique_societeParenteId_idx" ON "FournisseurLogistique"("societeParenteId");

-- CreateIndex
CREATE INDEX "FournisseurLogistique_proprietaireId_idx" ON "FournisseurLogistique"("proprietaireId");

-- CreateIndex
CREATE INDEX "MembreFournisseur_userId_idx" ON "MembreFournisseur"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MembreFournisseur_fournisseurId_userId_key" ON "MembreFournisseur"("fournisseurId", "userId");

-- CreateIndex
CREATE INDEX "DocumentVerification_fournisseurId_type_idx" ON "DocumentVerification"("fournisseurId", "type");

-- CreateIndex
CREATE INDEX "DocumentVerification_statut_expireLe_idx" ON "DocumentVerification"("statut", "expireLe");

-- CreateIndex
CREATE INDEX "VehiculeFlotte_fournisseurId_idx" ON "VehiculeFlotte"("fournisseurId");

-- CreateIndex
CREATE INDEX "ZoneService_pays_ville_actif_idx" ON "ZoneService"("pays", "ville", "actif");

-- CreateIndex
CREATE UNIQUE INDEX "ZoneService_fournisseurId_pays_ville_quartier_key" ON "ZoneService"("fournisseurId", "pays", "ville", "quartier");

-- CreateIndex
CREATE INDEX "RegleTarifFournisseur_fournisseurId_actif_idx" ON "RegleTarifFournisseur"("fournisseurId", "actif");

-- CreateIndex
CREATE UNIQUE INDEX "RegleTarifFournisseur_fournisseurId_version_key" ON "RegleTarifFournisseur"("fournisseurId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CourseLivraison_reference_key" ON "CourseLivraison"("reference");

-- CreateIndex
CREATE INDEX "CourseLivraison_tenantId_statut_createdAt_idx" ON "CourseLivraison"("tenantId", "statut", "createdAt");

-- CreateIndex
CREATE INDEX "CourseLivraison_fournisseurId_statut_idx" ON "CourseLivraison"("fournisseurId", "statut");

-- CreateIndex
CREATE INDEX "CourseLivraison_commandeId_idx" ON "CourseLivraison"("commandeId");

-- CreateIndex
CREATE INDEX "DevisLivraison_courseId_fournisseurId_idx" ON "DevisLivraison"("courseId", "fournisseurId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignationCourse_cleIdempotence_key" ON "AssignationCourse"("cleIdempotence");

-- CreateIndex
CREATE INDEX "AssignationCourse_statut_expireLe_idx" ON "AssignationCourse"("statut", "expireLe");

-- CreateIndex
CREATE INDEX "AssignationCourse_fournisseurId_statut_idx" ON "AssignationCourse"("fournisseurId", "statut");

-- CreateIndex
CREATE INDEX "AssignationCourse_courseId_idx" ON "AssignationCourse"("courseId");

-- CreateIndex
CREATE INDEX "EvenementCourse_courseId_survenuLe_idx" ON "EvenementCourse"("courseId", "survenuLe");

-- CreateIndex
CREATE UNIQUE INDEX "PreuveLivraison_courseId_key" ON "PreuveLivraison"("courseId");

-- CreateIndex
CREATE INDEX "PositionCourse_courseId_captureLe_idx" ON "PositionCourse"("courseId", "captureLe");

-- CreateIndex
CREATE INDEX "PositionCourse_captureLe_idx" ON "PositionCourse"("captureLe");

-- CreateIndex
CREATE INDEX "IncidentCourse_statut_createdAt_idx" ON "IncidentCourse"("statut", "createdAt");

-- CreateIndex
CREATE INDEX "IncidentCourse_tenantId_statut_idx" ON "IncidentCourse"("tenantId", "statut");

-- CreateIndex
CREATE INDEX "IncidentCourse_fournisseurId_statut_idx" ON "IncidentCourse"("fournisseurId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "AvisFournisseur_courseId_key" ON "AvisFournisseur"("courseId");

-- CreateIndex
CREATE INDEX "AvisFournisseur_fournisseurId_createdAt_idx" ON "AvisFournisseur"("fournisseurId", "createdAt");

-- CreateIndex
CREATE INDEX "HistoriqueScore_fournisseurId_createdAt_idx" ON "HistoriqueScore"("fournisseurId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EcritureCredit_reference_key" ON "EcritureCredit"("reference");

-- CreateIndex
CREATE INDEX "EcritureCredit_tenantId_createdAt_idx" ON "EcritureCredit"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "EcritureCredit_courseId_idx" ON "EcritureCredit"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "EcritureFinanceCourse_reference_key" ON "EcritureFinanceCourse"("reference");

-- CreateIndex
CREATE INDEX "EcritureFinanceCourse_courseId_idx" ON "EcritureFinanceCourse"("courseId");

-- CreateIndex
CREATE INDEX "EcritureFinanceCourse_fournisseurId_type_idx" ON "EcritureFinanceCourse"("fournisseurId", "type");

-- CreateIndex
CREATE INDEX "LotReglement_fournisseurId_statut_idx" ON "LotReglement"("fournisseurId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "LigneReglement_courseId_key" ON "LigneReglement"("courseId");

-- CreateIndex
CREATE INDEX "LigneReglement_lotId_idx" ON "LigneReglement"("lotId");

-- CreateIndex
CREATE INDEX "JournalLogistique_entite_entiteId_idx" ON "JournalLogistique"("entite", "entiteId");

-- CreateIndex
CREATE INDEX "JournalLogistique_createdAt_idx" ON "JournalLogistique"("createdAt");

-- CreateIndex
CREATE INDEX "EvenementSortant_statut_prochainEssai_idx" ON "EvenementSortant"("statut", "prochainEssai");

-- CreateIndex
CREATE UNIQUE INDEX "PolitiqueDispatch_portee_version_key" ON "PolitiqueDispatch"("portee", "version");

-- CreateIndex
CREATE INDEX "DecisionDispatch_courseId_createdAt_idx" ON "DecisionDispatch"("courseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AlerteLogistique_cle_key" ON "AlerteLogistique"("cle");

-- CreateIndex
CREATE INDEX "AlerteLogistique_statut_createdAt_idx" ON "AlerteLogistique"("statut", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VersionModele_nom_version_key" ON "VersionModele"("nom", "version");

-- AddForeignKey
ALTER TABLE "MembreFournisseur" ADD CONSTRAINT "MembreFournisseur_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "FournisseurLogistique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVerification" ADD CONSTRAINT "DocumentVerification_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "FournisseurLogistique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiculeFlotte" ADD CONSTRAINT "VehiculeFlotte_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "FournisseurLogistique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneService" ADD CONSTRAINT "ZoneService_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "FournisseurLogistique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegleTarifFournisseur" ADD CONSTRAINT "RegleTarifFournisseur_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "FournisseurLogistique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevisLivraison" ADD CONSTRAINT "DevisLivraison_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CourseLivraison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignationCourse" ADD CONSTRAINT "AssignationCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CourseLivraison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvenementCourse" ADD CONSTRAINT "EvenementCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CourseLivraison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreuveLivraison" ADD CONSTRAINT "PreuveLivraison_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CourseLivraison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionCourse" ADD CONSTRAINT "PositionCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CourseLivraison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentCourse" ADD CONSTRAINT "IncidentCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CourseLivraison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueScore" ADD CONSTRAINT "HistoriqueScore_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "FournisseurLogistique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneReglement" ADD CONSTRAINT "LigneReglement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "LotReglement"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Une seule course active par commande, une seule assignation ouverte par course.
CREATE UNIQUE INDEX IF NOT EXISTS "CourseLivraison_commande_active" ON "CourseLivraison"("commandeId") WHERE "statut" NOT IN ('livree', 'retournee', 'annulee');
CREATE UNIQUE INDEX IF NOT EXISTS "AssignationCourse_ouverte" ON "AssignationCourse"("courseId") WHERE "statut" IN ('proposee', 'acceptee');
ALTER TABLE "FournisseurLogistique" ADD CONSTRAINT "FournisseurLogistique_type_check" CHECK ("type" IN ('societe', 'livreur'));
ALTER TABLE "EcritureCredit" ADD CONSTRAINT "EcritureCredit_montant_positif" CHECK ("montant" > 0);
ALTER TABLE "AvisFournisseur" ADD CONSTRAINT "AvisFournisseur_note_check" CHECK ("note" BETWEEN 1 AND 5);
