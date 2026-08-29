// 申诉与回流：用户申诉 -> 人工复审 -> 纠正样本回流训练集/规则库
import { Router } from 'express';
import { getRecord, insertAppeal, updateAppeal, updateRecordDecision } from '../db/repository.js';
import {
  getAppeal,
  insertTrainingSample,
  listAppealsWithRecord,
} from '../db/phase3.js';
import { authMiddleware, type AuthRequest } from '../services/auth.js';

export const appealsRouter = Router();

// 用户提交申诉（公开，无需登录）
appealsRouter.post('/', (req, res) => {
  const { recordId, reason } = req.body ?? {};
  const record = getRecord(Number(recordId));
  if (!record) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  const id = insertAppeal(record.id, String(reason ?? ''));
  res.json({ ok: true, appealId: id });
});

// 申诉列表（含关联记录内容）
appealsRouter.get('/', authMiddleware, (_req, res) => {
  res.json({ appeals: listAppealsWithRecord() });
});

// 人工复审：approve=放行并回流 / reject=维持原处置
appealsRouter.post('/:id/review', authMiddleware, (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const appeal = getAppeal(id);
  if (!appeal) {
    res.status(404).json({ error: '申诉不存在' });
    return;
  }
  const { result, note } = req.body ?? {};
  const recordId = Number(appeal.record_id);
  const record = getRecord(recordId);

  if (result === 'approve') {
    // 放行 + 纠正样本回流训练集（真实回流规则库可在此扩展）
    if (record) {
      updateRecordDecision(recordId, 'passed', req.user!.username, String(note ?? ''));
      if (record.content) insertTrainingSample(record.content, 'none', 'appeal');
    }
    updateAppeal(id, 'reviewed', 'approved');
  } else {
    updateAppeal(id, 'reviewed', 'rejected');
  }
  res.json({ ok: true, appealId: id, result });
});
