import React, { useEffect, useState } from 'react';
import { api } from '../api';

interface Appeal {
  id: number;
  record_id: number;
  reason: string;
  status: string;
  result?: string;
  content?: string;
  media_path?: string;
  record_status?: string;
  record_decision?: string;
}

export default function Appeals() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [recordId, setRecordId] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const { data } = await api.get('/appeals');
    setAppeals(data.appeals);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    try {
      await api.post('/appeals', { recordId: Number(recordId), reason });
      setMsg('申诉已提交');
      setRecordId('');
      setReason('');
      await load();
    } catch (err: any) {
      setMsg(err?.response?.data?.error ?? '提交失败');
    }
  };

  const review = async (id: number, result: 'approve' | 'reject') => {
    await api.post(`/appeals/${id}/review`, { result, note: '' });
    await load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">申诉与回流</h1>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-3 text-sm font-medium text-slate-700">发起申诉</div>
        <div className="flex gap-3">
          <input
            placeholder="被拒记录 ID"
            value={recordId}
            onChange={(e) => setRecordId(e.target.value)}
            className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="申诉理由"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={submit}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
          >
            提交申诉
          </button>
        </div>
        {msg && <div className="mt-2 text-sm text-slate-500">{msg}</div>}
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-3 text-sm font-medium text-slate-700">申诉列表（人工复审）</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2">ID</th>
              <th>原内容</th>
              <th>理由</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {appeals.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="py-2 text-slate-400">#{a.id}</td>
                <td className="max-w-[240px] truncate">{a.content ?? a.media_path ?? '-'}</td>
                <td className="max-w-[200px] truncate">{a.reason}</td>
                <td>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      a.status === 'pending'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {a.status === 'pending' ? '待复审' : `已复审(${a.result})`}
                  </span>
                </td>
                <td>
                  {a.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => review(a.id, 'approve')}
                        className="rounded bg-green-600 px-2 py-1 text-xs text-white"
                      >
                        放行+回流
                      </button>
                      <button
                        onClick={() => review(a.id, 'reject')}
                        className="rounded bg-slate-500 px-2 py-1 text-xs text-white"
                      >
                        维持
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </td>
              </tr>
            ))}
            {appeals.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  暂无申诉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
