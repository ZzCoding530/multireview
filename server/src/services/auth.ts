// JWT 登录与鉴权
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import type { AuthUser } from '../types.js';

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
  );
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    req.user = {
      id: Number(payload.id),
      username: String(payload.username),
      role: payload.role as AuthUser['role'],
    };
    next();
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
}

export function requireRole(role: AuthUser['role']) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // 先鉴权（设置 req.user），再校验角色
    authMiddleware(req, res, () => {
      if (!req.user || (req.user.role !== role && req.user.role !== 'admin')) {
        res.status(403).json({ error: '权限不足' });
        return;
      }
      next();
    });
  };
}
