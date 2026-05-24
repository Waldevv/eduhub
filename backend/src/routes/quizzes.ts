import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user!.id;
  try {
    const quizzes = await prisma.questionario.findMany({
      where: { created_by: userId },
      include: { _count: { select: { questions: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json(quizzes);
  } catch {
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const quiz = await prisma.questionario.findUnique({
      where: { id: req.params.id },
      include: {
        questions: {
          orderBy: { sequence_order: 'asc' },
          include: { options: { orderBy: { sequence_order: 'asc' } } },
        },
      },
    });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch {
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user!.id;
  const { title, description } = req.body;
  try {
    const quiz = await prisma.questionario.create({
      data: { title, description, created_by: userId },
      include: { _count: { select: { questions: true } } },
    });
    res.status(201).json(quiz);
  } catch {
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const { title, description } = req.body;
  try {
    const quiz = await prisma.questionario.update({
      where: { id: req.params.id },
      data: { title, description },
      include: { _count: { select: { questions: true } } },
    });
    res.json(quiz);
  } catch {
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.questionario.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

router.post('/:quizId/questions', async (req: Request, res: Response) => {
  const { statement, score } = req.body;
  try {
    const last = await prisma.questaoQuestionario.findFirst({
      where: { quiz_id: req.params.quizId },
      orderBy: { sequence_order: 'desc' },
    });
    const question = await prisma.questaoQuestionario.create({
      data: {
        quiz_id: req.params.quizId,
        statement,
        score: score ?? 1,
        question_type: 'multiple_choice',
        sequence_order: (last?.sequence_order ?? 0) + 1,
      },
      include: { options: { orderBy: { sequence_order: 'asc' } } },
    });
    res.status(201).json(question);
  } catch {
    res.status(500).json({ error: 'Failed to create question' });
  }
});

router.patch('/questions/:id', async (req: Request, res: Response) => {
  const { statement, score } = req.body;
  try {
    const question = await prisma.questaoQuestionario.update({
      where: { id: req.params.id },
      data: { statement, score },
      include: { options: { orderBy: { sequence_order: 'asc' } } },
    });
    res.json(question);
  } catch {
    res.status(500).json({ error: 'Failed to update question' });
  }
});

router.delete('/questions/:id', async (req: Request, res: Response) => {
  try {
    await prisma.questaoQuestionario.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

router.patch('/:quizId/questions/reorder', async (req: Request, res: Response) => {
  const { items } = req.body as { items: { id: string; sequence_order: number }[] };
  try {
    await prisma.$transaction(
      items.map(({ id, sequence_order }) =>
        prisma.questaoQuestionario.update({ where: { id }, data: { sequence_order } })
      )
    );
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to reorder questions' });
  }
});

router.post('/questions/:questionId/options', async (req: Request, res: Response) => {
  const { option_text, is_correct } = req.body;
  try {
    const last = await prisma.opcaoQuestionario.findFirst({
      where: { question_id: req.params.questionId },
      orderBy: { sequence_order: 'desc' },
    });
    const option = await prisma.opcaoQuestionario.create({
      data: {
        question_id: req.params.questionId,
        option_text,
        is_correct: is_correct ?? false,
        sequence_order: (last?.sequence_order ?? 0) + 1,
      },
    });
    res.status(201).json(option);
  } catch {
    res.status(500).json({ error: 'Failed to create option' });
  }
});

router.patch('/options/:id', async (req: Request, res: Response) => {
  const { option_text, is_correct } = req.body;
  try {
    const option = await prisma.opcaoQuestionario.update({
      where: { id: req.params.id },
      data: { option_text, is_correct },
    });
    res.json(option);
  } catch {
    res.status(500).json({ error: 'Failed to update option' });
  }
});

router.delete('/options/:id', async (req: Request, res: Response) => {
  try {
    await prisma.opcaoQuestionario.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete option' });
  }
});

export default router;
