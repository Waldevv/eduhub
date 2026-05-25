import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { client, deleteDiscordChannel, syncUnitDiscordAccess, syncCourseCategoryAccess } from '../lib/discord-bot';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/course/:courseId', async (req: Request, res: Response) => {
  try {
    const units = await prisma.unidade.findMany({
      where: { course_id: req.params.courseId },
      include: { _count: { select: { blocks: true } } },
      orderBy: { sequence_order: 'asc' },
    });
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const unit = await prisma.unidade.findUnique({
      where: { id: req.params.id },
      include: {
        blocks: {
          include: { content: true, activity: true, interaction: true, consolidation: true },
          orderBy: { sequence_order: 'asc' },
        },
      },
    });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    res.json(unit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unit' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { course_id, title, description, pedagogical_guidance } = req.body;
  try {
    const lastUnit = await prisma.unidade.findFirst({
      where: { course_id },
      orderBy: { sequence_order: 'desc' },
    });
    const sequence_order = (lastUnit?.sequence_order ?? 0) + 1;

    const unit = await prisma.unidade.create({
      data: { course_id, title, description, pedagogical_guidance, sequence_order },
    });
    res.status(201).json(unit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

router.patch('/reorder', async (req: Request, res: Response) => {
  const { items } = req.body as { items: { id: string; sequence_order: number }[] };
  try {
    await prisma.$transaction(
      items.map(({ id, sequence_order }) =>
        prisma.unidade.update({ where: { id }, data: { sequence_order } })
      )
    );
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder units' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const { title, description, pedagogical_guidance, status, is_published } = req.body;
  try {
    const unit = await prisma.unidade.update({
      where: { id: req.params.id },
      data: { title, description, pedagogical_guidance, status, is_published },
    });

    if (is_published === true) {
      syncUnitDiscordAccess(req.params.id).catch(() => {});
      syncCourseCategoryAccess(req.params.id).catch(() => {});
    }

    res.json(unit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update unit' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const unit = await prisma.unidade.findUnique({
      where: { id: req.params.id },
      include: {
        blocks: {
          include: { interaction: { include: { channel: true } } },
        },
        announcement_channels: true,
      },
    });

    if (unit) {
      const platformChannels = [
        ...unit.blocks.flatMap((b) =>
          b.interaction?.channel?.created_by_platform ? [b.interaction.channel] : []
        ),
        ...(unit as any).announcement_channels,
      ];

      if (platformChannels.length > 0) {
        let categoryId: string | null = null;
        try {
          const first = await client.channels.fetch(platformChannels[0].discord_channel_id) as any;
          categoryId = first?.parentId ?? null;
        } catch {}

        for (const ch of platformChannels) {
          try { await deleteDiscordChannel(ch.discord_channel_id); } catch {}
        }

        if (categoryId) {
          try { await deleteDiscordChannel(categoryId); } catch {}
        }
      }
    }

    await prisma.unidade.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete unit' });
  }
});

export default router;
