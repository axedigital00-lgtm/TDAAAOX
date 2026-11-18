"use client";
// « Activer ce produit » : un exemple d'Axia (inactif, prix proposé, stock 0) devient un vrai produit
// une fois prix, photo et stock vérifiés. PUT /api/produits/[id] avec actif:true → exempleAxia:false.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Loader2 } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { televerser } from "@/lib/televerser";

export function ActiverExemple({ id, nom, prix, image, digital }: { id: string; nom: string; prix: number; image?: string; digital: boolean }) {
  const t = useT();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [prixSaisi, setPrixSaisi] = useState(String(prix));
  const [stock, setStock] = useState("");
  const [photo, setPhoto] = useState(image ?? "");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  const ajouterPhoto = async (f: File) => {
    setErreur(""); setEnvoi(true);
    const fd = new FormData();
    fd.append("file", f);
    const r = await televerser(fd, "image");
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.url) setPhoto(d.url); else setErreur(d.error || "Envoi de la photo impossible.");
    setEnvoi(false);
  };

  const activer = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = Number(prixSaisi), s = Number(stock);
    if (!(p > 0)) return setErreur("Indique ton vrai prix.");
    if (!digital && (stock === "" || !Number.isInteger(s) || s < 0)) return setErreur("Indique ton stock réel.");
    if (!photo) return setErreur("Ajoute une photo de ton produit.");
    setErreur(""); setEnvoi(true);
    const r = await fetch(`/api/produits/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prix: p, images: [photo], actif: true, ...(!digital && { stock: s }) }),
    });
    const d = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) return setErreur(d.error || "Activation impossible.");
    router.refresh();
  };

  if (!ouvert) return (
    <button type="button" onClick={() => setOuvert(true)}
      className="w-full min-h-[44px] rounded-2xl bg-[#111111] text-white text-[12.5px] font-semibold px-3">
      {t("Activer ce produit")}
    </button>
  );

  return (
    <form onSubmit={activer} className="ax-card p-3 space-y-2.5" aria-label={t("Activer {0}", nom)}>
      <p className="text-[11.5px] text-[#888]">{t("Vérifie le prix, la photo et le stock : le produit devient visible de tes clients.")}</p>
      <label className="block text-[11.5px] font-semibold text-[#111]">{t("Prix")}
        <input type="number" inputMode="decimal" min="0" step="any" required value={prixSaisi} onChange={(e) => setPrixSaisi(e.target.value)}
          className="mt-1 w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-[14px]" />
      </label>
      {!digital && (
        <label className="block text-[11.5px] font-semibold text-[#111]">{t("Stock disponible")}
          <input type="number" inputMode="numeric" min="0" step="1" required value={stock} onChange={(e) => setStock(e.target.value)}
            className="mt-1 w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-[14px]" />
        </label>
      )}
      <label className="flex items-center gap-2 min-h-[44px] cursor-pointer text-[12px] font-semibold text-[#111]">
        {photo ? <img src={photo} alt={nom} className="w-11 h-11 rounded-lg object-cover" /> : <span className="w-11 h-11 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><ImagePlus size={16} className="text-[#999]" /></span>}
        {photo ? t("Changer la photo") : t("Ajouter une photo")}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) ajouterPhoto(f); }} />
      </label>
      {erreur && <p role="alert" className="text-[11.5px] font-medium text-[#B91C1C]">{t(erreur)}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={envoi} className="flex-1 min-h-[44px] rounded-xl bg-[#111111] text-white text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
          {envoi ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{t("Activer")}
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="min-h-[44px] px-3 rounded-xl border border-[#E5E5E5] text-[12.5px] text-[#666]">{t("Annuler")}</button>
      </div>
    </form>
  );
}
