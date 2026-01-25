// File: src/ProductFormAI/utils/helpers.js

import { PROVIDER_META, STORAGE_KEY } from './constants';

/**
 * 获取 Provider 显示名称
 */
export const providerLabel = (p) => PROVIDER_META?.[p]?.label || String(p || "Unknown");

/**
 * 读取 AI 配置
 */
export const readAIConfig = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { extract_provider: "gemini", generate_provider: "claude" };
    const parsed = JSON.parse(raw);

    const extract_provider =
      parsed.extract_provider ||
      parsed.extractProvider ||
      parsed.extract_provider_name ||
      "gemini";

    const generate_provider =
      parsed.generate_provider ||
      parsed.planProvider ||
      parsed.generateProvider ||
      parsed.generate_provider_name ||
      "claude";

    return { extract_provider, generate_provider };
  } catch {
    return { extract_provider: "gemini", generate_provider: "claude" };
  }
};

/**
 * 安全的 JSON 解析
 */
export const safeJson = (maybe) => {
  if (maybe == null) return null;
  if (typeof maybe === "object") return maybe;
  if (typeof maybe === "string") {
    try {
      return JSON.parse(maybe);
    } catch {
      return null;
    }
  }
  return null;
};

/**
 * 带超时的 Promise
 */
export const withTimeout = async (promise, ms = 60000) => {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error("NETWORK_TIMEOUT")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
};

/**
 * 文件转 Base64 DataURL
 */
export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("FILE_READ_FAIL"));
    reader.readAsDataURL(file);
  });

/**
 * 创建空竞品对象
 */
export function makeEmptyCompetitor() {
  return {
    mode: "url",
    url: "",
    images: [],
    imagePreviews: [],
    hint: "",
    loading: false,
    success: false,
    error: "",
    data: null,
    providerUsed: "",
  };
}
