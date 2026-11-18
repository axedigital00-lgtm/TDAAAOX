"use client";
import { useState } from "react";
import {
  Check, AlertCircle, Sparkles,
  Globe, ImageIcon, HelpCircle, DollarSign, Type,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Bouton, Modale } from "@/components/ui";

interface Props {
  produitId: string;
  nom: string;
  description: string;
  images: string[];
  prix: string;
  metaTitle: string;
  faqCount: number;
  onPublier: () => Promise<void>;
  onClose: () => void;
}

export default function PublicationAssistant({
  produitId, nom, description, images, prix, metaTitle, faqCount, onPublier, onClose,
}: Props) {
  const t = useT();
  const [publishing, setPublishing] = useState(false);
  const [genFaq, setGenFaq] = useState(false);

  const items = [
    { key: "nom",   label: "Nom du produit",  ok: nom.length >= 5,        icon: <Type size={13} />,      conseil: "Un titre précis fait +30% de clics. Minimum 5 caractères." },
    { key: "desc",  label: "Description",     ok: description.length >= 80, icon: <Check size={13} />,   conseil: "Décrivez les bénéfices, pas seulement les caractéristiques (min. 80 car.)." },
    { key: "img",   label: "Image produit",   ok: images.length >= 1,     icon: <ImageIcon size={13} />, conseil: "Les produits avec photo se vendent 4× plus. Ajoutez une image." },
    { key: "prix",  label: "Prix valide",     ok: Number(prix) > 0,       icon: <DollarSign size={13} />,conseil: "Définissez un prix de vente positif." },
    { key: "seo",   label: "Titre SEO",       ok: metaTitle.length >= 5,  icon: <Globe size={13} />,     conseil: "Un titre SEO améliore votre visibilité sur Google." },
    { key: "faq",   label: "FAQ client",      ok: faqCount >= 2,          icon: <HelpCircle size={13} />,conseil: "Une FAQ rassure les acheteurs hésitants et réduit les messages de support." },
  ];

  const score = items.filter(i => i.ok).length;
  const pct   = Math.round((score / items.length) * 100);
  const ton = pct >= 80 ? { texte: "text-succes", barre: "bg-succes" } : pct >= 50 ? { texte: "text-attention", barre: "bg-primaire" } : { texte: "text-erreur", barre: "bg-erreur" };

  const handlePublier = async () => {
    setPublishing(true);
    try {
      await onPublier();
      onClose();
    } finally {
      setPublishing(false);
    }
  };

  const genererFaq = async () => {
    if (!nom) { toast.error(t("Indiquez d'abord le nom du produit : la FAQ s'appuie dessus.")); return; }
    setGenFaq(true);
    try {
      const r = await fetch("/api/ai/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, description }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const maj = await fetch(`/api/produits/${produitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faq: d.faq }),
      });
      if (!maj.ok) throw new Error("La FAQ a été générée mais n'a pas pu être enregistrée. Réessayez.");
      toast.success(t("FAQ générée et enregistrée. Rechargez la page pour la voir."));
    } catch (e: any) {
      toast.error(e?.message ? t(e.message) : t("La FAQ n'a pas pu être générée. Réessayez dans un instant."));
    } finally {
      setGenFaq(false);
    }
  };

  return (
    <Modale ouverte onFermer={onClose} verrouillee={publishing}
      titre={<span className="flex items-center gap-2"><Sparkles size={16} className="text-attention" aria-hidden />{t("Avant de publier…")}</span>}
      description={t("Vérifications pour maximiser vos ventes")}
      actions={<>
        <Bouton variante="secondaire" onClick={onClose} disabled={publishing}>{t("Continuer d'améliorer")}</Bouton>
        <Bouton onClick={handlePublier} charge={publishing} texteCharge={t("Publication…")} icone={<Check size={15} aria-hidden />}>
          {score === items.length ? t("Publier le produit") : t("Publier quand même")}
        </Bouton>
      </>}>
      <div className="space-y-4">
        {/* Score */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-doux font-medium">{t("Complétude du produit")}</span>
            <span className={`text-sm font-bold ${ton.texte}`}>{pct}%</span>
          </div>
          <div className="h-2 bg-carte-2 rounded-full overflow-hidden" role="progressbar" aria-label={t("Complétude du produit")} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full transition-all duration-500 ${ton.barre}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-doux mt-1">{score}/{items.length}{" "}{t("éléments complétés")}</p>
        </div>

        {/* Checklist */}
        <ul className="space-y-1.5">
          {items.map(item => (
            <li key={item.key} className={`flex items-start gap-3 p-3 rounded-controle border ${item.ok ? "bg-succes-fond border-succes-bordure" : "bg-attention-fond border-attention-bordure"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white ${item.ok ? "bg-succes" : "bg-attention"}`} aria-hidden>
                {item.ok ? <Check size={11} /> : <AlertCircle size={11} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${item.ok ? "text-succes" : "text-attention"}`}>
                  {t(item.label)}<span className="sr-only"> : {item.ok ? t("fait") : t("à compléter")}</span>
                </p>
                {!item.ok && <p className="text-xs text-encre/80 mt-0.5 leading-relaxed">{t(item.conseil)}</p>}
              </div>
            </li>
          ))}
        </ul>

        {/* IA suggestion — FAQ */}
        {faqCount < 2 && (
          <Bouton variante="secondaire" large onClick={genererFaq} charge={genFaq} texteCharge={t("Génération de la FAQ…")} icone={<Sparkles size={14} className="text-attention" aria-hidden />}>
            {t("Générer une FAQ avec l'IA")}
          </Bouton>
        )}
      </div>
    </Modale>
  );
}
