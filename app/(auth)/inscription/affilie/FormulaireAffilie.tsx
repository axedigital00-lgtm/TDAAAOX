"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Link2, Loader2, ShieldCheck } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { demanderCodeConnexion } from "@/components/auth/BoutonRenvoyerCode";
import { EcranCode } from "@/components/auth/EcranCode";

const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base sm:text-sm placeholder:text-gray-400 focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623]/10 focus:outline-none transition-all";

// Même flux que l'inscription livreur : compte créé → code par e-mail → connecté.
export function FormulaireAffilie({ suite }: { suite: string | null }) {
  const t = useT();
  const router = useRouter();
  const destination = suite || "/affilie";
  const lienConnexion = `/connexion?callbackUrl=${encodeURIComponent(destination)}`;
  const [loading, setLoading] = useState(false);
  const [cree, setCree] = useState<{ email: string; erreurEnvoi: string } | null>(null);
  const [erreur, setErreur] = useState("");
  const [emailPris, setEmailPris] = useState(false);
  const [form, setForm] = useState({ nom: "", email: "", password: "" });

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErreur("");
    setEmailPris(false);
    try {
      const res = await fetch("/api/affilie/inscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.emailPris) { setEmailPris(true); return; }
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création");
      const email = form.email.trim().toLowerCase(); // tel qu'enregistré par l'API
      let skip2fa = false, erreurEnvoi = "";
      try { skip2fa = await demanderCodeConnexion(email, form.password); }
      catch (e: any) { erreurEnvoi = e.message; }
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

  async function connecter(email: string, code?: string): Promise<string | null> {
    const result = await signIn("credentials", { email, password: form.password, code, redirect: false });
    if (result?.error) return code ? "Code invalide ou expiré" : "Email ou mot de passe incorrect";
    router.push(destination);
    router.refresh();
    return null;
  }

  if (cree) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="flex justify-center mb-8">
            <img src="/logo.png" alt="axso" style={{ height: "56px", width: "auto", objectFit: "contain" }} />
          </Link>
          <div className="rounded-xl p-3 text-sm mb-5 flex items-start gap-2"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#16a34a" }}>
            <ShieldCheck size={16} className="flex-shrink-0 mt-0.5" />
            <span><strong>{t("Compte créé !")}</strong>{" "}{t("Saisissez le code reçu par email pour accéder à votre espace affilié.")}</span>
          </div>
          <EcranCode
            email={cree.email}
            erreurInitiale={cree.erreurEnvoi}
            onValider={(code) => connecter(cree.email, code)}
            onRenvoyer={async () => { await demanderCodeConnexion(cree.email, form.password); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#F5A623]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-[#F5A623]/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex justify-center mb-3">
            <img src="/logo.png" alt="axso" style={{ height: "56px", width: "auto", objectFit: "contain" }} />
          </Link>
          <div className="mt-3 flex items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F5A623]/8 border border-[#F5A623]/20 flex items-center justify-center">
              <Link2 size={22} className="text-[#D4911A]" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-3">{t("Devenir affilié Axso")}</h1>
          <p className="text-gray-500 text-sm mt-1">{t("Gratuit, sans boutique. Axso vous verse vos commissions sur Mobile Money.")}</p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl shadow-[#F5A623]/8">
          {erreur && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm mb-5">{t(erreur)}</div>
          )}
          {emailPris && (
            <div className="bg-[#F5A623]/8 border border-[#F5A623]/25 rounded-xl p-3 text-amber-800 text-sm mb-5">
              {t("Cet e-mail a déjà un compte Axso. Connectez-vous : si vous êtes marchand, votre espace affilié est inclus.")}{" "}
              <Link href={lienConnexion} className="font-bold underline">{t("Se connecter")}</Link>
            </div>
          )}

          <form onSubmit={soumettre} className="space-y-4">
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1.5">{t("Nom complet *")}</label>
              <input required minLength={2} value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                placeholder={t("Aïcha Diallo")} autoComplete="name" className={inputCls} />
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1.5">{t("Email *")}</label>
              <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="aicha@exemple.com" autoComplete="email" className={inputCls} />
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1.5">{t("Mot de passe *")}</label>
              <input required minLength={6} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder={t("Min. 6 caractères")} autoComplete="new-password" className={inputCls} />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-[#F5A623] text-[#111111] font-bold py-3.5 rounded-xl hover:bg-[#D4911A] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#F5A623]/25"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" />{" "}{t("Création du compte...")}</> : t("Créer mon compte affilié")}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-gray-500">
          {t("Déjà un compte Axso (marchand ou affilié) ?")}{" "}
          <Link href={lienConnexion} className="text-[#D4911A] font-semibold hover:underline">{t("Se connecter")}</Link>
        </p>
      </div>
    </div>
  );
}
