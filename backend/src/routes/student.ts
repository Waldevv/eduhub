import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { syncUnitDiscordAccess, client as discordClient } from '../lib/discord-bot';

const router = Router();
router.use(authMiddleware);

router.get('/courses', async (req: Request, res: Response) => {
  const studentId = (req as AuthRequest).user!.id;
  try {
    const enrollments = await prisma.matricula.findMany({
      where: { student_id: studentId, status: 'active' },
      include: {
        course: {
          include: {
            teacher: { select: { id: true, name: true, avatar: true } },
            _count: { select: { enrollments: true } },
          },
        },
      },
      orderBy: { enrolled_at: 'desc' },
    });

    const result = await Promise.all(enrollments.map(async (e) => {
      const units = await prisma.unidade.findMany({
        where: { course_id: e.course.id, is_published: true },
        select: { id: true },
      });
      const unitIds = units.map(u => u.id);

      const [totalCountable, completedCountable] = await Promise.all([
        prisma.bloco.count({ where: { unit_id: { in: unitIds }, block_type: { not: 'evaluation' }, status: { not: 'disabled' } } }),
        prisma.progressoBloco.count({
          where: {
            student_id: studentId, is_completed: true,
            block: { unit_id: { in: unitIds }, block_type: { not: 'evaluation' } },
          },
        }),
      ]);

      return {
        ...e.course,
        enrolled_at: e.enrolled_at,
        total_units: units.length,
        progress: totalCountable > 0 ? Math.round((completedCountable / totalCountable) * 100) : 0,
      };
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.get('/courses/:id', async (req: Request, res: Response) => {
  const studentId = (req as AuthRequest).user!.id;
  try {
    const enrollment = await prisma.matricula.findUnique({
      where: { course_id_student_id: { course_id: req.params.id, student_id: studentId } },
    });
    if (!enrollment) return res.status(403).json({ error: 'Not enrolled' });

    const course = await prisma.curso.findUnique({
      where: { id: req.params.id },
      include: {
        teacher: { select: { id: true, name: true, avatar: true } },
        discord_server: { select: { id: true, server_name: true, discord_guild_id: true, is_active: true, discord_invite_url: true } },
        units: {
          where: { is_published: true },
          orderBy: { sequence_order: 'asc' },
        },
      },
    });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const unitsWithProgress = await Promise.all(course.units.map(async (unit) => {
      const allBlocks = await prisma.bloco.findMany({
        where: { unit_id: unit.id, status: { not: 'disabled' } },
        select: { id: true, block_type: true },
      });
      const countableIds = allBlocks.filter(b => b.block_type !== 'evaluation').map(b => b.id);

      const completedBlocks = countableIds.length > 0
        ? await prisma.progressoBloco.count({
            where: { block_id: { in: countableIds }, student_id: studentId, is_completed: true },
          })
        : 0;

      const isComplete = countableIds.length > 0 && completedBlocks >= countableIds.length;
      return {
        ...unit,
        total_blocks: allBlocks.length,
        countable_blocks: countableIds.length,
        completed_blocks: completedBlocks,
        progress: countableIds.length > 0 ? Math.round((completedBlocks / countableIds.length) * 100) : 0,
        is_complete: isComplete,
      };
    }));

    const unitsWithLock = unitsWithProgress.map((unit, idx) => ({
      ...unit,
      is_locked: idx > 0 && !unitsWithProgress[idx - 1].is_complete,
    }));

    res.json({ ...course, units: unitsWithLock });
  } catch {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

router.get('/units/:id', async (req: Request, res: Response) => {
  const studentId = (req as AuthRequest).user!.id;
  try {
    const unit = await prisma.unidade.findUnique({
      where: { id: req.params.id },
      include: {
        course: { select: { id: true, title: true } },
        blocks: {
          where: { status: { not: 'disabled' } },
          orderBy: { sequence_order: 'asc' },
          include: {
            content: true,
            activity: {
              include: {
                quiz: {
                  include: {
                    questions: {
                      orderBy: { sequence_order: 'asc' },
                      include: { options: { orderBy: { sequence_order: 'asc' } } },
                    },
                  },
                },
              },
            },
            interaction: { include: { channel: true } },
            consolidation: true,
          },
        },
      },
    });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });

    const enrollment = await prisma.matricula.findUnique({
      where: { course_id_student_id: { course_id: unit.course_id, student_id: studentId } },
    });
    if (!enrollment) return res.status(403).json({ error: 'Not enrolled' });

    const progressRecords = await prisma.progressoBloco.findMany({
      where: { block_id: { in: unit.blocks.map(b => b.id) }, student_id: studentId },
    });
    const progressMap = new Map(progressRecords.map(p => [p.block_id, p]));

    const submissions = await prisma.submissao.findMany({
      where: {
        student_id: studentId,
        activity_block: { block_id: { in: unit.blocks.map(b => b.id) } },
      },
      orderBy: { submitted_at: 'desc' },
    });
    const latestSubMap = new Map<string, typeof submissions[0]>();
    for (const sub of submissions) {
      if (!latestSubMap.has(sub.activity_block_id)) latestSubMap.set(sub.activity_block_id, sub);
    }

    const blocksResolved = await Promise.all(unit.blocks.map(async (block) => {
      const isConsolidationQuiz =
        block.block_type === 'consolidation' &&
        ((block.config_json as Record<string, unknown> | null)?.consolidationType ?? 'quiz') === 'quiz';

      if (!block.activity && (block.block_type === 'activity' || block.block_type === 'exam' || isConsolidationQuiz)) {
        const cfg = block.config_json as Record<string, unknown> | null;
        const quizId = cfg?.quizId as string | undefined;
        if (quizId) {
          const quiz = await prisma.questionario.findUnique({
            where: { id: quizId },
            include: {
              questions: {
                orderBy: { sequence_order: 'asc' },
                include: { options: { orderBy: { sequence_order: 'asc' } } },
              },
            },
          });
          if (quiz) {
            (block as any).activity = {
              id: `virtual_${block.id}`,
              block_id: block.id,
              activity_type: (cfg?.activityType as string) ?? 'quiz',
              completion_criteria: 'submission',
              max_attempts: cfg?.maxAttempts ? Number(cfg.maxAttempts) : null,
              time_limit_minutes: cfg?.timeLimit ? Number(cfg.timeLimit) : null,
              passing_score: cfg?.passingScore ? Number(cfg.passingScore) : null,
              description: (cfg?.description as string) ?? null,
              quiz,
            };
          }
        }
      }
      return block;
    }));

    const blocksWithStatus = blocksResolved.map((block, index) => {
      const progress = progressMap.get(block.id);
      const isCompleted = progress?.is_completed ?? false;

        let isAvailable = true;
      for (let i = 0; i < index; i++) {
        const prev = blocksResolved[i];
        if (prev.is_required && !progressMap.get(prev.id)?.is_completed) {
          isAvailable = false;
          break;
        }
      }

      const activityId = (block as any).activity?.id;
      const latestSub = activityId ? latestSubMap.get(activityId) : null;
      const attemptsDone = activityId
        ? submissions.filter(s => s.activity_block_id === activityId).length
        : 0;

      return {
        ...block,
        student_status: isCompleted ? 'completed' : isAvailable ? 'available' : 'locked',
        attempts_done: attemptsDone,
        latest_score: latestSub ? Number(latestSub.score) : null,
        latest_passed: latestSub?.is_approved ?? null,
      };
    });

    res.json({ ...unit, blocks: blocksWithStatus });
  } catch {
    res.status(500).json({ error: 'Failed to fetch unit' });
  }
});

router.get('/discord-membership/:courseId', async (req: Request, res: Response) => {
  const studentId = (req as AuthRequest).user!.id;
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: studentId },
      select: { discord_id: true },
    });
    if (!user?.discord_id) return res.json({ inServer: false, reason: 'no_discord_id' });

    const server = await prisma.servidorDiscord.findUnique({
      where: { course_id: req.params.courseId },
      select: { discord_guild_id: true, is_active: true },
    });
    if (!server?.is_active) return res.json({ inServer: false, reason: 'no_server' });

    try {
      const guild = await discordClient.guilds.fetch(server.discord_guild_id);
      await guild.members.fetch(user.discord_id);
      return res.json({ inServer: true });
    } catch {
      return res.json({ inServer: false });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Failed to check membership' });
  }
});

router.post('/discord-leave/:courseId', async (req: Request, res: Response) => {
  const studentId = (req as AuthRequest).user!.id;
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: studentId },
      select: { discord_id: true },
    });
    if (!user?.discord_id) return res.status(400).json({ error: 'No Discord account linked' });

    const server = await prisma.servidorDiscord.findUnique({
      where: { course_id: req.params.courseId },
      select: { discord_guild_id: true },
    });
    if (!server) return res.status(404).json({ error: 'No server linked' });

    try {
      const guild = await discordClient.guilds.fetch(server.discord_guild_id);
      const member = await guild.members.fetch(user.discord_id);
      await member.kick('Student left course server via platform');
    } catch {
      // member may have already left
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Failed to leave server' });
  }
});

router.post('/units/:id/sync-discord', async (req: Request, res: Response) => {
  const studentId = (req as AuthRequest).user!.id;
  try {
    await syncUnitDiscordAccess(req.params.id as string, studentId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Sync failed', detail: err?.message });
  }
});

router.post('/blocks/:id/complete', async (req: Request, res: Response) => {
  const studentId = (req as AuthRequest).user!.id;
  try {
    const block = await prisma.bloco.findUnique({ where: { id: req.params.id } });
    if (!block) return res.status(404).json({ error: 'Block not found' });

    await prisma.progressoBloco.upsert({
      where: { block_id_student_id: { block_id: block.id, student_id: studentId } },
      update: { is_completed: true, status: 'completed', completed_at: new Date() },
      create: {
        block_id: block.id, student_id: studentId,
        status: 'completed', is_completed: true,
        started_at: new Date(), completed_at: new Date(),
      },
    });

    syncUnitDiscordAccess(block.unit_id, studentId).catch(() => {});

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to complete block' });
  }
});

router.post('/blocks/:id/quiz', async (req: Request, res: Response) => {
  const studentId = (req as AuthRequest).user!.id;
  const { answers } = req.body as { answers: { question_id: string; option_id: string }[] };

  try {
    const block = await prisma.bloco.findUnique({
      where: { id: req.params.id },
      include: {
        activity: {
          include: {
            quiz: { include: { questions: { include: { options: true } } } },
          },
        },
      },
    });
    if (!block) return res.status(404).json({ error: 'Block not found' });

    if (!block.activity && block.block_type === 'consolidation') {
      const cfg = block.config_json as Record<string, unknown> | null;
      const consolidationType = (cfg?.consolidationType as string) ?? 'quiz';
      const quizId = cfg?.quizId as string | undefined;
      if (consolidationType === 'quiz' && quizId) {
        await prisma.blocoAtividade.upsert({
          where: { block_id: block.id },
          update: {
            activity_type: 'quiz',
            quiz_id: quizId,
            max_attempts: cfg?.maxAttempts ? Number(cfg.maxAttempts) : null,
            time_limit_minutes: cfg?.timeLimit ? Number(cfg.timeLimit) : null,
            passing_score: cfg?.passingScore ? Number(cfg.passingScore) : null,
            description: null,
          },
          create: {
            block_id: block.id,
            activity_type: 'quiz',
            quiz_id: quizId,
            max_attempts: cfg?.maxAttempts ? Number(cfg.maxAttempts) : null,
            time_limit_minutes: cfg?.timeLimit ? Number(cfg.timeLimit) : null,
            passing_score: cfg?.passingScore ? Number(cfg.passingScore) : null,
            description: null,
          },
        });
        const reloaded = await prisma.bloco.findUnique({
          where: { id: block.id },
          include: {
            activity: {
              include: { quiz: { include: { questions: { include: { options: true } } } } },
            },
          },
        });
        if (reloaded) (block as any).activity = reloaded.activity;
      }
    }

    if (!block.activity?.quiz) return res.status(400).json({ error: 'No quiz on this block' });

    const activityBlock = block.activity;
    const quiz = activityBlock.quiz!;

    const attemptCount = await prisma.submissao.count({
      where: { activity_block_id: activityBlock.id, student_id: studentId },
    });
    const maxAttempts = activityBlock.max_attempts ?? 9999;
    if (attemptCount >= maxAttempts) {
      return res.status(400).json({ error: 'Máximo de tentativas atingido' });
    }

    const totalScore = quiz.questions.reduce((sum, q) => sum + Number(q.score), 0);
    let earnedScore = 0;

    const responses = answers.map(({ question_id, option_id }) => {
      const question = quiz.questions.find(q => q.id === question_id);
      const option = question?.options.find(o => o.id === option_id);
      const correct = option?.is_correct ?? false;
      if (correct) earnedScore += Number(question?.score ?? 0);
      return {
        question_id,
        selected_option_id: option_id,
        is_correct: correct,
        score_obtained: correct ? Number(question?.score ?? 0) : 0,
        sequence_order: question?.sequence_order ?? 0,
      };
    });

    const scorePercent = totalScore > 0 ? (earnedScore / totalScore) * 100 : 0;
    const passingScore = Number(activityBlock.passing_score ?? 0);
    const passed = passingScore > 0 ? scorePercent >= passingScore : true;

    await prisma.submissao.create({
      data: {
        activity_block_id: activityBlock.id,
        student_id: studentId,
        attempt_number: attemptCount + 1,
        score: earnedScore,
        is_approved: passed,
        quiz_responses: { create: responses },
      },
    });

    await prisma.progressoBloco.upsert({
      where: { block_id_student_id: { block_id: block.id, student_id: studentId } },
      update: {
        is_completed: passed,
        is_approved: passed,
        status: passed ? 'completed' : 'in_progress',
        ...(passed ? { completed_at: new Date() } : {}),
      },
      create: {
        block_id: block.id, student_id: studentId,
        status: passed ? 'completed' : 'in_progress',
        is_completed: passed, is_approved: passed,
        started_at: new Date(),
        ...(passed ? { completed_at: new Date() } : {}),
      },
    });

    if (passed) syncUnitDiscordAccess(block.unit_id, studentId).catch(() => {});

    res.json({
      score: earnedScore,
      total_score: totalScore,
      score_percent: Math.round(scorePercent),
      passed,
      attempt_number: attemptCount + 1,
      max_attempts: maxAttempts,
      responses: responses.map(r => ({ question_id: r.question_id, is_correct: r.is_correct })),
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

router.post('/blocks/:id/assignment', async (req: Request, res: Response) => {
  const studentId = (req as AuthRequest).user!.id;
  const { file_url, text_content, link_url, submission_type } = req.body as {
    file_url?: string;
    text_content?: string;
    link_url?: string;
    submission_type: string;
  };

  try {
    const block = await prisma.bloco.findUnique({
      where: { id: req.params.id },
      include: { activity: true },
    });
    if (!block) return res.status(404).json({ error: 'Block not found' });
    if (!block.activity) return res.status(400).json({ error: 'No activity on this block' });

    const activityBlock = block.activity;

    const attemptCount = await prisma.submissao.count({
      where: { activity_block_id: activityBlock.id, student_id: studentId },
    });

    await prisma.submissao.create({
      data: {
        activity_block_id: activityBlock.id,
        student_id: studentId,
        attempt_number: attemptCount + 1,
        submission_data: { file_url, text_content, link_url, submission_type },
      },
    });

    await prisma.progressoBloco.upsert({
      where: { block_id_student_id: { block_id: block.id, student_id: studentId } },
      update: { is_completed: true, status: 'completed', completed_at: new Date() },
      create: {
        block_id: block.id, student_id: studentId,
        status: 'completed', is_completed: true,
        started_at: new Date(), completed_at: new Date(),
      },
    });

    syncUnitDiscordAccess(block.unit_id, studentId).catch(() => {});

    res.json({ ok: true, attempt_number: attemptCount + 1 });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

export default router;
