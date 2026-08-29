import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/index.js';
import { authMiddleware, signToken, type AuthRequest } from '../services/auth.js';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: '缺少用户名或密码' });
    return;
  }
  const row = getDb()
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(String(username)) as Record<string, unknown> | undefined;
  if (!row || !bcrypt.compareSync(String(password), row.password_hash as string)) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }
  const user = {
    id: row.id as number,
    username: row.username as string,
    role: row.role as 'admin' | 'reviewer' | 'user',
  };
  res.json({ token: signToken(user), user });
});

authRouter.get('/me', authMiddleware, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});
