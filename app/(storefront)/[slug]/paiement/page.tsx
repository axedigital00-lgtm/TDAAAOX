"use client";
// Attente du paiement Mobile Money : le client valide sur son téléphone ; dès la confirmation, l'accès s'ouvre.
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useT } from "@/components/I18nProvider";

type Etat = { statut: string; numero?: string; email?: string; boutique?: string; lienAcces?: string | null; lienAutorisation?: string | null };

export default function RetourPaiement() {
  const t = useT();
  const { slug } = useParams<{ slug: string }>();
  const params = useSearchParams();
  const id = params.get("id") ?? params.get("depositId") ?? "";
  const [etat, setEtat] = useState<Etat | null>(null);
  const [essais, setEssais] = useState(0);

  useEffect(() => {
    if (!id) return;
    let fini = false, n = 0;
    const lire = async () => {
      const r = await fetch(`/api/commandes/numerique/etat?id=${encodeURIComponent(id)}`).catch(() => null);
      const d: Etat | null = r?.ok ? await r.json().catch(() => null) : null;
      if (d) setEtat(d);
      setEssais(++n);
      if (d?.statut === "paye" && d.lienAcces) { fini = true; setTimeout(() => { window.location.href = d.lienAcces!; }, 1800); }
      if (d?.statut === "echoue" || n >= 40) fini = true;
      if (!fini) setTimeout(lire, n < 10 ? 2000 : 4000);
    };
    lire();
    return () => { fini = true; };
  }, [id]);

  const paye = etat?.statut === "paye";
  const echoue = etat?.statut === "echoue";
  const attente = !paye && !echoue && essais < 40;
  return (
    <div className="max-w-md mx-auto px-5 py-20 text-center">
      {paye ? <CheckCircle2 size={56} className="mx-auto text-green-600" />
        : echoue ? <XCircle size={56} className="mx-auto text-red-500" />
        : <Loader2 size={48} className="mx-auto animate-spin opacity-60" />}
      <h1 className="mt-6 text-2xl font-bold">
        {paye ? t("Paiement confirmé") : echoue ? t("Paiement non abouti") : attente ? t("Confirmation du paiement…") : t("Paiement en cours de vérification")}
      </h1>
      <p className="mt-3 opacity-70 leading-relaxed">
        {paye ? t("Merci ! Votre accès s'ouvre, et il a aussi été envoyé à {0}.", etat?.email ?? t("votre e-mail"))
          : echoue ? t("Aucun montant n'a été prélevé, ou il vous sera rendu par votre opérateur. Vous pouvez réessayer.")
          : attente ? (etat?.lienAutorisation
              ? t("Touchez le bouton ci-dessous pour valider le paiement dans votre application Mobile Money.")
              : t("Une demande de paiement vient d'arriver sur votre téléphone : entrez votre code secret Mobile Money pour valider. Cette page se met à jour toute seule."))
          : t("La confirmation prend plus de temps que prévu. Dès qu'elle arrive, votre accès vous est envoyé par e-mail.")}
      </p>
      {etat?.numero && <p className="mt-4 text-sm opacity-50">{t("Commande")} #{etat.numero}</p>}
      {paye && etat?.lienAcces && <a href={etat.lienAcces} className="inline-block mt-8 px-7 py-3.5 rounded-full font-semibold bg-black text-white">{t("Accéder à mon achat")}</a>}
      {attente && etat?.lienAutorisation && <a href={etat.lienAutorisation} className="inline-block mt-8 px-7 py-3.5 rounded-full font-semibold bg-black text-white">{t("Valider dans mon application Mobile Money")}</a>}
      {echoue && <a href={`/${slug}`} className="inline-block mt-8 px-7 py-3.5 rounded-full font-semibold bg-black text-white">{t("Retour à la boutique")}</a>}
    </div>
  );
}
