// LLM-as-a-Judge：用强模型（DeepSeek）自动评测在线模型、自动标注边界案例
import { callDeepSeek } from './llm/deepseek.js';
import { constrain } from './llm/constrain.js';
import { insertEvalRun, insertTrainingSample } from '../db/phase3.js';

export interface JudgeResult {
  text: string;
  onlineCategory: string | null;
  goldCategory: string | null;
  correct: boolean;
  reason: string;
}

const JUDGE_PROMPT = `你是资深内容审核专家，作为评测裁判（LLM-as-a-Judge），对一段文本独立打标，输出金标准标签。请严格按 JSON 格式输出（json）。

合法违规类别（category 只能取下列值之一）：politics(涉政)、pornography(涉黄)、violence(涉暴)、abuse(辱骂攻击)、spam(广告垃圾)、discrimination(歧视)、illegal(违法违规)、none(无违规)。

输出 JSON（只输出一个 JSON 对象，不要多余文字）：
{"category":"合法类别之一","confidence":0到1之间的小数,"reason":"判断理由","evidence":"原文中作为依据的片段"}`;

/** 评测单条样本：在线判定 vs 金标准 */
export async function judgeSample(text: string, onlineCategory: string | null): Promise<JudgeResult> {
  const resp = await callDeepSeek(`待评测文本：\n${text}`, JUDGE_PROMPT);
  const gold = constrain(resp.content);
  const goldCategory = gold?.category ?? null;
  const correct = onlineCategory === goldCategory;
  return { text, onlineCategory, goldCategory, correct, reason: gold?.reason ?? '' };
}

/** 批量评测，记录评测结果 */
export async function runJudgeEval(samples: Array<{ text: string; onlineCategory: string | null }>): Promise<{
  results: JudgeResult[];
  accuracy: number;
}> {
  const results: JudgeResult[] = [];
  for (const s of samples) {
    results.push(await judgeSample(s.text, s.onlineCategory));
  }
  const correctCount = results.filter((r) => r.correct).length;
  const accuracy = results.length === 0 ? 0 : correctCount / results.length;
  insertEvalRun('llm_judge', { total: results.length, correct: correctCount, accuracy });
  return { results, accuracy };
}

/** LLM-as-teacher：自动标注边界案例，写入训练集（供蒸馏/检索） */
export async function autoLabelBoundaryCases(samples: string[]): Promise<number> {
  let count = 0;
  for (const text of samples) {
    try {
      const resp = await callDeepSeek(`待标注文本：\n${text}`, JUDGE_PROMPT);
      const gold = constrain(resp.content);
      if (gold) {
        insertTrainingSample(text, gold.category ?? 'none', 'llm_judge');
        count++;
      }
    } catch {
      // 单条失败不影响整体
    }
  }
  return count;
}
