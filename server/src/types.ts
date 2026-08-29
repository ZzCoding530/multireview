// 全局共享类型与常量定义

export type ContentType = 'text' | 'image' | 'audio' | 'video';

/** 分级漏斗决策：直接通过 / 直接拒绝 / 转人审 */
export type Decision = 'pass' | 'reject' | 'review';

/** 处置终态：待处理 / 已通过 / 已拒绝 */
export type FinalStatus = 'pending' | 'passed' | 'rejected';

/** 合法违规类别（约束解码的类别白名单） */
export type Category =
  | 'politics'
  | 'pornography'
  | 'violence'
  | 'abuse'
  | 'spam'
  | 'discrimination'
  | 'illegal';

export const CATEGORIES: Category[] = [
  'politics',
  'pornography',
  'violence',
  'abuse',
  'spam',
  'discrimination',
  'illegal',
];

export const CATEGORY_LABELS: Record<Category, string> = {
  politics: '涉政',
  pornography: '涉黄',
  violence: '涉暴',
  abuse: '辱骂攻击',
  spam: '广告垃圾',
  discrimination: '歧视',
  illegal: '违法违规',
};

export type RuleType = 'keyword' | 'regex' | 'variant';

export interface Rule {
  id: number;
  name: string;
  type: RuleType;
  pattern: string;
  category: Category;
  enabled: boolean;
}

/** 单条命中位置（哪句话 / 哪一帧） */
export interface HitPosition {
  type: RuleType;
  ruleId: number;
  ruleName: string;
  category: Category;
  /** 命中的原始文本片段（变体词为归一化后片段） */
  matched: string;
  /** 起始字符偏移 */
  start: number;
  /** 结束字符偏移（不含） */
  end: number;
  /** 所在句子下标（从 0 开始） */
  sentenceIndex: number;
}

export interface DetectionResult {
  categories: Category[];
  confidence: number;
  hits: HitPosition[];
  /** 二期：LLM 语义精审结果（仅存疑内容） */
  llmReview?: LLMReview | null;
  llmUsed?: boolean;
  /** 二期多模态：OCR 提取文本 / 抽帧数 / 音频转写文本 */
  ocrText?: string | null;
  frameCount?: number;
  transcript?: string | null;
}

/** 二期：LLM 精审结构化输出 */
export interface LLMReview {
  category: Category | null;
  confidence: number;
  reason: string;
  evidence: string;
}

export interface Policy {
  id: number;
  businessLine: string;
  passThreshold: number;
  rejectThreshold: number;
  enabled: boolean;
}

export interface ModerationRecord {
  id: number;
  contentType: ContentType;
  content: string | null;
  mediaPath: string | null;
  detectionResult: DetectionResult | null;
  confidence: number;
  decision: Decision;
  finalStatus: FinalStatus;
  reviewer: string | null;
  reviewNote: string | null;
  businessLine: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: number;
  username: string;
  role: 'admin' | 'reviewer' | 'user';
}
