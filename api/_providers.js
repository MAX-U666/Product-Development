/**
 * Provider adapters (server-side only)
 *
 * Notes:
 * - Gemini REST: https://ai.google.dev/api/generate-content
 * - Claude Messages API: https://api.anthropic.com/v1/messages
 * - OpenAI Responses API: /v1/responses
 */

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`MISSING_ENV:${name}`);
  return v;
}

// 调用 Gemini API
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

// 调用 Claude API
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

// 提取 OpenAI 返回的文本
function extractOpenAIText(resp) {
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

// 调用 OpenAI API
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

// 调用 DeepSeek API
export async function callDeepSeek(prompt) {
  const key = requireEnv("DEEPSEEK_API_KEY");
  const url = 'https://api.deepseek.ai/v1/your-endpoint'; // 替换为 DeepSeek 的实际 API 地址

  const body = {
    model: process.env.DEEPSEEK_MODEL || "deepseek-model",  // 模型名，需根据需求替换
    input: { prompt },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) {
      const msg = json?.error?.message || JSON.stringify(json) || `HTTP_${res.status}`;
      throw new Error(`DEEPSEEK_ERROR:${msg}`);
    }

    const text = json?.response || "";
    return text.trim();
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    throw error;
  }
}

// 调用 Qwen（千问）API
export async function callQwen(prompt) {
  const key = requireEnv("DASHSCOPE_API_KEY");
  const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';  // 千问接口地址

  const body = {
    model: process.env.DASHSCOPE_MODEL || "qwen-max",  // 根据需求替换模型名
    input: { prompt },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) {
      const msg = json?.error?.message || JSON.stringify(json) || `HTTP_${res.status}`;
      throw new Error(`QWEN_ERROR:${msg}`);
    }

    const text = json?.response || "";
    return text.trim();
  } catch (error) {
    console.error('Error calling Qwen API:', error);
    throw error;
  }
}

// 调用 Ark API
export async function callArk(prompt) {
  const key = requireEnv("ARK_API_KEY");
  const url = 'https://api.ark.ai/v1/your-endpoint';  // 替换为 Ark 的实际 API 地址

  const body = {
    model: process.env.ARK_MODEL || "ark-model",  // 模型名，需根据需求替换
    input: { prompt },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) {
      const msg = json?.error?.message || JSON.stringify(json) || `HTTP_${res.status}`;
      throw new Error(`ARK_ERROR:${msg}`);
    }

    const text = json?.response || "";
    return text.trim();
  } catch (error) {
    console.error('Error calling Ark API:', error);
    throw error;
  }
}
