import { describe, expect, it } from 'vitest';
import { constrain } from '../src/services/llm/constrain.js';
import { CATEGORIES, type Category } from '../src/types.js';

const LEGAL = new Set<string>(CATEGORIES);

function isLegalOrNull(r: ReturnType<typeof constrain>): boolean {
  return r === null || r.category === null || LEGAL.has(r.category);
}

type Expected = Category | null | 'REJECT';

describe('LLM 约束解码（20 条边界样本，杜绝幻觉类别）', () => {
  const samples: Array<{ raw: string; expected: Expected }> = [
    // 合法类别
    { raw: '{"category":"politics","confidence":0.9,"reason":"r","evidence":"e"}', expected: 'politics' },
    { raw: '{"category":"illegal","confidence":0.85,"reason":"r","evidence":"e"}', expected: 'illegal' },
    { raw: '{"category":"abuse","confidence":0.7,"reason":"r","evidence":"e"}', expected: 'abuse' },
    { raw: '{"category":"spam","confidence":0.6,"reason":"r","evidence":"e"}', expected: 'spam' },
    { raw: '{"category":"discrimination","confidence":0.55,"reason":"r","evidence":"e"}', expected: 'discrimination' },
    // 无违规
    { raw: '{"category":"none","confidence":0.1,"reason":"r","evidence":""}', expected: null },
    { raw: '{"category":null,"confidence":0,"reason":"r","evidence":""}', expected: null },
    { raw: '{"category":"none","confidence":0,"reason":"无","evidence":""}', expected: null },
    // 幻觉类别（必须被拒绝）
    { raw: '{"category":"gamble","confidence":0.9,"reason":"r","evidence":"e"}', expected: 'REJECT' },
    { raw: '{"category":"sex","confidence":0.8,"reason":"r","evidence":"e"}', expected: 'REJECT' },
    { raw: '{"category":"政治","confidence":0.9,"reason":"r","evidence":"e"}', expected: 'REJECT' },
    { raw: '{"category":"violence1","confidence":0.8,"reason":"r","evidence":"e"}', expected: 'REJECT' },
    { raw: '{"category":"涉政","confidence":0.9,"reason":"r","evidence":"e"}', expected: 'REJECT' },
    { raw: '{"category":"ILLEGAL","confidence":0.9,"reason":"r","evidence":"e"}', expected: 'REJECT' },
    // 非法 JSON / 空
    { raw: 'not json at all', expected: 'REJECT' },
    { raw: '{"category":"politics"', expected: 'REJECT' },
    { raw: '', expected: 'REJECT' },
    // JSON 被文字包裹 -> 提取后解析
    { raw: '前置文字 {"category":"pornography","confidence":0.9,"reason":"x","evidence":"y"} 后置', expected: 'pornography' },
    // 置信度收敛到 [0,1]
    { raw: '{"category":"violence","confidence":1.5,"reason":"r","evidence":"e"}', expected: 'violence' },
    { raw: '{"category":"violence","confidence":"0.3","reason":"r","evidence":"e"}', expected: 'violence' },
  ];

  it('共 20 条边界样本', () => {
    expect(samples).toHaveLength(20);
  });

  it('每条样本的类别要么合法要么被拒绝（零幻觉）', () => {
    for (const s of samples) {
      const r = constrain(s.raw);
      expect(isLegalOrNull(r), `样本: ${s.raw}`).toBe(true);
    }
  });

  it('样本按预期归类', () => {
    for (const s of samples) {
      const r = constrain(s.raw);
      if (s.expected === 'REJECT') {
        expect(r, `应被拒绝: ${s.raw}`).toBeNull();
      } else {
        expect(r?.category, `样本: ${s.raw}`).toBe(s.expected);
      }
    }
  });

  it('置信度被收敛到 [0,1]', () => {
    expect(
      constrain('{"category":"violence","confidence":1.5,"reason":"r","evidence":"e"}')?.confidence,
    ).toBe(1);
    expect(
      constrain('{"category":"violence","confidence":-0.5,"reason":"r","evidence":"e"}')?.confidence,
    ).toBe(0);
    expect(
      constrain('{"category":"violence","confidence":"0.3","reason":"r","evidence":"e"}')?.confidence,
    ).toBe(0.3);
  });
});
