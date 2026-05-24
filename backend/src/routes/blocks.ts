import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/unit/:unitId', async (req: Request, res: Response) => {
  try {
    const blocks = await prisma.bloco.findMany({
      where: { unit_id: req.params.unitId as string },
      orderBy: { sequence_order: 'asc' },
    });
    res.json(blocks);
  } catch {
    res.status(500).json({ error: 'Failed to fetch blocks' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { unit_id, title, block_type, is_required, config_json } = req.body;
  try {
    const last = await prisma.bloco.findFirst({
      where: { unit_id },
      orderBy: { sequence_order: 'desc' },
    });
    const sequence_order = (last?.sequence_order ?? 0) + 1;
    const block = await prisma.bloco.create({
      data: { unit_id, title, block_type, is_required: is_required ?? false, sequence_order, config_json },
    });
    res.status(201).json(block);
  } catch {
    res.status(500).json({ error: 'Failed to create block' });
  }
});

router.patch('/reorder', async (req: Request, res: Response) => {
  const items: { id: string; sequence_order: number }[] = req.body;
  try {
    await Promise.all(
      items.map(({ id, sequence_order }) =>
        prisma.bloco.update({ where: { id }, data: { sequence_order } })
      )
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to reorder blocks' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const { title, is_required, status, config_json } = req.body;
  try {
    const block = await prisma.bloco.update({
      where: { id: req.params.id as string },
      data: { title, is_required, status, config_json },
    });

    if (config_json && (block.block_type === 'activity' || block.block_type === 'exam')) {
      const cfg = config_json as Record<string, unknown>;
      const activityType = (cfg.activityType as string) || 'quiz';
      const quizId = activityType === 'quiz' ? (cfg.quizId as string | null) ?? null : null;
      const maxAttempts = cfg.maxAttempts ? Number(cfg.maxAttempts) : null;
      const timeLimitMinutes = cfg.timeLimit ? Number(cfg.timeLimit) : null;
      const passingScore = cfg.passingScore ? Number(cfg.passingScore) : null;
      const description = (cfg.description as string | null) ?? null;

      await prisma.blocoAtividade.upsert({
        where: { block_id: block.id },
        update: { activity_type: activityType, quiz_id: quizId, max_attempts: maxAttempts, time_limit_minutes: timeLimitMinutes, passing_score: passingScore, description },
        create: { block_id: block.id, activity_type: activityType, quiz_id: quizId, max_attempts: maxAttempts, time_limit_minutes: timeLimitMinutes, passing_score: passingScore, description },
      });
    }

    if (config_json && block.block_type === 'consolidation') {
      const cfg = config_json as Record<string, unknown>;
      const consolidationType = (cfg.consolidationType as string) ?? 'quiz';
      if (consolidationType === 'quiz' && cfg.quizId) {
        await prisma.blocoAtividade.upsert({
          where: { block_id: block.id },
          update: {
            activity_type: 'quiz',
            quiz_id: cfg.quizId as string,
            max_attempts: cfg.maxAttempts ? Number(cfg.maxAttempts) : null,
            time_limit_minutes: cfg.timeLimit ? Number(cfg.timeLimit) : null,
            passing_score: cfg.passingScore ? Number(cfg.passingScore) : null,
            description: null,
          },
          create: {
            block_id: block.id,
            activity_type: 'quiz',
            quiz_id: cfg.quizId as string,
            max_attempts: cfg.maxAttempts ? Number(cfg.maxAttempts) : null,
            time_limit_minutes: cfg.timeLimit ? Number(cfg.timeLimit) : null,
            passing_score: cfg.passingScore ? Number(cfg.passingScore) : null,
            description: null,
          },
        });
      } else {
        await prisma.blocoAtividade.deleteMany({ where: { block_id: block.id } });
      }
    }

    res.json(block);
  } catch {
    res.status(500).json({ error: 'Failed to update block' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.bloco.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete block' });
  }
});

export default router;
