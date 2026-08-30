import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { api } from '../api';
import { CATEGORY_LABELS } from '../types';

interface Stats {
  total: number;
  byDecision: Record<string, number>;
  byFinalStatus: Record<string, number>;
  byCategory: Record<string, number>;
  avgConfidence: number;
  prefixCache?: { hits: number; misses: number; hitTokens: number; missTokens: number };
}

interface FullMetrics {
  recall: number;
  falsePositiveRate: number;
  humanRatio: number;
  costPerItem: number;
  avgLatencyMs: number;
  qualityAccuracy: number;
  humanReviewCount: number;
  totalCost: number;
}

export default function Stats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [metrics, setMetrics] = useState<FullMetrics | null>(null);

  useEffect(() => {
    api.get('/stats').then(({ data }) => setStats(data));
    api.get('/metrics').then(({ data }) => setMetrics(data));
  }, []);

  if (!stats || !metrics) {
    return <div className="text-sm text-slate-400">加载中...</div>;
  }

  const decisionPie = {
    title: { text: '分级漏斗决策分布', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['40%', '65%'],
        data: [
          { name: '自动通过', value: stats.byDecision.pass ?? 0, itemStyle: { color: '#16a34a' } },
          { name: '自动拦截', value: stats.byDecision.reject ?? 0, itemStyle: { color: '#dc2626' } },
          { name: '转人审', value: stats.byDecision.review ?? 0, itemStyle: { color: '#f97316' } },
        ],
        label: { formatter: '{b}: {c}' },
      },
    ],
  };

  const categoryBar = {
    title: { text: '违规类别分布', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: Object.keys(stats.byCategory).map((c) => CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c),
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{ type: 'bar', data: Object.values(stats.byCategory), itemStyle: { color: '#3b5bdb' }, barMaxWidth: 40 }],
  };

  const pc = stats.prefixCache;
  const pcTotal = pc ? pc.hits + pc.misses : 0;

  const fiveMetrics = [
    { label: '违规召回率', value: `${(metrics.recall * 100).toFixed(1)}%` },
    { label: '误伤率', value: `${(metrics.falsePositiveRate * 100).toFixed(1)}%` },
    { label: '人审占比', value: `${(metrics.humanRatio * 100).toFixed(1)}%` },
    { label: '单条成本', value: `¥${metrics.costPerItem.toFixed(4)}` },
    { label: '审核时延', value: `${metrics.avgLatencyMs.toFixed(0)}ms` },
    { label: '质检准确率', value: `${(metrics.qualityAccuracy * 100).toFixed(0)}%` },
    { label: '前缀缓存命中率', value: pcTotal ? `${((pc!.hits / pcTotal) * 100).toFixed(0)}%` : '0%' },
    { label: '累计成本', value: `¥${metrics.totalCost.toFixed(4)}` },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">审核统计看板</h1>

      <div className="grid grid-cols-4 gap-4">
        {fiveMetrics.map((c) => (
          <div key={c.label} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className="mt-1 text-xl font-semibold text-slate-800">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <ReactECharts option={decisionPie} style={{ height: 320 }} />
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <ReactECharts option={categoryBar} style={{ height: 320 }} />
        </div>
      </div>

      <p className="text-xs text-slate-400">
        召回/误伤基于内置标注评测集（{stats.total} 条真实审核记录 + 规则引擎评测）；单条成本按 DeepSeek token 计价 + 人审固定成本估算。
      </p>
    </div>
  );
}
