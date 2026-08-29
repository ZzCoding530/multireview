// 基于模块位置的路径常量，保证无论从哪个目录启动都一致
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** server/ 目录（src/paths.ts -> server/src；dist/paths.js -> server/dist） */
export const SERVER_DIR = path.resolve(__dirname, '..');
/** 项目根目录（/workspace） */
export const ROOT_DIR = path.resolve(SERVER_DIR, '..');
export const DATA_DIR = path.join(SERVER_DIR, 'data');
export const UPLOADS_DIR = path.join(SERVER_DIR, 'uploads');
