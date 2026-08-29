// 检索增强审核（RAG）：历史人审案例相似检索，注入 few-shot
// 真实向量化（embedding 模型）受限（HF 被墙），此处用字符 n-gram 相似度近似（见待完善清单）。
import { listTrainingSamples, type TrainingSample } from '../db/phase3.js';

function charNgrams(text: string, n = 2): Set<string> {
  const s = text.replace(/\s+/g, '');
  const set = new Set<string>();
  for (let i = 0; i <= s.length - n; i++) set.add(s.slice(i, i + n));
  return set;
}

function similarity(a: string, b: string): number {
  const ga = charNgrams(a);
  const gb = charNgrams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter++;
  return inter / Math.sqrt(ga.size * gb.size); // 余弦近似
}

export function retrieveSimilar(text: string, topK = 3): TrainingSample[] {
  const samples = listTrainingSamples(500);
  return samples
    .map((s) => ({ s, score: similarity(text, s.content) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => x.s);
}

export function buildFewShot(text: string, topK = 3): string {
  const cases = retrieveSimilar(text, topK);
  if (cases.length === 0) return '';
  return cases.map((c, i) => `案例${i + 1}：文本「${c.content}」→ 判定「${c.label}」`).join('\n');
}
