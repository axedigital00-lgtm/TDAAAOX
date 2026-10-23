"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, Truck, Loader2, ShieldCheck, Bike, Car, PersonStanding, type LucideIcon } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { demanderCodeConnexion } from "@/components/auth/BoutonRenvoyerCode";
import { EcranCode } from "@/components/auth/EcranCode";
import { exempleTelephone } from "@/lib/devise-convert";

const VEHICULES: { value: string; label: string; desc: string; Icon: LucideIcon }[] = [
  { value: "moto", label: "Moto", desc: "Idéal pour la ville", Icon: Bike },
  { value: "voiture", label: "Voiture", desc: "Pour les gros colis", Icon: Car },
  { value: "velo", label: "Vélo", desc: "Eco-responsable", Icon: Bike },
  { value: "a_pied", label: "À pied", desc: "Courtes distances", Icon: PersonStanding },
];

const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm placeholder:text-gray-400 focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623]/10 focus:outline-none transition-all";

export function FormulaireLivreur({ pays }: { pays: string | null }) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // Compte créé : on enchaîne sur le code de connexion (même flux que /connexion).
  const [cree, setCree] = useState<{ email: string; erreurEnvoi: string } | null>(null);
  const [erreur, setErreur] = useState("");
  const [form, setForm] = useState({
    nom: "", email: "", telephone: "", password: "", vehicule: "moto", zone: "",
  });

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErreur("");

    try {
      const res = await fetch("/api/livreurs/inscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
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

  // Renvoie un message d'erreur, ou null une fois connecté (direction l'espace livreur).
  async function connecter(email: string, code?: string): Promise<string | null> {
    const result = await signIn("credentials", { email, password: form.password, code, redirect: false });
    if (result?.error) return code ? "Code invalide ou expiré" : "Email ou mot de passe incorrect";
    router.push("/livreur");
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
            <span><strong>{t("Compte créé !")}</strong>{" "}{t("Saisissez le code reçu par email pour accéder à votre espace livreur. L'équipe Axso validera votre compte avant vos premières livraisons.")}</span>
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
    <div className="min-h-screen bg-gradient-to-br from-white to-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#F5A623]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-[#F5A623]/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex justify-center mb-3">
            <img src="/logo.png" alt="axso" style={{ height: "56px", width: "auto", objectFit: "contain" }} />
          </Link>
          <div className="mt-3 flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F5A623]/8 border border-[#F5A623]/20 flex items-center justify-center">
              <Truck size={22} className="text-[#D4911A]" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-3">{t("Rejoindre comme livreur")}</h1>
          <p className="text-gray-400 text-sm mt-1">{t("Recevez des commandes et gérez vos livraisons")}</p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-[#F5A623]/8">
          {erreur && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm mb-5">
              {t(erreur)}
            </div>
          )}

          <form onSubmit={soumettre} className="space-y-4">
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1.5">{t("Nom complet *")}</label>
              <input required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                placeholder={t("Mamadou Koné")} className={inputCls} />
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1.5">{t("Email *")}</label>
              <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="mamadou@exemple.com" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-600 text-sm font-medium mb-1.5">{t("Téléphone *")}</label>
                <input required value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })}
                  placeholder={exempleTelephone(pays)} className={inputCls} />
              </div>
              <div>
                <label className="block text-gray-600 text-sm font-medium mb-1.5">{t("Mot de passe *")}</label>
                <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={t("Min. 6 caractères")} className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-gray-600 text-sm font-medium mb-2">{t("Votre véhicule *")}</label>
              <div className="grid grid-cols-2 gap-2">
                {VEHICULES.map(v => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setForm({ ...form, vehicule: v.value })}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
                      form.vehicule === v.value
                        ? "border-[#F5A623] bg-[#F5A623]/8 text-gray-900"
                        : "border-gray-100 text-gray-500 hover:border-gray-200 bg-gray-50"
                    }`}
                  >
                    <v.Icon size={16} />
                    <span className="truncate">{t(v.label)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1.5">{t("Ville / Zone de couverture")}</label>
              <input value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })}
                placeholder={t("Ex: Dakar, Abidjan Plateau...")} className={inputCls} />
            </div>

            <div className="bg-[#F5A623]/8 border border-[#F5A623]/25 rounded-xl p-3">
              <p className="text-amber-700 text-xs leading-relaxed">
                {t("En créant un compte, vous rejoignez la plateforme Axso en tant que livreur indépendant. Les marchands pourront vous assigner des commandes.")}
              </p>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-[#F5A623] text-[#111111] font-bold py-3.5 rounded-xl hover:bg-[#D4911A] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#F5A623]/25 hover:scale-[1.02] active:scale-95"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" />{" "}{t("Création du compte...")}</> : t("Créer mon compte livreur")}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-2">
          <Link href="/connexion" className="text-[#F5A623] hover:underline text-sm flex items-center justify-center gap-1">
            <ArrowLeft size={13} />{" "}{t("Retour à la connexion")}
          </Link>
          <p className="text-gray-400 text-xs">
            {t("Vous voulez ouvrir une boutique ?")}{" "}
            <Link href="/inscription" className="text-gray-400 hover:text-[#F5A623] transition-colors underline">
              {t("Créer un compte vendeur")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
