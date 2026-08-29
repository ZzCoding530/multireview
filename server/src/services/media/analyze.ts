// 多模态审核编排：图片(OCR+视觉) / 音频(ASR->文本) / 视频(抽帧+OCR+ASR)
import { getPolicy, listRules } from '../../db/repository.js';
import { RuleEngine } from '../../rules/ruleEngine.js';
import { decide } from '../moderation.js';
import type { ContentType, Decision, DetectionResult } from '../../types.js';
import { analyzeImageVisual } from './clip.js';
import { extractAudio, extractKeyframes } from './frames.js';
import { ocrText } from './ocr.js';
import { transcribeAudio } from './whisper.js';
import path from 'node:path';
import { UPLOADS_DIR } from '../../paths.js';

export interface MediaAnalysis {
  detection: DetectionResult;
  decision: Decision;
  ocrText: string | null;
  transcript: string | null;
  frameCount: number;
  visualAvailable: boolean;
  asrAvailable: boolean;
}

const EMPTY_DETECTION: DetectionResult = { categories: [], confidence: 0, hits: [] };

function mergeDetection(base: DetectionResult, extra: DetectionResult): DetectionResult {
  const categories = [...new Set([...base.categories, ...extra.categories])];
  let confidence = base.confidence;
  for (const h of extra.hits) {
    const w = h.type === 'keyword' ? 0.85 : h.type === 'regex' ? 0.95 : 0.6;
    confidence = 1 - (1 - confidence) * (1 - w);
  }
  return { categories, confidence: Math.round(confidence * 10000) / 10000, hits: [...base.hits, ...extra.hits] };
}

export async function analyzeMedia(
  contentType: ContentType,
  filePath: string,
  businessLine: string,
): Promise<MediaAnalysis> {
  const policy = getPolicy(businessLine) ?? getPolicy('general')!;
  const engine = new RuleEngine(listRules());

  if (contentType === 'image') {
    const ocr = await ocrText(filePath);
    const textDetection = engine.detect(ocr);
    const visual = await analyzeImageVisual(filePath);

    let detection = textDetection;
    if (visual.available && visual.category) {
      detection = mergeDetection(textDetection, {
        categories: [visual.category],
        confidence: visual.confidence,
        hits: [],
      });
    }
    return {
      detection,
      decision: decide(detection, policy),
      ocrText: ocr,
      transcript: null,
      frameCount: 0,
      visualAvailable: visual.available,
      asrAvailable: false,
    };
  }

  if (contentType === 'audio') {
    const asr = await transcribeAudio(filePath);
    const detection = asr.text ? engine.detect(asr.text) : EMPTY_DETECTION;
    return {
      detection,
      decision: asr.text ? decide(detection, policy) : 'review',
      ocrText: null,
      transcript: asr.text,
      frameCount: 0,
      visualAvailable: false,
      asrAvailable: asr.available,
    };
  }

  // 视频：抽关键帧 -> 逐帧 OCR -> 文本规则；音频转写 -> 文本规则
  const framesDir = path.join(UPLOADS_DIR, 'frames', path.basename(filePath, path.extname(filePath)));
  const frames = await extractKeyframes(filePath, framesDir);
  let combined = '';
  for (const f of frames) {
    combined += (await ocrText(f)) + '\n';
  }

  const audioPath = path.join(framesDir, 'audio.wav');
  let transcript: string | null = null;
  let asrAvailable = false;
  try {
    await extractAudio(filePath, audioPath);
    const asr = await transcribeAudio(audioPath);
    transcript = asr.text;
    asrAvailable = asr.available;
    if (transcript) combined += '\n' + transcript;
  } catch {
    // 音频抽取失败不影响帧审核
  }

  const detection = engine.detect(combined);
  return {
    detection,
    decision: decide(detection, policy),
    ocrText: combined,
    transcript,
    frameCount: frames.length,
    visualAvailable: false,
    asrAvailable,
  };
}
