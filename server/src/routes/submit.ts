import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { UPLOADS_DIR } from '../paths.js';
import { getPolicy, insertRecord } from '../db/repository.js';
import { moderateText } from '../services/moderate.js';
import { analyzeMedia } from '../services/media/analyze.js';
import type { ContentType, DetectionResult } from '../types.js';

export const submitRouter = Router();

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({ storage });

function contentTypeOf(mime: string): ContentType {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return 'text';
}

// 文本提交：规则引擎检测 -> 分级漏斗 -> 存疑走 LLM 精审 -> 落库
submitRouter.post('/text', async (req, res) => {
  const { content, businessLine = 'general' } = req.body ?? {};
  if (typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ error: '内容不能为空' });
    return;
  }
  try {
    const { detection, decision, llmReview, llmUsed, modelName } = await moderateText(
      content,
      String(businessLine),
    );
    const detectionWithLlm: DetectionResult = { ...detection, llmReview, llmUsed };
    const policy = getPolicy(String(businessLine)) ?? getPolicy('general')!;
    const record = insertRecord({
      contentType: 'text',
      content,
      mediaPath: null,
      detectionResult: detectionWithLlm,
      confidence: detection.confidence,
      decision,
      businessLine: String(businessLine),
    });
    res.json({ record, detection: detectionWithLlm, decision, policy, llmReview, llmUsed, modelName });
  } catch (err) {
    res.status(502).json({ error: `审核服务异常：${(err as Error)?.message ?? ''}` });
  }
});

// 媒体上传：二期走多模态审核（图片 OCR+视觉 / 音频 ASR / 视频抽帧）
submitRouter.post('/media', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: '未上传文件' });
    return;
  }
  const contentType = contentTypeOf(req.file.mimetype);
  const businessLine = String(req.body?.businessLine ?? 'general');
  const absPath = path.join(UPLOADS_DIR, req.file.filename);
  const mediaPath = `/uploads/${req.file.filename}`;

  try {
    const analysis = await analyzeMedia(contentType, absPath, businessLine);
    const detectionResult: DetectionResult = {
      ...analysis.detection,
      ocrText: analysis.ocrText,
      frameCount: analysis.frameCount,
      transcript: analysis.transcript,
    };
    const record = insertRecord({
      contentType,
      content: analysis.ocrText ?? analysis.transcript ?? null,
      mediaPath,
      detectionResult,
      confidence: analysis.detection.confidence,
      decision: analysis.decision,
      businessLine,
    });
    res.json({ record, detection: detectionResult, decision: analysis.decision });
  } catch (err) {
    // 分析失败 -> 存不审，进人审队列（宁可延迟不可漏放）
    const record = insertRecord({
      contentType,
      content: null,
      mediaPath,
      detectionResult: null,
      confidence: 0,
      decision: 'review',
      businessLine,
    });
    res.json({ record, error: `媒体分析失败，已转人审：${(err as Error)?.message ?? ''}` });
  }
});
