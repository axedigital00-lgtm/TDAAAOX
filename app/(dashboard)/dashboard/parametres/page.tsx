"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Save, Globe, Bell, Users, ExternalLink, Copy, Check,
  Settings, MessageCircle, ChevronRight, ClipboardList, CreditCard,
} from "lucide-react";
import Link from "next/link";
import { PAYS_DEVISES, PAYS_OPTIONS } from "@/lib/ai-agent";
import { SelectPays } from "@/components/ui/SelectPays";
import { ModuleTutorial, BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";
import { lireReglagesPaiement, type ReglagesPaiement } from "@/lib/paiement-pays";
import { urlBoutique } from "@/lib/utils";
import { Badge, Bouton, Champ, CLASSE_SAISIE, classesBouton, EnTetePage, EtatChargement, EtatErreur, Saisie, ZoneTexte, useConfirmation } from "@/components/ui";

const PARAMETRES_TUTORIAL_STEPS = [
  { Icon: Settings,      titre: "Vos informations générales", description: "Nom, description, catégorie, pays et devise — la base de votre identité sur Axso." },
  { Icon: MessageCircle, titre: "Numéro WhatsApp Business",    description: "Ce numéro recevra les confirmations de commandes pour vos produits physiques et dropshipping." },
  { Icon: ClipboardList, titre: "Formulaire de commande",       description: "Choisissez les informations demandées à l'acheteur qui commande sans passer par WhatsApp (email, GPS, champ personnalisé)." },
  { Icon: CreditCard,    titre: "Moyens de paiement",           description: "Paiement à la livraison, commande WhatsApp : choisissez ce que vous acceptez, et pour quels pays." },
  { Icon: Bell,          titre: "Domaine, notifications, équipe", description: "Retrouvez ici les réglages avancés : domaine personnalisé, alertes et accès de vos collaborateurs." },
];

const CATEGORIES = ["Mode & Vêtements", "Électronique", "Alimentation", "Beauté & Cosmétiques", "Maison & Décoration", "Sport & Loisirs", "Livres & Culture", "Artisanat", "Services", "Autre"];


export default function ParametresPage() {
  const t = useT();
  const [tenant, setTenant] = useState<any>(null);
  const [form, setForm] = useState({
    nomBoutique: "", description: "", whatsapp: "", telephone: "", adresse: "", email: "", horaires: "",
    categorie: "", pays: "", devise: "XOF",
  });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [whatsappNumero, setWhatsappNumero] = useState("");
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [erreurWhatsapp, setErreurWhatsapp] = useState("");
  const { confirmer, dialogue } = useConfirmation();
  const [formCommande, setFormCommande] = useState({ demanderEmail: true, demanderGps: true, champActif: false, champLabel: "" });
  const [savingCommande, setSavingCommande] = useState(false);
  const [paiement, setPaiement] = useState<ReglagesPaiement>(lireReglagesPaiement({}));
  const [savingPaiement, setSavingPaiement] = useState(false);

  const [etat, setEtat] = useState<"chargement" | "pret" | "erreur">("chargement");
  const charger = () => {
    setEtat("chargement");
    fetch("/api/tenants/moi-complet").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => {
      setEtat("pret");
      if (data) {
        setTenant(data);
        setForm({
          nomBoutique: data.nomBoutique || "", description: data.description || "",
          whatsapp: data.whatsapp || "", telephone: data.telephone || "",
          adresse: data.adresse || "", email: data.email || "", horaires: data.horaires || "",
          // Anciennes boutiques : pays enregistré en toutes lettres ("Cameroun") → code ISO2.
          categorie: data.categorie || "", pays: PAYS_OPTIONS.find(p => p.nom === data.pays)?.code ?? data.pays ?? "", devise: data.devise || "XOF",
        });
        setWhatsappNumero(data.whatsappNumero || "");
        setPaiement(lireReglagesPaiement(data.parametresPaiement));
        const pc = data.parametresCommande || {};
        setFormCommande({
          demanderEmail: pc.demanderEmail ?? true,
          demanderGps: pc.demanderGps ?? true,
          champActif: pc.champPersonnalise?.actif ?? false,
          champLabel: pc.champPersonnalise?.label ?? "",
        });
      }
    }).catch(() => setEtat("erreur"));
  };
  useEffect(charger, []);

  async function sauvegarderCommande() {
    setSavingCommande(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parametresCommande: {
            demanderEmail: formCommande.demanderEmail,
            demanderGps: formCommande.demanderGps,
            champPersonnalise: { actif: formCommande.champActif, label: formCommande.champLabel },
          },
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("Formulaire de commande mis à jour !"));
    } catch { toast.error(t("Le formulaire de commande n'a pas pu être enregistré. Vérifiez votre connexion et réessayez.")); }
    finally { setSavingCommande(false); }
  }

  async function sauvegarderPaiement() {
    if (!paiement.livraison && !paiement.whatsapp) { toast.error(t("Gardez au moins un moyen de paiement activé avant d'enregistrer.")); return; }
    setSavingPaiement(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parametresPaiement: { ...(tenant?.parametresPaiement || {}), ...paiement } }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("Moyens de paiement mis à jour !"));
    } catch { toast.error(t("Les moyens de paiement n'ont pas pu être enregistrés. Vérifiez votre connexion et réessayez.")); }
    finally { setSavingPaiement(false); }
  }

  async function sauvegarderWhatsapp(e: React.FormEvent) {
    e.preventDefault();
    if (!whatsappNumero.startsWith("+") || !/^\+\d+$/.test(whatsappNumero)) {
      setErreurWhatsapp(t("Le numéro doit commencer par + suivi de chiffres (ex: +22507XXXXXXXX)"));
      return;
    }
    setSavingWhatsapp(true);
    try {
      const res = await fetch("/api/tenant/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappNumero }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("Numéro WhatsApp Business enregistré !"));
    } catch { toast.error(t("Le numéro WhatsApp n'a pas pu être enregistré. Vérifiez votre connexion et réessayez.")); }
    finally { setSavingWhatsapp(false); }
  }

  async function sauvegarder(e: React.FormEvent) {
    e.preventDefault();
    const changeDevise = !!tenant?.devise && form.devise !== tenant.devise;
    if (changeDevise && !(await confirmer({
      titre: t("Changer la devise de la boutique ?"),
      objet: `${tenant.devise} → ${form.devise}`,
      description: t("Tous les montants de la boutique seront convertis au taux du jour : prix des produits et variantes, frais de livraison, codes promo, commandes, commissions et solde du wallet (les factures déjà émises restent inchangées)."),
      libelleConfirmer: t("Convertir en {0}", form.devise),
      destructive: false,
    }))) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
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
  const boutiquUrl = tenant && origine ? urlBoutique(tenant, "", origine) : "";

  const SECTION = "rounded-carte border border-bordure bg-carte p-carte shadow-carte space-y-champs";
  const CASE = "flex items-start justify-between gap-4 py-2 min-h-10 cursor-pointer";
  const CASE_INPUT = "size-5 mt-0.5 shrink-0 accent-primaire";

  return (
    <div className="space-y-section max-w-2xl">
      <ModuleTutorial moduleKey="parametres" titre={t("Réglages")} sousTitre={t("Configuration de ton compte")} steps={PARAMETRES_TUTORIAL_STEPS} />
      {dialogue}

      <EnTetePage
        className="mb-0"
        titre={t("Réglages")}
        indicateurs={<BoutonRevoirTutoriel moduleKey="parametres" />}
        description={tenant?.nomBoutique ? `${t("Informations, coordonnées, commandes et paiements de")} ${tenant.nomBoutique}` : t("Informations, coordonnées, commandes et paiements de votre boutique")}
      />

      {etat === "chargement" && <EtatChargement texte={t("Chargement de vos réglages…")} />}
      {etat === "erreur" && (
        <EtatErreur titre={t("Vos réglages n'ont pas pu être chargés.")} texte={t("Vérifiez votre connexion puis réessayez.")} onReessayer={charger} />
      )}
      {etat === "pret" && <>
      {/* ── URL boutique ── */}
      {tenant && (
        <section className="rounded-carte border border-bordure bg-carte p-4 shadow-carte flex flex-wrap items-center gap-3">
          <span className="size-10 rounded-controle bg-primaire-fond flex items-center justify-center shrink-0" aria-hidden>
            <Globe className="size-4 text-attention" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="ax-aide">{t("Votre boutique en ligne")}</h2>
            <p className="text-sm font-mono font-semibold text-encre truncate">{boutiquUrl}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Bouton variante="secondaire" taille="compact" onClick={() => copier(boutiquUrl)}
              icone={copied ? <Check className="size-3.5 text-succes" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}>
              {copied ? t("Copié") : t("Copier le lien")}
            </Bouton>
            <a href={urlBoutique(tenant)} target="_blank" rel="noopener noreferrer" className={classesBouton({ variante: "secondaire", taille: "compact" })}>
              <ExternalLink className="size-3.5" aria-hidden />{t("Voir ma boutique")}
            </a>
          </div>
        </section>
      )}

      {/* ── Réglages avancés ── */}
      <section className="rounded-carte border border-bordure bg-carte shadow-carte">
        <h2 className="ax-sous-titre px-4 pt-4 pb-2">{t("Réglages avancés")}</h2>
        <ul className="divide-y divide-bordure">
          {[
            { Icon: Globe, label: "Domaine personnalisé", desc: "Connectez votre propre nom de domaine", href: "/dashboard/parametres/domaine" },
            { Icon: Bell, label: "Notifications", desc: "Alertes WhatsApp et email", href: "/dashboard/parametres/notifications" },
            { Icon: Users, label: "Équipe", desc: "Gérez les accès de vos collaborateurs", href: "/dashboard/parametres/equipe" },
          ].map((s) => {
            const Icon = s.Icon;
            return (
              <li key={s.href}>
                <Link href={s.href} className="flex items-center gap-3 px-4 py-3 min-h-14 hover:bg-carte-2 transition-colors group">
                  <span className="size-10 rounded-controle bg-carte-2 border border-bordure flex items-center justify-center shrink-0" aria-hidden>
                    <Icon className="size-4 text-doux" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block ax-libelle group-hover:text-attention transition-colors">{t(s.label)}</span>
                    <span className="block ax-aide">{t(s.desc)}</span>
                  </span>
                  <ChevronRight className="size-4 text-doux" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Informations générales + coordonnées ── */}
      <form onSubmit={sauvegarder} className={SECTION}>
        <h2 className="ax-titre-section flex items-center gap-2"><Settings className="size-4 text-attention" aria-hidden />{t("Informations générales")}</h2>

        <Saisie label={t("Nom de la boutique")} required value={form.nomBoutique} onChange={e => setForm({ ...form, nomBoutique: e.target.value })} />
        <ZoneTexte label={t("Description")} mention="facultatif" rows={3} value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t("Décrivez votre boutique en quelques mots…")} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Champ label={t("Catégorie")}>
            {(a) => (
              <select {...a} value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} className={CLASSE_SAISIE}>
                {CATEGORIES.map(c => <option key={c} value={c}>{t(c)}</option>)}
              </select>
            )}
          </Champ>
          <div className="space-y-1.5">
            <span className="ax-libelle block">{t("Pays")}</span>
            <SelectPays ariaLabel={t("Pays")} value={form.pays} onChange={code => setForm({ ...form, pays: code, devise: PAYS_DEVISES[code] ?? form.devise })} />
          </div>
          {/* Dérivée du pays (imposé aussi côté serveur, PATCH /api/tenants). */}
          <Saisie label={t("Devise")} value={form.devise} readOnly disabled
            aide={tenant?.devise && form.devise !== tenant.devise
              ? <span className="text-attention">{t("Vos montants seront convertis de")} {t(tenant.devise)} en {t(form.devise)} {t("au taux du jour à l'enregistrement.")}</span>
              : t("Définie automatiquement par le pays.")} />
        </div>

        {/* Coordonnées (page Contact de la boutique) : étape « Compléter mes coordonnées » de Démarrer. */}
        <div id="coordonnees" className="space-y-champs scroll-mt-24 border-t border-bordure pt-4">
          <div>
            <h3 className="ax-sous-titre">{t("Coordonnées")}</h3>
            <p className="ax-aide">{t("Affichées sur la page Contact de votre boutique.")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Saisie type="email" label={t("Email de contact")} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Saisie type="tel" label={t("WhatsApp")} mention="obligatoire" value={form.whatsapp}
              onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="+221700000000" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Saisie type="tel" label={t("Téléphone")} value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} />
            <Saisie label={t("Adresse physique")} value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} />
          </div>
          <Saisie label={t("Horaires")} value={form.horaires} onChange={e => setForm({ ...form, horaires: e.target.value })} maxLength={200}
            placeholder={t("Lun–Sam, 8h–19h")} />
        </div>

        <Bouton type="submit" charge={saving} texteCharge={t("Enregistrement…")} icone={<Save className="size-4" aria-hidden />}>
          {t("Enregistrer les informations")}
        </Bouton>
      </form>

      {/* ── WhatsApp Business ── */}
      <form onSubmit={sauvegarderWhatsapp} className={SECTION}>
        <div>
          <h2 className="ax-titre-section flex items-center gap-2"><MessageCircle className="size-4 text-succes" aria-hidden />{t("WhatsApp Business")}</h2>
          <p className="ax-texte-secondaire">{t("Ce numéro recevra les confirmations de commandes pour vos produits physiques et dropshipping.")}</p>
        </div>
        <Saisie type="tel" label={t("Numéro WhatsApp Business")} value={whatsappNumero}
          onChange={e => { setWhatsappNumero(e.target.value); setErreurWhatsapp(""); }}
          placeholder={t("+22507XXXXXXXX")} classeChamp="font-mono" erreur={erreurWhatsapp || undefined}
          aide={t("Format international : +[indicatif pays][numéro]. Ex : +22507XXXXXXXX")} />
        <Bouton type="submit" variante="secondaire" charge={savingWhatsapp} texteCharge={t("Enregistrement…")} icone={<Save className="size-4" aria-hidden />}>
          {t("Enregistrer le numéro")}
        </Bouton>
      </form>

      {/* ── Formulaire de commande "Commander maintenant" ── */}
      <section className={SECTION}>
        <div>
          <h2 className="ax-titre-section flex items-center gap-2"><ClipboardList className="size-4 text-attention" aria-hidden />{t("Formulaire de commande")}</h2>
          <p className="ax-texte-secondaire">{t("Personnalisez les informations demandées à l'acheteur qui choisit \"Commander maintenant\" (sans passer par WhatsApp).")}</p>
        </div>
        <div className="divide-y divide-bordure">
          <label className={CASE}>
            <span className="ax-texte">{t("Demander l'adresse email")}</span>
            <input type="checkbox" checked={formCommande.demanderEmail}
              onChange={e => setFormCommande(f => ({ ...f, demanderEmail: e.target.checked }))} className={CASE_INPUT} />
          </label>
          <label className={CASE}>
            <span className="ax-texte">{t("Proposer le partage de la position GPS")}</span>
            <input type="checkbox" checked={formCommande.demanderGps}
              onChange={e => setFormCommande(f => ({ ...f, demanderGps: e.target.checked }))} className={CASE_INPUT} />
          </label>
          <label className={CASE}>
            <span className="ax-texte">{t("Ajouter un champ personnalisé")}</span>
            <input type="checkbox" checked={formCommande.champActif}
              onChange={e => setFormCommande(f => ({ ...f, champActif: e.target.checked }))} className={CASE_INPUT} />
          </label>
        </div>
        {formCommande.champActif && (
          <Saisie label={t("Libellé du champ")} value={formCommande.champLabel} onChange={e => setFormCommande(f => ({ ...f, champLabel: e.target.value }))}
            placeholder={t("Ex : Précisions sur la commande, Code postal…")} />
        )}
        <Bouton variante="secondaire" onClick={sauvegarderCommande} charge={savingCommande} texteCharge={t("Enregistrement…")} icone={<Save className="size-4" aria-hidden />}>
          {t("Enregistrer le formulaire")}
        </Bouton>
      </section>

      {/* ── Moyens de paiement ── */}
      <section className={SECTION}>
        <div>
          <h2 className="ax-titre-section flex items-center gap-2"><CreditCard className="size-4 text-attention" aria-hidden />{t("Moyens de paiement")}</h2>
          <p className="ax-texte-secondaire">{t("Ce que vos clients peuvent choisir pour vos produits physiques.")}</p>
        </div>
        <div className="divide-y divide-bordure">
          {([
            ["livraison", "Paiement à la livraison", "Le client paie le livreur en espèces ou par Mobile Money à la réception."],
            ["whatsapp", "Commande via WhatsApp", "La commande arrive sur votre WhatsApp, payée à la livraison."],
            ["livraisonHorsPays", "Paiement à la livraison hors de votre pays", "Désactivé : un client d'un autre pays ne peut pas commander. Évite les colis envoyés loin puis refusés."],
          ] as const).map(([cle, titre, aide]) => (
            <label key={cle} className={CASE}>
              <span className="min-w-0">
                <span className="block ax-texte">{t(titre)}</span>
                <span className="block ax-aide mt-0.5">{t(aide)}</span>
              </span>
              <input type="checkbox" checked={paiement[cle]} disabled={cle === "livraisonHorsPays" && !paiement.livraison && !paiement.whatsapp}
                onChange={e => setPaiement(p => ({ ...p, [cle]: e.target.checked }))} className={CASE_INPUT} />
            </label>
          ))}
        </div>
        <Bouton variante="secondaire" onClick={sauvegarderPaiement} charge={savingPaiement} texteCharge={t("Enregistrement…")} icone={<Save className="size-4" aria-hidden />}>
          {t("Enregistrer les moyens de paiement")}
        </Bouton>
      </section>

      {/* ── Plan actuel ── */}
      {tenant && (
        <section className="rounded-carte border border-bordure bg-carte p-carte shadow-carte space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="ax-sous-titre">{t("Plan actuel")}</h2>
            <Badge ton="accent">{tenant.planType?.toUpperCase()}</Badge>
          </div>
          <dl className="space-y-2">
            {[
              { label: "Commission Axso", value: "0 % (paiement à la livraison)" },
              { label: "Actif depuis", value: new Date(tenant.createdAt).toLocaleDateString(t.loc) },
            ].map(row => (
              <div key={row.label} className="flex justify-between gap-3 text-sm">
                <dt className="text-doux">{t(row.label)}</dt>
                <dd className="font-semibold text-encre text-right">{t(row.value)}</dd>
              </div>
            ))}
          </dl>
          <Bouton variante="fantome" taille="compact" href="/dashboard/abonnement">{t("Voir les abonnements")}</Bouton>
        </section>
      )}
      </>}
    </div>
  );
}
