// 模型版本管理：灰度发布 / 回滚
import { Router } from 'express';
import { insertModelVersion, listModelVersions } from '../db/phase3.js';
import { applyGrayRelease, rollback } from '../services/modelVersion.js';
import { requireRole } from '../services/auth.js';

export const modelVersionsRouter = Router();

modelVersionsRouter.get('/', (_req, res) => {
  res.json({ versions: listModelVersions() });
});

modelVersionsRouter.post('/', requireRole('admin'), (req, res) => {
  const { name, provider } = req.body ?? {};
  if (!name || !provider) {
    res.status(400).json({ error: '缺少 name/provider' });
    return;
  }
  res.json({ version: insertModelVersion(String(name), String(provider)) });
});

// 灰度发布：候选版本切 20% 流量
modelVersionsRouter.post('/:id/gray', requireRole('admin'), (req, res) => {
  const v = listModelVersions().find((m) => m.id === Number(req.params.id));
  if (!v) {
    res.status(404).json({ error: '版本不存在' });
    return;
  }
  applyGrayRelease(v);
  res.json({ versions: listModelVersions() });
});

// 回滚：灰度版本下线，流量回归 active
modelVersionsRouter.post('/rollback', requireRole('admin'), (req, res) => {
  const { activeName } = req.body ?? {};
  rollback(String(activeName ?? 'deepseek-v4-flash'));
  res.json({ versions: listModelVersions() });
});
