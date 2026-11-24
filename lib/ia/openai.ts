// Client OpenAI minimal : texte (Responses API) et images, avec la consommation réelle de jetons.
export const MODELE_TEXTE = () => process.env.OPENAI_MODELE_TEXTE || "gpt-5-mini";
export const MODELE_IMAGE = () => process.env.OPENAI_MODELE_IMAGE || "gpt-image-1-mini";
export const openaiConfigure = () => !!process.env.OPENAI_API_KEY;

const appel = async (chemin: string, corps: unknown, delai = 120_000) => {
  const r = await fetch(`https://api.openai.com/v1${chemin}`, { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(corps), signal: AbortSignal.timeout(delai) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`OpenAI ${r.status} ${d?.error?.code ?? ""}`.trim());
  return d;
};

export async function texteOpenAI(instructions: string, entree: string, maxSortie = 1200) {
  const d = await appel("/responses", { model: MODELE_TEXTE(), instructions, input: entree, max_output_tokens: maxSortie, reasoning: { effort: "minimal" } });
  const texte = (d.output ?? []).flatMap((o: any) => o.content ?? []).filter((c: any) => c.type === "output_text").map((c: any) => c.text).join("").trim();
  return { texte, modele: MODELE_TEXTE(), entree: Number(d.usage?.input_tokens ?? 0), sortie: Number(d.usage?.output_tokens ?? 0) };
}

export async function imageOpenAI(prompt: string, qualite: "medium" | "high", taille: "1024x1024" | "1024x1536" | "1536x1024" = "1024x1024") {
  const d = await appel("/images/generations", { model: MODELE_IMAGE(), prompt, n: 1, size: taille, quality: qualite, output_format: "webp" });
  const b64 = d.data?.[0]?.b64_json;
  if (typeof b64 !== "string") throw new Error("OpenAI : image absente");
  return { dataUrl: `data:image/webp;base64,${b64}`, modele: MODELE_IMAGE(), entree: Number(d.usage?.input_tokens ?? 0), sortie: Number(d.usage?.output_tokens ?? 0) };
}
