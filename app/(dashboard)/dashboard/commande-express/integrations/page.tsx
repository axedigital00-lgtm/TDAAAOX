"use client";
// Intégrations Releasit COD AXSO : conversions envoyées depuis le serveur à Meta et TikTok (en plus du pixel
// du navigateur, sans doublon), moment de l'achat (création ou confirmation), événement de test.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader, Card, Badge, Button, Banner } from "@/components/dashboard/design-system";
import { OngletsCommandeExpress } from "@/components/dashboard/commande-express/OngletsApp";
import { useT } from "@/components/I18nProvider";

type Etat = { metaPixels: string[]; tiktokPixels: string[]; metaConfigure: boolean; tiktokConfigure: boolean; metaTestCode: string; modePurchase: "creation" | "confirmation" };

export default function IntegrationsPage() {
  const t = useT();
  const [e, setE] = useState<Etat | null>(null);
  const [meta, setMeta] = useState(""), [tiktok, setTiktok] = useState(""), [code, setCode] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const charger = useCallback(() => fetch("/api/commande-express/integrations").then((r) => (r.ok ? r.json() : null)).then((x) => { if (x) { setE(x); setCode(x.metaTestCode); } }), []);
  useEffect(() => { charger(); }, [charger]);

  const appel = async (init: RequestInit, ok: string) => {
    setEnvoi(true);
    try {
      const r = await fetch("/api/commande-express/integrations", { ...init, headers: { "Content-Type": "application/json" } });
      const x = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(x.error ?? "Enregistrement impossible");
      return x;
    } catch (err) { toast.error(t(err instanceof Error ? err.message : "Enregistrement impossible")); return null; }
    finally { setEnvoi(false); if (ok) await charger(); }
  };
  const enregistrer = async (maj: Record<string, string>) => {
    const x = await appel({ method: "PATCH", body: JSON.stringify(maj) }, "ok");
    if (x) { toast.success(t("Intégration enregistrée")); setMeta(""); setTiktok(""); }
  };
  const tester = async () => {
    const x = await appel({ method: "POST" }, "");
    if (!x) return;
    const r = Object.entries(x.resultats as Record<string, { ok: boolean; detail?: string }>);
    const ko = r.filter(([, v]) => !v.ok);
    if (!ko.length) toast.success(t("Événement de test envoyé : vérifiez-le dans le Gestionnaire d'événements"));
    else toast.error(`${ko.map(([k]) => k).join(", ")} : ${ko[0][1].detail ?? ""}`.slice(0, 220));
  };

  if (!e) return <Page width="narrow"><PageHeader icon="link" title={t("Intégrations")} /><Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement...")}</p></Card></Page>;

  return (
    <Page width="narrow">
      <PageHeader icon="link" title={t("Intégrations")} backHref="/dashboard/commande-express" />
      <OngletsCommandeExpress />
      <div style={{ display: "grid", gap: "var(--space-400)", marginTop: "var(--space-400)" }}>
        <Banner tone="info" title={t("Vos publicités apprennent de chaque vente")}>
          {t("En plus du pixel du navigateur (souvent bloqué), AXSO envoie la vente directement à Meta et TikTok. Le même n° de commande sert d'identifiant : la vente n'est jamais comptée deux fois.")}
        </Banner>

        <Card title={t("Moment de l'achat")}>
          <div style={{ display: "grid", gap: 8 }}>
            {(["creation", "confirmation"] as const).map((m) => (
              <label key={m} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 10, borderRadius: 10, border: "1px solid var(--color-border-secondary)", cursor: "pointer" }}>
                <input type="radio" name="mode" checked={e.modePurchase === m} onChange={() => enregistrer({ modePurchase: m })} style={{ marginTop: 3 }} />
                <span><b>{t(m === "creation" ? "À la commande" : "À la confirmation (recommandé en paiement à la livraison)")}</b><br />
                  <span className="axd-muted" style={{ fontSize: 13 }}>{t(m === "creation" ? "L'achat est envoyé dès que le client valide le formulaire." : "Le navigateur envoie un « Lead » ; l'achat part quand votre équipe confirme la commande au téléphone. La publicité apprend des vrais acheteurs, pas des faux numéros.")}</span></span>
              </label>
            ))}
          </div>
        </Card>

        {([["meta", "Meta (Facebook, Instagram)", e.metaPixels, e.metaConfigure, meta, setMeta, "Jeton d'accès de l'API Conversions (Gestionnaire d'événements → Paramètres)"], ["tiktok", "TikTok", e.tiktokPixels, e.tiktokConfigure, tiktok, setTiktok, "Jeton d'accès de l'Events API (TikTok Events Manager → Paramètres)"]] as const).map(([id, nom, pixels, configure, valeur, setValeur, aide]) => (
          <Card key={id} title={nom} actions={<Badge tone={configure && pixels.length ? "success" : "neutral"}>{t(configure && pixels.length ? "Connecté" : "Non connecté")}</Badge>}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 13.5 }}>{pixels.length ? <><span className="axd-muted">{t("Pixel(s)")} :</span> {pixels.join(", ")}</> : <span className="axd-muted">{t("Aucun pixel : ajoutez-le d'abord dans")} <Link href="/dashboard/marketing/tracking">{t("Marketing → Suivi")}</Link>.</span>}</div>
              <label style={{ display: "grid", gap: 6 }}><span style={{ fontWeight: 600, fontSize: 13.5 }}>{t(aide)}</span>
                <input className="axd-input" type="password" autoComplete="off" placeholder={t(configure ? "Jeton enregistré (laisser vide pour le garder)" : "Collez le jeton ici")} value={valeur} onChange={(x) => setValeur(x.target.value)} /></label>
              {id === "meta" && <label style={{ display: "grid", gap: 6 }}><span style={{ fontWeight: 600, fontSize: 13.5 }}>{t("Code de test (facultatif, ex. TEST12345)")}</span>
                <input className="axd-input" maxLength={40} value={code} onChange={(x) => setCode(x.target.value)} /></label>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button variant="primary" disabled={envoi} onClick={() => enregistrer(id === "meta" ? { metaToken: meta, metaTestCode: code } : { tiktokToken: tiktok })}>{t("Enregistrer")}</Button>
                {configure && <Button variant="plain" disabled={envoi} onClick={() => { if (confirm(t("Retirer ce jeton ?"))) enregistrer(id === "meta" ? { metaToken: "-" } : { tiktokToken: "-" }); }}>{t("Retirer le jeton")}</Button>}
              </div>
            </div>
          </Card>
        ))}

        <Card title={t("Vérifier")}>
          <div style={{ display: "grid", gap: 8 }}>
            <p className="axd-muted" style={{ margin: 0, fontSize: 13.5 }}>{t("Envoie un achat d'essai (1 FCFA, n° TEST-…) à chaque plateforme connectée. Avec un code de test Meta, il apparaît dans l'onglet « Tester les événements ».")}</p>
            <div><Button disabled={envoi || !(e.metaConfigure || e.tiktokConfigure)} onClick={tester}>{t("Envoyer un événement de test")}</Button></div>
          </div>
        </Card>
      </div>
    </Page>
  );
}
