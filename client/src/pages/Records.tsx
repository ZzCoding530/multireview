import React, { useEffect, useState } from 'react';
import { api, decisionColor } from '../api';
import type { ModerationRecord } from '../types';
import { CATEGORY_LABELS, DECISION_LABELS, FINAL_STATUS_LABELS } from '../types';

export default function Records() {
  const [records, setRecords] = useState<ModerationRecord[]>([]);

  useEffect(() => {
    api.get('/stats/records').then(({ data }) => setRecords(data.records));
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-4 text-xl font-semibold text-slate-800">审核记录</h1>
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2">ID</th>
              <th>类型</th>
              <th>内容</th>
              <th>类别</th>
              <th>置信度</th>
              <th>漏斗决策</th>
              <th>处置状态</th>
              <th>处置人</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2 text-slate-400">{r.id}</td>
                <td>{r.contentType}</td>
                <td className="max-w-[280px] truncate">
                  {r.content ?? r.mediaPath ?? '-'}
                </td>
                <td>
                  <span className="flex flex-wrap gap-1">
                    {(r.detectionResult?.categories ?? []).map((c) => (
                      <span key={c} className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                        {CATEGORY_LABELS[c]}
                      </span>
                    ))}
                  </span>
                </td>
                <td>{Math.round(r.confidence * 100)}%</td>
                <td>
                  <span
                    className="rounded px-2 py-0.5 text-xs text-white"
                    style={{ backgroundColor: decisionColor(r.decision) }}
                  >
                    {DECISION_LABELS[r.decision]}
                  </span>
                </td>
                <td>{FINAL_STATUS_LABELS[r.finalStatus]}</td>
                <td>{r.reviewer ?? '-'}</td>
                <td className="text-xs text-slate-400">{r.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
