"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { CadreSuivi, SuiviCommande } from "@/components/tracking/SuiviCommande";

export default function SuiviPage() {
  const t = useT();
  const [numero, setNumero] = useState("");
  const [telephone, setTelephone] = useState("");
  const [url, setUrl] = useState("");
  useEffect(() => { setNumero(new URLSearchParams(window.location.search).get("numero")?.trim().toUpperCase() || ""); }, []);
  function chercher(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ numero: numero.trim(), telephone: telephone.trim() });
    setUrl("/api/suivi?" + params);
  }
  if (url) return <SuiviCommande key={url} url={url} recommencer={() => setUrl("")}/>;
  return <CadreSuivi><section className="axs-suivi-search"><div className="axs-suivi-form">
    <h1>{t("Suivre ma commande")}</h1>
    <p>{t("Retrouvez votre colis avec le numéro de commande et le téléphone utilisé lors de l’achat.")}</p>
    <form onSubmit={chercher}>
      <label htmlFor="suivi-numero">{t("Numéro de commande")}</label>
      <input id="suivi-numero" value={numero} required placeholder="AX-20261120-XXXX" onChange={e => setNumero(e.target.value.toUpperCase())}/>
      <label htmlFor="suivi-tel">{t("Téléphone")}</label>
      <input id="suivi-tel" type="tel" autoComplete="tel" required value={telephone} onChange={e => setTelephone(e.target.value)}/>
      <button type="submit" disabled={!numero.trim() || telephone.replace(/\D/g,"").length < 8}><Search size={17}/>{t("Rechercher ma commande")}</button>
    </form></div><img className="axs-suivi-photo" src="/editorial/suivi-course.webp" alt=""/></section></CadreSuivi>;
}
