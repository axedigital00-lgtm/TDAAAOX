import { AsyncLocalStorage } from "node:async_hooks";
import type { PrismaClient } from "@prisma/client";

// Vite peut charger plusieurs copies du module dans le même isolate.
const shared = globalThis as typeof globalThis & { axsoWorkerContext?: AsyncLocalStorage<{ prisma?: PrismaClient }> };
export const contexteWorker = shared.axsoWorkerContext ??= new AsyncLocalStorage<{ prisma?: PrismaClient }>();
