// État des intégrations : quelles variables d'environnement sont renseignées sur
// ce serveur, et ce que chacune active. Réservé au super-admin ; aucune valeur n'est affichée.
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { getAdminSessionPour } from "@/lib/admin-auth";
import { etatIntegrations } from "@/lib/integrations";
import { getT } from "@/lib/i18n/serveur";
import { EnTetePage, Carte, Badge } from "@/components/command-center/ui";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const session = await getAdminSessionPour("integrations");
  if (!session) redirect("/admin?refus=1");
  const t = await getT();
  const etats = etatIntegrations();
  const manquantes = etats.filter((e) => !e.active);

  const bloquant = manquantes.some((e) => e.indispensable);

  return (
    <div className="space-y-5 max-w-4xl">
      <EnTetePage titre={t("État des intégrations")} sousTitre={t("Ce que ce serveur a de configuré. Les valeurs ne sont jamais affichées : elles se règlent dans Vercel → Settings → Environment Variables, puis un redéploiement.")} />
      <p role={bloquant ? "alert" : undefined} className={`text-[13px] font-semibold ${manquantes.length === 0 ? "cc-good" : bloquant ? "cc-bad" : "cc-warn"}`}>
        {manquantes.length === 0 ? t("Tout est configuré.")
          : bloquant ? t("Une intégration indispensable est incomplète : l'application ne peut pas fonctionner correctement.")
          : t("{0} fonction(s) facultative(s) non configurée(s) : elles sont masquées ou marquées « bientôt disponible » pour les marchands.", manquantes.length)}
      </p>
      <Carte pad={false}>
        <ul className="divide-y cc-sep">
          {etats.map((e) => (
            <li key={e.cle} className="p-4 grid gap-2 md:grid-cols-[1fr_1.4fr_1.2fr] md:gap-4 text-[13px]">
              <div className="flex md:flex-col items-start gap-2 md:gap-1">
                <span className="font-semibold">{t(e.nom)}</span>
                <Badge ton={e.active ? "good" : e.indispensable ? "bad" : "warn"}>{t(e.active ? "Active" : e.indispensable ? "Indispensable · incomplète" : "Facultative · inactive")}</Badge>
              </div>
              <p className="cc-muted">{t(e.fonction)}</p>
              <ul className="space-y-1">
                {e.variables.map((v) => (
                  <li key={v.nom} className={`flex items-center gap-2 min-w-0 ${v.configuree ? "cc-good" : "cc-bad"}`}>
                    {v.configuree ? <CheckCircle2 size={14} className="shrink-0" aria-hidden /> : <XCircle size={14} className="shrink-0" aria-hidden />}
                    <code className="text-[12px] [overflow-wrap:anywhere]">{v.nom}</code>
                    <span className="text-[12px]">{t(v.configuree ? "configurée" : "absente")}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Carte>
    </div>
  );
}
