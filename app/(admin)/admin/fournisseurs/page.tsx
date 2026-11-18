"use client";
// File de vérification des fournisseurs (admins AXSO). Seul endroit où une
// donnée fournisseur peut passer à « vérifié » : chaque décision exige sa
// source (registre consulté, appel à l'organisme…) et est tracée au journal.
// Rien n'est jamais vérifié automatiquement.
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { EtatVide } from "@/components/command-center/ui";
import { useT } from "@/components/I18nProvider";
import { Bouton, Chargement, CLASSE_CHAMP, Erreur, envoyer, Pastille, useApi } from "@/components/dashboard/sourcing/ui";
import { PastilleConfiance } from "@/components/dashboard/sourcing/fournisseurs/affichage";
import { CHAMPS_VERIFIABLES, LIBELLES_CONFIANCE, STATUTS_AUDIT, TYPES_AUDIT, TYPES_DOCUMENT, TYPES_ENTREPRISE, niveauConfiance } from "@/lib/sourcing/fournisseurs/types";

type Cible = { cible: "champ"; champ: string } | { cible: "document"; documentId: string } | { cible: "audit"; auditId: string };

/** Décision de vérification : niveau + source obligatoire. */
function Decision({ fournisseurId, cible, rejet, onFait }: { fournisseurId: string; cible: Cible; rejet?: boolean; onFait: () => void }) {
  const t = useT();
  const [niveau, setNiveau] = useState("verifie");
  const [source, setSource] = useState("");
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(false);
  async function valider() {
    setCharge(true); setErreur("");
    try { await envoyer(`/api/fournisseurs/${fournisseurId}/verifier`, "POST", { ...cible, niveau, source }); setSource(""); onFait(); }
    catch (e) { setErreur((e as Error).message); }
    setCharge(false);
  }
  return (
    <div className="mt-1.5">
      <div className="flex gap-1.5 flex-wrap">
        <select value={niveau} onChange={(e) => setNiveau(e.target.value)} className={`${CLASSE_CHAMP} !w-auto !py-1 !text-[11px]`} aria-label={t("Niveau de vérification")}>
          {Object.entries(LIBELLES_CONFIANCE).map(([cle, l]) => <option key={cle} value={cle}>{t(l)}</option>)}
          {rejet && <option value="rejete">{t("Rejeté")}</option>}
        </select>
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder={t("Source : registre consulté, organisme contacté…")} className={`${CLASSE_CHAMP} !py-1 !text-[11px] flex-1 min-w-[180px]`} aria-label={t("Source de la vérification (5 caractères minimum)")} />
        <Bouton petit onClick={valider} charge={charge} disabled={source.trim().length < 5}>{t("Enregistrer la vérification")}</Bouton>
      </div>
      {erreur && <p className="text-[11px] cc-bad mt-1">{t(erreur)}</p>}
    </div>
  );
}

export default function AdminFournisseurs() {
  const t = useT();
  const [saisie, setSaisie] = useState("");
  const [q, setQ] = useState("");
  const [tous, setTous] = useState(false);
  const { data, erreur, chargement, recharger } = useApi<{ peutEcrire: boolean; fournisseurs: any[] }>(`/api/fournisseurs/verifications?q=${encodeURIComponent(q)}${tous ? "&tous=1" : ""}`);
  const date = (d?: string | null) => (d ? new Date(d).toLocaleDateString(t.loc) : "—");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="cc-h1">{t("Fournisseurs à vérifier")}</h1>
        <p className="text-[13px] cc-muted mt-1 max-w-2xl">{t("Documents, audits et vérifications retirées après une modification du marchand, en attente de contrôle. Cherchez un fournisseur pour vérifier son identité ou son entreprise, corriger ou retirer une vérification. Ne marquez « vérifié » que ce que vous avez contrôlé vous-même à la source, et indiquez cette source : elle est affichée au marchand.")}</p>
        <form onSubmit={(e) => { e.preventDefault(); setQ(saisie.trim()); }} className="flex items-center gap-2 flex-wrap mt-3">
          <input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder={t("Nom du fournisseur…")} aria-label={t("Rechercher un fournisseur")} className={`${CLASSE_CHAMP} !w-auto min-w-[220px]`} />
          <Bouton petit type="submit">{t("Rechercher")}</Bouton>
          {q && <button type="button" className="cc-badge cc-badge-accent" onClick={() => { setQ(""); setSaisie(""); }} aria-label={t("Retirer la recherche « {0} »", q)}>« {q} » ×</button>}
          <label className="flex items-center gap-1.5 text-[12px] cc-muted">
            <input type="checkbox" checked={tous} onChange={(e) => setTous(e.target.checked)} />{t("Tous les fournisseurs")}
          </label>
        </form>
        {data && !data.peutEcrire && <p className="text-[12px] cc-muted mt-2">{t("Lecture seule : seul un administrateur complet peut enregistrer une vérification.")}</p>}
      </div>
      {chargement && !data ? <Chargement /> : erreur ? <Erreur message={erreur} /> : !data?.fournisseurs.length ? (
        <section className="cc-card"><EtatVide titre={t(q || tous ? "Aucun fournisseur trouvé." : "Aucune pièce en attente de vérification.")} explication={q ? t("Vérifiez l'orthographe du nom ou retirez la recherche.") : undefined} /></section>
      ) : data.fournisseurs.map((f) => (
        <section key={f.id} className="cc-card p-4 sm:p-5 space-y-4">
          <div>
            <p className="text-[15px] font-bold">{f.nom} <span className="text-[11px] font-normal cc-muted">· {f.pays} · {t(TYPES_ENTREPRISE[f.typeEntreprise] ?? f.typeEntreprise)} · {t("boutique")} {f.boutique}{f.actif ? "" : ` · ${t("désactivé")}`}</span></p>
            <p className="text-[11px] cc-muted mt-0.5">
              {f.url && <a href={f.url} target="_blank" rel="noreferrer" className="underline mr-3">{f.url}</a>}
              {f.email && <span className="mr-3">{f.email}</span>}
              {f.telephone && <span className="mr-3">{f.telephone}</span>}
              {f.anneeCreation && <span className="mr-3">{t("Créée en")} {f.anneeCreation}</span>}
              {f.nbEmployes && <span className="mr-3">{f.nbEmployes} {t("employés")}</span>}
              {f.capaciteProduction && <span className="mr-3">{t("Capacité")} : {f.capaciteProduction}</span>}
              {f.adresseUsine && <span className="mr-3">{t("Usine")} : {f.adresseUsine}</span>}
              {f.numeroLicence && <span>{t("Licence")} : {f.numeroLicence}</span>}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {Object.entries(CHAMPS_VERIFIABLES).map(([champ, libelle]) => {
              const derniere = f.verifications.find((v: any) => v.champ === champ);
              return (
                <div key={champ} className="rounded-xl border cc-sep p-3">
                  <p className="text-[12px] font-semibold">{t(libelle)}</p>
                  <div className="mt-1"><PastilleConfiance niveau={niveauConfiance(derniere?.niveau)} source={derniere?.source} /></div>
                  {derniere && <p className="text-[10px] cc-muted mt-1">{derniere.source} · {date(derniere.createdAt)}</p>}
                  {data.peutEcrire && <Decision fournisseurId={f.id} cible={{ cible: "champ", champ }} onFait={recharger} />}
                </div>
              );
            })}
          </div>

          {f.documents.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold cc-muted uppercase tracking-wide mb-1.5">{t("Documents")}</p>
              <div className="space-y-2">
                {f.documents.map((d: any) => (
                  <div key={d.id} className="rounded-xl border cc-sep p-3">
                    <div className="flex items-center gap-2 flex-wrap text-[12px]">
                      <b>{d.certification ? `${d.certification} — ` : ""}{d.nom}</b>
                      <span className="cc-muted">{t(TYPES_DOCUMENT[d.type] ?? d.type)}</span>
                      {d.statutVerification === "rejete" ? <Pastille ton="attention">{t("Rejeté")}</Pastille> : <PastilleConfiance niveau={niveauConfiance(d.statutVerification)} source={d.sourceVerification} />}
                      {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline"><ExternalLink size={11} />{t("Ouvrir le fichier")}</a> : <span className="cc-warn">{t("Aucun fichier")}</span>}
                    </div>
                    <p className="text-[11px] cc-muted mt-1">{t("Organisme")} : {d.organismeEmetteur ?? "—"} · {t("N°")} {d.numero ?? "—"} · {t("Émis le")} {date(d.dateEmission)} · {t("Expire le")} {date(d.dateExpiration)}</p>
                    {data.peutEcrire && <Decision fournisseurId={f.id} cible={{ cible: "document", documentId: d.id }} rejet onFait={recharger} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {f.audits.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold cc-muted uppercase tracking-wide mb-1.5">{t("Audits et inspections")}</p>
              <div className="space-y-2">
                {f.audits.map((a: any) => (
                  <div key={a.id} className="rounded-xl border cc-sep p-3">
                    <div className="flex items-center gap-2 flex-wrap text-[12px]">
                      <b>{t(TYPES_AUDIT[a.type] ?? a.type)}</b>
                      <span className="cc-muted">{a.prestataire} · {t(STATUTS_AUDIT[a.statut] ?? a.statut)} · {date(a.dateAudit)}{a.reference ? ` · ${a.reference}` : ""}</span>
                      <PastilleConfiance niveau={niveauConfiance(a.confiance)} source={a.sourceVerification} />
                      {a.rapportUrl && <a href={a.rapportUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline"><ExternalLink size={11} />{t("Ouvrir le rapport")}</a>}
                    </div>
                    {data.peutEcrire && <Decision fournisseurId={f.id} cible={{ cible: "audit", auditId: a.id }} onFait={recharger} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
