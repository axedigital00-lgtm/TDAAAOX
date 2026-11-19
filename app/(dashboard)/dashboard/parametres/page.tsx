"use client";
// Paramètres › Général (masterprompt §9.2-1) : identité, coordonnées (#coordonnees, étape de Démarrer),
// pays et devise, numéro WhatsApp Business. Paiements et formulaire de commande : sections dédiées.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings, MessageCircle, ClipboardList, CreditCard, Bell } from "lucide-react";
import { PAYS_DEVISES, PAYS_OPTIONS } from "@/lib/ai-agent";
import { SelectPays } from "@/components/ui/SelectPays";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";
import { urlBoutique } from "@/lib/utils";
import { EtatErreur, useConfirmation } from "@/components/ui";
import { Button, Card, ContextualSaveBar, Field, Select, SettingsRow, ResourceList, SkeletonPage, TextField, Textarea } from "@/components/ui/adm";
import { SectionParametres, SousSection, modifie } from "./ui";

const PARAMETRES_TUTORIAL_STEPS = [
  { Icon: Settings,      titre: "Vos informations générales", description: "Nom, description, catégorie, pays et devise — la base de votre identité sur Axso." },
  { Icon: MessageCircle, titre: "Numéro WhatsApp Business",    description: "Ce numéro recevra les confirmations de commandes pour vos produits physiques et dropshipping." },
  { Icon: ClipboardList, titre: "Formulaire de commande",       description: "Choisissez les informations demandées à l'acheteur qui commande sans passer par WhatsApp (email, GPS, champ personnalisé)." },
  { Icon: CreditCard,    titre: "Moyens de paiement",           description: "Paiement à la livraison, commande WhatsApp : choisissez ce que vous acceptez, et pour quels pays." },
  { Icon: Bell,          titre: "Domaine, notifications, équipe", description: "Retrouvez ici les réglages avancés : domaine personnalisé, alertes et accès de vos collaborateurs." },
];

const CATEGORIES = ["Mode & Vêtements", "Électronique", "Alimentation", "Beauté & Cosmétiques", "Maison & Décoration", "Sport & Loisirs", "Livres & Culture", "Artisanat", "Services", "Autre"];

type Formulaire = {
  nomBoutique: string; description: string; whatsapp: string; telephone: string; adresse: string; email: string; horaires: string;
  categorie: string; pays: string; devise: string; whatsappNumero: string;
};
const VIDE: Formulaire = { nomBoutique: "", description: "", whatsapp: "", telephone: "", adresse: "", email: "", horaires: "", categorie: "", pays: "", devise: "XOF", whatsappNumero: "" };

export default function ParametresPage() {
  const t = useT();
  const { confirmer, dialogue } = useConfirmation();
  const [tenant, setTenant] = useState<any>(null);
  const [form, setForm] = useState<Formulaire>(VIDE);
  const [enregistre, setEnregistre] = useState<Formulaire | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [erreurWhatsapp, setErreurWhatsapp] = useState("");
  const [etat, setEtat] = useState<"chargement" | "pret" | "erreur">("chargement");

  const charger = () => {
    setEtat("chargement");
    fetch("/api/tenants/moi-complet").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => {
      setEtat("pret");
      if (!data) return;
      setTenant(data);
      const f: Formulaire = {
        nomBoutique: data.nomBoutique || "", description: data.description || "",
        whatsapp: data.whatsapp || "", telephone: data.telephone || "",
        adresse: data.adresse || "", email: data.email || "", horaires: data.horaires || "",
        // Anciennes boutiques : pays enregistré en toutes lettres ("Cameroun") → code ISO2.
        categorie: data.categorie || "", pays: PAYS_OPTIONS.find(p => p.nom === data.pays)?.code ?? data.pays ?? "", devise: data.devise || "XOF",
        whatsappNumero: data.whatsappNumero || "",
      };
      setForm(f); setEnregistre(f);
    }).catch(() => setEtat("erreur"));
  };
  useEffect(charger, []);

  const maj = (champ: keyof Formulaire, valeur: string) => setForm(f => ({ ...f, [champ]: valeur }));

  async function sauvegarder() {
    if (!enregistre) return;
    const { whatsappNumero, ...infos } = form;
    const { whatsappNumero: numeroAvant, ...infosAvant } = enregistre;
    const changeNumero = whatsappNumero !== numeroAvant;
    if (changeNumero && whatsappNumero && !/^\+\d+$/.test(whatsappNumero)) {
      setErreurWhatsapp(t("Le numéro doit commencer par + suivi de chiffres (ex: +22507XXXXXXXX)"));
      return;
    }
    const changeInfos = modifie(infos, infosAvant);
    const changeDevise = changeInfos && !!tenant?.devise && form.devise !== tenant.devise;
    if (changeDevise && !(await confirmer({
      titre: t("Changer la devise de la boutique ?"),
      objet: `${tenant.devise} → ${form.devise}`,
      description: t("Tous les montants de la boutique seront convertis au taux du jour : prix des produits et variantes, frais de livraison, codes promo, commandes, commissions et solde du wallet (les factures déjà émises restent inchangées)."),
      libelleConfirmer: t("Convertir en {0}", form.devise),
      destructive: false,
    }))) return;
    setSaving(true);
    try {
      if (changeInfos) {
        const res = await fetch("/api/tenants", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(infos) });
        if (!res.ok) throw new Error();
      }
      if (changeNumero) {
        const res = await fetch("/api/tenant/whatsapp", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ whatsappNumero }) });
        if (!res.ok) throw new Error();
      }
      setEnregistre(form);
      toast.success(changeDevise ? t("Devise changée : tous vos montants sont maintenant en {0}", form.devise) : t("Informations mises à jour !"));
      if (changeDevise) setTimeout(() => window.location.reload(), 900); // tout le dashboard passe dans la nouvelle devise
    } catch { toast.error(t("Les informations n'ont pas pu être enregistrées. Vérifiez votre connexion et réessayez.")); }
    finally { setSaving(false); }
  }

  function copier(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const [origine, setOrigine] = useState("");
  useEffect(() => setOrigine(window.location.origin), []);
  const boutiqueUrl = tenant && origine ? urlBoutique(tenant, "", origine) : "";

  return (
    <SectionParametres titre={t("Général")} actions={<BoutonRevoirTutoriel moduleKey="parametres" />}>
      <ModuleTutorial moduleKey="parametres" titre={t("Réglages")} sousTitre={t("Configuration de votre boutique")} steps={PARAMETRES_TUTORIAL_STEPS} />
      {dialogue}
      <ContextualSaveBar dirty={modifie(form, enregistre)} saving={saving} onSave={sauvegarder}
        onDiscard={() => { if (enregistre) setForm(enregistre); setErreurWhatsapp(""); }} />

      {etat === "chargement" && <SkeletonPage label={t("Chargement de vos réglages…")} />}
      {etat === "erreur" && <EtatErreur titre={t("Vos réglages n'ont pas pu être chargés.")} texte={t("Vérifiez votre connexion puis réessayez.")} onReessayer={charger} />}
      {etat === "pret" && <>
        {tenant && (
          <ResourceList>
            <SettingsRow icon="globe" title={t("Votre boutique en ligne")} subtitle={<span className="font-mono">{boutiqueUrl}</span>}
              end={<>
                <Button size="sm" onClick={() => copier(boutiqueUrl)}>{copied ? t("Copié") : t("Copier le lien")}</Button>
                <a href={urlBoutique(tenant)} target="_blank" rel="noopener noreferrer" className="text-(--color-link) hover:underline">{t("Voir ma boutique")}</a>
              </>} />
          </ResourceList>
        )}

        <SousSection titre={t("Informations sur la boutique")} description={t("Nom, description et catégorie affichés sur votre boutique.")}>
          <Card>
            <div className="flex flex-col gap-4">
              <TextField label={t("Nom de la boutique")} required value={form.nomBoutique} onChange={e => maj("nomBoutique", e.target.value)} />
              <Textarea label={t("Description")} rows={3} value={form.description} onChange={e => maj("description", e.target.value)} placeholder={t("Décrivez votre boutique en quelques mots…")} />
              <Select label={t("Catégorie")} value={form.categorie} onChange={e => maj("categorie", e.target.value)}
                options={[{ value: "", label: t("Choisir une catégorie") }, ...CATEGORIES.map(c => ({ value: c, label: t(c) }))]} />
            </div>
          </Card>
        </SousSection>

        <SousSection id="coordonnees" titre={t("Coordonnées")} description={t("Affichées sur la page Contact de votre boutique.")}>
          <Card>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField type="email" label={t("Email de contact")} value={form.email} onChange={e => maj("email", e.target.value)} />
              <TextField type="tel" label={t("WhatsApp")} value={form.whatsapp} onChange={e => maj("whatsapp", e.target.value)} placeholder="+221700000000" />
              <TextField type="tel" label={t("Téléphone")} value={form.telephone} onChange={e => maj("telephone", e.target.value)} />
              <TextField label={t("Adresse physique")} value={form.adresse} onChange={e => maj("adresse", e.target.value)} />
              <TextField className="sm:col-span-2" label={t("Horaires")} value={form.horaires} onChange={e => maj("horaires", e.target.value)} maxLength={200} placeholder={t("Lun–Sam, 8h–19h")} />
            </div>
          </Card>
        </SousSection>

        <SousSection titre={t("Paramètres par défaut")} description={t("Le pays fixe la devise de tous vos montants.")}>
          <Card>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("Pays")}>
                {() => <SelectPays ariaLabel={t("Pays")} value={form.pays} onChange={code => setForm(f => ({ ...f, pays: code, devise: PAYS_DEVISES[code] ?? f.devise }))} />}
              </Field>
              {/* Dérivée du pays (imposé aussi côté serveur, PATCH /api/tenants). */}
              <TextField label={t("Devise")} value={form.devise} readOnly disabled
                helpText={tenant?.devise && form.devise !== tenant.devise
                  ? `${t("Vos montants seront convertis de")} ${t(tenant.devise)} en ${t(form.devise)} ${t("au taux du jour à l'enregistrement.")}`
                  : t("Définie automatiquement par le pays.")} />
            </div>
          </Card>
        </SousSection>

        <SousSection titre={t("WhatsApp Business")} description={t("Ce numéro recevra les confirmations de commandes pour vos produits physiques et dropshipping.")}>
          <Card>
            <TextField type="tel" label={t("Numéro WhatsApp Business")} value={form.whatsappNumero} className="font-mono"
              onChange={e => { maj("whatsappNumero", e.target.value); setErreurWhatsapp(""); }}
              placeholder={t("+22507XXXXXXXX")} error={erreurWhatsapp || undefined}
              helpText={t("Format international : +[indicatif pays][numéro]. Ex : +22507XXXXXXXX")} />
          </Card>
        </SousSection>
      </>}
    </SectionParametres>
  );
}
