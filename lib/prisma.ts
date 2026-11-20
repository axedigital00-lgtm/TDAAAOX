// Singleton Prisma Client v7 avec adaptateur pg pour PostgreSQL local
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { contexteWorker } from "./contexte-worker";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function creerPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:Admin@localhost:5432/axso";

  const workers = process.env.AXSO_RUNTIME === "workers";
  if (workers && !process.env.DATABASE_URL) throw new Error("DATABASE_URL est requise sur Workers");
  const adapter = new PrismaPg({ connectionString, ...(workers ? { max: 2, idleTimeoutMillis: 1000 } : {}) });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  } as any);
}

function clientWorker() {
  const contexte = contexteWorker.getStore();
  if (!contexte) throw new Error("Accès PostgreSQL hors requête Worker");
  return contexte.prisma ??= creerPrismaClient();
}

export const prisma = process.env.AXSO_RUNTIME === "workers"
  ? new Proxy({} as PrismaClient, {
      get(_, propriete) {
        const client = clientWorker();
        const valeur = Reflect.get(client, propriete);
        return typeof valeur === "function" ? valeur.bind(client) : valeur;
      },
    })
  : globalForPrisma.prisma ?? creerPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
