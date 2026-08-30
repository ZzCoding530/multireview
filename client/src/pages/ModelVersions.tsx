import React, { useEffect, useState } from 'react';
import { api } from '../api';

interface ModelVersion {
  id: number;
  name: string;
  provider: string;
  status: string;
  trafficPercent: number;
}

const STATUS_LABEL: Record<string, string> = {
  candidate: '候选',
  gray: '灰度中',
  active: '在线',
  rolled_back: '已回滚',
};

export default function ModelVersions() {
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('mock-small');

  const load = async () => {
    const { data } = await api.get('/model-versions');
    setVersions(data.versions);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!name) return;
    await api.post('/model-versions', { name, provider });
    setName('');
    await load();
  };

  const gray = async (id: number) => {
    await api.post(`/model-versions/${id}/gray`);
    await load();
  };

  const rollback = async () => {
    await api.post('/model-versions/rollback', { activeName: 'deepseek-v4-flash' });
    await load();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">模型版本与灰度发布</h1>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex gap-3">
          <input
            placeholder="版本名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="mock-small">mock-small（小模型）</option>
            <option value="deepseek">deepseek（大模型）</option>
          </select>
          <button
            onClick={add}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
          >
            新增版本
          </button>
          <button
            onClick={rollback}
            className="ml-auto rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            回滚灰度
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2">版本</th>
              <th>提供方</th>
              <th>状态</th>
              <th>流量</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id} className="border-b">
                <td className="py-2 font-mono text-xs">{v.name}</td>
                <td>{v.provider}</td>
                <td>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      v.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : v.status === 'gray'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {STATUS_LABEL[v.status] ?? v.status}
                  </span>
                </td>
                <td>{v.trafficPercent}%</td>
                <td>
                  {v.status === 'candidate' && (
                    <button
                      onClick={() => gray(v.id)}
                      className="rounded bg-orange-500 px-2 py-1 text-xs text-white"
                    >
                      灰度 20%
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-slate-400">
          灰度发布：候选版本切 20% 流量，观察指标劣化可回滚（小模型为 mock 占位，见待完善清单）。
        </p>
      </div>
    </div>
  );
}
