-- Relances d'automatisation : déjà présent en prod (ajouté à la main), manquait dans les migrations.
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "relancesRefuseesLe" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Produit" ALTER COLUMN "affiliationActive" SET DEFAULT false;

-- CreateTable
CREATE TABLE "RelanceEnvoyee" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelanceEnvoyee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RelanceEnvoyee_workflowId_cle_key" ON "RelanceEnvoyee"("workflowId", "cle");

-- AddForeignKey
ALTER TABLE "RelanceEnvoyee" ADD CONSTRAINT "RelanceEnvoyee_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AutomationWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

