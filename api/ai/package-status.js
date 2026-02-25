// api/ai/package-status.js
// GET /api/ai/package-status?product_id=xxx
// 查询某产品的所有包装方案状态

const SB_URL = "https://ppzwadqyqjadfdklkvtw.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwendhZHF5cWphZGZka2xrdnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODgzOTQsImV4cCI6MjA4NDQ2NDM5NH0.xRfWovMVy55OqFFeS3hi1bn7X3CMji-clm8Hzo0yBok";

function sbHeaders() {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    Accept: "application/json",
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const productId = req.query?.product_id;
  if (!productId) return res.status(400).json({ error: "Missing product_id" });

  try {
    const url = `${SB_URL}/rest/v1/package_designs?product_id=eq.${productId}&order=created_at.asc`;
    const r = await fetch(url, { headers: sbHeaders() });
    if (!r.ok) throw new Error(await r.text());
    const designs = await r.json();

    const generating = designs.filter((d) => d.status === "generating").length;
    const pending = designs.filter((d) => d.status === "pending").length;
    const failed = designs.filter((d) => d.status === "failed").length;

    return res.status(200).json({
      success: true,
      total: designs.length,
      generating,
      pending,
      failed,
      done: generating === 0,
      designs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
