"use client";
// « Activer ce produit » : un exemple d'Axia (inactif, prix proposé, stock 0) devient un vrai produit
// une fois prix, photo et stock vérifiés. PUT /api/produits/[id] avec actif:true → exempleAxia:false.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import { televerser } from "@/lib/televerser";
import { Banner, Button, Modal, TextField, Thumbnail } from "@/components/ui/adm";

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
    if (!(p > 0)) return setErreur("Indiquez votre vrai prix.");
    if (!digital && (stock === "" || !Number.isInteger(s) || s < 0)) return setErreur("Indiquez votre stock réel.");
    if (!photo) return setErreur("Ajoutez une photo de votre produit.");
    setErreur(""); setEnvoi(true);
    const r = await fetch(`/api/produits/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prix: p, images: [photo], actif: true, ...(!digital && { stock: s }) }),
    });
    const d = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) return setErreur(d.error || "Activation impossible.");
    setOuvert(false);
    router.refresh();
  };

  // data-stop : dans une ligne de liste cliquable, un clic dans la fenêtre n'ouvre pas la fiche.
  return (
    <span data-stop>
      <Button size="sm" variant="primary" onClick={() => setOuvert(true)}>{t("Activer ce produit")}</Button>
      <Modal open={ouvert} onClose={() => setOuvert(false)} locked={envoi} size="sm" title={t("Activer {0}", nom)}
        footer={<>
          <Button onClick={() => setOuvert(false)} disabled={envoi}>{t("Annuler")}</Button>
          <Button variant="primary" type="submit" form={`activer-${id}`} loading={envoi}>{t("Activer")}</Button>
        </>}>
        <form id={`activer-${id}`} onSubmit={activer} className="space-y-3">
          <p className="m-0 text-(--color-text-secondary)">{t("Vérifiez le prix, la photo et le stock : le produit devient visible de vos clients.")}</p>
          <TextField label={t("Prix")} type="number" inputMode="decimal" min="0" step="any" required value={prixSaisi} onChange={(e) => setPrixSaisi(e.target.value)} />
          {!digital && (
            <TextField label={t("Stock disponible")} type="number" inputMode="numeric" min="0" step="1" required value={stock} onChange={(e) => setStock(e.target.value)} />
          )}
          <label className="flex cursor-pointer items-center gap-3 font-[550] text-(--color-text-strong)">
            <Thumbnail src={photo || null} alt={nom} size={40} />
            {photo ? t("Changer la photo") : t("Ajouter une photo")}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) ajouterPhoto(f); }} />
          </label>
          {erreur && <Banner tone="critical">{t(erreur)}</Banner>}
        </form>
      </Modal>
    </span>
  );
}
