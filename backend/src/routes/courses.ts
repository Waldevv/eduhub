import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { syncUnitDiscordAccess } from '../lib/discord-bot';

const router = Router();

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

router.get('/join/:code', async (req: Request, res: Response) => {
  try {
    const course = await prisma.curso.findUnique({
      where: { invite_code: req.params.code.toUpperCase() },
      include: {
        teacher: { select: { id: true, name: true, avatar: true } },
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) return res.status(404).json({ error: 'Código de convite inválido' });
    res.json({
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      objectives: course.objectives,
      start_date: course.start_date,
      end_date: course.end_date,
      status: course.status,
      invite_code: course.invite_code,
      teacher: course.teacher,
      enrollments: course._count.enrollments,
    });
  } catch {
    res.status(500).json({ error: 'Falha ao buscar curso' });
  }
});

router.post('/join/:code', authMiddleware, async (req: Request, res: Response) => {
  const studentId = (req as AuthRequest).user!.id;
  try {
    const course = await prisma.curso.findUnique({
      where: { invite_code: req.params.code.toUpperCase() },
    });
    if (!course) return res.status(404).json({ error: 'Código de convite inválido' });

    const enrollment = await prisma.matricula.upsert({
      where: { course_id_student_id: { course_id: course.id, student_id: studentId } },
      update: { status: 'active' },
      create: { course_id: course.id, student_id: studentId },
    });

    prisma.unidade.findMany({ where: { course_id: course.id, is_published: true }, select: { id: true } })
      .then((units) => units.forEach((u) => syncUnitDiscordAccess(u.id, studentId).catch(() => {})))
      .catch(() => {});

    res.json({ ok: true, enrollment });
  } catch {
    res.status(500).json({ error: 'Falha ao entrar no curso' });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const courses = await prisma.curso.findMany({
      where: { teacher_id: (req as AuthRequest).user!.id },
      include: { _count: { select: { units: true, enrollments: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json(courses);
  } catch {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const course = await prisma.curso.findUnique({
      where: { id: req.params.id },
      include: {
        units: { orderBy: { sequence_order: 'asc' } },
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.teacher_id !== (req as AuthRequest).user!.id) return res.status(403).json({ error: 'Forbidden' });
    res.json(course);
  } catch {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { title, description, category, objectives, start_date, end_date } = req.body;
  const teacher_id = (req as AuthRequest).user!.id;
  try {
    let invite_code = generateInviteCode();
    while (await prisma.curso.findUnique({ where: { invite_code } })) {
      invite_code = generateInviteCode();
    }
    const course = await prisma.curso.create({
      data: {
        title, description, category, objectives, teacher_id, invite_code,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
      },
    });
    res.status(201).json(course);
  } catch {
    res.status(500).json({ error: 'Failed to create course' });
  }
});

router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { title, description, category, objectives, start_date, end_date, status } = req.body;
  try {
    const existing = await prisma.curso.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Course not found' });
    if (existing.teacher_id !== (req as AuthRequest).user!.id) return res.status(403).json({ error: 'Forbidden' });

    const course = await prisma.curso.update({
      where: { id: req.params.id },
      data: {
        title, description, category, objectives, status,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date !== undefined ? (end_date ? new Date(end_date) : null) : undefined,
      },
    });
    res.json(course);
  } catch {
    res.status(500).json({ error: 'Failed to update course' });
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.curso.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Course not found' });
    if (existing.teacher_id !== (req as AuthRequest).user!.id) return res.status(403).json({ error: 'Forbidden' });

    await prisma.curso.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

export default router;
