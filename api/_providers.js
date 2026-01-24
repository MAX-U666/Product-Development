function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`MISSING_ENV:${name}`);
  return v;
}

// ========== 文本模式的 AI 调用函数 ==========

// 调用 Gemini API
export async function callGemini(prompt) {
  const key = requireEnv("GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash-001";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
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

  const text =
    json?.content
      ?.filter((c) => c?.type === "text")
      ?.map((c) => c?.text)
      ?.join("") || "";
  return text.trim();
}

// 调用 OpenAI API
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

// DeepSeek API（OpenAI 兼容格式）
export async function callDeepSeek(prompt) {
  const key = requireEnv("DEEPSEEK_API_KEY");
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const url = "https://api.deepseek.com/chat/completions"; // OpenAI 兼容路径

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "" },
        { role: "user", content: prompt },
      ],
    }),
  });
  const json = await res.json();

  if (!res.ok) {
    const msg = json.error?.message || JSON.stringify(json);
    throw new Error(`DEEPSEEK_ERROR:${msg}`);
  }

  // 默认返回内容在 choices[0]?.message?.content
  const text = json.choices?.[0]?.message?.content || "";
  return text.trim();
}

// 通义千问（Qwen） API（OpenAI 兼容 / compatible-mode）
export async function callQwen(prompt) {
  const key = requireEnv("DASHSCOPE_API_KEY");
  const model = process.env.DASHSCOPE_MODEL || "qwen-plus";
  // 兼容方式的 Base URL（国内外命名略不同）
  const baseURL = process.env.DASHSCOPE_BASE_URL
    || "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const url = `${baseURL}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "" },
        { role: "user", content: prompt },
      ],
    }),
  });
  const json = await res.json();

  if (!res.ok) {
    const msg = json.error?.message || JSON.stringify(json);
    throw new Error(`QWEN_ERROR:${msg}`);
  }

  const text = json.choices?.[0]?.message?.content || "";
  return text.trim();
}

// Ark API — 需要提供真实文档 URL/结构
export async function callArk(prompt) {
  const key = requireEnv("ARK_API_KEY");
  const model = process.env.ARK_MODEL || "";
  const url = process.env.ARK_BASE_URL; // 需要你定义

  if (!url) throw new Error("MISSING_ENV:ARK_BASE_URL");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt, // 假设结构
    }),
  });
  const json = await res.json();

  if (!res.ok) {
    const msg = json.error?.message || JSON.stringify(json);
    throw new Error(`ARK_ERROR:${msg}`);
  }

  // 需要根据实际文档调整解析字段
  return json.result || "";
}

// ========== 图片模式的 AI 调用函数 ==========

/**
 * Gemini 图片识别
 * @param {string} prompt - 提示词
 * @param {Array} images - 图片数组 [{name, type, dataUrl}]
 * @returns {Promise<string>}
 */
export async function callGeminiWithImages(prompt, images) {
  const key = requireEnv("GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash-001";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  // 构建 parts：先文本，再图片
  const parts = [{ text: prompt }];
  
  for (const img of images) {
    // dataUrl 格式: data:image/png;base64,iVBORw0K...
    const base64Data = img.dataUrl.split(',')[1]; // 提取 base64 部分
    const mimeType = img.type || 'image/png';
    
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64Data
      }
    });
  }

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
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

/**
 * Claude 图片识别
 * @param {string} prompt - 提示词
 * @param {Array} images - 图片数组 [{name, type, dataUrl}]
 * @returns {Promise<string>}
 */
export async function callClaudeWithImages(prompt, images) {
  const key = requireEnv("ANTHROPIC_API_KEY");
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

  // 构建 content：先图片，再文本（Claude 推荐顺序）
  const content = [];
  
  for (const img of images) {
    // dataUrl 格式: data:image/png;base64,iVBORw0K...
    const base64Data = img.dataUrl.split(',')[1]; // 提取 base64 部分
    const mediaType = img.type || 'image/png';
    
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: base64Data
      }
    });
  }
  
  content.push({
    type: "text",
    text: prompt
  });

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
      messages: [{ role: "user", content }],
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message || JSON.stringify(json) || `HTTP_${res.status}`;
    throw new Error(`CLAUDE_ERROR:${msg}`);
  }

  const text =
    json?.content
      ?.filter((c) => c?.type === "text")
      ?.map((c) => c?.text)
      ?.join("") || "";
  return text.trim();
}
