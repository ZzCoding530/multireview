// LLM 精审编排：调用 DeepSeek -> 约束解码 -> 前缀缓存统计
import type { LLMReview } from '../../types.js';
import { constrain } from './constrain.js';
import { callDeepSeek } from './deepseek.js';
import { PrefixCache, type PrefixCacheStats } from './prefixCache.js';

let cache: PrefixCache | null = null;

function getCache(): PrefixCache {
  if (!cache) cache = new PrefixCache('moderation-rules-prefix');
  return cache;
}

/**
 * 对存疑文本做 LLM 语义精审。
 * @returns 合法结构化结果；若两次调用都无法得到合法输出则返回 null（保持转人审，不自动放行）。
 */
export async function reviewWithLLM(text: string): Promise<LLMReview | null> {
  let resp = await callDeepSeek(text);
  let review = constrain(resp.content);

  if (!review) {
    // 解析失败或幻觉类别：重试一次
    resp = await callDeepSeek(text);
    review = constrain(resp.content);
  }

  getCache().record(resp.hitTokens, resp.missTokens);
  return review;
}

export function getPrefixCacheStats(): PrefixCacheStats {
  return getCache().getStats();
}
