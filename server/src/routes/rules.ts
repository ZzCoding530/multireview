import { Router } from 'express';
import {
  deleteRule,
  insertRule,
  listPolicies,
  listRules,
  updatePolicy,
  updateRule,
} from '../db/repository.js';
import { requireRole } from '../services/auth.js';
import { CATEGORIES, type Category, type RuleType } from '../types.js';

export const rulesRouter = Router();

// 规则列表
rulesRouter.get('/', (_req, res) => {
  res.json({ rules: listRules() });
});

// 新增规则（热更新：下一请求即生效，无需重启）
rulesRouter.post('/', requireRole('admin'), (req, res) => {
  const { name, type, pattern, category } = req.body ?? {};
  if (!name || !pattern || !category) {
    res.status(400).json({ error: '缺少 name/pattern/category' });
    return;
  }
  if (!['keyword', 'regex', 'variant'].includes(type)) {
    res.status(400).json({ error: 'type 必须是 keyword/regex/variant' });
    return;
  }
  if (!CATEGORIES.includes(category as Category)) {
    res.status(400).json({ error: '非法违规类别' });
    return;
  }
  const rule = insertRule({
    name: String(name),
    type: type as RuleType,
    pattern: String(pattern),
    category: category as Category,
  });
  res.json({ rule });
});

// 更新规则
rulesRouter.put('/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const { name, type, pattern, category, enabled } = req.body ?? {};
  if (type && !['keyword', 'regex', 'variant'].includes(type)) {
    res.status(400).json({ error: 'type 必须是 keyword/regex/variant' });
    return;
  }
  if (category && !CATEGORIES.includes(category as Category)) {
    res.status(400).json({ error: '非法违规类别' });
    return;
  }
  const ok = updateRule(id, {
    name: name !== undefined ? String(name) : undefined,
    type: type as RuleType | undefined,
    pattern: pattern !== undefined ? String(pattern) : undefined,
    category: category as Category | undefined,
    enabled: enabled !== undefined ? Boolean(enabled) : undefined,
  });
  res.json({ ok });
});

// 删除规则
rulesRouter.delete('/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  res.json({ ok: deleteRule(id) });
});

// 策略列表
rulesRouter.get('/policies', (_req, res) => {
  res.json({ policies: listPolicies() });
});

// 更新阈值（热更新 + 可回滚：前端记录历史）
rulesRouter.put('/policies/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const { passThreshold, rejectThreshold, enabled } = req.body ?? {};
  const ok = updatePolicy(id, {
    passThreshold: passThreshold !== undefined ? Number(passThreshold) : undefined,
    rejectThreshold: rejectThreshold !== undefined ? Number(rejectThreshold) : undefined,
    enabled: enabled !== undefined ? Boolean(enabled) : undefined,
  });
  res.json({ ok });
});
