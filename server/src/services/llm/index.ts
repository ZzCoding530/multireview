// LLM 精审编排：调用 DeepSeek -> 约束解码 -> 前缀缓存统计
import type { LLMReview } from '../../types.js';
import { constrain } from './constrain.js';
import { buildSystemPrompt, callDeepSeek } from './deepseek.js';
import { PrefixCache, type PrefixCacheStats } from './prefixCache.js';

let cache: PrefixCache | null = null;

function getCache(): PrefixCache {
  if (!cache) cache = new PrefixCache('moderation-rules-prefix');
  return cache;
}

/**
 * 对存疑文本做 LLM 语义精审。
 * @param fewShot 检索增强注入的历史相似案例（可选）
 * @returns 合法结构化结果；若两次调用都无法得到合法输出则返回 null（保持转人审，不自动放行）。
 */
export async function reviewWithLLM(text: string, fewShot?: string): Promise<LLMReview | null> {
  const systemPrompt = fewShot
    ? `${buildSystemPrompt()}\n\n以下是与当前文本相似的历史人审案例（few-shot，供参考）：\n${fewShot}`
    : undefined;

  let resp = await callDeepSeek(`待审核文本：\n${text}`, systemPrompt);
  let review = constrain(resp.content);

  if (!review) {
    // 解析失败或幻觉类别：重试一次
    resp = await callDeepSeek(`待审核文本：\n${text}`, systemPrompt);
    review = constrain(resp.content);
  }

  getCache().record(resp.hitTokens, resp.missTokens, resp.outputTokens);
  return review;
}

export function getPrefixCacheStats(): PrefixCacheStats {
  return getCache().getStats();
}
