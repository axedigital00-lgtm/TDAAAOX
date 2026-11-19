-- AlterTable
ALTER TABLE "Produit" ADD COLUMN     "archiveLe" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "etiquettes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "NoteClient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "auteurId" TEXT,
    "auteurNom" TEXT,
    "texte" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VueListe" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ressource" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "params" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VueListe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteClient_tenantId_clientId_createdAt_idx" ON "NoteClient"("tenantId", "clientId", "createdAt");

-- CreateIndex
CREATE INDEX "VueListe_tenantId_userId_ressource_idx" ON "VueListe"("tenantId", "userId", "ressource");

-- AddForeignKey
ALTER TABLE "NoteClient" ADD CONSTRAINT "NoteClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VueListe" ADD CONSTRAINT "VueListe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

