// 大小模型协同 + 知识蒸馏
// 真实蒸馏（LLM 当 teacher，SFT/DPO 蒸馏到小模型）受限（无本地训练环境），
// 此处保留蒸馏接口，用 mock 指标占位（见待完善清单）。
import { countTrainingSamples, insertDistillJob, updateDistillJob } from '../db/phase3.js';

export interface DistillResult {
  jobId: number;
  status: string;
  metrics: Record<string, unknown>;
}

export async function runDistillation(teacher: string, student: string): Promise<DistillResult> {
  const sampleCount = countTrainingSamples();
  const jobId = insertDistillJob(teacher, student, sampleCount);
  const metrics = {
    note: 'mock 蒸馏结果：真实 SFT/DPO 微调训练未启用（无本地训练环境，见待完善清单）',
    sampleCount,
    evalLoss: Number((0.5 - sampleCount * 0.001).toFixed(4)),
    accuracy: Math.min(0.95, 0.8 + sampleCount * 0.002),
  };
  updateDistillJob(jobId, 'done', JSON.stringify(metrics));
  return { jobId, status: 'done', metrics };
}
