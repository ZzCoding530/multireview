// 三期数据访问层：训练样本、模型版本、蒸馏任务、质检、评测、申诉
import { getDb } from './index.js';

// ---- 训练样本（纠正样本回流 / LLM 标注） ----

export interface TrainingSample {
  id: number;
  content: string;
  label: string;
  source: string;
}

export function insertTrainingSample(content: string, label: string, source: string): number {
  const info = getDb()
    .prepare('INSERT INTO training_samples (content, label, source) VALUES (?, ?, ?)')
    .run(content, label, source);
  return Number(info.lastInsertRowid);
}

export function listTrainingSamples(limit = 100): TrainingSample[] {
  return getDb()
    .prepare('SELECT * FROM training_samples ORDER BY id DESC LIMIT ?')
    .all(limit) as unknown as TrainingSample[];
}

export function countTrainingSamples(): number {
  return (getDb().prepare('SELECT COUNT(*) AS c FROM training_samples').get() as { c: number }).c;
}

// ---- 模型版本（灰度发布/回滚） ----

export interface ModelVersion {
  id: number;
  name: string;
  provider: string;
  status: string;
  trafficPercent: number;
  createdAt: string;
}

export function listModelVersions(): ModelVersion[] {
  const rows = getDb().prepare('SELECT * FROM model_versions ORDER BY id').all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as number,
    name: r.name as string,
    provider: r.provider as string,
    status: r.status as string,
    trafficPercent: r.traffic_percent as number,
    createdAt: r.created_at as string,
  }));
}

export function insertModelVersion(name: string, provider: string): ModelVersion {
  const info = getDb()
    .prepare("INSERT INTO model_versions (name, provider, status, traffic_percent) VALUES (?, ?, 'candidate', 0)")
    .run(name, provider);
  return listModelVersions().find((m) => m.id === Number(info.lastInsertRowid))!;
}

export function updateModelVersion(id: number, patch: Partial<{ status: string; trafficPercent: number }>): boolean {
  const fields: string[] = [];
  const values: Array<string | number> = [];
  if (patch.status !== undefined) { fields.push('status = ?'); values.push(patch.status); }
  if (patch.trafficPercent !== undefined) { fields.push('traffic_percent = ?'); values.push(patch.trafficPercent); }
  if (fields.length === 0) return false;
  values.push(id);
  const info = getDb().prepare(`UPDATE model_versions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return info.changes > 0;
}

// ---- 蒸馏任务（大小模型协同） ----

export function insertDistillJob(teacher: string, student: string, sampleCount: number): number {
  const info = getDb()
    .prepare("INSERT INTO distill_jobs (teacher_model, student_model, sample_count, status) VALUES (?, ?, ?, 'pending')")
    .run(teacher, student, sampleCount);
  return Number(info.lastInsertRowid);
}

export function updateDistillJob(id: number, status: string, metrics: string | null): void {
  getDb().prepare('UPDATE distill_jobs SET status = ?, metrics = ? WHERE id = ?').run(status, metrics, id);
}

export function listDistillJobs(limit = 20): Array<Record<string, unknown>> {
  return getDb().prepare('SELECT * FROM distill_jobs ORDER BY id DESC LIMIT ?').all(limit) as Array<Record<string, unknown>>;
}

// ---- 质检抽样 ----

export function insertQualityCheck(recordId: number, reviewer: string, result: string, note: string | null): void {
  getDb()
    .prepare('INSERT INTO quality_checks (record_id, reviewer, result, note) VALUES (?, ?, ?, ?)')
    .run(recordId, reviewer, result, note);
}

export function listQualityChecks(): Array<Record<string, unknown>> {
  return getDb().prepare('SELECT * FROM quality_checks ORDER BY id DESC').all() as Array<Record<string, unknown>>;
}

export function qualityStats(): { total: number; correct: number; accuracy: number } {
  const total = (getDb().prepare('SELECT COUNT(*) AS c FROM quality_checks').get() as { c: number }).c;
  const correct = (
    getDb().prepare("SELECT COUNT(*) AS c FROM quality_checks WHERE result = 'correct'").get() as { c: number }
  ).c;
  return { total, correct, accuracy: total === 0 ? 0 : correct / total };
}

// ---- 评测记录 ----

export function insertEvalRun(evalType: string, metrics: object): void {
  getDb().prepare('INSERT INTO eval_runs (eval_type, metrics) VALUES (?, ?)').run(evalType, JSON.stringify(metrics));
}

export function listEvalRuns(limit = 20): Array<Record<string, unknown>> {
  return getDb().prepare('SELECT * FROM eval_runs ORDER BY id DESC LIMIT ?').all(limit) as Array<Record<string, unknown>>;
}

// ---- 申诉（带记录内容） ----

export function getAppeal(id: number): Record<string, unknown> | undefined {
  return getDb().prepare('SELECT * FROM appeals WHERE id = ?').get(id) as Record<string, unknown> | undefined;
}

export function listAppealsWithRecord(): Array<Record<string, unknown>> {
  return getDb()
    .prepare(
      `SELECT a.*, r.content, r.media_path, r.final_status AS record_status, r.decision AS record_decision
       FROM appeals a LEFT JOIN moderation_records r ON a.record_id = r.id
       ORDER BY a.id DESC`,
    )
    .all() as Array<Record<string, unknown>>;
}
