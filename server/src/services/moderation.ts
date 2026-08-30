// 分级审核漏斗决策
import type { Decision, DetectionResult, Policy } from '../types.js';

/**
 * 按置信度与业务线阈值分流：
 *  - 高置信违规 -> reject（自动拦截）
 *  - 低置信安全 -> pass（自动放行）
 *  - 中间地带   -> review（转人审）
 */
export function decide(detection: DetectionResult, policy: Policy): Decision {
  if (detection.confidence >= policy.rejectThreshold) return 'reject';
  if (detection.confidence <= policy.passThreshold) return 'pass';
  return 'review';
}
