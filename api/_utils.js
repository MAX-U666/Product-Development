/**
 * Vercel Serverless Functions - shared utils
 *
 * ✅ 只在服务端执行：可安全使用 API Key
 * ✅ 统一 JSON 读取 / 返回格式 / Provider 归一化
 */

export async function readJson(req) {
  // Vercel 通常会自动解析 req.body（若 content-type: application/json）
  if (req.body && typeof req.body === "object") return req.body;

  // 兼容：手动读取 raw body（某些代理/运行时会让 req.body 为空）
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

export function requirePost(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { success: false, error: "METHOD_NOT_ALLOWED" });
    return false;
  }
  return true;
}

/**
 * 统一 provider 命名（前端存 localStorage: gemini/claude/gpt4）
 */
export function normalizeProvider(p) {
  const v = String(p || "").toLowerCase().trim();
  if (v === "gpt4" || v === "openai" || v === "gpt-4") return "gpt4";
  if (v === "claude" || v === "anthropic") return "claude";
  return "gemini";
}
