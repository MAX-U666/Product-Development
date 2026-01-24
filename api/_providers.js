// api/_providers.js

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`MISSING_ENV:${name}`);
  return v;
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
