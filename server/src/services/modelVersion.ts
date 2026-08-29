// 模型版本灰度路由：按流量百分比在 active 与 gray 版本间分流
import {
  listModelVersions,
  updateModelVersion,
  type ModelVersion,
} from '../db/phase3.js';

export interface RoutedModel {
  name: string;
  provider: string;
}

export function routeModel(): RoutedModel {
  const versions = listModelVersions();
  const active = versions.find((v) => v.status === 'active') ?? versions[0];
  const gray = versions.filter((v) => v.status === 'gray' && v.trafficPercent > 0);

  if (gray.length === 0 || !active) {
    return { name: active?.name ?? 'deepseek-v4-flash', provider: active?.provider ?? 'deepseek' };
  }

  const totalGray = gray.reduce((s, v) => s + v.trafficPercent, 0);
  const r = Math.random() * 100;
  if (r < totalGray) {
    const g = gray[0];
    return { name: g.name, provider: g.provider };
  }
  return { name: active.name, provider: active.provider };
}

/** 灰度发布：候选版本切 20% 流量，active 保留剩余 */
export function applyGrayRelease(candidate: ModelVersion): void {
  const versions = listModelVersions();
  const oldActive = versions.find((v) => v.status === 'active');
  updateModelVersion(candidate.id, { status: 'gray', trafficPercent: 20 });
  if (oldActive) updateModelVersion(oldActive.id, { trafficPercent: 80 });
}

/** 回滚：灰度版本下线，流量回归 active */
export function rollback(activeName: string): void {
  const versions = listModelVersions();
  for (const g of versions.filter((v) => v.status === 'gray')) {
    updateModelVersion(g.id, { status: 'rolled_back', trafficPercent: 0 });
  }
  const active = versions.find((v) => v.name === activeName);
  if (active) updateModelVersion(active.id, { status: 'active', trafficPercent: 100 });
}
