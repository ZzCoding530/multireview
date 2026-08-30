import { describe, expect, it } from 'vitest';
import { RuleEngine } from '../src/rules/ruleEngine.js';
import type { Rule } from '../src/types.js';

const rules: Rule[] = [
  { id: 1, name: '赌博-关键词', type: 'keyword', pattern: '赌博', category: 'illegal', enabled: true },
  { id: 2, name: '手机号-正则', type: 'regex', pattern: '1[3-9]\\d{9}', category: 'spam', enabled: true },
  { id: 3, name: '赌博-变体', type: 'variant', pattern: '赌 博', category: 'illegal', enabled: true },
];

describe('文本规则引擎（关键词/正则/变体词）', () => {
  it('关键词规则：明确违规文本被命中并返回类别与位置', () => {
    const engine = new RuleEngine(rules);
    const r = engine.detect('这里有人在赌博，请处理');
    expect(r.categories).toContain('illegal');
    expect(r.confidence).toBeGreaterThan(0.8);
    const hit = r.hits.find((h) => h.type === 'keyword');
    expect(hit).toBeDefined();
    expect(hit!.matched).toBe('赌博');
    expect(hit!.start).toBe(5);
    expect(hit!.sentenceIndex).toBe(0);
  });

  it('正则规则：命中手机号并归类为广告垃圾', () => {
    const engine = new RuleEngine(rules);
    const r = engine.detect('加我 13812345678 有优惠');
    expect(r.categories).toContain('spam');
    const hit = r.hits.find((h) => h.type === 'regex');
    expect(hit).toBeDefined();
    expect(hit!.matched).toBe('13812345678');
  });

  it('变体词规则：含分隔符的变体词也能命中', () => {
    const engine = new RuleEngine(rules);
    const r = engine.detect('这里可以赌 博');
    expect(r.categories).toContain('illegal');
    const hit = r.hits.find((h) => h.type === 'variant');
    expect(hit).toBeDefined();
    expect(hit!.matched).toBe('赌博');
  });

  it('无违规内容置信度为 0 且无命中', () => {
    const engine = new RuleEngine(rules);
    const r = engine.detect('今天天气不错，适合出门');
    expect(r.confidence).toBe(0);
    expect(r.hits).toHaveLength(0);
  });
});
