"use client";
import { exempleTelephone } from "@/lib/devise-convert";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, MessageSquare, Mail, Save } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { Bouton, EnTetePage, EtatErreur, Saisie, Squelette } from "@/components/ui";

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
  const [erreurChargement, setErreurChargement] = useState(false);
  const [pays, setPays] = useState("");

  const charger = () => {
    setErreurChargement(false);
    fetch("/api/tenants/moi-complet").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(tenant => {
      setPays(tenant?.pays ?? "");
      if (tenant?.parametresPaiement) {
        const saved = (tenant.parametresPaiement as any).notifications;
        if (saved) setConfig({ ...DEFAUT, ...saved });
      }
      if (!config.whatsappNumero && tenant?.whatsapp) {
        setConfig(prev => ({ ...prev, whatsappNumero: tenant.whatsapp }));
      }
      if (!config.emailNotif && tenant?.email) {
        setConfig(prev => ({ ...prev, emailNotif: tenant.email }));
      }
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
      toast.success(t("Préférences de notification enregistrées."));
    } catch {
      toast.error(t("Les préférences n'ont pas pu être enregistrées. Vérifiez votre connexion et réessayez."));
    } finally {
      setSaving(false);
    }
  }

  const Interrupteur = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}
      className="relative w-11 h-6 my-2 rounded-full transition-colors flex-shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus before:absolute before:-inset-2 before:content-['']"
      style={{ backgroundColor: checked ? "var(--ax-primaire)" : "var(--ax-bordure-forte)" }}>
      <span className="absolute top-1 transition-[left] rounded-full w-4 h-4 bg-carte shadow" style={{ left: checked ? "calc(100% - 20px)" : "4px" }} />
    </button>
  );
  const CARTE = "rounded-carte border border-bordure bg-carte shadow-carte p-carte space-y-champs";
  const entete = (
    <EnTetePage className="mb-0" titre={t("Notifications")} retour={{ href: "/dashboard/parametres", libelle: t("Réglages") }}
      description={t("Choisissez comment et pour quoi vous êtes prévenu.")} />
  );

  if (erreurChargement) {
    return (
      <div className="space-y-section max-w-2xl">
        {entete}
        <EtatErreur titre={t("Vos préférences n'ont pas pu être chargées.")} texte={t("Vérifiez votre connexion puis réessayez.")} onReessayer={charger} />
      </div>
    );
  }
  if (!loaded) {
    return (
      <div className="space-y-section max-w-2xl" role="status" aria-busy="true">
        {entete}
        <span className="sr-only">{t("Chargement…")}</span>
        <Squelette className="h-32 w-full rounded-carte" />
        <Squelette className="h-32 w-full rounded-carte" />
      </div>
    );
  }

  return (
    <div className="space-y-section max-w-2xl">
      {entete}

      {/* WhatsApp */}
      <section className={CARTE}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-controle bg-succes-fond border border-succes-bordure flex items-center justify-center shrink-0" aria-hidden>
              <MessageSquare size={18} className="text-succes" />
            </div>
            <div className="min-w-0">
              <h2 className="ax-sous-titre">{t("WhatsApp Business")}</h2>
              <p className="ax-aide">{t("Notifications instantanées via WhatsApp")}</p>
            </div>
          </div>
          <Interrupteur label={t("Notifications WhatsApp")} checked={config.whatsappActif} onChange={() => toggle("whatsappActif")} />
        </div>
        {config.whatsappActif && (
          <Saisie type="tel" label={t("Numéro WhatsApp (avec indicatif pays)")} value={config.whatsappNumero}
            onChange={e => setConfig({ ...config, whatsappNumero: e.target.value })} placeholder={exempleTelephone(pays)}
            aide={t("Les notifications seront envoyées sur ce numéro via l'API WhatsApp Business.")} />
        )}
      </section>

      {/* Email */}
      <section className={CARTE}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-controle bg-primaire-fond border border-attention-bordure flex items-center justify-center shrink-0" aria-hidden>
              <Mail size={18} className="text-attention" />
            </div>
            <div className="min-w-0">
              <h2 className="ax-sous-titre">{t("Email")}</h2>
              <p className="ax-aide">{t("Notifications par email")}</p>
            </div>
          </div>
          <Interrupteur label={t("Notifications par email")} checked={config.emailActif} onChange={() => toggle("emailActif")} />
        </div>
        {config.emailActif && (
          <Saisie type="email" label={t("Email de notification")} value={config.emailNotif}
            onChange={e => setConfig({ ...config, emailNotif: e.target.value })} placeholder="moi@maboutique.com" />
        )}
      </section>

      {/* Types de notifications */}
      <section className={CARTE}>
        <h2 className="ax-titre-section flex items-center gap-2"><Bell size={16} className="text-attention" aria-hidden />{t("Alertes activées")}</h2>
        <div className="divide-y divide-bordure">
          {[
            { key: "notifNouvelleCommande", label: "Nouvelle commande", desc: "Alerte dès qu'un client passe une commande" },
            { key: "notifPaiementRecu", label: "Paiement reçu", desc: "Confirmation quand un paiement est validé" },
            { key: "notifNouvelAvis", label: "Nouvel avis client", desc: "Quand un client laisse un avis" },
            { key: "notifStockFaible", label: "Stock faible", desc: `Alerte quand un produit passe sous le seuil défini` },
          ].map(notif => (
            <div key={notif.key} className="flex items-center justify-between gap-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="ax-libelle">{t(notif.label)}</p>
                <p className="ax-aide">{t(notif.desc)}</p>
              </div>
              <Interrupteur label={t(notif.label)}
                checked={config[notif.key as keyof typeof config] as boolean}
                onChange={() => toggle(notif.key as keyof typeof config)}
              />
            </div>
          ))}
        </div>
        {config.notifStockFaible && (
          <Saisie type="number" className="max-w-56 pt-2 border-t border-bordure" label={t("Seuil de stock faible (en unités)")} min={1} max={100} suffixe={t("unités")}
            value={config.notifStockSeuil} onChange={e => setConfig({ ...config, notifStockSeuil: Number(e.target.value) })} />
        )}
      </section>

      <Bouton onClick={sauvegarder} charge={saving} texteCharge={t("Enregistrement…")} icone={<Save size={15} aria-hidden />}>
        {t("Enregistrer les notifications")}
      </Bouton>
    </div>
  );
}
