"use client";
// Graphiques avancés et expériences 3D du Cockpit. SVG et WebGL sans dépendance ajoutée.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Maximize2, Minimize2, Pause, Play } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { formats } from "@/lib/command-center/format";
import { JOURS_SEMAINE, type Lien, type Noeud } from "@/lib/command-center/cockpit";
import { creerGlobe, versVecteur, type Etat, type Ville } from "@/components/marketing/motion/moteurGlobe";

const RAD = Math.PI / 180;
const SERIES = ["#EBA900", "#5b9cf0", "#2fbf71", "#d55181", "#9085e9", "#fb8c3c", "#4ecdc4", "#c9c9c4"];
const nb = (v: number) => v.toLocaleString("fr-FR");

export type PointGlobe = { iso: string; nom: string; lat: number; lng: number; marchands: number; commandes: number; gmv: number | null; lien: string };

export function GlobeCockpit({ points, argent }: { points: PointGlobe[]; argent: boolean }) {
  const t = useT();
  const { formatValeur } = formats(t);
  const routeur = useRouter();
  const cadre = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<Record<string, HTMLButtonElement | null>>({});
  const auto = useRef(true);
  const [lecture, setLecture] = useState(true);
  const [plein, setPlein] = useState(false);
  const [survol, setSurvol] = useState<PointGlobe | null>(null);
  const [etat, setEtat] = useState<"attente" | "ok" | "ko">("attente");
  const max = Math.max(1, ...points.map((p) => (argent ? p.gmv ?? 0 : p.commandes) || p.marchands));

  useEffect(() => {
    const c = canvas.current, boite = cadre.current;
    if (!c || !boite || !points.length) return;
    const villes: Ville[] = points.map((p) => ({ id: p.iso, nom: p.nom, lat: p.lat, lng: p.lng }));
    const hub = points[0];
    const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calme) auto.current = false;
    let moteur: ReturnType<typeof creerGlobe> = null, raf = 0, fin = false, visible = true, der = 0, temps = 0, tire = false, px = 0, py = 0, vit = 0;
    const e: Etat = { yaw: -hub.lng * RAD, pitch: Math.min(hub.lat, 30) * RAD * .8, zoom: 1.02, focus: versVecteur(hub.lat, hub.lng) };
    const peindre = () => {
      if (!moteur) return;
      moteur.dessiner(e, temps);
      for (const v of villes) {
        const el = labels.current[v.id]; if (!el) continue;
        const pos = moteur.projeter(v, e);
        if (pos) { el.style.transform = `translate3d(${pos.x.toFixed(1)}px,${pos.y.toFixed(1)}px,0)`; el.style.opacity = "1"; el.style.pointerEvents = "auto"; el.tabIndex = 0; }
        else { el.style.opacity = "0"; el.style.pointerEvents = "none"; el.tabIndex = -1; }
      }
    };
    const boucle = (m: number) => {
      if (fin || !visible || !moteur) { raf = 0; return; }
      const dt = Math.min(.05, (m - der) / 1000 || .016); der = m; temps += dt;
      if (!tire) { e.yaw += (auto.current ? .09 : 0) * dt + vit * dt; vit *= Math.exp(-dt * 2.5); }
      peindre();
      raf = requestAnimationFrame(boucle);
    };
    const lancer = () => { if (!raf && visible && moteur && !calme) { der = performance.now(); raf = requestAnimationFrame(boucle); } };
    const bas = (v: PointerEvent) => { if (v.button) return; tire = true; px = v.clientX; py = v.clientY; vit = 0; c.setPointerCapture(v.pointerId); c.style.cursor = "grabbing"; };
    const bouge = (v: PointerEvent) => { if (!tire) return; const k = 2.2 / c.clientHeight, dx = v.clientX - px, dy = v.clientY - py; px = v.clientX; py = v.clientY; e.yaw += dx * k; vit = dx * k * 60; e.pitch = Math.max(-1.1, Math.min(1.1, e.pitch + dy * k)); if (calme) peindre(); };
    const haut = () => { tire = false; c.style.cursor = "grab"; };
    const molette = (v: WheelEvent) => { if (!v.ctrlKey) return; v.preventDefault(); e.zoom = Math.max(.75, Math.min(1.9, e.zoom * (v.deltaY > 0 ? .95 : 1.05))); if (calme) peindre(); };
    c.addEventListener("pointerdown", bas); c.addEventListener("pointermove", bouge); c.addEventListener("pointerup", haut); c.addEventListener("pointercancel", haut); c.addEventListener("wheel", molette, { passive: false });
    const obs = new IntersectionObserver(([x]) => { visible = x.isIntersecting; if (visible) lancer(); });
    const ro = new ResizeObserver(() => { moteur?.redimensionner(); if (calme) peindre(); });
    const img = new Image();
    img.onload = () => {
      if (fin) return;
      try { moteur = creerGlobe(c, img, villes, hub.iso); } catch { moteur = null; }
      if (!moteur) return setEtat("ko");
      setEtat("ok"); ro.observe(c); obs.observe(boite); peindre(); lancer();
    };
    img.onerror = () => setEtat("ko");
    img.src = "/globe/terres.png";
    return () => { fin = true; cancelAnimationFrame(raf); obs.disconnect(); ro.disconnect(); c.removeEventListener("pointerdown", bas); c.removeEventListener("pointermove", bouge); c.removeEventListener("pointerup", haut); c.removeEventListener("pointercancel", haut); c.removeEventListener("wheel", molette); moteur?.detruire(); };
  }, [points]);

  useEffect(() => {
    const f = () => setPlein(document.fullscreenElement === cadre.current);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);

  if (!points.length) return <div className="ccx-globe ccx-vide">{t("Aucun pays à afficher sur ce périmètre.")}</div>;
  const info = survol ?? points[0];
  return <div ref={cadre} className="ccx-globe" data-etat={etat}>
    <canvas ref={canvas} role="img" aria-label={t("Globe 3D de l'activité par pays. Faites-le glisser pour le tourner.")} />
    {etat === "ko" && <p className="ccx-vide">{t("La 3D n'est pas disponible sur cet appareil.")}</p>}
    {etat === "ok" && <div className="ccx-labels">{points.map((p) => {
      const v = (argent ? p.gmv ?? 0 : p.commandes) || p.marchands;
      return <button key={p.iso} type="button" ref={(el) => { labels.current[p.iso] = el; }} aria-label={`${p.nom} : ${t("filtrer")}`} onMouseEnter={() => setSurvol(p)} onFocus={() => setSurvol(p)} onClick={() => routeur.push(p.lien)}>
        <i style={{ height: 8 + (v / max) * 42 }} /><span>{p.iso}</span>
      </button>;
    })}</div>}
    <aside className="ccx-info">
      <small>{survol ? t("Pays survolé") : t("Premier marché")}</small><strong>{info.nom}</strong>
      <dl><div><dt>{t("Marchands")}</dt><dd>{nb(info.marchands)}</dd></div><div><dt>{t("Commandes")}</dt><dd>{nb(info.commandes)}</dd></div>{argent && <div><dt>GMV</dt><dd>{formatValeur(info.gmv ?? 0, "xaf")}</dd></div>}</dl>
    </aside>
    <div className="ccx-outils">
      <button type="button" aria-label={lecture ? t("Arrêter la rotation") : t("Reprendre la rotation")} onClick={() => { auto.current = !auto.current; setLecture(auto.current); }}>{lecture ? <Pause size={14} /> : <Play size={14} />}</button>
      <button type="button" aria-label={plein ? t("Quitter le plein écran") : t("Plein écran")} onClick={() => (plein ? document.exitFullscreen() : cadre.current?.requestFullscreen())}>{plein ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
    </div>
  </div>;
}

/** Relief isométrique : une colonne 3D par créneau jour × heure. */
export function Relief3D({ grille }: { grille: number[][] }) {
  const t = useT();
  const [rot, setRot] = useState(false);
  const [info, setInfo] = useState<{ j: number; h: number; v: number } | null>(null);
  const max = Math.max(1, ...grille.flat());
  const X = 13, Y = 7.2, H = 74;
  const proj = (j: number, h: number) => { const a = rot ? 23 - h : h, b = rot ? 6 - j : j; return { x: 96 + (a - b) * X, y: 92 + (a + b) * Y }; };
  const cases = useMemo(() => {
    const l: { j: number; h: number; v: number; o: number }[] = [];
    grille.forEach((ligne, j) => ligne.forEach((v, h) => l.push({ j, h, v, o: (rot ? 23 - h : h) + (rot ? 6 - j : j) })));
    return l.sort((a, b) => a.o - b.o);
  }, [grille, rot]);
  const vide = max === 1 && !grille.flat().some(Boolean);
  return <div>
    <svg viewBox="0 0 430 330" className="ccx-relief" role="img" aria-label={t("Relief 3D des commandes par jour et par heure")} onMouseLeave={() => setInfo(null)}>
      {cases.map(({ j, h, v }) => {
        const p = proj(j, h), z = v ? 3 + (v / max) * H : 1.5, k = v / max;
        const c = v ? `hsl(${42 - k * 8} ${72 + k * 22}% ${30 + k * 34}%)` : "var(--cc-surface-3)";
        const c2 = v ? `hsl(${40 - k * 8} ${70 + k * 20}% ${20 + k * 22}%)` : "var(--cc-surface-2)", c3 = v ? `hsl(${38 - k * 8} ${68 + k * 20}% ${13 + k * 16}%)` : "var(--cc-surface-2)";
        const haut = `${p.x},${p.y - z} ${p.x + X},${p.y + Y - z} ${p.x},${p.y + 2 * Y - z} ${p.x - X},${p.y + Y - z}`;
        return <g key={`${j}-${h}`} onMouseEnter={() => setInfo({ j, h, v })} opacity={info && info.j === j && info.h === h ? 1 : info ? .82 : 1}>
          <polygon fill={c2} points={`${p.x - X},${p.y + Y - z} ${p.x},${p.y + 2 * Y - z} ${p.x},${p.y + 2 * Y} ${p.x - X},${p.y + Y}`} />
          <polygon fill={c3} points={`${p.x + X},${p.y + Y - z} ${p.x},${p.y + 2 * Y - z} ${p.x},${p.y + 2 * Y} ${p.x + X},${p.y + Y}`} />
          <polygon fill={c} points={haut} />
        </g>;
      })}
    </svg>
    <div className="flex items-center justify-between gap-2 text-[12px]">
      <span className="cc-muted">{vide ? t("Aucune commande sur la période.") : info ? <><b className="cc-num">{nb(info.v)}</b> {t("commande(s)")} · {t(JOURS_SEMAINE[info.j])} {String(info.h).padStart(2, "0")}h</> : t("Survolez une colonne")}</span>
      <button type="button" className="cc-btn cc-btn-sm" onClick={() => setRot((r) => !r)}>{t("Pivoter")}</button>
    </div>
  </div>;
}

export function Heatmap({ grille }: { grille: number[][] }) {
  const t = useT();
  const max = Math.max(1, ...grille.flat());
  return <div className="ccx-heat" role="table" aria-label={t("Commandes par jour et par heure")}>
    {grille.map((l, j) => <div role="row" key={j}><span role="rowheader">{t(JOURS_SEMAINE[j])}</span>{l.map((v, h) => <i role="cell" key={h} title={`${t(JOURS_SEMAINE[j])} ${h}h : ${v}`} style={{ opacity: v ? .22 + (v / max) * .78 : 1, background: v ? "#EBA900" : "var(--cc-surface-2)" }} />)}</div>)}
    <div aria-hidden><span />{Array.from({ length: 24 }, (_, h) => <b key={h}>{h % 6 === 0 ? h : ""}</b>)}</div>
  </div>;
}

export function Sankey({ noeuds, liens }: { noeuds: Noeud[]; liens: Lien[] }) {
  const t = useT();
  const [actif, setActif] = useState<string | null>(null);
  if (!noeuds.length) return <p className="cc-faint text-[13px] py-8 text-center">{t("Aucune commande sur la période.")}</p>;
  const L = 640, H = 300, largeur = 12, ecart = 12, colX = [96, 314, 532];
  const total = Math.max(...[0, 1, 2].map((c) => noeuds.filter((n) => n.colonne === c).reduce((s, n) => s + n.valeur, 0)));
  const maxN = Math.max(...[0, 1, 2].map((c) => noeuds.filter((n) => n.colonne === c).length));
  const k = (H - ecart * (maxN - 1)) / total;
  const pos = new Map<string, { x: number; y: number; h: number; sortie: number; entree: number }>();
  for (const c of [0, 1, 2]) {
    const liste = noeuds.filter((n) => n.colonne === c), haut = liste.reduce((s, n) => s + n.valeur * k, 0) + ecart * (liste.length - 1);
    let y = (H - haut) / 2;
    for (const n of liste) { pos.set(n.id, { x: colX[c], y, h: Math.max(2, n.valeur * k), sortie: 0, entree: 0 }); y += n.valeur * k + ecart; }
  }
  const ordonnes = [...liens].sort((a, b) => b.valeur - a.valeur);
  return <svg viewBox={`0 0 ${L} ${H + 8}`} className="w-full h-auto" role="img" aria-label={t("Flux des commandes : canal, paiement, statut")} onMouseLeave={() => setActif(null)}>
    {ordonnes.map((l) => {
      const a = pos.get(l.de)!, b = pos.get(l.vers)!, e = l.valeur * k, y0 = a.y + a.sortie + e / 2, y1 = b.y + b.entree + e / 2;
      a.sortie += e; b.entree += e;
      const x0 = a.x + largeur, x1 = b.x, m = (x0 + x1) / 2, allume = !actif || actif === l.de || actif === l.vers;
      return <path key={`${l.de}${l.vers}`} d={`M${x0} ${y0} C${m} ${y0} ${m} ${y1} ${x1} ${y1}`} fill="none" stroke={l.vers.includes("annulee") || l.vers.includes("echouee") ? "#f0605d" : l.vers.includes("payee") ? "#2fbf71" : "#EBA900"} strokeOpacity={allume ? .36 : .06} strokeWidth={Math.max(1, e)}><title>{`${l.valeur}`}</title></path>;
    })}
    {noeuds.map((n) => { const p = pos.get(n.id)!; return <g key={n.id} onMouseEnter={() => setActif(n.id)}>
      <rect x={p.x} y={p.y} width={largeur} height={p.h} rx={3} fill="var(--cc-text)" />
      <text x={n.colonne === 2 ? p.x + largeur + 7 : p.x - 7} y={p.y + p.h / 2 + 4} textAnchor={n.colonne === 2 ? "start" : "end"} fontSize="11.5" fill="var(--cc-text-2)">{t(n.nom)} <tspan fill="var(--cc-text)" fontWeight="600">{nb(n.valeur)}</tspan></text>
    </g>; })}
  </svg>;
}

export function Entonnoir({ etapes }: { etapes: { nom: string; valeur: number }[] }) {
  const t = useT();
  const max = Math.max(1, etapes[0]?.valeur ?? 1);
  return <ol className="ccx-entonnoir">{etapes.map((e, i) => {
    const prec = i ? etapes[i - 1].valeur : null;
    return <li key={e.nom}><div className="flex justify-between gap-2 text-[12.5px]"><span>{t(e.nom)}</span><span className="cc-num"><b>{nb(e.valeur)}</b>{prec ? <span className="cc-faint"> · {Math.round((e.valeur / prec) * 100)} %</span> : null}</span></div>
      <div className="ccx-barre"><span style={{ width: `${(e.valeur / max) * 100}%`, animationDelay: `${i * 80}ms` }} /></div></li>;
  })}</ol>;
}

export function Anneau({ items, centre }: { items: { nom: string; valeur: number }[]; centre?: string }) {
  const t = useT();
  const total = items.reduce((s, x) => s + x.valeur, 0);
  const R = 42, C = 2 * Math.PI * R;
  let dec = 0;
  return <div className="flex items-center gap-4">
    <svg viewBox="0 0 110 110" width={116} height={116} role="img" aria-label={items.map((x) => `${t(x.nom)} ${x.valeur}`).join(", ")} style={{ flex: "none" }}>
      <circle cx="55" cy="55" r={R} fill="none" stroke="var(--cc-surface-3)" strokeWidth="12" />
      {total > 0 && items.map((x, i) => { const l = (x.valeur / total) * C, el = <circle key={x.nom} cx="55" cy="55" r={R} fill="none" stroke={SERIES[i % SERIES.length]} strokeWidth="12" strokeDasharray={`${Math.max(l - 1.5, 0)} ${C}`} strokeDashoffset={-dec} transform="rotate(-90 55 55)" />; dec += l; return el; })}
      <text x="55" y="59" textAnchor="middle" fontSize="16" fontWeight="600" fill="var(--cc-text)">{centre ?? nb(total)}</text>
    </svg>
    <ul className="flex-1 min-w-0 space-y-1.5">{items.map((x, i) => <li key={x.nom} className="flex items-center gap-2 text-[12.5px]"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: SERIES[i % SERIES.length] }} /><span className="cc-muted truncate flex-1">{t(x.nom)}</span><span className="cc-num font-medium">{nb(x.valeur)}</span></li>)}</ul>
  </div>;
}

export function Treemap({ items, argent }: { items: { nom: string; valeur: number }[]; argent: boolean }) {
  const t = useT();
  const { formatValeur } = formats(t);
  if (!items.length) return <p className="cc-faint text-[13px] py-8 text-center">{t("Aucune vente sur la période.")}</p>;
  const total = items.reduce((s, x) => s + x.valeur, 0);
  const rects: { x: number; y: number; w: number; h: number; it: (typeof items)[number]; i: number }[] = [];
  const decoupe = (l: typeof items, x: number, y: number, w: number, h: number, base: number) => {
    if (!l.length) return;
    if (l.length === 1) { rects.push({ x, y, w, h, it: l[0], i: base }); return; }
    const somme = l.reduce((s, a) => s + a.valeur, 0);
    let cumul = 0, c = 0;
    while (c < l.length - 1 && (cumul + l[c].valeur) <= somme / 2) cumul += l[c++].valeur;
    if (c === 0) { cumul = l[0].valeur; c = 1; }
    const r = cumul / somme;
    if (w >= h) { decoupe(l.slice(0, c), x, y, w * r, h, base); decoupe(l.slice(c), x + w * r, y, w * (1 - r), h, base + c); }
    else { decoupe(l.slice(0, c), x, y, w, h * r, base); decoupe(l.slice(c), x, y + h * r, w, h * (1 - r), base + c); }
  };
  decoupe(items, 0, 0, 100, 100, 0);
  return <div className="ccx-treemap">{rects.map((r) => <div key={r.it.nom} title={`${r.it.nom} : ${argent ? formatValeur(r.it.valeur, "xaf") : nb(r.it.valeur)}`} style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%`, background: SERIES[r.i % SERIES.length] }}>
    {r.w > 14 && r.h > 14 && <><b>{r.it.nom}</b><span>{Math.round((r.it.valeur / total) * 100)} %</span></>}
  </div>)}</div>;
}

export function Cohortes({ lignes }: { lignes: { mois: number; taille: number; retention: (number | null)[] }[] }) {
  const t = useT();
  const nom = (m: number) => new Date(Date.UTC(Math.floor(m / 12), m % 12, 1)).toLocaleDateString(t.loc, { month: "short", year: "2-digit", timeZone: "UTC" });
  return <div className="overflow-x-auto"><table className="ccx-cohortes">
    <thead><tr><th>{t("Cohorte")}</th><th>{t("Marchands")}</th>{lignes[0]?.retention.map((_, k) => <th key={k}>M{k}</th>)}</tr></thead>
    <tbody>{lignes.map((l) => <tr key={l.mois}><th>{nom(l.mois)}</th><td className="cc-num">{l.taille}</td>{l.retention.map((r, k) => <td key={k} style={r == null ? undefined : { background: `rgba(235,169,0,${.08 + r * .82})`, color: r > .55 ? "#111" : undefined }}>{r == null ? "" : `${Math.round(r * 100)} %`}</td>)}</tr>)}</tbody>
  </table></div>;
}

export function Radar({ axes }: { axes: { nom: string; score: number | null }[] }) {
  const t = useT();
  const n = axes.length, R = 88, c = 130;
  if (n < 3) return null;
  const pt = (i: number, v: number) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v]; };
  const forme = axes.map((a, i) => pt(i, (a.score ?? 0) / 100).join(",")).join(" ");
  return <svg viewBox="-46 0 352 260" className="w-full max-w-[380px] mx-auto" role="img" aria-label={axes.map((a) => `${a.nom} ${a.score ?? "n/d"}`).join(", ")}>
    {[.25, .5, .75, 1].map((k) => <polygon key={k} fill="none" stroke="var(--cc-border-strong)" points={axes.map((_, i) => pt(i, k).join(",")).join(" ")} />)}
    {axes.map((a, i) => { const [x, y] = pt(i, 1), [lx, ly] = pt(i, 1.18); return <g key={a.nom}><line x1={c} y1={c} x2={x} y2={y} stroke="var(--cc-border)" /><text x={lx} y={ly + 3} fontSize="9.5" textAnchor={lx < c - 8 ? "end" : lx > c + 8 ? "start" : "middle"} fill="var(--cc-text-2)">{t(a.nom)}</text></g>; })}
    <polygon points={forme} fill="rgba(235,169,0,.26)" stroke="#EBA900" strokeWidth="1.8" className="ccx-radar" />
    {axes.map((a, i) => { const [x, y] = pt(i, (a.score ?? 0) / 100); return <circle key={a.nom} cx={x} cy={y} r="2.6" fill="#EBA900" />; })}
  </svg>;
}

export function ExportCsv({ nom, lignes }: { nom: string; lignes: (string | number)[][] }) {
  const t = useT();
  return <button type="button" className="cc-btn cc-btn-sm" onClick={() => {
    const neutre = (v: string | number) => { const s = String(v); return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`; };
    const url = URL.createObjectURL(new Blob(["﻿" + lignes.map((l) => l.map(neutre).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `${nom}.csv`; a.click(); URL.revokeObjectURL(url);
  }}>{t("Exporter en CSV")}</button>;
}
