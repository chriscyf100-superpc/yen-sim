// api/parse-image.js
// Vercel Serverless Function — proxies image OCR + parsing to Anthropic
// Accepts base64 image, returns parsed order JSON

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Vercel usually auto-parses JSON bodies, but fall back to manual parsing
  // in case req.body arrives as a raw string/buffer instead of an object.
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); }
    catch (e) { return res.status(400).json({ error: "Invalid JSON body", detail: e.message }); }
  }
  if (Buffer.isBuffer(body)) {
    try { body = JSON.parse(body.toString("utf8")); }
    catch (e) { return res.status(400).json({ error: "Invalid JSON body (buffer)", detail: e.message }); }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body missing or not JSON", bodyType: typeof req.body });
  }

  const { image, mimeType } = body;
  if (!image) {
    return res.status(400).json({ error: "Missing image field (base64 string)", receivedKeys: Object.keys(body) });
  }

  const SYS = `You are an OCR + order parser for Yen Sim Trading Sdn Bhd, a timber company in Malaysia.
First transcribe the handwritten text exactly as written, then parse it into a timber order.
Input may be in English, Mandarin, Cantonese, or Bahasa Melayu.

SPECIES: DH/DkN→"Dark Hardwood", Ym/YM→"Yellow Meranti", Mrt/MRT→"Meranti",
         DRM→"Dark Red Meranti", Balau→"Balau", Chengal→"Chengal", Km/KM→"Kempas"
         Also: 黑木→Dark Hardwood, 梅兰地→Meranti

QTY/LENGTH: "100/10'"=100pcs@10ft, "一百条十呎"=100@10ft, "100 keping 10 kaki"=100@10ft
Any length valid including odd numbers: 11ft, 13ft, 15ft etc.

SIZE: 2x4, 1x2, 5/8x8; grades A/B/AB after size

CRITICAL OUTPUT RULE: Your entire response must be ONLY the JSON object below — nothing before it, nothing after it. Do NOT write "I'll transcribe..." or any other sentence. Do NOT use markdown code fences. The very first character of your response must be { and the very last character must be }.

{"ocrText":"verbatim handwriting transcript","customer":null,"items":[{"species":"","size":"","lengths":[{"l":"10ft","q":0}],"notes":""}],"notes":"","confidence":"high|medium|low"}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: SYS,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType || "image/jpeg",
                data: image,
              },
            },
            {
              type: "text",
              text: "Transcribe and parse this handwritten Malaysian timber order sheet.",
            },
          ],
        }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic error:", data);
      return res.status(502).json({ error: "AI OCR failed", detail: data });
    }

    const raw = data.content?.[0]?.text || "{}";

    // Strip markdown fences if present
    let cleaned = raw.replace(/```json|```/g, "").trim();

    // If Claude added a sentence before/after the JSON, extract just the {...} block
    if (!cleaned.startsWith("{")) {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        cleaned = cleaned.slice(start, end + 1);
      }
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON parse failed. Raw Claude response:", raw);
      return res.status(502).json({
        error: "AI returned non-JSON response",
        detail: `Claude said: "${raw.slice(0, 200)}"`,
      });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Image parse error:", err);
    return res.status(500).json({ error: "Internal error", detail: err.message });
  }
}
