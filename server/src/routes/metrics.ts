// 五指标看板 + LLM-as-a-Judge 评测 + 蒸馏 + 检索增强
import { Router } from 'express';
import { computeFullMetrics } from '../services/metrics.js';
import { autoLabelBoundaryCases, runJudgeEval } from '../services/judge.js';
import { runDistillation } from '../services/distill.js';
import { retrieveSimilar } from '../services/rag.js';
import { listDistillJobs } from '../db/phase3.js';
import { requireRole } from '../services/auth.js';

export const metricsRouter = Router();

// 五指标：召回率 / 误伤率 / 人审占比 / 单条成本 / 审核时延（+质检准确率）
metricsRouter.get('/', (_req, res) => {
  res.json(computeFullMetrics());
});

// LLM-as-a-Judge 批量评测
metricsRouter.post('/eval/judge', requireRole('admin'), async (req, res) => {
  const { samples } = req.body ?? {};
  const result = await runJudgeEval(samples ?? []);
  res.json(result);
});

// LLM-as-teacher 自动标注边界案例（回流训练集）
metricsRouter.post('/eval/auto-label', requireRole('admin'), async (req, res) => {
  const { samples } = req.body ?? {};
  const labeled = await autoLabelBoundaryCases(samples ?? []);
  res.json({ labeled });
});

// 知识蒸馏（mock 指标占位）
metricsRouter.post('/distill', requireRole('admin'), async (req, res) => {
  const { teacher, student } = req.body ?? {};
  const result = await runDistillation(
    String(teacher ?? 'deepseek-v4-flash'),
    String(student ?? 'mock-small-model-v1'),
  );
  res.json(result);
});

metricsRouter.get('/distill/jobs', (_req, res) => {
  res.json({ jobs: listDistillJobs() });
});

// 检索相似案例（演示）
metricsRouter.get('/rag/retrieve', (req, res) => {
  const text = String(req.query.text ?? '');
  res.json({ similar: retrieveSimilar(text, 3) });
});
