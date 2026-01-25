/**
 * /api/upload-image
 * 
 * POST 请求：上传图片到 Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }

    const { file, bucket, folder } = req.body;

    if (!file || !bucket) {
      return res.status(400).json({ error: 'MISSING_REQUIRED_FIELDS' });
    }

    // 解析 base64 数据
    const matches = file.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'INVALID_FILE_FORMAT' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // 生成文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = mimeType.split('/')[1] || 'jpg';
    const filename = `${timestamp}-${randomStr}.${ext}`;
    
    const path = folder ? `${folder}/${filename}` : filename;

    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('[api/upload-image] Supabase error:', error);
      return res.status(500).json({ 
        error: 'UPLOAD_FAILED', 
        message: error.message 
      });
    }

    // 获取公共 URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return res.status(200).json({
      success: true,
      url: publicUrlData.publicUrl,
      path: data.path,
    });

  } catch (e) {
    console.error('[api/upload-image] Error:', e);
    return res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: String(e?.message || e) 
    });
  }
}
