import bandes from "./land-bands.json";

export type Camera = { latitude: number; longitude: number; zoom: number };
export type Lieu = { nom: string; total: number; lat: number | null; lng: number | null };
export const origine: Camera = { latitude: 5, longitude: 12, zoom: 1 };
export const zoomMin = 0.65;
export const zoomMax = 4;
export const borner = (valeur: number, min: number, max: number) => Math.min(max, Math.max(min, valeur));
export const longitude = (valeur: number) => ((valeur + 180) % 360 + 360) % 360 - 180;

const rad = Math.PI / 180;

function point(lat: number, lng: number) {
  const cosLat = Math.cos(lat * rad);
  return { x: cosLat * Math.cos(lng * rad), y: cosLat * Math.sin(lng * rad), z: Math.sin(lat * rad) };
}

// Intersections des terres à chaque parallèle impair, issues de Natural Earth
// 1:110m (domaine public). L’espacement angulaire augmente près des pôles.
const points = bandes.flatMap((limites, i) => {
  const lat = -89 + 2 * i;
  const n = Math.max(1, Math.round(180 * Math.cos(lat * rad)));
  return Array.from({ length: n }, (_, j) => {
    const lng = -180 + (j + (i % 2) / 2) * 360 / n;
    const terre = limites.some((ouest, k) => k % 2 === 0 && lng >= ouest && lng < limites[k + 1]);
    return { ...point(lat, lng), terre };
  });
});

export type Repere = { nom: string; x: number; y: number };

export function dessinerGlobe(ctx: CanvasRenderingContext2D, largeur: number, hauteur: number,
  camera: Camera, lieux: Lieu[], selection: string): Repere[] {
  const cx = largeur / 2, cy = hauteur / 2;
  const rayon = Math.min(largeur, hauteur) * .46 * camera.zoom;
  const cosLon = Math.cos(camera.longitude * rad), sinLon = Math.sin(camera.longitude * rad);
  const cosLat = Math.cos(camera.latitude * rad), sinLat = Math.sin(camera.latitude * rad);
  function projeter(p: ReturnType<typeof point>) {
    const horizontal = cosLon * p.x + sinLon * p.y;
    return { x: cx + rayon * (cosLon * p.y - sinLon * p.x),
      y: cy - rayon * (cosLat * p.z - sinLat * horizontal), visible: cosLat * horizontal + sinLat * p.z > 0 };
  }

  ctx.clearRect(0, 0, largeur, hauteur);
  const fond = ctx.createRadialGradient(cx-rayon*.26,cy-rayon*.32,rayon*.08,cx,cy,rayon);
  fond.addColorStop(0,"#fcffff"); fond.addColorStop(.88,"#e4f4f1"); fond.addColorStop(1,"#cbe5e3");
  ctx.fillStyle = fond;
  ctx.beginPath(); ctx.arc(cx,cy,rayon,0,2*Math.PI); ctx.fill();
  const terre = new Path2D(), mer = new Path2D();
  for (const p of points) {
    const q = projeter(p);
    if (!q.visible || q.x < -4 || q.x > largeur+4 || q.y < -4 || q.y > hauteur+4) continue;
    const r = Math.max(.45, rayon * (p.terre ? .0049 : .0021));
    const path = p.terre ? terre : mer;
    path.moveTo(q.x+r,q.y); path.arc(q.x,q.y,r,0,2*Math.PI);
  }
  ctx.fillStyle="#b5d8d4"; ctx.fill(mer);
  ctx.fillStyle="#4aa99f"; ctx.fill(terre);

  const reperes: Repere[] = [];
  for (const lieu of lieux) {
    if (lieu.lat == null || lieu.lng == null) continue;
    const p = projeter(point(lieu.lat,lieu.lng));
    if (!p.visible || p.x < 0 || p.x > largeur || p.y < 0 || p.y > hauteur) continue;
    ctx.beginPath(); ctx.arc(p.x,p.y,lieu.nom === selection ? 7 : 5,0,2*Math.PI);
    ctx.fillStyle="#693ab3"; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle="white"; ctx.stroke();
    reperes.push({nom:lieu.nom, x:p.x, y:p.y});
  }
  return reperes;
}
