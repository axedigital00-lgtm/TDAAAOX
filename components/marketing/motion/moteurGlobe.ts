// Moteur WebGL2 du globe, sans dépendance : la sphère est calculée par pixel (points de terre,
// atmosphère, étoiles), les trajets et les villes sont dessinés par-dessus avec occultation.
export type Ville = { id: string; nom: string; lat: number; lng: number };

const RAD = Math.PI / 180;
const CAMERA = 3.05, FOCALE = 1.9;

const VS_QUAD = `#version 300 es
in vec2 aP; void main(){ gl_Position = vec4(aP, 0., 1.); }`;

const FS_SPHERE = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes; uniform mat3 uRot; uniform float uCam, uF, uTime; uniform sampler2D uMask; uniform vec3 uFocus;
const float PI = 3.14159265, LIGNES = 210.;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float etoiles(vec2 uv){
  float s = 0.;
  for (int i = 0; i < 2; i++) {
    float e = 90. + float(i) * 110.; vec2 g = uv * e, c = floor(g); float r = h21(c + float(i));
    if (r > .985) { vec2 d = fract(g) - .5 - (vec2(h21(c + 1.), h21(c + 2.)) - .5) * .6;
      s += smoothstep(.09, 0., length(d)) * (.35 + .65 * sin(uTime * (.5 + r) + r * 40.) * .5 + .3); }
  }
  return s;
}
bool afrique(float lat, float lng){
  float a = lat / PI * 180., g = lng / PI * 180.;
  if (a < -36. || a > 37.6 || g < -18.5 || g > 52.) return false;
  if (a > 12. && g > 43.5 - (a - 12.) * .61) return false;
  if (a > 35.9 && g < -5.) return false;
  return true;
}
void main(){
  vec2 uv = (gl_FragCoord.xy * 2. - uRes) / uRes.y;
  vec3 ro = vec3(0., 0., uCam), rd = normalize(vec3(uv, -uF));
  float b = dot(ro, rd), h = b * b - dot(ro, ro) + 1.;
  float d = length(ro - rd * b);
  vec3 c = vec3(.004, .006, .012) + vec3(.03, .05, .09) * exp(-1.5 * max(d - .9, 0.)) * .55 + vec3(.72, .78, .92) * etoiles(uv) * .55;
  float halo = exp(-max(d - 1., 0.) * 11.);
  c += (vec3(.16, .38, .86) * .62 + vec3(.92, .62, .1) * .1) * halo;
  if (h > 0.) {
    vec3 n = ro + rd * (-b - sqrt(h));
    vec3 l = transpose(uRot) * n;
    float lat = asin(clamp(l.y, -1., 1.)), lng = atan(l.x, l.z);
    float dLat = PI / LIGNES, r = floor((lat + PI * .5) / dLat), latC = (r + .5) * dLat - PI * .5;
    float cols = max(1., floor(2. * LIGNES * cos(latC))), dLng = 2. * PI / cols;
    float col = floor((lng + PI) / dLng), lngC = (col + .5) * dLng - PI;
    float terre = textureLod(uMask, vec2((lngC + PI) / (2. * PI), (PI * .5 - latC) / PI), 0.).r;
    float dd = length(vec2((lng - lngC) * cos(lat), lat - latC)) / dLat;
    float point = terre > .5 ? 1. - smoothstep(.27, .43, dd) : 0.;
    vec3 L = normalize(vec3(-.55, .62, .72));
    float diff = clamp(dot(n, L) * .9 + .32, 0., 1.);
    float bord = pow(1. - clamp(dot(n, -rd), 0., 1.), 3.2);
    vec3 mer = mix(vec3(.006, .012, .028), vec3(.022, .05, .11), diff);
    bool af = afrique(latC, lngC);
    float dist = acos(clamp(dot(normalize(l), uFocus), -1., 1.));
    float onde = exp(-pow((dist - fract(uTime * .22) * 1.1) * 15., 2.)) * (1. - fract(uTime * .22));
    float proche = exp(-dist * dist * 58.);
    vec3 teinte = af ? mix(vec3(.82, .55, .08), vec3(1., .82, .36), proche + onde) : vec3(.3, .39, .55);
    float force = af ? .68 + 1.15 * proche + 1.25 * onde : .42;
    c = mer + teinte * point * force * (.2 + diff) + vec3(.2, .46, 1.) * bord * .78;
    float aa = smoothstep(0., .035, sqrt(h));
    c = mix(vec3(.11, .27, .66), c, aa);
  }
  c = c / (1. + c * .28);
  o = vec4(pow(c, vec3(.92)), 1.);
}`;

const COMMUN = `uniform mat3 uRot; uniform float uCam, uF, uAsp;
float visible(vec3 w){ vec3 ro = vec3(0.,0.,uCam), v = w - ro; float l = length(v); vec3 rd = v / l;
  float b = dot(ro, rd), h = b*b - dot(ro,ro) + 1.; if (h < 0.) return 1.; return (-b - sqrt(h)) > l - .012 ? 1. : 0.; }
vec4 proj(vec3 w){ vec3 v = w - vec3(0.,0.,uCam); return vec4(v.x * uF / uAsp, v.y * uF, 0., -v.z); }`;

const VS_ARC = `#version 300 es
precision highp float;
in vec3 aPos, aNext; in float aSide, aT, aOff;
uniform vec2 uRes; ${COMMUN}
out float vT, vOff, vVis, vSide;
void main(){
  vec3 w = uRot * aPos; vec4 a = proj(w), b = proj(uRot * aNext);
  vec2 sa = a.xy / a.w, sb = b.xy / b.w, dir = sb - sa; dir.x *= uAsp;
  float l = length(dir); dir = l > 1e-5 ? dir / l : vec2(1., 0.);
  vec2 nrm = vec2(-dir.y / uAsp, dir.x);
  a.xy += nrm * aSide * (3.2 / uRes.y) * a.w;
  gl_Position = a; vT = aT; vOff = aOff; vVis = visible(w); vSide = aSide;
}`;

const FS_ARC = `#version 300 es
precision highp float;
in float vT, vOff, vVis, vSide; out vec4 o; uniform float uTime;
void main(){
  if (vVis < .5) discard;
  float tete = fract(uTime * .24 + vOff) * 1.45 - .2;
  float g = vT < tete ? exp(-(tete - vT) * 5.2) : exp(-(vT - tete) * 80.);
  float bords = 1. - smoothstep(.15, 1., abs(vSide));
  vec3 c = mix(vec3(.96, .62, .08), vec3(1., .94, .74), pow(g, 3.));
  float a = (.09 + g * 1.05) * bords;
  o = vec4(c * a, a);
}`;

const VS_POINT = `#version 300 es
precision highp float;
in vec3 aPos; in float aFort, aOff;
uniform float uDpr, uTime; ${COMMUN}
out float vVis, vFort, vP;
void main(){
  vec3 w = uRot * aPos; gl_Position = proj(w); vVis = visible(w); vFort = aFort;
  vP = fract(uTime * .55 + aOff); gl_PointSize = (aFort > .5 ? 54. : 30.) * uDpr;
}`;

const FS_POINT = `#version 300 es
precision highp float;
in float vVis, vFort, vP; out vec4 o;
void main(){
  if (vVis < .5) discard;
  float d = length(gl_PointCoord - .5) * 2.;
  float coeur = 1. - smoothstep(.1, .16, d);
  float anneau = (1. - smoothstep(.0, .05, abs(d - vP))) * (1. - vP) * .85;
  float a = coeur + anneau;
  vec3 c = mix(vec3(1., .69, .12), vec3(1., .97, .86), coeur);
  o = vec4(c * a, a);
}`;

function programme(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const compiler = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, compiler(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compiler(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "programme");
  const u: Record<string, WebGLUniformLocation | null> = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < n; i++) { const nom = gl.getActiveUniform(p, i)!.name; u[nom] = gl.getUniformLocation(p, nom); }
  return { p, u };
}

export const versVecteur = (lat: number, lng: number, r = 1): [number, number, number] => {
  const a = lat * RAD, g = lng * RAD;
  return [r * Math.cos(a) * Math.sin(g), r * Math.sin(a), r * Math.cos(a) * Math.cos(g)];
};

/** Rotation : pitch (X) après yaw (Y), en colonnes pour WebGL. */
export function matriceRotation(yaw: number, pitch: number) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return new Float32Array([cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy]);
}

function trajet(a: [number, number, number], b: [number, number, number], n = 72) {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), ang = Math.acos(dot), s = Math.sin(ang) || 1;
  const alt = 0.05 + ang * 0.2;
  const pts: number[][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, k0 = Math.sin((1 - t) * ang) / s, k1 = Math.sin(t * ang) / s, r = 1.004 + alt * Math.sin(Math.PI * t);
    pts.push([(k0 * a[0] + k1 * b[0]) * r, (k0 * a[1] + k1 * b[1]) * r, (k0 * a[2] + k1 * b[2]) * r]);
  }
  return pts;
}

export type Etat = { yaw: number; pitch: number; zoom: number; focus: [number, number, number] };

export function creerGlobe(canvas: HTMLCanvasElement, masque: HTMLImageElement, villes: Ville[], hubId: string) {
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" });
  if (!gl) return null;
  const sphere = programme(gl, VS_QUAD, FS_SPHERE), arc = programme(gl, VS_ARC, FS_ARC), point = programme(gl, VS_POINT, FS_POINT);

  const vaoQuad = gl.createVertexArray()!;
  gl.bindVertexArray(vaoQuad);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const locQ = gl.getAttribLocation(sphere.p, "aP");
  gl.enableVertexAttribArray(locQ); gl.vertexAttribPointer(locQ, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, masque);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const hub = villes.find((v) => v.id === hubId)!;
  const a0 = versVecteur(hub.lat, hub.lng);
  const brut: number[] = [];
  villes.filter((v) => v.id !== hubId).forEach((v, iv) => {
    const pts = trajet(a0, versVecteur(v.lat, v.lng)), off = iv * 0.137;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1], p2 = pts[Math.min(i + 2, pts.length - 1)];
      const t0 = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1);
      const s = (p: number[], q: number[], cote: number, t: number) => brut.push(p[0], p[1], p[2], q[0], q[1], q[2], cote, t, off);
      s(p0, p1, -1, t0); s(p0, p1, 1, t0); s(p1, p2, 1, t1);
      s(p0, p1, -1, t0); s(p1, p2, 1, t1); s(p1, p2, -1, t1);
    }
  });
  const vaoArc = gl.createVertexArray()!;
  gl.bindVertexArray(vaoArc);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(brut), gl.STATIC_DRAW);
  ([["aPos", 3, 0], ["aNext", 3, 12], ["aSide", 1, 24], ["aT", 1, 28], ["aOff", 1, 32]] as const).forEach(([nom, taille, dec]) => {
    const l = gl.getAttribLocation(arc.p, nom);
    gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, taille, gl.FLOAT, false, 36, dec);
  });
  const nbArc = brut.length / 9;

  const vaoPts = gl.createVertexArray()!;
  gl.bindVertexArray(vaoPts);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(villes.flatMap((v, i) => [...versVecteur(v.lat, v.lng, 1.006), v.id === hubId ? 1 : 0, i * 0.173])), gl.STATIC_DRAW);
  ([["aPos", 3, 0], ["aFort", 1, 12], ["aOff", 1, 16]] as const).forEach(([nom, taille, dec]) => {
    const l = gl.getAttribLocation(point.p, nom);
    gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, taille, gl.FLOAT, false, 20, dec);
  });
  gl.bindVertexArray(null);

  let dpr = 1, L = 1, H = 1;
  const redimensionner = () => {
    dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.5 : 2);
    L = Math.max(1, canvas.clientWidth); H = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(L * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  redimensionner();

  /** Position écran (px CSS) d'un point du globe, null s'il est caché par la sphère. */
  const projeter = (v: Ville, e: Etat) => {
    const r = matriceRotation(e.yaw, e.pitch), p = versVecteur(v.lat, v.lng, 1.01);
    const x = r[0] * p[0] + r[3] * p[1] + r[6] * p[2], y = r[1] * p[0] + r[4] * p[1] + r[7] * p[2], z = r[2] * p[0] + r[5] * p[1] + r[8] * p[2];
    const cam = CAMERA / e.zoom, vz = z - cam;
    const l = Math.hypot(x, y, vz), dx = x / l, dy = y / l, dz = vz / l;
    const b = dz * cam, h = b * b - cam * cam + 1;
    if (h > 0 && -b - Math.sqrt(h) < l - 0.02) return null;
    return { x: L / 2 + (dx / -dz) * FOCALE * H / 2, y: H / 2 - (dy / -dz) * FOCALE * H / 2 };
  };

  const dessiner = (e: Etat, temps: number) => {
    const rot = matriceRotation(e.yaw, e.pitch), cam = CAMERA / e.zoom, asp = L / H;
    gl.disable(gl.BLEND);
    gl.useProgram(sphere.p); gl.bindVertexArray(vaoQuad);
    gl.uniform2f(sphere.u.uRes, canvas.width, canvas.height); gl.uniformMatrix3fv(sphere.u.uRot, false, rot);
    gl.uniform1f(sphere.u.uCam, cam); gl.uniform1f(sphere.u.uF, FOCALE); gl.uniform1f(sphere.u.uTime, temps);
    gl.uniform1i(sphere.u.uMask, 0); gl.uniform3fv(sphere.u.uFocus, e.focus);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(arc.p); gl.bindVertexArray(vaoArc);
    gl.uniformMatrix3fv(arc.u.uRot, false, rot); gl.uniform1f(arc.u.uCam, cam); gl.uniform1f(arc.u.uF, FOCALE);
    gl.uniform1f(arc.u.uAsp, asp); gl.uniform2f(arc.u.uRes, H, H); gl.uniform1f(arc.u.uTime, temps);
    gl.drawArrays(gl.TRIANGLES, 0, nbArc);

    gl.useProgram(point.p); gl.bindVertexArray(vaoPts);
    gl.uniformMatrix3fv(point.u.uRot, false, rot); gl.uniform1f(point.u.uCam, cam); gl.uniform1f(point.u.uF, FOCALE);
    gl.uniform1f(point.u.uAsp, asp); gl.uniform1f(point.u.uDpr, dpr); gl.uniform1f(point.u.uTime, temps);
    gl.drawArrays(gl.POINTS, 0, villes.length);
    gl.bindVertexArray(null);
  };

  return { dessiner, projeter, redimensionner, detruire: () => gl.getExtension("WEBGL_lose_context")?.loseContext() };
}
