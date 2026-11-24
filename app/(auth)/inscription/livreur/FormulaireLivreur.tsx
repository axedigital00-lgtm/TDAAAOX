"use client";
import "@fontsource-variable/inter/wght.css";
import "@/components/auth/auth.css";
import "./inscription-transporteur.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, ArrowRight, Bike, Building2, Car, Check, Eye, EyeOff, Loader2, PersonStanding, ShieldCheck, type LucideIcon } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { demanderCodeConnexion } from "@/components/auth/BoutonRenvoyerCode";
import { EcranCode } from "@/components/auth/EcranCode";
import { exempleTelephone } from "@/lib/devise-convert";

const VEHICULES: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: "moto", label: "Moto", Icon: Bike },
  { value: "voiture", label: "Voiture", Icon: Car },
  { value: "velo", label: "Vélo", Icon: Bike },
  { value: "a_pied", label: "À pied", Icon: PersonStanding },
];
const TYPES: { value: "livreur" | "societe"; label: string; desc: string; Icon: LucideIcon }[] = [
  { value: "livreur", label: "Livreur indépendant", desc: "Vous livrez vous-même, à votre rythme.", Icon: Bike },
  { value: "societe", label: "Société de livraison", desc: "Vous gérez une équipe et une flotte.", Icon: Building2 },
];
const ETAPES_RESEAU = [
  ["Créez votre compte", "Quelques informations suffisent."],
  ["Envoyez vos documents", "Un administrateur AXSO valide votre compte sous 24 h maximum. Vos documents restent privés."],
  ["Recevez vos courses", "Le montant net est affiché avant que vous acceptiez."],
];

export function FormulaireLivreur({ pays }: { pays: string | null }) {
  const t = useT();
  const router = useRouter();
  const [etape, setEtape] = useState(0);
  const [loading, setLoading] = useState(false);
  const [voirMdp, setVoirMdp] = useState(false);
  // Compte créé : on enchaîne sur le code de connexion (même flux que /connexion).
  const [cree, setCree] = useState<{ email: string; erreurEnvoi: string } | null>(null);
  const [erreur, setErreur] = useState("");
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ type: "livreur" as "livreur" | "societe", nom: "", email: "", telephone: "", password: "", vehicule: "moto", zone: "" });
  const corps = useRef<HTMLDivElement>(null);
  const societe = form.type === "societe";
  const titres = societe ? ["Votre activité", "Votre compte"] : ["Votre activité", "Votre compte", "Vos livraisons"];
  const derniere = etape === titres.length - 1;

  useEffect(() => { if (etape > 0) corps.current?.querySelector<HTMLElement>("input")?.focus(); }, [etape]);
  const maj = (k: keyof typeof form, v: string) => { setForm((f) => ({ ...f, [k]: v })); setErreurs((e) => ({ ...e, [k]: "" })); };

  function valider() {
    if (etape !== 1) return true;
    const e: Record<string, string> = {};
    if (form.nom.trim().length < 2) e.nom = societe ? "Indiquez le nom de la société" : "Indiquez votre nom complet";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Adresse e-mail invalide";
    if (!societe && form.telephone.replace(/\D/g, "").length < 8) e.telephone = "Numéro de téléphone invalide";
    if (form.password.length < 6) e.password = "6 caractères minimum";
    setErreurs(e);
    return !Object.keys(e).length;
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!valider()) return;
    if (!derniere) { setEtape(etape + 1); return; }
    setLoading(true);
    setErreur("");
    try {
      const res = await fetch("/api/livreurs/inscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(societe ? { ...form, telephone: undefined, zone: undefined } : form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création");
      const email = form.email.trim().toLowerCase(); // tel qu'enregistré par l'API
      let skip2fa = false, erreurEnvoi = "";
      try { skip2fa = await demanderCodeConnexion(email, form.password); }
      catch (e: any) { erreurEnvoi = e.message; } // affiché sur l'écran du code, « Renvoyer » reste possible
      if (skip2fa) {
        const err = await connecter(email);
        if (err) throw new Error(err);
        return;
      }
      setCree({ email, erreurEnvoi });
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Renvoie un message d'erreur, ou null une fois connecté (direction le portail transporteur).
  async function connecter(email: string, code?: string): Promise<string | null> {
    const result = await signIn("credentials", { email, password: form.password, code, redirect: false });
    if (result?.error) return code ? "Code invalide ou expiré" : "Email ou mot de passe incorrect";
    router.push("/transporteur");
    router.refresh();
    return null;
  }

  const champ = (k: "nom" | "email" | "telephone", label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="axi-champ">
      <label htmlFor={`tr-${k}`}>{t(label)}</label>
      <input id={`tr-${k}`} value={form[k]} onChange={(e) => maj(k, e.target.value)} aria-invalid={!!erreurs[k]} aria-describedby={erreurs[k] ? `tr-${k}-err` : undefined} {...props} />
      {erreurs[k] && <p id={`tr-${k}-err`} className="axi-err">{t(erreurs[k])}</p>}
    </div>
  );

  return (
    <div className="axi">
      <header className="axi-tete">
        <Link href="/" aria-label="AXSO"><img src="/logo-dark.png" alt="AXSO" /></Link>
        <p>{t("Déjà inscrit ?")} <Link href="/connexion?callbackUrl=/transporteur">{t("Se connecter")}</Link></p>
      </header>

      <main className="axi-grille">
        <section className="axi-texte">
          <p className="axi-surtitre">{t("Réseau de livraison AXSO")}</p>
          <h1>{t("Recevez des courses près de chez vous.")}</h1>
          <p className="axi-lead">{t("Rejoignez AXSO comme livreur ou société de livraison. Vous gardez la main sur chaque course.")}</p>
          <ol className="axi-points">
            {ETAPES_RESEAU.map(([titre, desc], i) => <li key={titre}><span>{i + 1}</span><div><b>{t(titre)}</b><small>{t(desc)}</small></div></li>)}
          </ol>
        </section>

        <div className="axi-carte">
          {cree ? <>
            <div className="axa-alerte axa-alerte--ok" role="status" style={{ display: "flex", gap: 8 }}>
              <ShieldCheck size={16} style={{ flex: "none", marginTop: 2 }} />
              <span><b>{t("Demande d'inscription enregistrée.")}</b> {t("Un administrateur AXSO valide votre compte sous 24 h maximum avant activation. En attendant, saisissez le code reçu par e-mail pour compléter votre dossier.")}</span>
            </div>
            <div className="axa" style={{ all: "unset", display: "block" }}>
              <EcranCode email={cree.email} erreurInitiale={cree.erreurEnvoi} onValider={(code) => connecter(cree.email, code)} onRenvoyer={async () => { await demanderCodeConnexion(cree.email, form.password); }} />
            </div>
          </> : <form onSubmit={soumettre} noValidate>
            <ol className="axi-progres" aria-label={t("Progression")}>
              {titres.map((x, i) => <li key={x} data-etat={i < etape ? "fait" : i === etape ? "actif" : "attente"} aria-current={i === etape ? "step" : undefined}><i>{i < etape ? <Check size={12} strokeWidth={3} /> : i + 1}</i><span>{t(x)}</span></li>)}
            </ol>
            {erreur && <div className="axa-alerte axa-alerte--err" role="alert">{t(erreur)}</div>}

            <div ref={corps} key={etape} className="axi-corps">
              {etape === 0 && <>
                <h2>{t("Comment livrez-vous ?")}</h2>
                <p className="axi-sous">{t("Votre espace s'adapte à votre activité.")}</p>
                <div className="axi-types" role="radiogroup" aria-label={t("Type de compte")}>
                  {TYPES.map((x) => <button key={x.value} type="button" role="radio" aria-checked={form.type === x.value} onClick={() => maj("type", x.value)}><span className="axi-ico"><x.Icon size={20} /></span><span><b>{t(x.label)}</b><small>{t(x.desc)}</small></span><i aria-hidden="true" /></button>)}
                </div>
              </>}

              {etape === 1 && <>
                <h2>{t("Créez votre compte")}</h2>
                <p className="axi-sous">{t("Vous l'utiliserez pour suivre vos courses et vos gains.")}</p>
                {champ("nom", societe ? "Nom de la société" : "Nom complet", { autoComplete: societe ? "organization" : "name" })}
                {champ("email", "Adresse e-mail", { type: "email", autoComplete: "email", inputMode: "email" })}
                {!societe && champ("telephone", "Téléphone", { type: "tel", autoComplete: "tel", placeholder: exempleTelephone(pays) })}
                <div className="axi-champ">
                  <label htmlFor="tr-password">{t("Mot de passe")}</label>
                  <div className="axi-mdp">
                    <input id="tr-password" type={voirMdp ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(e) => maj("password", e.target.value)} placeholder={t("6 caractères minimum")} aria-invalid={!!erreurs.password} aria-describedby={erreurs.password ? "tr-password-err" : undefined} />
                    <button type="button" onClick={() => setVoirMdp(!voirMdp)} aria-label={t(voirMdp ? "Masquer le mot de passe" : "Afficher le mot de passe")}>{voirMdp ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                  {erreurs.password && <p id="tr-password-err" className="axi-err">{t(erreurs.password)}</p>}
                </div>
              </>}

              {etape === 2 && <>
                <h2>{t("Comment vous déplacez-vous ?")}</h2>
                <p className="axi-sous">{t("Vous pourrez modifier ces informations à tout moment.")}</p>
                <div className="axi-vehicules" role="radiogroup" aria-label={t("Votre véhicule")}>
                  {VEHICULES.map((v) => <button key={v.value} type="button" role="radio" aria-checked={form.vehicule === v.value} onClick={() => maj("vehicule", v.value)}><v.Icon size={22} /><span>{t(v.label)}</span></button>)}
                </div>
                <div className="axi-champ">
                  <label htmlFor="tr-zone">{t("Ville ou zone de livraison")}</label>
                  <input id="tr-zone" value={form.zone} onChange={(e) => maj("zone", e.target.value)} placeholder={t("Ex : Douala, Abidjan Plateau")} />
                </div>
              </>}
            </div>

            <div className="axi-actions">
              {etape > 0 && <button type="button" className="axi-retour" onClick={() => { setErreur(""); setEtape(etape - 1); }} aria-label={t("Retour")}><ArrowLeft size={18} /></button>}
              <button type="submit" className="axi-suite" disabled={loading}>
                {loading ? <><Loader2 size={17} className="animate-spin" />{t("Création du compte...")}</> : derniere ? t("Créer mon compte") : <>{t("Continuer")}<ArrowRight size={17} /></>}
              </button>
            </div>
            <p className="axi-vendre">{t("Vous voulez vendre ?")} <Link href="/inscription">{t("Créer une boutique")}</Link></p>
          </form>}
        </div>
      </main>

      <footer className="axi-pied">
        <Link href="/contact">{t("Aide")}</Link>
        <Link href="/legal/privacy">{t("Confidentialité")}</Link>
        <Link href="/legal/cgu">{t("Conditions")}</Link>
      </footer>
    </div>
  );
}
