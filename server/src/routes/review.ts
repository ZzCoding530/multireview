import { Router } from 'express';
import {
  addReviewLog,
  listPendingReview,
  updateRecordDecision,
} from '../db/repository.js';
import { authMiddleware, type AuthRequest } from '../services/auth.js';
import type { FinalStatus } from '../types.js';

export const reviewRouter = Router();

reviewRouter.use(authMiddleware);

// 待审队列：风险降序、时效升序
reviewRouter.get('/queue', (_req, res) => {
  res.json({ items: listPendingReview() });
});

// 处置：通过 / 拒绝 / 存疑升级，全部留痕
reviewRouter.post('/:id', (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: '非法记录 ID' });
    return;
  }
  const { action, note } = req.body ?? {};
  if (!['pass', 'reject', 'escalate'].includes(action)) {
    res.status(400).json({ error: '非法处置动作' });
    return;
  }
  const finalStatus: FinalStatus = action === 'pass' ? 'passed' : action === 'reject' ? 'rejected' : 'pending';
  const ok = updateRecordDecision(id, finalStatus, req.user!.username, note ?? null);
  if (!ok) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  addReviewLog(id, req.user!.username, action, note ?? null);
  res.json({ ok: true, id, action, finalStatus });
});
