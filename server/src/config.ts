// 环境配置
import dotenv from 'dotenv';
import { ROOT_DIR } from './paths.js';

dotenv.config({ path: `${ROOT_DIR}/.env` });

export const config = {
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || 'mini-modguard-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  },
  hfEndpoint: process.env.HF_ENDPOINT || '',
};
