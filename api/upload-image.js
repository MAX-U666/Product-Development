/**
 * /api/upload-image
 *
 * POST：上传图片到 Supabase Storage（统一 bucket = bottle-library）
 *
 * 关键改动：
 * 1) bucket 不再从前端接收，避免 Bucket not found
 * 2) 任何异常尽量返回 JSON（前端不再出现 json() 解析失败）
 * 3) 兼容传入 base64 dataURL
 */

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    const err = new Error("Supabase env missing");
    err.detail = { hasSUPABASE_URL: !!url, hasSUPABASE_SERVICE_KEY: !!key };
    throw err;
  }
  return createClient(url, key);
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      return res.status(200).json({ ok: true });
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "METHOD_NOT_ALLOWED", got: req.method });
    }

    const supabase = getSupabase();

    const body = req.body || {};
    const { file, folder } = body;

    // ✅ 统一 bucket（不再从前端传）
    const bucket = "bottle-library";

    if (!file) {
      return res.status(400).json({ error: "MISSING_REQUIRED_FIELDS", required: ["file"] });
    }

    // 解析 base64 dataURL：data:image/png;base64,xxxx
    const matches = String(file).match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({
        error: "INVALID_FILE_FORMAT",
        message: "file must be a base64 dataURL like data:image/png;base64,xxxx",
      });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    // 生成文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2, 10);
    const ext = mimeType.split("/")[1] || "jpg";
    const filename = `${timestamp}-${randomStr}.${ext}`;

    // folder 允许为空；建议你传：products/{productId}/ref 等
    const safeFolder = folder ? String(folder).replace(/^\/+|\/+$/g, "") : "";
    const path = safeFolder ? `${safeFolder}/${filename}` : filename;

    // 上传
    const { data, error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

    if (error) {
      console.error("[api/upload-image] Supabase error:", error);
      return res.status(500).json({
        error: "UPLOAD_FAILED",
        message: error.message,
        hint: error.hint || null,
        details: error.details || null,
        code: error.code || null,
        bucket,
        path,
      });
    }

    // 公共 URL（bucket 需为 Public）
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);

    return res.status(200).json({
      success: true,
      url: publicUrlData?.publicUrl || null,
      path: data?.path || path,
      bucket,
    });
  } catch (e) {
    console.error("[api/upload-image] Error:", e?.detail || e);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: String(e?.message || e),
      detail: e?.detail || null,
    });
  }
}
