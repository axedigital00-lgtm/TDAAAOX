"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { useT } from "@/components/I18nProvider";

interface Props {
  slug: string;
  accent: string;
  texte: string;
  fond: string;
}

export function ContactForm({ slug, accent, texte, fond }: Props) {
  const t = useT();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [siteWeb, setSiteWeb] = useState(""); // honeypot — jamais rempli par un humain
  const [envoi, setEnvoi] = useState(false);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const e2: Record<string, string> = {};
    if (!nom.trim()) e2.nom = t("Indiquez votre nom.");
    if (!email.trim()) e2.email = t("Indiquez votre e-mail pour recevoir la réponse.");
    if (!message.trim()) e2.message = t("Écrivez votre message.");
    setErreurs(e2);
    if (Object.keys(e2).length) return;
    setEnvoi(true);
    try {
      const res = await fetch(`/api/storefront/${slug}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, email, message, site_web: siteWeb }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "");
      toast.success(t("Message envoyé à la boutique. Elle vous répondra par e-mail."));
      setNom(""); setEmail(""); setMessage("");
    } catch (err: any) {
      toast.error(!(err instanceof TypeError) && err?.message ? t(err.message) : t("Votre message n'a pas pu être envoyé. Vérifiez votre connexion puis réessayez."));
    } finally {
      setEnvoi(false);
    }
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-base sm:text-sm outline-none transition-colors";
  const inputStyle = { backgroundColor: `${accent}0a`, color: texte, border: `1px solid ${accent}20` };

  return (
    <form onSubmit={envoyer} className="space-y-4 max-w-lg">
      <input
        type="text" name="site_web" value={siteWeb} onChange={e => setSiteWeb(e.target.value)}
        className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true"
      />
      <div>
        <label htmlFor="contact-nom" className="text-xs font-semibold mb-1.5 block" style={{ color: texte, opacity: 0.8 }}>{t("Nom")}</label>
        <input id="contact-nom" value={nom} onChange={e => setNom(e.target.value)} autoComplete="name" aria-invalid={!!erreurs.nom} placeholder={t("Votre nom")} className={inputCls} style={inputStyle} />
        {erreurs.nom && <p role="alert" className="text-xs mt-1 font-medium text-red-500">{erreurs.nom}</p>}
      </div>
      <div>
        <label htmlFor="contact-email" className="text-xs font-semibold mb-1.5 block" style={{ color: texte, opacity: 0.8 }}>{t("E-mail")}</label>
        <input id="contact-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" aria-invalid={!!erreurs.email} placeholder="vous@example.com" className={inputCls} style={inputStyle} />
        {erreurs.email && <p role="alert" className="text-xs mt-1 font-medium text-red-500">{erreurs.email}</p>}
      </div>
      <div>
        <label htmlFor="contact-message" className="text-xs font-semibold mb-1.5 block" style={{ color: texte, opacity: 0.8 }}>{t("Message")}</label>
        <textarea id="contact-message" aria-invalid={!!erreurs.message} value={message} onChange={e => setMessage(e.target.value)} placeholder={t("Votre message...")} rows={5} className={`${inputCls} resize-none`} style={inputStyle} />
        {erreurs.message && <p role="alert" className="text-xs mt-1 font-medium text-red-500">{erreurs.message}</p>}
      </div>
      <button
        type="submit" disabled={envoi}
        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: accent, color: fond }}
      >
        {envoi ? <><Loader2 size={15} className="animate-spin" />{" "}{t("Envoi du message…")}</> : <><Send size={15} />{" "}{t("Envoyer le message")}</>}
      </button>
    </form>
  );
}
