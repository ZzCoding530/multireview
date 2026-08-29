// 约束解码层：把 LLM 的 JSON 输出钉死在合法类别内，杜绝幻觉标签。
// 注意：通过 HTTP API 无法做真正的 logits 掩码，此处用「JSON Schema 提示 + 输出白名单校验」
// 达到等价的结构化约束（详见 待完善清单）。
import { CATEGORIES, type Category, type LLMReview } from '../../types.js';

/**
 * 解析并约束 LLM 原始输出：
 * - 非法 JSON -> 返回 null
 * - category 不在合法集合 -> 返回 null（幻觉被拒绝）
 * - confidence 强制收敛到 [0,1]
 */
export function constrain(raw: string): LLMReview | null {
  const trimmed = raw.trim();
  let obj: unknown;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      obj = JSON.parse(m[0]);
    } catch {
      return null;
    }
  }

  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const cat = o.category;

  if (cat === undefined || cat === null || cat === 'none' || cat === '') {
    return {
      category: null,
      confidence: 0,
      reason: String(o.reason ?? ''),
      evidence: String(o.evidence ?? ''),
    };
  }

  if (typeof cat !== 'string' || !CATEGORIES.includes(cat as Category)) {
    return null; // 幻觉类别，直接拒绝
  }

  const conf = Number(o.confidence);
  const confidence = Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0.5;
  return {
    category: cat as Category,
    confidence,
    reason: String(o.reason ?? ''),
    evidence: String(o.evidence ?? ''),
  };
}
