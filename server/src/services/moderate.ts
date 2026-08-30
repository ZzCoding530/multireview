// 文本审核编排：规则引擎先行 -> 分级漏斗 -> 存疑走 LLM/小模型精审（灰度路由 + 检索增强）
import { getPolicy, listRules } from '../db/repository.js';
import { RuleEngine } from '../rules/ruleEngine.js';
import type { Decision, DetectionResult, LLMReview } from '../types.js';
import { reviewWithLLM } from './llm/index.js';
import { decide } from './moderation.js';
import { routeModel } from './modelVersion.js';
import { smallModelReview } from './smallModel.js';
import { buildFewShot } from './rag.js';
import { recordLatency } from './metrics.js';

export interface TextModerationResult {
  detection: DetectionResult;
  decision: Decision;
  llmReview: LLMReview | null;
  llmUsed: boolean;
  modelName?: string;
}

export async function moderateText(
  content: string,
  businessLine: string,
): Promise<TextModerationResult> {
  const start = Date.now();
  const policy = getPolicy(businessLine) ?? getPolicy('general')!;
  const engine = new RuleEngine(listRules());
  const detection = engine.detect(content);
  let decision = decide(detection, policy);
  let llmReview: LLMReview | null = null;
  let llmUsed = false;
  let modelName: string | undefined;

  // 仅存疑内容进入精审，明确通过/拦截不花大模型成本
  if (decision === 'review') {
    llmUsed = true;
    const route = routeModel();
    modelName = route.name;
    try {
      if (route.provider === 'mock-small') {
        // 便宜的小模型扛在线流量（占位）
        llmReview = await smallModelReview(content);
      } else {
        // 大模型（DeepSeek）+ 检索增强 few-shot
        const fewShot = buildFewShot(content);
        llmReview = await reviewWithLLM(content, fewShot || undefined);
      }
    } catch {
      llmReview = null; // 精审不可用 -> 维持人审（宁可延迟不可漏放）
    }
    if (llmReview) {
      if (llmReview.category === null) decision = 'pass';
      else if (llmReview.confidence >= policy.rejectThreshold) decision = 'reject';
      else decision = 'review';
    }
  }

  recordLatency(Date.now() - start);
  return { detection, decision, llmReview, llmUsed, modelName };
}
