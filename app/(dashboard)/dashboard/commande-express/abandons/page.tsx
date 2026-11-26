"use client";
// Formulaires Releasit COD AXSO abandonnés : relances WhatsApp automatiques (délais et message réglables),
// relance ou appel en un geste, commandes récupérées et CA récupéré sur 30 jours.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader, Card, Badge, Button, Banner, Toggle, Icon } from "@/components/dashboard/design-system";
import { OngletsCommandeExpress } from "@/components/dashboard/commande-express/OngletsApp";
import { useT } from "@/components/I18nProvider";
import { formatMontant } from "@/lib/utils";

type Relances = { actif: boolean; etapes: number[]; message: string };
type Abandon = { id: string; nom: string | null; telephone: string; produit: string | null; quantite: number; montant: number | null; relances: number; derniereRelance: string | null; createdAt: string; commande: { id: string; numero: string; montantTotal: number } | null; lienWhatsApp: string; lienAppel: string };
type Donnees = { relances: Relances; devise: string; stats: { total: number; recuperees: number; apresRelance: number; caRecupere: number }; abandons: Abandon[] };

const DELAIS = [{ v: 15, l: "15 min" }, { v: 60, l: "1 h" }, { v: 120, l: "2 h" }, { v: 360, l: "6 h" }, { v: 1440, l: "24 h" }, { v: 2880, l: "48 h" }];

export default function AbandonsPage() {
  const t = useT();
  const [d, setD] = useState<Donnees | null>(null);
  const [cfg, setCfg] = useState<Relances | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const charger = useCallback(() => fetch("/api/commande-express/abandons").then((r) => (r.ok ? r.json() : null)).then((x) => { if (x) { setD(x); setCfg(x.relances); } }), []);
  useEffect(() => { charger(); }, [charger]);

  const enregistrer = async (maj: Relances) => {
    setEnvoi(true);
    try {
      const r = await fetch("/api/commande-express/abandons", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(maj) });
      const x = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(x.error ?? "Enregistrement impossible");
      toast.success(t(maj.actif ? "Relances automatiques activées" : "Réglages enregistrés")); await charger();
    } catch (e) { toast.error(t(e instanceof Error ? e.message : "Enregistrement impossible")); }
    finally { setEnvoi(false); }
  };
  const relanceManuelle = async (a: Abandon) => {
    window.open(a.lienWhatsApp, "_blank", "noopener");
    await fetch("/api/commande-express/abandons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id }) });
    charger();
  };

  if (!d || !cfg) return <Page width="narrow"><PageHeader icon="history" title={t("Abandons")} /><Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement...")}</p></Card></Page>;
  const taux = d.stats.total ? Math.round((d.stats.recuperees / d.stats.total) * 100) : null;

  return (
    <Page width="narrow">
      <PageHeader icon="history" title={t("Abandons")} backHref="/dashboard/commande-express" />
      <OngletsCommandeExpress />
      <div style={{ display: "grid", gap: "var(--space-400)", marginTop: "var(--space-400)" }}>
        <Card title={t("30 derniers jours")}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
            {[[String(d.stats.total), "Formulaires abandonnés"], [String(d.stats.recuperees), "Récupérés"], [taux === null ? "-" : `${taux} %`, "Taux de récupération"], [formatMontant(d.stats.caRecupere, d.devise), "CA récupéré"]].map(([v, l]) => (
              <div key={l}><div style={{ fontSize: 22, fontWeight: 700 }}>{v}</div><div className="axd-muted" style={{ fontSize: 13 }}>{t(l)}</div></div>
            ))}
          </div>
        </Card>

        <Card title={t("Relances automatiques sur WhatsApp")} actions={<Toggle checked={cfg.actif} disabled={envoi} label={t("Relances automatiques")} onChange={(v) => enregistrer({ ...cfg, actif: v })} />}>
          <div style={{ display: "grid", gap: 12 }}>
            <Banner tone="info">{t("Un client qui a rempli son nom et son numéro sans commander reçoit votre message aux délais choisis. Les relances s'arrêtent dès qu'il commande. Il faut que WhatsApp Business soit relié à AXSO ; sinon, relancez à la main depuis la liste.")}</Banner>
            <div style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>{t("Délais des relances (3 au maximum)")}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DELAIS.map((x) => {
                  const pris = cfg.etapes.includes(x.v);
                  return <button key={x.v} type="button" className={`axd-btn axd-btn--sm${pris ? " axd-btn--primary" : ""}`} onClick={() => {
                    const etapes = pris ? cfg.etapes.filter((e) => e !== x.v) : [...cfg.etapes, x.v].sort((a, b) => a - b).slice(0, 3);
                    if (etapes.length) setCfg({ ...cfg, etapes });
                  }}>{t(x.l)}</button>;
                })}
              </div>
            </div>
            <label style={{ display: "grid", gap: 6 }}><span style={{ fontWeight: 600, fontSize: 13.5 }}>{t("Message ({nom}, {produit}, {boutique}, {lien})")}</span>
              <textarea className="axd-input" rows={4} maxLength={500} value={cfg.message} onChange={(e) => setCfg({ ...cfg, message: e.target.value })} style={{ minHeight: 96, padding: 10 }} /></label>
            <div><Button variant="primary" loading={envoi} onClick={() => enregistrer(cfg)}>{t("Enregistrer")}</Button></div>
          </div>
        </Card>

        <Card title={t("Formulaires abandonnés")} padding="none">
          {!d.abandons.length ? <div style={{ padding: 16 }}><p className="axd-muted" style={{ margin: 0 }}>{t("Aucun pour l'instant. Ils apparaissent dès qu'un client remplit son nom et son numéro sans commander.")}</p></div> : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {d.abandons.map((a) => (
                <li key={a.id} style={{ borderTop: "1px solid var(--color-border-secondary)", padding: "12px 16px", display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{a.nom || a.telephone}</div>
                      <div className="axd-muted" style={{ fontSize: 13 }}>{[a.produit && `${a.quantite} × ${a.produit}`, a.telephone, new Date(a.createdAt).toLocaleString(t.loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })].filter(Boolean).join(" · ")}</div>
                    </div>
                    {a.montant ? <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{formatMontant(a.montant, d.devise)}</span> : null}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {a.commande ? <Link href={`/dashboard/commandes/${a.commande.id}`}><Badge tone="success">{t("Récupéré · #{0}", a.commande.numero)}</Badge></Link>
                      : <Badge tone={a.relances ? "info" : "warning"}>{a.relances ? t("{0} relance(s)", a.relances) : t("Pas encore relancé")}</Badge>}
                    <span style={{ flex: 1 }} />
                    {!a.commande && <>
                      <Button size="sm" onClick={() => relanceManuelle(a)}><Icon name="whatsapp" />WhatsApp</Button>
                      <a className="axd-btn axd-btn--sm" href={a.lienAppel}>{t("Appeler")}</a>
                    </>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}
