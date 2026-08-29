// 数据访问层：规则、策略、审核记录、申诉、日志的增删改查
import { getDb } from './index.js';
import type {
  Category,
  ContentType,
  DetectionResult,
  Decision,
  FinalStatus,
  ModerationRecord,
  Policy,
  Rule,
  RuleType,
} from '../types.js';

interface RecordRow {
  id: number;
  content_type: string;
  content: string | null;
  media_path: string | null;
  detection_result: string | null;
  confidence: number;
  decision: string;
  final_status: string;
  reviewer: string | null;
  review_note: string | null;
  business_line: string;
  created_at: string;
  updated_at: string;
}

function rowToRecord(row: RecordRow): ModerationRecord {
  return {
    id: row.id,
    contentType: row.content_type as ContentType,
    content: row.content,
    mediaPath: row.media_path,
    detectionResult: row.detection_result ? (JSON.parse(row.detection_result) as DetectionResult) : null,
    confidence: row.confidence,
    decision: row.decision as Decision,
    finalStatus: row.final_status as FinalStatus,
    reviewer: row.reviewer,
    reviewNote: row.review_note,
    businessLine: row.business_line,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---- 规则 ----

export function listRules(): Rule[] {
  const rows = getDb()
    .prepare('SELECT * FROM rules ORDER BY id')
    .all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as number,
    name: r.name as string,
    type: r.type as RuleType,
    pattern: r.pattern as string,
    category: r.category as Category,
    enabled: Boolean(r.enabled),
  }));
}

export function insertRule(input: {
  name: string;
  type: RuleType;
  pattern: string;
  category: Category;
}): Rule {
  const info = getDb()
    .prepare('INSERT INTO rules (name, type, pattern, category) VALUES (?, ?, ?, ?)')
    .run(input.name, input.type, input.pattern, input.category);
  const id = Number(info.lastInsertRowid);
  return { id, ...input, enabled: true };
}

export function updateRule(
  id: number,
  input: Partial<{ name: string; type: RuleType; pattern: string; category: Category; enabled: boolean }>,
): boolean {
  const fields: string[] = [];
  const values: Array<string | number> = [];
  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
  if (input.type !== undefined) { fields.push('type = ?'); values.push(input.type); }
  if (input.pattern !== undefined) { fields.push('pattern = ?'); values.push(input.pattern); }
  if (input.category !== undefined) { fields.push('category = ?'); values.push(input.category); }
  if (input.enabled !== undefined) { fields.push('enabled = ?'); values.push(input.enabled ? 1 : 0); }
  if (fields.length === 0) return false;
  fields.push("updated_at = datetime('now')");
  values.push(id);
  const info = getDb()
    .prepare(`UPDATE rules SET ${fields.join(', ')} WHERE id = ?`)
    .run(...values);
  return info.changes > 0;
}

export function deleteRule(id: number): boolean {
  const info = getDb().prepare('DELETE FROM rules WHERE id = ?').run(id);
  return info.changes > 0;
}

// ---- 策略 ----

export function listPolicies(): Policy[] {
  const rows = getDb().prepare('SELECT * FROM policies ORDER BY id').all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as number,
    businessLine: r.business_line as string,
    passThreshold: r.pass_threshold as number,
    rejectThreshold: r.reject_threshold as number,
    enabled: Boolean(r.enabled),
  }));
}

export function getPolicy(businessLine: string): Policy | undefined {
  const r = getDb()
    .prepare('SELECT * FROM policies WHERE business_line = ?')
    .get(businessLine) as Record<string, unknown> | undefined;
  if (!r) return undefined;
  return {
    id: r.id as number,
    businessLine: r.business_line as string,
    passThreshold: r.pass_threshold as number,
    rejectThreshold: r.reject_threshold as number,
    enabled: Boolean(r.enabled),
  };
}

export function updatePolicy(
  id: number,
  input: { passThreshold?: number; rejectThreshold?: number; enabled?: boolean },
): boolean {
  const fields: string[] = [];
  const values: Array<string | number> = [];
  if (input.passThreshold !== undefined) { fields.push('pass_threshold = ?'); values.push(input.passThreshold); }
  if (input.rejectThreshold !== undefined) { fields.push('reject_threshold = ?'); values.push(input.rejectThreshold); }
  if (input.enabled !== undefined) { fields.push('enabled = ?'); values.push(input.enabled ? 1 : 0); }
  if (fields.length === 0) return false;
  fields.push("updated_at = datetime('now')");
  values.push(id);
  const info = getDb().prepare(`UPDATE policies SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return info.changes > 0;
}

// ---- 审核记录 ----

export function insertRecord(input: {
  contentType: ContentType;
  content: string | null;
  mediaPath: string | null;
  detectionResult: DetectionResult | null;
  confidence: number;
  decision: Decision;
  businessLine: string;
}): ModerationRecord {
  const info = getDb()
    .prepare(
      `INSERT INTO moderation_records
       (content_type, content, media_path, detection_result, confidence, decision, final_status, business_line)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      input.contentType,
      input.content,
      input.mediaPath,
      input.detectionResult ? JSON.stringify(input.detectionResult) : null,
      input.confidence,
      input.decision,
      input.businessLine,
    );
  const id = Number(info.lastInsertRowid);
  return getRecord(id)!;
}

export function getRecord(id: number): ModerationRecord | undefined {
  const row = getDb().prepare('SELECT * FROM moderation_records WHERE id = ?').get(id) as
    | RecordRow
    | undefined;
  return row ? rowToRecord(row) : undefined;
}

/** 待审队列：decision='review' 且未处置，风险降序、时效升序 */
export function listPendingReview(): ModerationRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM moderation_records
       WHERE decision = 'review' AND final_status = 'pending'
       ORDER BY confidence DESC, created_at ASC`,
    )
    .all() as unknown as RecordRow[];
  return rows.map(rowToRecord);
}

export function listRecords(limit = 100): ModerationRecord[] {
  const rows = getDb()
    .prepare('SELECT * FROM moderation_records ORDER BY id DESC LIMIT ?')
    .all(limit) as unknown as RecordRow[];
  return rows.map(rowToRecord);
}

export function updateRecordDecision(
  id: number,
  finalStatus: FinalStatus,
  reviewer: string,
  note: string | null,
): boolean {
  const info = getDb()
    .prepare(
      `UPDATE moderation_records
       SET final_status = ?, reviewer = ?, review_note = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(finalStatus, reviewer, note, id);
  return info.changes > 0;
}

export function addReviewLog(recordId: number, reviewer: string, action: string, note: string | null): void {
  getDb()
    .prepare('INSERT INTO review_logs (record_id, reviewer, action, note) VALUES (?, ?, ?, ?)')
    .run(recordId, reviewer, action, note);
}

// ---- 申诉 ----

export function insertAppeal(recordId: number, reason: string): number {
  const info = getDb()
    .prepare('INSERT INTO appeals (record_id, reason) VALUES (?, ?)')
    .run(recordId, reason);
  return Number(info.lastInsertRowid);
}

export function listAppeals(): Array<Record<string, unknown>> {
  return getDb()
    .prepare('SELECT * FROM appeals ORDER BY id DESC')
    .all() as Array<Record<string, unknown>>;
}

export function updateAppeal(id: number, status: string, result: string | null): boolean {
  const info = getDb()
    .prepare("UPDATE appeals SET status = ?, result = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, result, id);
  return info.changes > 0;
}

// ---- 统计 ----

export interface Stats {
  total: number;
  byDecision: Record<string, number>;
  byFinalStatus: Record<string, number>;
  byCategory: Record<string, number>;
  avgConfidence: number;
}

export function getStats(): Stats {
  const db = getDb();
  const total = (db.prepare('SELECT COUNT(*) AS c FROM moderation_records').get() as { c: number }).c;
  const byDecision = Object.fromEntries(
    (db
      .prepare('SELECT decision, COUNT(*) AS c FROM moderation_records GROUP BY decision')
      .all() as Array<{ decision: string; c: number }>).map((r) => [r.decision, r.c]),
  );
  const byFinalStatus = Object.fromEntries(
    (db
      .prepare('SELECT final_status, COUNT(*) AS c FROM moderation_records GROUP BY final_status')
      .all() as Array<{ final_status: string; c: number }>).map((r) => [r.final_status, r.c]),
  );
  const byCategory: Record<string, number> = {};
  const rows = db.prepare('SELECT detection_result FROM moderation_records').all() as Array<{
    detection_result: string | null;
  }>;
  for (const r of rows) {
    if (!r.detection_result) continue;
    try {
      const d = JSON.parse(r.detection_result) as DetectionResult;
      for (const c of d.categories) byCategory[c] = (byCategory[c] || 0) + 1;
    } catch {
      /* ignore */
    }
  }
  const avg = (db.prepare('SELECT AVG(confidence) AS a FROM moderation_records').get() as { a: number | null }).a;
  return {
    total,
    byDecision,
    byFinalStatus,
    byCategory,
    avgConfidence: avg ?? 0,
  };
}
