// DeepSeek 精审提供方（OpenAI 兼容 Chat Completions 接口）
import { config } from '../../config.js';
import { CATEGORIES, CATEGORY_LABELS } from '../../types.js';

export interface DeepSeekResponse {
  content: string;
  hitTokens: number;
  missTokens: number;
}

function buildSystemPrompt(): string {
  const categoryLines = CATEGORIES.map(
    (c) => `- ${c}：${CATEGORY_LABELS[c]}`,
  ).join('\n');
  return `你是内容审核精审模型，负责对规则引擎判定为「存疑」的文本做语义精审，判断其是否违规。请严格按 JSON 格式输出结果（json）。

合法违规类别（category 只能取下列值之一，不得编造其他类别）：
${categoryLines}
- none：无违规

输出 JSON 格式（不要输出任何多余文字，只输出一个 JSON 对象）：
{"category":"合法类别之一","confidence":0到1之间的小数,"reason":"判断理由","evidence":"原文中作为依据的片段"}

要求：
1. category 必须是上述合法类别之一（含 none），严禁编造。
2. confidence 为 0~1 的置信度小数。
3. 对反讽、隐喻、黑话、谐音变体要结合上下文判断，宁可转人审也不漏放。`;
}

/** 调用 DeepSeek 完成精审，返回原始 JSON 文本与缓存命中统计 */
export async function callDeepSeek(userContent: string): Promise<DeepSeekResponse> {
  const body = {
    model: config.deepseek.model,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: `待审核文本：\n${userContent}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_tokens: 512,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${config.deepseek.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.deepseek.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`DeepSeek API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_cache_hit_tokens?: number; prompt_cache_miss_tokens?: number };
    };

    return {
      content: data.choices?.[0]?.message?.content ?? '',
      hitTokens: data.usage?.prompt_cache_hit_tokens ?? 0,
      missTokens: data.usage?.prompt_cache_miss_tokens ?? 0,
    };
  } finally {
    clearTimeout(timer);
  }
}
