import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { contexteCC } from "@/lib/command-center/serveur";
import { X } from "lucide-react";
import { EnTetePage, Carte, EtatVide, Note } from "@/components/command-center/ui";
import { getT } from "@/lib/i18n/serveur";

const PAR_PAGE = 50;
const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 120) || undefined;

export default async function Audit({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  await contexteCC("audit", sp);
  const t = await getT();
  const action = un(sp.action), admin = un(sp.admin);
  const page = Math.max(1, Math.min(1000, Number(un(sp.page)) || 1));
  // Filtre « action » par préfixe : « reglage » couvre reglage.seuils, reglage.objectifs…
  const where = { ...(action ? { action: { startsWith: action } } : {}), ...(admin ? { adminEmail: admin } : {}) };

  const [lignes, total, actions, admins] = await Promise.all([
    prisma.auditAdmin.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAR_PAGE, take: PAR_PAGE }),
    prisma.auditAdmin.count({ where }),
    prisma.auditAdmin.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" }, take: 200 }),
    prisma.auditAdmin.findMany({ distinct: ["adminEmail"], select: { adminEmail: true }, orderBy: { adminEmail: "asc" }, take: 200 }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
  const href = (p: number, o: { action?: string | null; admin?: string | null } = {}) => {
    const a = o.action === undefined ? action : o.action, m = o.admin === undefined ? admin : o.admin;
    return `/admin/audit?${new URLSearchParams({ ...(a ? { action: a } : {}), ...(m ? { admin: m } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;
  };
  const avantApres = (l: (typeof lignes)[number]) => l.avant == null && l.apres == null ? <span className="cc-faint">—</span> : (
    <details>
      <summary className="cursor-pointer text-[12px] py-1" style={{ color: "var(--cc-accent-text)" }}>{t("Voir avant / après")}</summary>
      <div className="grid gap-2 mt-2 lg:grid-cols-2">
        <div><p className="cc-eyebrow mb-1">{t("Avant")}</p><pre className="text-[11px] whitespace-pre-wrap break-all p-2 rounded max-h-64 overflow-auto" style={{ background: "var(--cc-surface-2)" }}>{json(l.avant)}</pre></div>
        <div><p className="cc-eyebrow mb-1">{t("Après")}</p><pre className="text-[11px] whitespace-pre-wrap break-all p-2 rounded max-h-64 overflow-auto" style={{ background: "var(--cc-surface-2)" }}>{json(l.apres)}</pre></div>
      </div>
    </details>
  );
  const date = (d: Date) => <>{d.toLocaleString(t.loc, { dateStyle: "short", timeStyle: "medium", timeZone: "UTC" })} <span className="cc-faint">UTC</span></>;
  const json = (x: unknown) => (x == null ? "—" : JSON.stringify(x, null, 2));

  return (
    <div className="space-y-5">
      <EnTetePage eyebrow={t("Gouvernance")} titre={t("Journal d'audit")} sousTitre={t("Toutes les actions administratives : réglages, boutiques, plans, retraits, équipe, rapports envoyés.")} />
      <Note>{t("Données réelles uniquement, quel que soit le filtre de source. Le journal est en lecture seule.")}</Note>

      <form method="get" className="flex flex-wrap items-end gap-2 cc-no-print" aria-label={t("Filtrer le journal")}>
        <label className="grid gap-1 text-[12px] cc-muted">{t("Action")}
          <select name="action" defaultValue={action ?? ""} className="cc-select min-w-[200px] h-10 sm:h-8">
            <option value="">{t("Toutes")}</option>
            {action && !actions.some((a) => a.action === action) && <option value={action}>{action}…</option>}
            {actions.map((a) => <option key={a.action} value={a.action}>{a.action}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-[12px] cc-muted">{t("Administrateur")}
          <select name="admin" defaultValue={admin ?? ""} className="cc-select min-w-[200px] h-10 sm:h-8">
            <option value="">{t("Tous")}</option>
            {admins.map((a) => <option key={a.adminEmail} value={a.adminEmail}>{a.adminEmail}</option>)}
          </select>
        </label>
        <button className="cc-btn cc-btn-sm h-10 sm:h-8">{t("Filtrer le journal")}</button>
        <span className="cc-faint text-[12px] ml-auto">{t(total > 1 ? "{0} entrées" : "{0} entrée", total.toLocaleString(t.loc))}</span>
      </form>
      {(action || admin) && (
        <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
          <span className="cc-faint">{t("Filtré :")}</span>
          {action && <Link href={href(1, { action: null })} className="cc-badge cc-badge-accent" aria-label={t("Retirer le filtre {0}", action)}>{t("Action")} : {action} <X size={11} aria-hidden /></Link>}
          {admin && <Link href={href(1, { admin: null })} className="cc-badge cc-badge-accent" aria-label={t("Retirer le filtre {0}", admin)}>{admin} <X size={11} aria-hidden /></Link>}
          <Link href="/admin/audit" className="underline cc-muted">{t("Tout effacer")}</Link>
        </div>
      )}

      <Carte pad={false}>
        {!lignes.length ? <EtatVide titre={t(action || admin ? "Aucune action ne correspond à ces filtres." : "Aucune action enregistrée pour l'instant.")} explication={t(action || admin ? "Retirez un filtre pour élargir la recherche." : "Les actions des administrateurs (réglages, boutiques, retraits, équipe…) apparaîtront ici.")} action={action || admin ? <Link href="/admin/audit" className="cc-btn cc-btn-sm">{t("Voir tout le journal")}</Link> : undefined} /> : (
          <>
          <ul className="md:hidden divide-y cc-sep">
            {lignes.map((l) => (
              <li key={l.id} className="p-4 space-y-1 text-[12.5px]">
                <p className="flex flex-wrap items-center justify-between gap-2"><code className="text-[12px]">{l.action}</code><span className="cc-num text-[11.5px]">{date(l.createdAt)}</span></p>
                <p className="[overflow-wrap:anywhere]">{l.adminEmail}</p>
                <p className="cc-muted [overflow-wrap:anywhere]">{l.entite}{l.entiteId ? ` · ${l.entiteId}` : ""}{l.ip ? ` · IP ${l.ip}` : ""}</p>
                {avantApres(l)}
              </li>
            ))}
          </ul>
          <div className="hidden md:block overflow-x-auto">
            <table className="cc-table">
              <thead><tr><th>{t("Date")}</th><th>{t("Administrateur")}</th><th>{t("Action")}</th><th>{t("Entité")}</th><th>ID</th><th>IP</th><th>{t("Avant / après")}</th></tr></thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="whitespace-nowrap cc-num">{date(l.createdAt)}</td>
                    <td className="max-w-[200px] truncate" title={l.adminEmail}>{l.adminEmail}</td>
                    <td><code className="text-[12px]">{l.action}</code></td>
                    <td>{l.entite}</td>
                    <td className="max-w-[160px] truncate cc-faint" title={l.entiteId ?? ""}>{l.entiteId ?? "—"}</td>
                    <td className="cc-faint whitespace-nowrap">{l.ip ?? "—"}</td>
                    <td className="min-w-[160px]">{avantApres(l)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Carte>
      {pages > 1 && (
        <nav className="flex items-center justify-end gap-2 text-[12px]" aria-label={t("Pagination")}>
          {page > 1 ? <Link href={href(page - 1)} className="cc-btn cc-btn-sm">{t("Précédent")}</Link> : <span className="cc-btn cc-btn-sm opacity-50" aria-disabled>{t("Précédent")}</span>}
          <span className="cc-faint">{t("Page {0} / {1}", page, pages)}</span>
          {page < pages ? <Link href={href(page + 1)} className="cc-btn cc-btn-sm">{t("Suivant")}</Link> : <span className="cc-btn cc-btn-sm opacity-50" aria-disabled>{t("Suivant")}</span>}
        </nav>
      )}
    </div>
  );
}
