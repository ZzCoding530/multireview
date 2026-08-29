// 文本审核编排：规则引擎先行 -> 分级漏斗 -> 存疑走 LLM 精审
import { getPolicy, listRules } from '../db/repository.js';
import { RuleEngine } from '../rules/ruleEngine.js';
import type { Decision, DetectionResult, LLMReview } from '../types.js';
import { reviewWithLLM } from './llm/index.js';
import { decide } from './moderation.js';

export interface TextModerationResult {
  detection: DetectionResult;
  decision: Decision;
  llmReview: LLMReview | null;
  llmUsed: boolean;
}

export async function moderateText(
  content: string,
  businessLine: string,
): Promise<TextModerationResult> {
  const policy = getPolicy(businessLine) ?? getPolicy('general')!;
  const engine = new RuleEngine(listRules());
  const detection = engine.detect(content);
  let decision = decide(detection, policy);
  let llmReview: LLMReview | null = null;
  let llmUsed = false;

  // 仅存疑内容进入 LLM 精审，明确通过/拦截不花大模型成本
  if (decision === 'review') {
    llmUsed = true;
    try {
      llmReview = await reviewWithLLM(content);
    } catch {
      llmReview = null; // LLM 不可用 -> 维持人审（宁可延迟不可漏放）
    }
    if (llmReview) {
      if (llmReview.category === null) {
        decision = 'pass'; // LLM 判断无违规
      } else if (llmReview.confidence >= policy.rejectThreshold) {
        decision = 'reject'; // LLM 高置信违规
      } else {
        decision = 'review'; // LLM 也不确定，维持人审
      }
    }
    // llmReview 为 null（无法解析或不可用）时保持 review
  }

  return { detection, decision, llmReview, llmUsed };
}
