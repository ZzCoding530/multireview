import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.user.username);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-sidebar">
      <form
        onSubmit={submit}
        className="w-80 rounded-2xl bg-white p-8 shadow-xl"
      >
        <div className="mb-6 text-center">
          <div className="text-3xl">🛡️</div>
          <h1 className="mt-2 text-lg font-semibold text-slate-800">mini-modguard</h1>
          <p className="text-sm text-slate-500">多模态内容审核平台</p>
        </div>
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-primary-600 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? '登录中...' : '登录'}
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">
          默认账号：admin / admin123 · reviewer / review123
        </p>
      </form>
    </div>
  );
}
