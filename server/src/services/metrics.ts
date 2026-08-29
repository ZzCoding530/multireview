// 审核统计五指标：召回率、误伤率、人审占比、单条成本、审核时延
import { getStats, listRules } from '../db/repository.js';
import { RuleEngine } from '../rules/ruleEngine.js';
import { getPrefixCacheStats } from './llm/index.js';
import { qualityStats } from '../db/phase3.js';

// DeepSeek v4-flash 定价（元/百万 tokens）
const PRICE_HIT_INPUT = 0.02 / 1e6;
const PRICE_MISS_INPUT = 1 / 1e6;
const PRICE_OUTPUT = 2 / 1e6;
const HUMAN_REVIEW_COST = 0.1; // 元/条（人工审核假设成本）

// 内置标注评测集（文本 + 金标准标签）
const LABELED_EVAL_SET: Array<{ text: string; label: string }> = [
  { text: '这里有人在赌博，请处理', label: 'illegal' },
  { text: '今天天气很好，适合出门', label: 'none' },
  { text: '加我微信 13812345678 有优惠', label: 'spam' },
  { text: '出售枪支弹药', label: 'violence' },
  { text: '这部电影真好看', label: 'none' },
  { text: '毒品交易平台，需要的联系', label: 'illegal' },
  { text: '正常交流，没有违规内容', label: 'none' },
  { text: '代开发票请联系我', label: 'spam' },
];

// 审核时延内存缓冲区
let latencyBuffer: number[] = [];

export function recordLatency(ms: number): void {
  latencyBuffer.push(ms);
  if (latencyBuffer.length > 1000) latencyBuffer.shift();
}

export function avgLatency(): number {
  if (latencyBuffer.length === 0) return 0;
  return latencyBuffer.reduce((a, b) => a + b, 0) / latencyBuffer.length;
}

function computeRecallFalsePositive(): { recall: number; falsePositiveRate: number } {
  const engine = new RuleEngine(listRules());
  let tp = 0;
  let fn = 0;
  let fp = 0;
  let tn = 0;
  for (const item of LABELED_EVAL_SET) {
    const d = engine.detect(item.text);
    const predictedViolation = d.categories.length > 0;
    const actualViolation = item.label !== 'none';
    if (actualViolation && predictedViolation) tp++;
    else if (actualViolation && !predictedViolation) fn++;
    else if (!actualViolation && predictedViolation) fp++;
    else tn++;
  }
  return {
    recall: tp / Math.max(1, tp + fn),
    falsePositiveRate: fp / Math.max(1, fp + tn),
  };
}

export function computeFullMetrics(): Record<string, number> {
  const stats = getStats();
  const pc = getPrefixCacheStats();
  const { recall, falsePositiveRate } = computeRecallFalsePositive();
  const q = qualityStats();

  const total = Math.max(1, stats.total);
  const humanReviewCount = (stats.byFinalStatus.passed ?? 0) + (stats.byFinalStatus.rejected ?? 0);
  const humanRatio = (stats.byDecision.review ?? 0) / total;

  const llmCost =
    pc.hitTokens * PRICE_HIT_INPUT + pc.missTokens * PRICE_MISS_INPUT + pc.outputTokens * PRICE_OUTPUT;
  const humanCost = humanReviewCount * HUMAN_REVIEW_COST;
  const totalCost = llmCost + humanCost;

  return {
    total,
    recall,
    falsePositiveRate,
    humanRatio,
    humanReviewCount,
    costPerItem: totalCost / total,
    totalCost,
    avgLatencyMs: avgLatency(),
    qualityAccuracy: q.accuracy,
    evalSetSize: LABELED_EVAL_SET.length,
  };
}
