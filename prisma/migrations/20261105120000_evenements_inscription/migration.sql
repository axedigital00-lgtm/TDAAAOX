-- Analytics anonyme du parcours d'inscription marchand (une ligne par vue / choix / abandon d'étape).
-- CreateTable
CREATE TABLE "EvenementInscription" (
    "id" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "etape" TEXT NOT NULL,
    "valeur" TEXT,
    "dureeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvenementInscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvenementInscription_createdAt_idx" ON "EvenementInscription"("createdAt");

-- CreateIndex
CREATE INDEX "EvenementInscription_session_idx" ON "EvenementInscription"("session");
