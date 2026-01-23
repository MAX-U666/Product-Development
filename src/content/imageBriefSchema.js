// src/content/imageBriefSchema.js
export function defaultImageBrief() {
  return {
    overall_style: '高端/自然/功效感（三选一或组合）',
    brand_tone: '专业可信/温和护理/强功效对比（选一）',
    target_audience: '例如：油头/头屑/敏感头皮/孕妇可用（按产品填）',
    key_claims: [
      '卖点1（可验证）',
      '卖点2（可验证）'
    ],
    required_images: [
      {
        scene: '主图',
        purpose: '搜索点击',
        description: '白底/浅色底 + 产品主体 + 2-3个核心卖点字',
        must_have: ['产品正面清晰', '容量/规格', '核心功效词'],
        avoid: ['夸张特效', '虚假对比', '医疗暗示'],
        refs: []
      },
      {
        scene: '卖点图1',
        purpose: '讲清功效机制',
        description: '成分/功效机制可视化（图标+短句）',
        must_have: ['成分名', '对应功效', '适用人群'],
        avoid: ['治愈/治疗/药用表述'],
        refs: []
      },
      {
        scene: '场景图',
        purpose: '建立使用联想',
        description: '浴室/洗发场景，真实质感',
        must_have: ['环境干净', '光线通透'],
        avoid: ['过度网感滤镜'],
        refs: []
      }
    ],
    delivery: {
      format: 'PNG/JPG',
      size: '1:1 主图 + 3:4 详情图（按平台）',
      text_language: '印尼语/英语/中文（按站点）'
    },
    notes: '补充说明'
  }
}
