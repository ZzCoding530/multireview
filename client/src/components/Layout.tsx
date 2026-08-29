import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const nav = [
  { to: '/', label: '内容提交', icon: '📤', end: true },
  { to: '/review', label: '人审工作台', icon: '🧑‍⚖️' },
  { to: '/rules', label: '策略管理', icon: '⚙️' },
  { to: '/stats', label: '统计看板', icon: '📊' },
  { to: '/records', label: '审核记录', icon: '🗂️' },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = localStorage.getItem('username');

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <div className="flex h-screen">
      {/* 深色侧边栏 */}
      <aside className="flex w-56 flex-col bg-sidebar text-slate-300">
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-5">
          <span className="text-xl">🛡️</span>
          <div>
            <div className="text-sm font-semibold text-white">mini-modguard</div>
            <div className="text-[11px] text-slate-500">多模态内容审核</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <span>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4 text-sm">
          <div className="text-slate-300">{user ?? '未登录'}</div>
          <button
            onClick={logout}
            className="mt-2 w-full rounded-lg bg-slate-800 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* 浅色内容区 */}
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <Outlet />
      </main>
    </div>
  );
}
