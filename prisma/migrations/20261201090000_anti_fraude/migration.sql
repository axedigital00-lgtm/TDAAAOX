-- Anti-fraude Commande Express : liste noire, limite par jour, numéro normalisé, empreinte de connexion. Ajout uniquement.
ALTER TABLE "ReglagesCommandeExpress" ADD COLUMN "limiteParJour" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "CommandeExpress" ADD COLUMN "telephone" TEXT;
ALTER TABLE "CommandeExpress" ADD COLUMN "ipHash" TEXT;
ALTER TABLE "CommandeExpress" ADD COLUMN "dureeRemplissage" INTEGER;
CREATE INDEX "CommandeExpress_tenantId_telephone_idx" ON "CommandeExpress"("tenantId", "telephone");
CREATE INDEX "CommandeExpress_tenantId_ipHash_idx" ON "CommandeExpress"("tenantId", "ipHash");

CREATE TABLE "ListeNoireCommande" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "motif" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListeNoireCommande_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ListeNoireCommande_tenantId_type_valeur_key" ON "ListeNoireCommande"("tenantId", "type", "valeur");
