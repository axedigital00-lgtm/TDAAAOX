"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { schemaConnexion } from "@/lib/validations";
import type { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthCadre } from "@/components/auth/AuthCadre";
import { useT } from "@/components/I18nProvider";
import { estRoleAdmin } from "@/lib/command-center/rbac";
import { demanderCodeConnexion } from "@/components/auth/BoutonRenvoyerCode";
import { EcranCode } from "@/components/auth/EcranCode";

type FormConnexion = z.infer<typeof schemaConnexion>;

function ConnexionForm() {
  const t = useT();
  const router       = useRouter();
  const searchParams = useSearchParams();
  // Uniquement un chemin interne : empêche une redirection vers un site externe via ?callbackUrl=
  const cb           = searchParams.get("callbackUrl");
  const callbackUrl  = cb?.startsWith("/") && !cb.startsWith("//") ? cb : "/dashboard/accueil";
  const inscriptionReussie = searchParams.get("inscription") === "success";

  const [showPass, setShowPass] = useState(false);
  const [erreur,   setErreur]   = useState("");
  const [etape, setEtape] = useState<"identifiants" | "code">("identifiants");
  const [identifiants, setIdentifiants] = useState<{ email: string; password: string } | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormConnexion>({
    resolver: zodResolver(schemaConnexion),
  });

  // Renvoie un message d'erreur, ou null une fois connecté.
  async function finaliserConnexion(email: string, password: string, code?: string): Promise<string | null> {
    const result = await signIn("credentials", { email, password, code, redirect: false });
    if (result?.error) return code ? "Code invalide ou expiré" : "Email ou mot de passe incorrect";
    const sessionRes = await fetch("/api/auth/session");
    const session    = await sessionRes.json();
    if (session?.user?.role === "livreur") router.push(cb?.startsWith("/transporteur") ? cb : "/livreur");
    else if (session?.user?.role === "transporteur") router.push("/transporteur");
    else if (session?.user?.role === "affilie") router.push(cb?.startsWith("/") && !cb.startsWith("//") ? cb : "/affilie");
    else if (estRoleAdmin(session?.user?.role)) router.push("/admin");
    else router.push(callbackUrl);
    router.refresh();
    return null;
  }

  const onSubmit = async (data: FormConnexion) => {
    setErreur("");
    try {
      let skip2fa: boolean;
      try { skip2fa = await demanderCodeConnexion(data.email, data.password); }
      catch (e: any) { setErreur(e.message); return; }

      if (skip2fa) {
        const err = await finaliserConnexion(data.email, data.password);
        if (err) setErreur(err);
      } else {
        setIdentifiants({ email: data.email, password: data.password });
        setEtape("code");
      }
    } catch {
      setErreur("Erreur de connexion, réessaie");
    }
  };

  if (etape === "code" && identifiants) {
    return (
      <EcranCode
        email={identifiants.email}
        onValider={(code) => finaliserConnexion(identifiants.email, identifiants.password, code)}
        onRenvoyer={async () => { await demanderCodeConnexion(identifiants.email, identifiants.password); }}
        onRetour={() => { setEtape("identifiants"); setErreur(""); }}
      />
    );
  }

  return (
    <>
      <h1 className="axa-titre">{t("Se connecter")}</h1>
      <p className="axa-sous">{t("Continuer vers votre espace AXSO")}</p>

      {inscriptionReussie && <div className="axa-alerte axa-alerte--ok" role="status">{t("Boutique créée avec succès !")}</div>}
      {erreur && <div className="axa-alerte axa-alerte--err" role="alert">{t(erreur)}</div>}

      <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="axa-champ">
          <label htmlFor="connexion-email">{t("Adresse e-mail")}</label>
          <input id="connexion-email" type="email" autoComplete="email" {...register("email")} className="axa-input" />
          {errors.email && <p className="axa-err-champ">{t(errors.email.message)}</p>}
        </div>

        <div className="axa-champ">
          <label htmlFor="connexion-password">{t("Mot de passe")}</label>
          <div className="axa-mdp">
            <input id="connexion-password" type={showPass ? "text" : "password"} autoComplete="current-password" {...register("password")} className="axa-input" />
            <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? t("Masquer le mot de passe") : t("Afficher le mot de passe")}>
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.password && <p className="axa-err-champ">{t(errors.password.message)}</p>}
        </div>

        <p style={{ margin: "-4px 0 20px", fontSize: 14 }}><Link href="/mot-de-passe-oublie" className="axa-lien">{t("Mot de passe oublié ?")}</Link></p>

        <button type="submit" disabled={isSubmitting} className="axa-btn">
          {isSubmitting ? <><Loader2 size={16} className="animate-spin" />{t("Connexion...")}</> : t("Se connecter")}
        </button>
      </form>

      <p className="axa-bas">{t("Nouveau sur AXSO ?")}{" "}<Link href={cb?.startsWith("/transporteur") ? "/inscription/livreur" : "/inscription"} className="axa-lien">{t(cb?.startsWith("/transporteur") ? "Créer un compte transporteur" : "Créer une boutique gratuitement")}</Link></p>
    </>
  );
}

export default function ConnexionPage() {
  const t = useT();
  return (
    <AuthCadre>
      <Suspense fallback={<p className="axa-sous">{t("Chargement...")}</p>}>
        <ConnexionForm />
      </Suspense>
    </AuthCadre>
  );
}
