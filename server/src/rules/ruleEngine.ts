// 文本规则引擎：关键词（Aho-Corasick）+ 正则 + 变体词 三通道检测
import { AhoCorasick } from './ahoCorasick.js';
import { normalizeVariant } from './variants.js';
import type { Category, DetectionResult, HitPosition, Rule } from '../types.js';

const WEIGHT: Record<Rule['type'], number> = {
  keyword: 0.85,
  regex: 0.95,
  variant: 0.6,
};

// 按标点切分句子，用于计算命中所属句子下标
const SENTENCE_SPLIT = /[。！？!?；;\n]+/;

export function sentenceIndex(text: string, offset: number): number {
  const head = text.slice(0, offset);
  const parts = head.split(SENTENCE_SPLIT);
  return Math.max(0, parts.length - 1);
}

export class RuleEngine {
  private keywords: Rule[] = [];
  private regexes: Rule[] = [];
  private variants: Rule[] = [];

  constructor(rules: Rule[]) {
    for (const r of rules) {
      if (!r.enabled) continue;
      if (r.type === 'keyword') this.keywords.push(r);
      else if (r.type === 'regex') this.regexes.push(r);
      else this.variants.push(r);
    }
  }

  detect(text: string): DetectionResult {
    const hits: HitPosition[] = [];

    // 1. 关键词：Aho-Corasick 多模式匹配
    if (this.keywords.length > 0) {
      const ac = new AhoCorasick(this.keywords.map((r) => r.pattern));
      for (const m of ac.search(text)) {
        const rule = this.keywords[m.patternIndex];
        const pattern = rule.pattern;
        const start = m.end - pattern.length + 1;
        hits.push({
          type: 'keyword',
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          matched: text.slice(start, m.end + 1),
          start,
          end: m.end + 1,
          sentenceIndex: sentenceIndex(text, start),
        });
      }
    }

    // 2. 正则
    for (const rule of this.regexes) {
      let re: RegExp;
      try {
        re = new RegExp(rule.pattern, 'g');
      } catch {
        continue; // 跳过非法正则
      }
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        hits.push({
          type: 'regex',
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          matched: m[0],
          start: m.index,
          end: m.index + m[0].length,
          sentenceIndex: sentenceIndex(text, m.index),
        });
        if (m.index === re.lastIndex) re.lastIndex++; // 防零宽死循环
      }
    }

    // 3. 变体词：归一化后子串匹配
    if (this.variants.length > 0) {
      const normalized = normalizeVariant(text);
      for (const rule of this.variants) {
        const np = normalizeVariant(rule.pattern);
        if (np.length === 0) continue;
        let idx = normalized.indexOf(np);
        while (idx !== -1) {
          hits.push({
            type: 'variant',
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            matched: np,
            start: idx,
            end: idx + np.length,
            sentenceIndex: sentenceIndex(normalized, idx),
          });
          idx = normalized.indexOf(np, idx + 1);
        }
      }
    }

    // 置信度：多条命中按权重合并 1 - Π(1 - w)
    const categorySet = new Set<Category>();
    let confidence = 0;
    for (const h of hits) {
      categorySet.add(h.category);
      confidence = 1 - (1 - confidence) * (1 - WEIGHT[h.type]);
    }
    confidence = Math.round(confidence * 10000) / 10000;

    return { categories: [...categorySet], confidence, hits };
  }
}
