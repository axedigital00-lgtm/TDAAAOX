"use client";
import { useRef, useState } from "react";
import { Loader2, Store, Check, AlertCircle, Sparkles, Shirt, Utensils, Cpu, Home, Palette, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { slugify, SOUS_DOMAINES_ACTIFS } from "@/lib/utils";
import { PAYS_DEVISES } from "@/lib/ai-agent";
import { SelectPays } from "@/components/ui/SelectPays";
import { useT } from "@/components/I18nProvider";
import { Bouton, Champ, Modale, Saisie } from "@/components/ui";

const CATEGORIES = [
  { label: "Mode", Icon: Shirt },
  { label: "Beauté", Icon: Sparkles },
  { label: "Alimentation", Icon: Utensils },
  { label: "Électronique", Icon: Cpu },
  { label: "Maison", Icon: Home },
  { label: "Artisanat", Icon: Palette },
  { label: "Autre", Icon: MoreHorizontal },
];


type StatutSlug = "idle" | "verification" | "disponible" | "pris" | "invalide";

export function NouvelleBoutiqueModal({ onClose, onCree }: { onClose: () => void; onCree: (tenantId: string) => void }) {
  const t = useT();
  const [nom, setNom] = useState("");
  const [slug, setSlug] = useState("");
  const [pays, setPays] = useState("CM");
  const [categorie, setCategorie] = useState("Mode");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [slugTouche, setSlugTouche] = useState(false);
  const [statutSlug, setStatutSlug] = useState<StatutSlug>("idle");
  const [tente, setTente] = useState(false); // erreurs affichées sous les champs après un premier essai
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  function changerNom(v: string) {
    setNom(v);
    if (!slugTouche) verifierSlug(slugify(v));
  }

  function verifierSlug(v: string) {
    setSlug(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!v.trim()) { setStatutSlug("idle"); return; }
    setStatutSlug("verification");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/boutiques?checkSlug=${encodeURIComponent(v)}`);
        const data = await res.json();
        setStatutSlug(data.disponible ? "disponible" : "pris");
      } catch { setStatutSlug("idle"); }
    }, 400);
  }

  async function creer() {
    setTente(true);
    if (!nom.trim() || !slug.trim() || !whatsapp.trim() || statutSlug === "pris" || statutSlug === "verification") return;
    setLoading(true);
    try {
      const res = await fetch("/api/boutiques", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomBoutique: nom.trim(), slug: slug.trim(), pays, categorie, whatsapp: whatsapp.trim(), devise: PAYS_DEVISES[pays] ?? "XAF" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "La boutique n'a pas pu être créée. Réessayez dans un instant.");
      toast.success(t("Boutique « {0} » créée.", nom));
      onCree(data.tenantId);
    } catch (e: any) { toast.error(t(e.message) || t("La boutique n'a pas pu être créée. Réessayez dans un instant.")); }
    finally { setLoading(false); }
  }

  const fermer = onClose;

  return (
    <Modale ouverte onFermer={fermer} verrouillee={loading} titre={<span className="flex items-center gap-2"><Store size={18} aria-hidden />{t("Nouvelle boutique")}</span>}
      description={t("Palier 2 · multi-boutique")}
      actions={<>
        <Bouton variante="secondaire" onClick={fermer} disabled={loading}>{t("Annuler")}</Bouton>
        <Bouton onClick={creer} charge={loading} disabled={statutSlug === "verification"} icone={<Store size={15} aria-hidden />}>{t("Créer la boutique")}</Bouton>
      </>}>
      <div className="space-y-champs">
        <Saisie label={t("Nom de la boutique")} required value={nom} onChange={e => changerNom(e.target.value)} placeholder={t("Ma deuxième boutique")} autoFocus
          erreur={tente && !nom.trim() ? t("Indiquez le nom de la nouvelle boutique.") : undefined} />

        <Champ label={t("Adresse de la boutique")} mention="obligatoire"
          aide={statutSlug === "disponible" ? <span className="text-succes">{t("Adresse disponible")}</span> : undefined}
          erreur={statutSlug === "pris" ? t("Cette adresse est déjà prise ou réservée : choisissez-en une autre.") : tente && !slug.trim() ? t("Indiquez l'adresse de la boutique.") : undefined}>
          {(a) => (
            <div className={`flex items-center gap-2 rounded-controle px-3 min-h-10 border bg-carte-2 transition-colors focus-within:border-primaire ${statutSlug === "pris" ? "border-erreur" : statutSlug === "disponible" ? "border-succes-bordure" : "border-bordure"}`}>
              {!SOUS_DOMAINES_ACTIFS && <span className="text-doux text-sm whitespace-nowrap">axsoafrica.com/</span>}
              <input {...a} value={slug} onChange={e => { verifierSlug(slugify(e.target.value)); setSlugTouche(true); }} placeholder="maboutique"
                autoCapitalize="none" className="flex-1 bg-transparent text-sm text-encre outline-none min-w-0 py-2" />
              {SOUS_DOMAINES_ACTIFS && <span className="text-doux text-sm whitespace-nowrap">.{process.env.NEXT_PUBLIC_AXSO_DOMAIN}</span>}
              <span className="flex-shrink-0" aria-hidden>
                {statutSlug === "verification" && <Loader2 size={14} className="animate-spin text-doux" />}
                {statutSlug === "disponible" && <Check size={14} className="text-succes" />}
                {statutSlug === "pris" && <AlertCircle size={14} className="text-erreur" />}
              </span>
            </div>
          )}
        </Champ>

        <div className="space-y-1.5">
          <p id="nb-categorie" className="ax-libelle">{t("Catégorie")}</p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="nb-categorie">
            {CATEGORIES.map(({ label, Icon }) => (
              <button key={label} type="button" role="radio" aria-checked={categorie === label} onClick={() => setCategorie(label)}
                className={`flex items-center gap-1.5 px-3 min-h-10 sm:min-h-8 rounded-full text-xs font-semibold transition-all ${categorie === label ? "bg-secondaire text-carte" : "bg-carte-2 text-doux hover:text-encre"}`}>
                <Icon size={13} aria-hidden /> {t(label)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <span className="ax-libelle block">{t("Pays")}</span>
            <SelectPays ariaLabel={t("Pays")} value={pays} onChange={setPays} />
          </div>
          <Saisie type="tel" label="WhatsApp" required value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder={t("+237 6XX XXX XXX")}
            erreur={tente && !whatsapp.trim() ? t("Indiquez le numéro WhatsApp de la boutique.") : undefined} />
        </div>
      </div>
    </Modale>
  );
}
