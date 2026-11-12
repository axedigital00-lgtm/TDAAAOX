// Sons de fusée de l'inscription : module unique, généré en Web Audio (aucun fichier à charger).
// Pour passer à de vrais fichiers audio plus tard, remplacer l'intérieur en gardant la même API.
// Rien ne joue avant activerAudio() (appelé dans un clic : règle des navigateurs) ni si le son est coupé.
// Aucune fonction ne lève d'erreur : un son raté ne bloque jamais l'inscription.

const CLE = "axso_son_coupe";

type Voix = { sortie: GainNode; sources: AudioScheduledSourceNode[] };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bruit: AudioBuffer | null = null;
const enCours = new Set<Voix>();

export function sonCoupe(): boolean {
  try { return localStorage.getItem(CLE) === "1"; } catch { return false; }
}

export function couperSon(coupe: boolean): void {
  try { if (coupe) localStorage.setItem(CLE, "1"); else localStorage.removeItem(CLE); } catch {}
  if (coupe) eteindre(0.08);
}

/** À appeler dans un geste du marchand : crée le contexte audio et débloque iOS. */
export function activerAudio(): void {
  try {
    if (typeof window === "undefined") return;
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      // Limiteur en sortie : jamais de saturation, même quand les sons se chevauchent.
      const limiteur = ctx.createDynamicsCompressor();
      limiteur.threshold.value = -6;
      limiteur.knee.value = 0;
      limiteur.ratio.value = 20;
      limiteur.attack.value = 0.003;
      limiteur.release.value = 0.25;
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(limiteur).connect(ctx.destination);
      bruit = bruitRose(ctx);
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    // iOS : un son (même muet) joué pendant le clic déverrouille la sortie audio.
    const muet = ctx.createBufferSource();
    muet.buffer = ctx.createBuffer(1, 1, 22050);
    muet.connect(ctx.destination);
    muet.start(0);
  } catch {}
}

/** Poussée d'une étape : niveau 0 → 1, plus puissant et un peu plus long à chaque étape (0,8 à 1,2 s). */
export function jouerPoussee(niveau: number): void {
  const n = Math.min(Math.max(Number(niveau) || 0, 0), 1);
  jouer((c, sortie, t) => {
    const duree = 0.8 + 0.4 * n;
    const pic = 0.22 + 0.33 * n;

    // Souffle du réacteur : bruit rose dont le filtre s'ouvre puis se referme.
    const souffle = sourceBruit(c);
    const filtre = c.createBiquadFilter();
    filtre.type = "lowpass";
    filtre.Q.value = 0.7;
    filtre.frequency.setValueAtTime(260, t);
    filtre.frequency.exponentialRampToValueAtTime(700 + 1600 * n, t + duree * 0.3);
    filtre.frequency.exponentialRampToValueAtTime(220, t + duree);
    const env = enveloppe(c, t, pic, 0.1, duree);
    souffle.connect(filtre).connect(env).connect(sortie);

    // Basse : sinus grave qui descend légèrement.
    const basse = c.createOscillator();
    basse.type = "sine";
    basse.frequency.setValueAtTime(48 + 20 * n, t);
    basse.frequency.exponentialRampToValueAtTime(40, t + duree);
    basse.connect(enveloppe(c, t, 0.12 + 0.22 * n, 0.08, duree)).connect(sortie);

    return [souffle, basse].map(s => { s.start(t); s.stop(t + duree + 0.05); return s; });
  });
}

/** Décollage final (~5,2 s) : le grondement monte, culmine puis se dissipe. */
export function jouerDecollage(): void {
  jouer((c, sortie, t) => {
    const montee = 2.1, plateau = 2.7, fin = 5.2;

    const souffle = sourceBruit(c);
    const filtre = c.createBiquadFilter();
    filtre.type = "lowpass";
    filtre.Q.value = 0.8;
    filtre.frequency.setValueAtTime(180, t);
    filtre.frequency.exponentialRampToValueAtTime(2600, t + montee);
    filtre.frequency.setValueAtTime(2600, t + plateau);
    filtre.frequency.exponentialRampToValueAtTime(260, t + fin);

    // Léger tremblement du grondement (7 Hz) : la puissance « vibre » sans effet de jeu vidéo.
    const tremble = c.createGain();
    tremble.gain.value = 1;
    const lfo = c.createOscillator();
    lfo.frequency.value = 7;
    const profondeur = c.createGain();
    profondeur.gain.value = 0.12;
    lfo.connect(profondeur).connect(tremble.gain);

    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.62, t + montee);
    env.gain.setValueAtTime(0.62, t + plateau);
    env.gain.exponentialRampToValueAtTime(0.0001, t + fin);
    souffle.connect(filtre).connect(tremble).connect(env).connect(sortie);

    // Basse qui monte avec la poussée puis retombe.
    const basse = c.createOscillator();
    basse.type = "sine";
    basse.frequency.setValueAtTime(38, t);
    basse.frequency.exponentialRampToValueAtTime(64, t + montee);
    basse.frequency.exponentialRampToValueAtTime(34, t + fin);
    const envBasse = c.createGain();
    envBasse.gain.setValueAtTime(0.0001, t);
    envBasse.gain.linearRampToValueAtTime(0.34, t + montee);
    envBasse.gain.setValueAtTime(0.34, t + plateau);
    envBasse.gain.exponentialRampToValueAtTime(0.0001, t + fin);
    basse.connect(envBasse).connect(sortie);

    return [souffle, basse, lfo].map(s => { s.start(t); s.stop(t + fin + 0.05); return s; });
  });
}

/** Arrête tout en fondu (~150 ms) sans toucher à la préférence de coupure (ex. création échouée en plein décollage). */
export function arreterSons(): void {
  try { eteindre(0.15); } catch {}
}

export function vibrer(motif: number | number[]): void {
  try { if (!sonCoupe()) navigator.vibrate?.(motif); } catch {}
}

// ─── Interne ─────────────────────────────────────────────────────────────────

// Lance une voix : coupe en fondu la précédente, la branche au master, la nettoie à la fin.
function jouer(construire: (c: AudioContext, sortie: GainNode, t: number) => AudioScheduledSourceNode[]) {
  try {
    if (!ctx || !master || sonCoupe()) return;
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    eteindre(0.06);
    const sortie = ctx.createGain();
    sortie.connect(master);
    const sources = construire(ctx, sortie, ctx.currentTime + 0.005);
    const voix: Voix = { sortie, sources };
    enCours.add(voix);
    sources[0].onended = () => { enCours.delete(voix); try { sortie.disconnect(); } catch {} };
  } catch {}
}

function eteindre(fondu: number) {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const v of enCours) {
    try {
      v.sortie.gain.cancelScheduledValues(t);
      v.sortie.gain.setValueAtTime(v.sortie.gain.value, t);
      v.sortie.gain.linearRampToValueAtTime(0, t + fondu);
      v.sources.forEach(s => s.stop(t + fondu + 0.02));
    } catch {}
  }
  enCours.clear();
}

// Attaque linéaire courte puis décroissance exponentielle jusqu'au silence.
function enveloppe(c: AudioContext, t: number, pic: number, attaque: number, duree: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(pic, t + attaque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  return g;
}

function sourceBruit(c: AudioContext) {
  const s = c.createBufferSource();
  s.buffer = bruit;
  s.loop = true;
  return s;
}

// Bruit rose (méthode « economy » de Paul Kellet) : plus doux et plus grave que le bruit blanc.
// ponytail: 2 s en boucle, la répétition reste inaudible sous les filtres ; allonger si on l'entend.
function bruitRose(c: AudioContext) {
  const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const blanc = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + blanc * 0.099046;
    b1 = 0.963 * b1 + blanc * 0.2965164;
    b2 = 0.57 * b2 + blanc * 1.0526913;
    d[i] = (b0 + b1 + b2 + blanc * 0.1848) * 0.2;
  }
  return buf;
}
