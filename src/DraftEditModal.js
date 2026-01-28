// src/DraftEditModal.jsx*
// 🆕 新增组件 - 编辑已拒绝的草稿并重新提交审核
import React, { useState, useEffect } from "react";
import { X, Save, Loader, Tag, Target, FileText, Beaker, Sparkles, Palette, DollarSign } from "lucide-react";
import { updateData } from "./api";
import { getCurrentBeijingISO } from "./timeConfig";

// 模块字段编辑组件
const ModuleField = ({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
  maxLength,
  required = false
}) => {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="h-4 w-4 text-indigo-600" />}
        <span className="text-sm font-semibold text-zinc-900">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      </div>

      {multiline ? (
        <textarea
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2 resize-none"
          rows={rows}
          value={value || ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
        />
      ) : (
        <input
          type="text"
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2"
          value={value || ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
        />
      )}

      {maxLength && (
        <div className="mt-1 text-xs text-zinc-400 text-right">
          {(value || "").length} / {maxLength}
        </div>
      )}
    </div>
  );
};

// 三语名称组件
const TrilingualNameField = ({ 
  nameZh, nameEn, nameId, 
  onChangeZh, onChangeEn, onChangeId 
}) => {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="h-4 w-4 text-indigo-600" />
        <span className="text-sm font-semibold text-zinc-900">
          产品名称（三语）<span className="text-red-500 ml-0.5">*</span>
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">中文名称</label>
          <input
            type="text"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2"
            value={nameZh || ""}
            placeholder="如：迷迭香防脱洗发水"
            onChange={(e) => onChangeZh(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">英文名称</label>
          <input
            type="text"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2"
            value={nameEn || ""}
            placeholder="如：Rosemary Anti Hair Fall Shampoo"
            onChange={(e) => onChangeEn(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">印尼语名称</label>
          <input
            type="text"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2"
            value={nameId || ""}
            placeholder="如：Shampo Anti Rontok Rosemary"
            onChange={(e) => onChangeId(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default function DraftEditModal({ draft, currentUser, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name_zh: "",
    name_en: "",
    name_id: "",
    positioning: "",
    selling_point: "",
    ingredients: "",
    efficacy: "",
    scent: "",
    texture_color: "",
    pricing: "",
    title: "",
    keywords: ""
  });

  const [saving, setSaving] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (draft) {
      setFormData({
        name_zh: draft.name_zh || "",
        name_en: draft.name_en || "",
        name_id: draft.name_id || "",
        positioning: draft.positioning || "",
        selling_point: draft.selling_point || "",
        ingredients: draft.ingredients || "",
        efficacy: draft.efficacy || "",
        scent: draft.scent || "",
        texture_color: draft.texture_color || "",
        pricing: draft.pricing || "",
        title: draft.title || "",
        keywords: draft.keywords || ""
      });
    }
  }, [draft]);

  // 保存并重新提交
  const handleSave = async () => {
    // 验证必填
    if (!formData.name_zh && !formData.name_en && !formData.name_id) {
      alert("请至少填写一个产品名称");
      return;
    }

    setSaving(true);

    try {
      // 更新草稿数据，状态改回"待审核"
      const updatePayload = {
        name_zh: formData.name_zh || null,
        name_en: formData.name_en || null,
        name_id: formData.name_id || null,
        positioning: formData.positioning || null,
        selling_point: formData.selling_point || null,
        ingredients: formData.ingredients || null,
        efficacy: formData.efficacy || null,
        scent: formData.scent || null,
        texture_color: formData.texture_color || null,
        pricing: formData.pricing || null,
        title: formData.title || null,
        keywords: formData.keywords || null,
        // 重置状态为待审核
        status: "待审核",
        // 清空之前的审核信息
        reviewed_by: null,
        reviewed_at: null,
        review_comment: null,
        // 更新修改时间
        updated_at: getCurrentBeijingISO(),
        updated_by: currentUser?.id || null
      };

      await updateData("ai_drafts", draft.id, updatePayload);

      alert("✅ 草稿已更新并重新提交审核！");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      alert(`保存失败：${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ESC 关闭
  useEffect(() => {
    const onKeyDown = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm py-8">
      <div className="relative w-[95vw] max-w-4xl rounded-2xl bg-white shadow-2xl">
        {/* 头部 */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-t-2xl border-b border-zinc-200 bg-white px-6 py-4">
          <div>
            <div className="text-lg font-bold text-zinc-900">✏️ 编辑草稿</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              修改后将重新提交审核 · {draft.category} · {draft.market} · {draft.platform}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 拒绝原因提示 */}
        {draft.review_comment && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="text-sm font-semibold text-red-800 mb-1">📝 上次审核意见</div>
            <div className="text-sm text-red-700">{draft.review_comment}</div>
            {draft.reviewed_at && (
              <div className="text-xs text-red-500 mt-2">
                审核时间：{new Date(draft.reviewed_at).toLocaleString('zh-CN')}
              </div>
            )}
          </div>
        )}

        {/* 表单内容 */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* 模块1: 产品名称（三语） */}
          <TrilingualNameField
            nameZh={formData.name_zh}
            nameEn={formData.name_en}
            nameId={formData.name_id}
            onChangeZh={(v) => setFormData(prev => ({ ...prev, name_zh: v }))}
            onChangeEn={(v) => setFormData(prev => ({ ...prev, name_en: v }))}
            onChangeId={(v) => setFormData(prev => ({ ...prev, name_id: v }))}
          />

          {/* 模块2: 产品定位 */}
          <ModuleField
            label="产品定位"
            icon={Target}
            value={formData.positioning}
            onChange={(v) => setFormData(prev => ({ ...prev, positioning: v }))}
            placeholder="如：热带湿热气候防脱清凉洗发水"
            multiline
            rows={2}
          />

          {/* 模块3: 卖点简介 */}
          <ModuleField
            label="卖点简介"
            icon={FileText}
            value={formData.selling_point}
            onChange={(v) => setFormData(prev => ({ ...prev, selling_point: v }))}
            placeholder="产品卖点段落描述..."
            multiline
            rows={4}
          />

          {/* 模块4: 主要成分 */}
          <ModuleField
            label="主要成分"
            icon={Beaker}
            value={formData.ingredients}
            onChange={(v) => setFormData(prev => ({ ...prev, ingredients: v }))}
            placeholder="如：迷迭香叶提取物, 薄荷油, 咖啡因..."
            multiline
            rows={2}
          />

          {/* 模块5: 主打功效 */}
          <ModuleField
            label="主打功效"
            icon={Sparkles}
            value={formData.efficacy}
            onChange={(v) => setFormData(prev => ({ ...prev, efficacy: v }))}
            placeholder="如：防脱发与强韧发根、即时清凉舒缓..."
            multiline
            rows={3}
          />

          {/* 模块6: 香味 */}
          <ModuleField
            label="香味"
            icon={Palette}
            value={formData.scent}
            onChange={(v) => setFormData(prev => ({ ...prev, scent: v }))}
            placeholder="如：清新薄荷迷迭香草本香"
          />

          {/* 模块7: 质地颜色 */}
          <ModuleField
            label="质地颜色"
            icon={Palette}
            value={formData.texture_color}
            onChange={(v) => setFormData(prev => ({ ...prev, texture_color: v }))}
            placeholder="如：淡绿色清透凝露质地"
          />

          {/* 模块8: 定价策略 */}
          <ModuleField
            label="定价策略"
            icon={DollarSign}
            value={formData.pricing}
            onChange={(v) => setFormData(prev => ({ ...prev, pricing: v }))}
            placeholder="如：IDR 49,900 / 59,900"
          />

          {/* 模块9: 产品标题 */}
          <ModuleField
            label="产品标题"
            icon={Tag}
            value={formData.title}
            onChange={(v) => setFormData(prev => ({ ...prev, title: v }))}
            placeholder="电商平台展示标题..."
            multiline
            rows={2}
            maxLength={255}
          />

          {/* 搜索关键词 */}
          <ModuleField
            label="搜索关键词"
            icon={Tag}
            value={formData.keywords}
            onChange={(v) => setFormData(prev => ({ ...prev, keywords: v }))}
            placeholder="用逗号分隔关键词..."
            multiline
            rows={2}
          />
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4 rounded-b-2xl">
          <div className="text-xs text-zinc-500">
            💡 保存后草稿状态将改为「待审核」，等待管理员重新审核
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  保存并重新提交
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
