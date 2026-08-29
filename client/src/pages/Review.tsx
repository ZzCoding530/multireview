import React, { useEffect, useState } from 'react';
import { api, riskColor } from '../api';
import type { ModerationRecord } from '../types';
import { CATEGORY_LABELS, FINAL_STATUS_LABELS } from '../types';

export default function Review() {
  const [queue, setQueue] = useState<ModerationRecord[]>([]);
  const [selected, setSelected] = useState<ModerationRecord | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await api.get('/review/queue');
    setQueue(data.items);
    setSelected((prev) => {
      if (!prev) return data.items[0] ?? null;
      return data.items.find((i: ModerationRecord) => i.id === prev.id) ?? data.items[0] ?? null;
    });
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (action: 'pass' | 'reject' | 'escalate') => {
    if (!selected) return;
    setLoading(true);
    try {
      await api.post(`/review/${selected.id}`, { action, note });
      setNote('');
      await load();
    } finally {
      setLoading(false);
    }
  };

  const d = selected?.detectionResult;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-xl font-semibold text-slate-800">人审工作台</h1>
      <div className="grid grid-cols-3 gap-6">
        {/* 待审队列 */}
        <div className="col-span-1 rounded-xl bg-white p-3 shadow-sm">
          <div className="mb-2 px-2 text-sm font-medium text-slate-600">
            待审队列（{queue.length}）
          </div>
          <div className="max-h-[70vh] space-y-2 overflow-y-auto">
            {queue.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-400">暂无待审内容</div>
            )}
            {queue.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  selected?.id === r.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">#{r.id} · {r.contentType}</span>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: riskColor(r.confidence) }}
                  />
                </div>
                <div className="mt-1 line-clamp-2 text-sm text-slate-700">
                  {r.content ?? r.mediaPath ?? '(无内容)'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 详情与处置 */}
        <div className="col-span-2 rounded-xl bg-white p-5 shadow-sm">
          {!selected ? (
            <div className="py-20 text-center text-slate-400">选择左侧内容进行处置</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">记录 #{selected.id}</span>
                <span className="text-sm text-slate-500">
                  状态：{FINAL_STATUS_LABELS[selected.finalStatus]}
                </span>
              </div>

              <div className="mt-3 rounded-lg bg-slate-50 p-4">
                {selected.contentType === 'text' ? (
                  <p className="text-sm text-slate-800">{selected.content}</p>
                ) : selected.mediaPath ? (
                  <img src={selected.mediaPath} alt="" className="max-h-64 rounded" />
                ) : (
                  <p className="text-sm text-slate-400">无内容</p>
                )}
              </div>

              {d && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-slate-700">机器检测结果（供参考）</div>
                  <div className="mt-2 flex items-center gap-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs text-white"
                      style={{ backgroundColor: riskColor(selected.confidence) }}
                    >
                      置信度 {Math.round(selected.confidence * 100)}%
                    </span>
                    {d.categories.map((c) => (
                      <span key={c} className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                        {CATEGORY_LABELS[c]}
                      </span>
                    ))}
                  </div>
                  {d.hits.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-slate-500">
                      {d.hits.map((h, i) => (
                        <li key={i}>
                          [{h.type}] 第 {h.sentenceIndex + 1} 句 ·「{h.matched}」→ {CATEGORY_LABELS[h.category]}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="mt-5">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="处置备注（留痕）"
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </div>

              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => act('pass')}
                  disabled={loading}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                >
                  通过
                </button>
                <button
                  onClick={() => act('reject')}
                  disabled={loading}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                >
                  拒绝
                </button>
                <button
                  onClick={() => act('escalate')}
                  disabled={loading}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600"
                >
                  存疑升级
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
