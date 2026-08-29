// 质检抽样：抽审已处置内容，统计人审准确率
import { Router } from 'express';
import { listRecords } from '../db/repository.js';
import { insertQualityCheck, qualityStats } from '../db/phase3.js';
import { authMiddleware, type AuthRequest } from '../services/auth.js';

export const qualityRouter = Router();

qualityRouter.use(authMiddleware);

// 抽样：从已处置记录中随机抽约 10%
qualityRouter.post('/sample', (_req, res) => {
  const reviewed = listRecords(500).filter(
    (r) => r.finalStatus === 'passed' || r.finalStatus === 'rejected',
  );
  const n = Math.max(1, Math.floor(reviewed.length * 0.1));
  const sampled = [...reviewed].sort(() => Math.random() - 0.5).slice(0, n);
  res.json({ sampled });
});

// 记录质检结果（correct / incorrect）
qualityRouter.post('/:recordId', (req: AuthRequest, res) => {
  const { result, note } = req.body ?? {};
  insertQualityCheck(
    Number(req.params.recordId),
    req.user!.username,
    String(result),
    note ? String(note) : null,
  );
  res.json({ ok: true });
});

// 质检准确率
qualityRouter.get('/stats', (_req, res) => {
  res.json(qualityStats());
});
