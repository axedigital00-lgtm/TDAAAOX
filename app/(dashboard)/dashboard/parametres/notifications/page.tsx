"use client";
import { exempleTelephone } from "@/lib/devise-convert";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { EtatErreur } from "@/components/ui";
import { Card, ContextualSaveBar, ResourceList, SettingsRow, SkeletonPage, TextField, Toggle } from "@/components/ui/adm";
import { SectionParametres, SousSection, modifie } from "../ui";

const DEFAUT = {
  whatsappNumero: "",
  emailNotif: "",
  notifNouvelleCommande: true,
  notifPaiementRecu: true,
  notifNouvelAvis: false,
  notifStockFaible: true,
  notifStockSeuil: 5,
  whatsappActif: false,
  emailActif: true,
};

export default function NotificationsPage() {
  const t = useT();
  const [config, setConfig] = useState(DEFAUT);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [enregistre, setEnregistre] = useState<typeof DEFAUT | null>(null);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [pays, setPays] = useState("");

  const charger = () => {
    setErreurChargement(false);
    fetch("/api/tenants/moi-complet").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(tenant => {
      setPays(tenant?.pays ?? "");
      const saved = (tenant?.parametresPaiement as any)?.notifications;
      const c = { ...DEFAUT, ...(saved || {}) };
      if (!c.whatsappNumero && tenant?.whatsapp) c.whatsappNumero = tenant.whatsapp;
      if (!c.emailNotif && tenant?.email) c.emailNotif = tenant.email;
      setConfig(c); setEnregistre(c);
      setLoaded(true);
    }).catch(() => setErreurChargement(true));
  };
  useEffect(charger, []);

  function toggle(key: keyof typeof config) {
    setConfig(prev => ({ ...prev, [key]: !prev[key as keyof typeof config] }));
  }

  async function sauvegarder() {
    setSaving(true);
    try {
      const res = await fetch("/api/tenants/moi-complet").then(r => r.json());
      const paiementActuel = (res?.parametresPaiement as any) || {};
      const maj = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parametresPaiement: { ...paiementActuel, notifications: config },
          whatsapp: config.whatsappNumero || res?.whatsapp,
        }),
      });
      if (!maj.ok) throw new Error();
      setEnregistre(config);
      toast.success(t("Préférences de notification enregistrées."));
    } catch {
      toast.error(t("Les préférences n'ont pas pu être enregistrées. Vérifiez votre connexion et réessayez."));
    } finally {
      setSaving(false);
    }
  }

  const charge = erreurChargement ? (
    <EtatErreur titre={t("Vos préférences n'ont pas pu être chargées.")} texte={t("Vérifiez votre connexion puis réessayez.")} onReessayer={charger} />
  ) : !loaded ? <SkeletonPage label={t("Chargement…")} /> : null;

  return (
    <SectionParametres titre={t("Notifications")} description={t("Choisissez comment et pour quoi vous êtes prévenu.")}>
      <ContextualSaveBar dirty={modifie(config, enregistre)} saving={saving} onSave={sauvegarder} onDiscard={() => enregistre && setConfig(enregistre)} />
      {charge ?? <>
        <SousSection titre={t("Canaux")}>
          <ResourceList>
            <SettingsRow icon="whatsapp" title={t("WhatsApp Business")} subtitle={t("Notifications instantanées via WhatsApp")}
              end={<Toggle label={t("Notifications WhatsApp")} checked={config.whatsappActif} onChange={() => toggle("whatsappActif")} />} />
            <SettingsRow icon="mail" title={t("Email")} subtitle={t("Notifications par email")}
              end={<Toggle label={t("Notifications par email")} checked={config.emailActif} onChange={() => toggle("emailActif")} />} />
          </ResourceList>
          {(config.whatsappActif || config.emailActif) && (
            <Card>
              <div className="flex flex-col gap-4">
                {config.whatsappActif && (
                  <TextField type="tel" label={t("Numéro WhatsApp (avec indicatif pays)")} value={config.whatsappNumero}
                    onChange={e => setConfig({ ...config, whatsappNumero: e.target.value })} placeholder={exempleTelephone(pays)}
                    helpText={t("Les notifications seront envoyées sur ce numéro via l'API WhatsApp Business.")} />
                )}
                {config.emailActif && (
                  <TextField type="email" label={t("Email de notification")} value={config.emailNotif}
                    onChange={e => setConfig({ ...config, emailNotif: e.target.value })} placeholder="moi@maboutique.com" />
                )}
              </div>
            </Card>
          )}
        </SousSection>

        <SousSection titre={t("Alertes activées")}>
          <ResourceList>
            {[
              { key: "notifNouvelleCommande", label: "Nouvelle commande", desc: "Alerte dès qu'un client passe une commande" },
              { key: "notifPaiementRecu", label: "Paiement reçu", desc: "Confirmation quand un paiement est validé" },
              { key: "notifNouvelAvis", label: "Nouvel avis client", desc: "Quand un client laisse un avis" },
              { key: "notifStockFaible", label: "Stock faible", desc: "Alerte quand un produit passe sous le seuil défini" },
            ].map(notif => (
              <SettingsRow key={notif.key} title={t(notif.label)} subtitle={t(notif.desc)}
                end={<Toggle label={t(notif.label)} checked={config[notif.key as keyof typeof config] as boolean} onChange={() => toggle(notif.key as keyof typeof config)} />} />
            ))}
          </ResourceList>
          {config.notifStockFaible && (
            <Card>
              <TextField type="number" className="max-w-56" label={t("Seuil de stock faible (en unités)")} min={1} max={100}
                value={config.notifStockSeuil} onChange={e => setConfig({ ...config, notifStockSeuil: Number(e.target.value) })} />
            </Card>
          )}
        </SousSection>
      </>}
    </SectionParametres>
  );
}
