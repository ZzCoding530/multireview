// SQLite 数据层：建表、迁移、种子数据
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { DATA_DIR } from '../paths.js';

let db: DatabaseSync | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'reviewer',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('keyword','regex','variant')),
  pattern TEXT NOT NULL,
  category TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_line TEXT NOT NULL UNIQUE,
  pass_threshold REAL NOT NULL DEFAULT 0.2,
  reject_threshold REAL NOT NULL DEFAULT 0.8,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS moderation_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type TEXT NOT NULL,
  content TEXT,
  media_path TEXT,
  detection_result TEXT,
  confidence REAL NOT NULL DEFAULT 0,
  decision TEXT NOT NULL,
  final_status TEXT NOT NULL DEFAULT 'pending',
  reviewer TEXT,
  review_note TEXT,
  business_line TEXT NOT NULL DEFAULT 'general',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS review_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL,
  reviewer TEXT NOT NULL,
  action TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS appeals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS training_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  label TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'appeal',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS model_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate',
  traffic_percent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS distill_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_model TEXT NOT NULL,
  student_model TEXT NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  metrics TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quality_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL,
  reviewer TEXT,
  result TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS eval_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eval_type TEXT NOT NULL,
  metrics TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function seed(db: DatabaseSync): void {
  const userCount = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    const insert = db.prepare(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
    );
    insert.run('admin', bcrypt.hashSync('admin123', 10), 'admin');
    insert.run('reviewer', bcrypt.hashSync('review123', 10), 'reviewer');
  }

  const ruleCount = (db.prepare('SELECT COUNT(*) AS c FROM rules').get() as { c: number }).c;
  if (ruleCount === 0) {
    const insert = db.prepare(
      'INSERT INTO rules (name, type, pattern, category) VALUES (?, ?, ?, ?)',
    );
    // 关键词规则
    const keywords: Array<[string, string, string, string]> = [
      ['赌博-关键词', 'keyword', '赌博', 'illegal'],
      ['毒品-关键词', 'keyword', '毒品', 'illegal'],
      ['枪支-关键词', 'keyword', '枪支', 'violence'],
      ['诈骗-关键词', 'keyword', '诈骗', 'illegal'],
      ['代开发票-关键词', 'keyword', '代开发票', 'spam'],
    ];
    for (const [name, type, pattern, category] of keywords) {
      insert.run(name, type, pattern, category);
    }
    // 正则规则
    insert.run('手机号-正则', 'regex', '1[3-9]\\d{9}', 'spam');
    insert.run('银行卡号-正则', 'regex', '\\d{16,19}', 'illegal');
    // 变体词规则（含分隔符，归一化后命中）
    insert.run('赌博-变体', 'variant', '赌 博', 'illegal');
    insert.run('代开发票-变体', 'variant', '代 开 发 票', 'spam');
    insert.run('加微信-变体', 'variant', '加·微·信', 'spam');
  }

  const policyCount = (db.prepare('SELECT COUNT(*) AS c FROM policies').get() as { c: number }).c;
  if (policyCount === 0) {
    const insert = db.prepare(
      'INSERT INTO policies (business_line, pass_threshold, reject_threshold) VALUES (?, ?, ?)',
    );
    insert.run('general', 0.2, 0.8); // 通用业务线
    insert.run('youth', 0.1, 0.5); // 青少年模式更严
  }

  const modelVersionCount = (db.prepare('SELECT COUNT(*) AS c FROM model_versions').get() as { c: number }).c;
  if (modelVersionCount === 0) {
    const insert = db.prepare(
      'INSERT INTO model_versions (name, provider, status, traffic_percent) VALUES (?, ?, ?, ?)',
    );
    insert.run('deepseek-v4-flash', 'deepseek', 'active', 100);
    insert.run('mock-small-model-v1', 'mock-small', 'candidate', 0);
  }
}

export function getDb(): DatabaseSync {
  if (!db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new DatabaseSync(path.join(DATA_DIR, 'modguard.db'));
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec(SCHEMA);
    seed(db);
  }
  return db;
}
