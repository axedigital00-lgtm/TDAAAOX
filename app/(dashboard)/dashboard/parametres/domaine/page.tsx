"use client";
// Domaine personnalisé — état réel lu chez l'hébergeur (Vercel ou Cloudflare for SaaS) via /api/domaine (lib/domaines.ts).
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Card, Field } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { useT } from "@/components/I18nProvider";
import { urlBoutique } from "@/lib/utils";

type Enregistrement = { type: string; nom: string; valeur: string; raison: string };
type Etat = { actif: boolean; verifie: boolean; dnsOk: boolean; enregistrements: Enregistrement[]; message?: string };
type Donnees = { slug?: string; sousDomaineAt?: string | null; publiee?: boolean; configure: boolean; hebergeur?: "vercel" | "cloudflare"; domaine: string | null; etat?: Etat | null };

function copier(texte: string, message: string) {
  navigator.clipboard?.writeText(texte).then(() => toast.success(message)).catch(() => {});
}

export default function DomainePage() {
  const t = useT();
  const [d, setD] = useState<Donnees | null>(null);
  const [saisie, setSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [verif, setVerif] = useState(false);
  const [origine, setOrigine] = useState("");

  const charger = useCallback(async (verifier = false) => {
    const r = await fetch(`/api/domaine${verifier ? "?verifier=1" : ""}`);
    const j = await r.json();
    if (!r.ok) { toast.error(t(j.error) ?? t("Chargement impossible")); return null; }
    setD(j); return j as Donnees;
  }, []);

  useEffect(() => { setOrigine(window.location.origin); charger(); }, [charger]);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!saisie.trim()) return;
    setEnvoi(true);
    try {
      const r = await fetch("/api/domaine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domaine: saisie }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      toast.success(t("Domaine ajouté — créez maintenant les enregistrements DNS ci-dessous"));
      setSaisie(""); await charger();
    } catch (err) { toast.error(err instanceof Error && err.message ? t(err.message) : t("Enregistrement impossible")); } finally { setEnvoi(false); }
  }

  async function verifier() {
    setVerif(true);
    const j = await charger(true);
    setVerif(false);
    if (j?.etat?.actif) toast.success(t("Domaine actif !"));
    else if (j?.etat) toast.message(t("Pas encore prêt"), { description: t("Le DNS peut mettre de quelques minutes à 48 h à se propager.") });
  }

  async function retirer() {
    if (!confirm(t("Retirer {0} ? La boutique restera accessible sur son adresse AXSO.", d?.domaine))) return;
    const r = await fetch("/api/domaine", { method: "DELETE" });
    if (r.ok) { toast.success(t("Domaine retiré")); charger(); } else toast.error(t("Suppression impossible"));
  }

  const adresseAxso = d?.slug ? urlBoutique({ slug: d.slug, sousDomaineAt: d.sousDomaineAt }, "", origine) : "…"; // adresse AXSO (hors domaine personnalisé)
  const etat = d?.etat;

  return (
    <Page width="narrow">
      <PageHeader icon="globe" title={t("Domaines")} backHref="/dashboard/parametres" />
      <div className="axd-stack">
        <Card title={t("Adresse AXSO de la boutique")}>
          <p style={{ margin: 0, fontFamily: "ui-monospace, monospace", overflowWrap: "anywhere" }}>{adresseAxso}</p>
          <p className="axd-muted" style={{ fontSize: 12, margin: "6px 0 0" }}>{t("Toujours disponible, même avec un domaine personnalisé.")}</p>
        </Card>

        {!d ? (
          <Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement…")}</p></Card>
        ) : !d.configure ? (
          <Banner tone="warning" title={t("Domaines personnalisés non activés sur ce serveur.")}>
            {d.hebergeur === "cloudflare"
              ? <>{t("L'administrateur doit renseigner")} <code>CF_SAAS_ZONE_ID</code>, <code>CF_SAAS_TARGET</code>, <code>CF_SAAS_READ_TOKEN</code> {t("(et")} <code>CF_SAAS_EDIT_TOKEN</code> {t("pour l'enregistrement automatique).")}</>
              : <>{t("L'administrateur doit renseigner")} <code>VERCEL_API_TOKEN</code> {t("et")} <code>VERCEL_PROJECT_ID</code>.</>}
          </Banner>
        ) : !d.domaine ? (
          <Card title={t("Connecter un domaine")}>
            <form onSubmit={enregistrer} style={{ display: "grid", gap: "var(--space-300)" }}>
              <Field label={t("Votre domaine")} help={t("Conseil : un sous-domaine (boutique.…, shop.…) est le plus simple. Vous devez déjà posséder ce domaine chez un registraire (OVH, Namecheap, GoDaddy…).")}>
                {(p) => <input {...p} className="axd-input" value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder={t("boutique.mondomaine.com")} inputMode="url" autoCapitalize="none" />}
              </Field>
              {!d.publiee && <Banner tone="warning">{t("Votre boutique est en brouillon : le domaine l'affichera une fois la boutique publiée.")}</Banner>}
              <div><Button variant="primary" type="submit" loading={envoi} disabled={!saisie.trim()}>{t("Connecter ce domaine")}</Button></div>
            </form>
          </Card>
        ) : (
          <>
            <Card title={t("Domaine personnalisé")} actions={<Badge tone={etat?.actif ? "success" : "attention"}>{etat?.actif ? t("Actif") : t("En attente du DNS")}</Badge>}>
              <a href={`https://${d.domaine}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "ui-monospace, monospace", overflowWrap: "anywhere", textDecoration: "underline" }}>{d.domaine}</a>
              {etat?.message && <p style={{ margin: "8px 0 0", color: "var(--color-critical-text)", fontSize: 13 }}>{t(etat.message)}</p>}
              {etat && !etat.actif && (
                <ul className="axd-muted" style={{ fontSize: 13, margin: "10px 0 0", paddingLeft: 18 }}>
                  <li>{etat.dnsOk ? t("Routage (A / CNAME) détecté") : t("Routage (A / CNAME) pas encore détecté")}</li>
                  <li>{etat.verifie ? t("Propriété du domaine vérifiée") : t("Propriété du domaine pas encore vérifiée")}</li>
                </ul>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: "var(--space-400)", flexWrap: "wrap" }}>
                <Button onClick={verifier} loading={verif}>{t("Vérifier maintenant")}</Button>
                <Button variant="plain" onClick={retirer}>{t("Retirer le domaine")}</Button>
              </div>
            </Card>

            {etat && !etat.actif && etat.enregistrements.length > 0 && (
              <Card title={t("À créer chez votre registraire")} padding="none">
                <p className="axd-muted" style={{ margin: "4px var(--space-400) var(--space-300)" }}>{t("Dans la zone DNS de votre domaine, ajoutez exactement ces enregistrements :")}</p>
                <table className="axd-ix">
                  <thead><tr><th>{t("Type")}</th><th>{t("Nom")}</th><th>{t("Valeur")}</th></tr></thead>
                  <tbody>
                    {etat.enregistrements.map((e, i) => (
                      <tr key={i}>
                        <td className="axd-ix-primary">{e.type}<div className="axd-muted" style={{ fontWeight: 400, fontSize: 12, whiteSpace: "normal" }}>{t(e.raison)}</div></td>
                        <td><button type="button" className="axd-btn axd-btn--plain axd-btn--sm" onClick={() => copier(e.nom, t("Copié"))} style={{ fontFamily: "ui-monospace, monospace", whiteSpace: "normal", textAlign: "left" }}>{e.nom} <Copy size={11} /></button></td>
                        <td><button type="button" className="axd-btn axd-btn--plain axd-btn--sm" onClick={() => copier(e.valeur, t("Copié"))} style={{ fontFamily: "ui-monospace, monospace", whiteSpace: "normal", wordBreak: "break-all", textAlign: "left" }}>{e.valeur} <Copy size={11} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: "var(--space-300) var(--space-400)" }}>
                  <Banner>{t("La propagation prend de quelques minutes à 48 h. Le certificat HTTPS est ensuite créé automatiquement. Cliquez sur « Vérifier maintenant » pour suivre l'avancement.")}</Banner>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </Page>
  );
}
