/**
 * Provider adapters (server-side only)
 *
 * Notes:
 * - Gemini REST: https://ai.google.dev/api/generate-content citeturn0search1turn0search10
 * - Claude Messages API: https://api.anthropic.com/v1/messages citeturn0search0turn0search15
 * - OpenAI Responses API: /v1/responses citeturn0search5turn0search2
 */

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`MISSING_ENV:${name}`);
  return v;
}

export async function callGemini(prompt) {
  const key = requireEnv("GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash-001";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      // 让模型尽量按 JSON 返回（不保证 100%）
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message || JSON.stringify(json) || `HTTP_${res.status}`;
    throw new Error(`GEMINI_ERROR:${msg}`);
  }

  const text = json?.candidates?.[0]?.content?.parts?.map(p => p?.text).filter(Boolean).join("") || "";
  return text.trim();
}

export async function callClaude(prompt) {
  const key = requireEnv("ANTHROPIC_API_KEY");
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message || JSON.stringify(json) || `HTTP_${res.status}`;
    throw new Error(`CLAUDE_ERROR:${msg}`);
  }

  // Claude 返回 content 数组
  const text =
    json?.content
      ?.filter((c) => c?.type === "text")
      ?.map((c) => c?.text)
      ?.join("") || "";
  return text.trim();
}

function extractOpenAIText(resp) {
  // Responses API: output -> content blocks
  const out = resp?.output || [];
  const texts = [];
  for (const item of out) {
    const content = item?.content || [];
    for (const c of content) {
      if (c?.type === "output_text" && c?.text) texts.push(c.text);
    }
  }
  return texts.join("").trim();
}

export async function callOpenAI(prompt) {
  const key = requireEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_MODEL || "gpt-4.1";
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
      max_output_tokens: 1800,
      temperature: 0.2,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message || JSON.stringify(json) || `HTTP_${res.status}`;
    throw new Error(`OPENAI_ERROR:${msg}`);
  }

  return extractOpenAIText(json);
}
