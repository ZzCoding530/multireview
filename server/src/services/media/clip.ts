// 视觉对齐模型（CLIP 风格图文对齐）：画面违规判定
// 真实实现基于 transformers.js 的 zero-shot-image-classification，
// 权重从 HuggingFace 下载（Xenova/clip-vit-base-patch32）。
// 当前沙箱 HuggingFace 被墙，首次调用失败后缓存为「不可用」，避免重复阻塞（详见 待完善清单）。
import type { Category } from '../../types.js';

export interface VisualResult {
  available: boolean;
  category: Category | null;
  confidence: number;
  reason: string;
}

const VISUAL_LABELS = ['涉政', '涉黄', '涉暴', '辱骂攻击', '广告垃圾', '歧视', '违法违规', '正常内容'];

const LABEL_TO_CATEGORY: Record<string, Category | null> = {
  涉政: 'politics',
  涉黄: 'pornography',
  涉暴: 'violence',
  辱骂攻击: 'abuse',
  广告垃圾: 'spam',
  歧视: 'discrimination',
  违法违规: 'illegal',
  正常内容: null,
};

let unavailable = false;

export async function analyzeImageVisual(imagePath: string): Promise<VisualResult> {
  if (unavailable) {
    return { available: false, category: null, confidence: 0, reason: '视觉对齐模型不可用（HF 权重被墙）' };
  }
  try {
    const { pipeline } = await import('@huggingface/transformers');
    const classifier = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
    const outputs = (await classifier(imagePath, VISUAL_LABELS)) as Array<{ label: string; score: number }>;
    const top = outputs[0];
    if (!top) return { available: false, category: null, confidence: 0, reason: '无输出' };
    return {
      available: true,
      category: LABEL_TO_CATEGORY[top.label] ?? null,
      confidence: top.score,
      reason: `视觉对齐模型判定为「${top.label}」`,
    };
  } catch (err) {
    unavailable = true;
    return {
      available: false,
      category: null,
      confidence: 0,
      reason: `视觉对齐模型不可用：${(err as Error)?.message?.slice(0, 80)}`,
    };
  }
}
