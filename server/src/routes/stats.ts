import { Router } from 'express';
import { getStats, listRecords } from '../db/repository.js';
import { getPrefixCacheStats } from '../services/llm/index.js';

export const statsRouter = Router();

// 基础统计（决策分布 / 处置分布 / 类别分布）+ 前缀缓存命中统计
statsRouter.get('/', (_req, res) => {
  res.json({ ...getStats(), prefixCache: getPrefixCacheStats() });
});

statsRouter.get('/records', (_req, res) => {
  res.json({ records: listRecords(200) });
});
