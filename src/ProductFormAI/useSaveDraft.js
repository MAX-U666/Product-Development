// File: src/ProductFormAI/hooks/useSaveDraft.js

import { useState, useCallback } from "react";
import { insertAIDraft } from "../../api";
import { getCurrentBeijingISO } from "../../timeConfig";

export function useSaveDraft(currentUser, formData, competitors, planResult, aiConfig, aiExplain, onSuccess, onClose) {
  const [savingDraft, setSavingDraft] = useState(false);

  const handleSaveDraft = useCallback(async () => {
    // 兼容多种用户对象结构
    const userId = currentUser?.id ?? currentUser?.user_id ?? currentUser?.userId;
    
    // 严格检查，允许 id 为 0
    if (userId === null || userId === undefined) {
      console.error("=== 用户信息调试 ===");
      console.error("currentUser:", currentUser);
      console.error("currentUser?.id:", currentUser?.id);
      console.error("localStorage currentUser:", localStorage.getItem('currentUser'));
      
      alert("当前用户信息缺失，请重新登录\n\n详细信息请查看浏览器控制台");
      return;
    }

    console.log("=== 准备保存草稿 ===");
    console.log("用户ID:", userId);
    console.log("标题:", formData.title || "(未填写)");

    setSavingDraft(true);
    try {
      // 估算成本
      let estimatedCost = 0;
      competitors.forEach(c => {
        if (c.success) {
          estimatedCost += c.mode === 'image' ? 0.002 : 0.0005;
        }
      });
      if (planResult) {
        if (aiConfig.generate_provider === 'claude') estimatedCost += 0.015;
        else if (aiConfig.generate_provider === 'gpt4') estimatedCost += 0.02;
        else estimatedCost += 0.001;
      }

      // 保存到 ai_drafts 表（扁平字段）
      await insertAIDraft({
        develop_month: formData.developMonth,
        category: formData.category,
        market: formData.market,
        platform: formData.platform,
        
        positioning: formData.positioning || null,
        selling_point: formData.sellingPoint || null,
        ingredients: formData.ingredients || null,
        efficacy: formData.efficacy || null,
        volume: formData.volume || null,
        scent: formData.scent || null,
        texture_color: formData.color || null,
        pricing: formData.pricing || null,
        title: formData.title || null,
        keywords: formData.keywords || null,
        packaging_requirements: formData.packaging || null,
        
        extract_provider: aiConfig.extract_provider,
        generate_provider: aiConfig.generate_provider,
        competitors_data: competitors
          .filter((c) => c.success && c.data)
          .map((c) => ({
            mode: c.mode,
            url: c.url || "",
            data: c.data || null,
            providerUsed: c.providerUsed || "",
          })),
        ai_explanations: aiExplain,
        estimated_cost: estimatedCost,
        
        status: '待审核',
        created_by: userId,
        created_at: getCurrentBeijingISO(),
      });

      alert('✅ AI 草稿已保存！\n\n请前往「🤖 AI 草稿」Tab 进行审核');
      onSuccess?.();
      onClose?.();
    } catch (e) {
      const msg = String(e?.message || e) === "NETWORK_TIMEOUT"
        ? "网络超时：保存草稿失败，请稍后重试"
        : `保存草稿失败：${String(e?.message || "").slice(0, 200) || "请稍后重试"}`;
      alert(msg);
    } finally {
      setSavingDraft(false);
    }
  }, [currentUser, formData, competitors, planResult, aiConfig, aiExplain, onSuccess, onClose]);

  return {
    savingDraft,
    handleSaveDraft,
  };
}
