import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const CLIENT_ID = () => process.env.DISCORD_CLIENT_ID!;
const CLIENT_SECRET = () => process.env.DISCORD_CLIENT_SECRET!;
const REDIRECT_URI = () => process.env.DISCORD_REDIRECT_URI || 'http://localhost:3001/api/auth/discord/callback';
const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_SECRET = () => process.env.JWT_SECRET!;

function makeToken(user: { id: string; discord_id: string | null; role: string; profile_completed: boolean }) {
  return jwt.sign(
    { id: user.id, discord_id: user.discord_id, role: user.role, profile_completed: user.profile_completed },
    JWT_SECRET(),
    { expiresIn: '7d' }
  );
}

router.get('/discord', (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID(),
    redirect_uri: REDIRECT_URI(),
    response_type: 'code',
    scope: 'identify email guilds',
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

router.get('/discord/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${FRONTEND_URL()}/login?error=no_code`);

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID(),
        client_secret: CLIENT_SECRET(),
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: REDIRECT_URI(),
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) throw new Error('No access token');

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userRes.json() as any;

    const avatar = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    const tokenExpires = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    const user = await prisma.usuario.upsert({
      where: { discord_id: discordUser.id },
      update: {
        email: discordUser.email || `${discordUser.id}@discord.user`,
        avatar,
        discord_access_token: tokenData.access_token,
        ...(tokenExpires ? { discord_token_expires: tokenExpires } : {}),
      },
      create: {
        discord_id: discordUser.id,
        name: discordUser.global_name || discordUser.username,
        email: discordUser.email || `${discordUser.id}@discord.user`,
        avatar,
        role: 'pending',
        profile_completed: false,
        discord_access_token: tokenData.access_token,
        ...(tokenExpires ? { discord_token_expires: tokenExpires } : {}),
      },
    });

    const token = makeToken(user);
    res.redirect(`${FRONTEND_URL()}/auth/callback?token=${token}`);
  } catch (err: any) {
    console.error('Discord OAuth error:', err.message);
    res.redirect(`${FRONTEND_URL()}/login?error=oauth_failed`);
  }
});

router.post('/complete-profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { role, name, birth_date, gender } = req.body as {
    role: 'teacher' | 'student';
    name?: string;
    birth_date?: string;
    gender?: string;
  };
  if (role !== 'teacher' && role !== 'student') {
    return res.status(400).json({ error: 'Papel inválido' });
  }
  try {
    const user = await prisma.usuario.update({
      where: { id: req.user!.id },
      data: {
        role,
        profile_completed: true,
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(birth_date ? { birth_date: new Date(birth_date) } : {}),
        ...(gender ? { gender } : {}),
      },
    });
    const token = makeToken(user);
    res.json({ token });
  } catch {
    res.status(500).json({ error: 'Falha ao completar perfil' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.usuario.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;
