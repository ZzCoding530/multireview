// OCR：tesseract.js 提取图片内文字（真实能力），供文本规则审核
// 语言包预下载到 server/data/tessdata，本地加载（绕过沙箱 worker 线程的代理限制）
import { createWorker } from 'tesseract.js';
import type { Worker } from 'tesseract.js';
import path from 'node:path';
import { DATA_DIR } from '../../paths.js';

const TESSDATA_DIR = path.join(DATA_DIR, 'tessdata');

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('chi_sim', 1, {
      langPath: TESSDATA_DIR,
    });
  }
  return workerPromise;
}

export async function ocrText(imagePath: string): Promise<string> {
  const worker = await getWorker();
  const { data } = await worker.recognize(imagePath);
  return data.text ?? '';
}
