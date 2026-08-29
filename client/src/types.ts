export type Category =
  | 'politics'
  | 'pornography'
  | 'violence'
  | 'abuse'
  | 'spam'
  | 'discrimination'
  | 'illegal';

export type Decision = 'pass' | 'reject' | 'review';
export type FinalStatus = 'pending' | 'passed' | 'rejected';

export const CATEGORY_LABELS: Record<Category, string> = {
  politics: '涉政',
  pornography: '涉黄',
  violence: '涉暴',
  abuse: '辱骂攻击',
  spam: '广告垃圾',
  discrimination: '歧视',
  illegal: '违法违规',
};

export const DECISION_LABELS: Record<Decision, string> = {
  pass: '自动通过',
  reject: '自动拦截',
  review: '转人审',
};

export const FINAL_STATUS_LABELS: Record<FinalStatus, string> = {
  pending: '待处理',
  passed: '已通过',
  rejected: '已拒绝',
};

export interface HitPosition {
  type: string;
  ruleName: string;
  category: Category;
  matched: string;
  start: number;
  end: number;
  sentenceIndex: number;
}

export interface DetectionResult {
  categories: Category[];
  confidence: number;
  hits: HitPosition[];
  llmReview?: LLMReview | null;
  llmUsed?: boolean;
  ocrText?: string | null;
  frameCount?: number;
  transcript?: string | null;
}

export interface LLMReview {
  category: Category | null;
  confidence: number;
  reason: string;
  evidence: string;
}

export interface ModerationRecord {
  id: number;
  contentType: string;
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

export interface Rule {
  id: number;
  name: string;
  type: string;
  pattern: string;
  category: Category;
  enabled: boolean;
}

export interface Policy {
  id: number;
  businessLine: string;
  passThreshold: number;
  rejectThreshold: number;
  enabled: boolean;
}
