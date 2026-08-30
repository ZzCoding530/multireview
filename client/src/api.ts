import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export function riskColor(confidence: number): string {
  if (confidence >= 0.8) return '#dc2626'; // 红
  if (confidence >= 0.5) return '#f97316'; // 橙
  return '#16a34a'; // 绿
}

export function decisionColor(decision: string): string {
  if (decision === 'reject') return '#dc2626';
  if (decision === 'review') return '#f97316';
  return '#16a34a';
}
