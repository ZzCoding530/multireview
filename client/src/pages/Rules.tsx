import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Category, Policy, Rule } from '../types';
import { CATEGORY_LABELS } from '../types';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [form, setForm] = useState({ name: '', type: 'keyword', pattern: '', category: 'illegal' });
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [r, p] = await Promise.all([api.get('/rules'), api.get('/rules/policies')]);
    setRules(r.data.rules);
    setPolicies(p.data.policies);
  };

  useEffect(() => {
    load();
  }, []);

  const addRule = async () => {
    try {
      await api.post('/rules', form);
      setMsg('规则已新增（热更新，即刻生效）');
      setForm({ name: '', type: 'keyword', pattern: '', category: 'illegal' });
      await load();
    } catch (err: any) {
      setMsg(err?.response?.data?.error ?? '新增失败');
    }
  };

  const toggleRule = async (r: Rule) => {
    await api.put(`/rules/${r.id}`, { enabled: !r.enabled });
    await load();
  };

  const delRule = async (id: number) => {
    await api.delete(`/rules/${id}`);
    await load();
  };

  const updatePolicy = async (p: Policy, patch: Partial<Policy>) => {
    await api.put(`/rules/policies/${p.id}`, patch);
    await load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">策略管理</h1>
      {msg && <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{msg}</div>}

      {/* 阈值配置 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-medium text-slate-700">分级漏斗阈值（按业务线）</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2">业务线</th>
              <th>通过阈值（≤）</th>
              <th>拦截阈值（≥）</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">
                  {p.businessLine === 'youth' ? '青少年模式（更严）' : '通用业务线'}
                </td>
                <td>
                  <input
                    type="number"
                    step="0.05"
                    defaultValue={p.passThreshold}
                    onBlur={(e) => updatePolicy(p, { passThreshold: Number(e.target.value) })}
                    className="w-20 rounded border border-slate-300 px-2 py-1"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.05"
                    defaultValue={p.rejectThreshold}
                    onBlur={(e) => updatePolicy(p, { rejectThreshold: Number(e.target.value) })}
                    className="w-20 rounded border border-slate-300 px-2 py-1"
                  />
                </td>
                <td className="text-xs text-slate-400">失焦即热更新</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 规则库 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-medium text-slate-700">规则库（增删改热更新）</h2>
        <div className="mb-4 grid grid-cols-5 gap-2">
          <input
            placeholder="规则名"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="keyword">关键词</option>
            <option value="regex">正则</option>
            <option value="variant">变体词</option>
          </select>
          <input
            placeholder="规则内容"
            value={form.pattern}
            onChange={(e) => setForm({ ...form, pattern: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <button
            onClick={addRule}
            className="rounded bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700"
          >
            新增规则
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2">ID</th>
              <th>名称</th>
              <th>类型</th>
              <th>内容</th>
              <th>类别</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2 text-slate-400">{r.id}</td>
                <td>{r.name}</td>
                <td>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{r.type}</span>
                </td>
                <td className="font-mono text-xs">{r.pattern}</td>
                <td>{CATEGORY_LABELS[r.category]}</td>
                <td>
                  <button
                    onClick={() => toggleRule(r)}
                    className={`rounded px-2 py-0.5 text-xs ${
                      r.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {r.enabled ? '启用' : '停用'}
                  </button>
                </td>
                <td>
                  <button onClick={() => delRule(r.id)} className="text-xs text-red-600">
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
