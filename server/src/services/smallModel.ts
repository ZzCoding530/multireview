// 小模型（蒸馏后的"便宜在线模型"）——占位实现
// 真实小模型推理（如蒸馏后的 BERT/小 LLM）受限（无本地训练/推理环境），
// 此处用规则引擎模拟小模型行为，保留与 LLM 一致的 LLMReview 接口（见待完善清单）。
import { RuleEngine } from '../rules/ruleEngine.js';
import { listRules } from '../db/repository.js';
import type { LLMReview } from '../types.js';

export async function smallModelReview(text: string): Promise<LLMReview> {
  const engine = new RuleEngine(listRules());
  const d = engine.detect(text);
  if (d.categories.length === 0) {
    return { category: null, confidence: 0, reason: '小模型判定无违规', evidence: '' };
  }
  return {
    category: d.categories[0],
    confidence: d.confidence,
    reason: '小模型规则命中',
    evidence: d.hits[0]?.matched ?? '',
  };
}
