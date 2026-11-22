// Flux temps réel d'une course : signale un changement, le client relit alors la vue de son rôle.
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { acteurCourse, refus, sessionLogistique } from "@/lib/logistique/api";

export const dynamic = "force-dynamic";
const limite = rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "logistique-flux" });
const INTERVALLE_MS = 3000, DUREE_MS = 50_000;

async function empreinte(id: string) {
  const [c, p] = await Promise.all([
    prisma.courseLivraison.findUnique({ where: { id }, select: { statut: true, updatedAt: true } }),
    prisma.positionCourse.findFirst({ where: { courseId: id }, orderBy: { captureLe: "desc" }, select: { id: true } }),
  ]);
  return c ? `${c.statut}|${c.updatedAt.getTime()}|${p?.id ?? ""}` : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await sessionLogistique();
  if (!s) return refus();
  const l = limite.check(s.userId);
  if (!l.success) return rateLimitResponse(l.reset);
  const { id } = await params;
  const a = await acteurCourse(id, s, "lecture");
  if (!a || a.type === "systeme") return refus(404, "Course introuvable");

  const encodeur = new TextEncoder();
  let fini = false;
  const flux = new ReadableStream<Uint8Array>({
    async start(c) {
      const envoyer = (x: string) => { if (!fini) c.enqueue(encodeur.encode(x)); };
      const debut = Date.now();
      let derniere = await empreinte(id).catch(() => null);
      envoyer("retry: 4000\n\nevent: pret\ndata: {}\n\n");
      try {
        while (!fini && !req.signal.aborted && Date.now() - debut < DUREE_MS) {
          await new Promise((r) => setTimeout(r, INTERVALLE_MS));
          if (fini || req.signal.aborted) break;
          const e = await empreinte(id);
          if (e == null) break;
          if (e !== derniere) { derniere = e; envoyer("event: change\ndata: {}\n\n"); } else envoyer(": veille\n\n");
        }
      } catch { /* le client se reconnecte */ }
      if (!fini) { fini = true; c.close(); }
    },
    cancel() { fini = true; },
  });
  return new Response(flux, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}
