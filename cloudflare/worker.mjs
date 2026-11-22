import handler from "vinext/server/fetch-handler";
import { contexteWorker } from "../lib/contexte-worker";
import schedules from "../vercel.json";

export default {
  fetch(request, env, ctx) {
    return contexteWorker.run({}, () => handler.fetch(request, env, ctx));
  },
  async scheduled(event, env) {
    if (env.AXSO_CRONS_ENABLED !== "1") return;
    // Lancements planifiés : le seul passage fréquent (l'heure annoncée au marchand doit être tenue).
    const job = event.cron === "*/5 * * * *" ? { path: "/api/cron/automatisations", seul: "lancements" } : schedules.crons.find(job => job.schedule === event.cron);
    if (!job || !env.CRON_SECRET) throw new Error("Configuration cron AXSO incomplète");
    const taches = job.seul ? [job.seul] : job.path === "/api/cron/automatisations"
      ? ["automatisations", "relances", "livraisons", "imports", "rappelsLive", "studio", "sousDomaines", "rappelsEssai", "rappelsAbonnement", "rappelsSeances", "adhesions"]
      : [null];
    const echecs = [];
    for (const tache of taches) {
      const url = new URL(job.path, env.AUTH_URL);
      if (tache) url.searchParams.set("tache", tache);
      try {
        const response = await env.SELF.fetch(url, { redirect: "manual", headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
        await response.body?.cancel();
        if (!response.ok) echecs.push(tache ?? job.path);
      } catch { echecs.push(tache ?? job.path); }
    }
    if (echecs.length) throw new Error(`Échec des tâches AXSO : ${echecs.join(", ")}`);
  },
};
