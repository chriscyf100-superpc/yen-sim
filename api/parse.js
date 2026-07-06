// api/parse.js
// Vercel Serverless Function — proxies text order parsing to Anthropic
// Runs SERVER-SIDE on Vercel, so the API key is never exposed to the browser

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Missing text field" });
  }

  const SYS = `You are an order parser for Yen Sim Trading Sdn Bhd, a timber company in Malaysia.
Input may be in English, Mandarin (普通话), Cantonese (廣東話), or Bahasa Melayu. Parse any language.

SPECIES (detect from English, Chinese, or Malay):
- Dark Hardwood: DH, DkN, 黑木, 黑硬木, kayu keras hitam
- Yellow Meranti: Ym, 黄梅兰地, meranti kuning
- Meranti: Mrt, 梅兰地, meranti
- Dark Red Meranti: DRM, 暗红梅兰地, meranti merah tua
- Balau: 巴劳, balau
- Chengal: 青格兰, chengal
- Kempas: Km, 坎帕斯, kempas

QTY/LENGTH (detect from English, Chinese, or Malay):
- "100/10" or "100/10'" = 100pcs @ 10ft
- "一百条十呎" = 100pcs @ 10ft
- "100 keping 10 kaki" = 100pcs @ 10ft
- Any length valid including odd: 11ft, 13ft, 15ft etc.

SIZE: 2x4, 1x2, 5/8x8 etc; grades A/B/AB/CA/CB after size

CRITICAL OUTPUT RULE: Your entire response must be ONLY the JSON object below — nothing before it, nothing after it. Do NOT write any introductory sentence. Do NOT use markdown code fences. Do NOT add any follow-up commentary, self-correction, or re-analysis after the JSON (e.g. never write "Wait, let me re-parse..."). Decide on your final answer internally, then output ONLY the finished JSON object. The very first character of your response must be { and the very last character must be }.

{"customer":null,"items":[{"species":"","size":"","lengths":[{"l":"10ft","q":0}],"notes":""}],"notes":"","confidence":"high|medium|low"}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_KEY,   // ← server-side only, never exposed
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system: SYS,
        messages: [{ role: "user", content: text }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic error:", data);
      return res.status(502).json({ error: "AI parse failed", detail: data });
    }

    const raw = data.content?.[0]?.text || "{}";

    let cleaned = raw.replace(/```json|```/g, "").trim();

    // Always extract just the {...} block regardless of preamble/trailing text
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.slice(start, end + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON parse failed. Raw Claude response:", raw);
      return res.status(502).json({
        error: "AI returned non-JSON response",
        detail: `Claude said: "${raw.slice(0, 300)}"`,
      });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Parse error:", err);
    return res.status(500).json({ error: "Internal error", detail: err.message });
  }
}
