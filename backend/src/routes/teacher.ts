import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function calcStatus(
  progressCount: number,
  isComplete: boolean,
  progress: number,
  lastAccess: Date | null
): string {
  if (progressCount === 0) return 'not_started';
  if (isComplete) return 'completed';
  if (lastAccess && Date.now() - lastAccess.getTime() > TWO_DAYS_MS && progress < 50) return 'at_risk';
  return 'in_progress';
}

function latestDate(dates: (Date | null)[]): Date | null {
  const valid = dates.filter((d): d is Date => d !== null);
  if (valid.length === 0) return null;
  return new Date(Math.max(...valid.map(d => d.getTime())));
}

function earliestDate(dates: (Date | null)[]): Date | null {
  const valid = dates.filter((d): d is Date => d !== null);
  if (valid.length === 0) return null;
  return new Date(Math.min(...valid.map(d => d.getTime())));
}

router.get('/units/:unitId/progress', async (req: Request, res: Response) => {
  const teacherId = (req as AuthRequest).user!.id;
  try {
    const unit = await prisma.unidade.findUnique({
      where: { id: req.params.unitId },
      include: {
        course: { select: { id: true, title: true, teacher_id: true } },
        blocks: {
          where: { status: { not: 'disabled' } },
          orderBy: { sequence_order: 'asc' },
          select: { id: true, title: true, block_type: true, sequence_order: true },
        },
      },
    });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (unit.course.teacher_id !== teacherId) return res.status(403).json({ error: 'Not authorized' });

    const blockIds = unit.blocks.map(b => b.id);
    const countableIds = unit.blocks.filter(b => b.block_type !== 'evaluation').map(b => b.id);

    const enrollments = await prisma.matricula.findMany({
      where: { course_id: unit.course_id, status: 'active' },
      include: { student: { select: { id: true, name: true, avatar: true, email: true } } },
    });

    const allProgress = await prisma.progressoBloco.findMany({
      where: { block_id: { in: blockIds } },
    });
    const progressByStudent = new Map<string, typeof allProgress>();
    for (const p of allProgress) {
      if (!progressByStudent.has(p.student_id)) progressByStudent.set(p.student_id, []);
      progressByStudent.get(p.student_id)!.push(p);
    }

    const students = enrollments.map((e) => {
      const records = progressByStudent.get(e.student.id) ?? [];
      const progressMap = new Map(records.map(p => [p.block_id, p]));

      const completedCount = countableIds.filter(id => progressMap.get(id)?.is_completed).length;
      const total = countableIds.length;
      const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
      const isComplete = total > 0 && completedCount >= total;

      const allDates = records.flatMap(p => [p.started_at, p.completed_at]);
      const lastAccess = latestDate(allDates);

      const block_completions: Record<string, boolean> = {};
      for (const b of unit.blocks) {
        block_completions[b.id] = progressMap.get(b.id)?.is_completed ?? false;
      }

      return {
        ...e.student,
        completed_blocks: completedCount,
        countable_blocks: total,
        progress,
        status: calcStatus(records.length, isComplete, progress, lastAccess),
        last_access: lastAccess?.toISOString() ?? null,
        block_completions,
      };
    });

    res.json({
      unit: { id: unit.id, title: unit.title, course_id: unit.course_id },
      blocks: unit.blocks,
      students,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch unit progress' });
  }
});

router.get('/units/:unitId/students/:studentId', async (req: Request, res: Response) => {
  const teacherId = (req as AuthRequest).user!.id;
  try {
    const unit = await prisma.unidade.findUnique({
      where: { id: req.params.unitId },
      include: {
        course: { select: { id: true, title: true, teacher_id: true } },
        blocks: {
          where: { status: { not: 'disabled' } },
          orderBy: { sequence_order: 'asc' },
          include: {
            activity: {
              include: {
                quiz: {
                  include: { questions: { include: { options: true }, orderBy: { sequence_order: 'asc' } } },
                },
              },
            },
          },
        },
      },
    });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (unit.course.teacher_id !== teacherId) return res.status(403).json({ error: 'Not authorized' });

    const student = await prisma.usuario.findUnique({
      where: { id: req.params.studentId },
      select: { id: true, name: true, email: true, avatar: true },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const blockIds = unit.blocks.map(b => b.id);
    const countableIds = unit.blocks.filter(b => b.block_type !== 'evaluation').map(b => b.id);

    const progressRecords = await prisma.progressoBloco.findMany({
      where: { block_id: { in: blockIds }, student_id: student.id },
    });
    const progressMap = new Map(progressRecords.map(p => [p.block_id, p]));

    const completedCount = countableIds.filter(id => progressMap.get(id)?.is_completed).length;
    const total = countableIds.length;
    const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const isComplete = total > 0 && completedCount >= total;

    const allDates = progressRecords.flatMap(p => [p.started_at, p.completed_at]);
    const lastAccess = latestDate(allDates);
    const startedAt = earliestDate(allDates);

    const completedAt = isComplete
      ? latestDate(progressRecords.map(p => p.completed_at))
      : null;

    const blocks = await Promise.all(unit.blocks.map(async (block) => {
      const prog = progressMap.get(block.id);
      const activity = (block as any).activity as {
        id: string;
        activity_type: string;
        quiz: { questions: { id: string; statement: string; score: number; options: { id: string; option_text: string; is_correct: boolean }[] }[] } | null;
      } | null;

      let activityBlockId = activity?.id;
      let activityType = activity?.activity_type ?? null;

      if (!activityBlockId && ['activity', 'exam', 'consolidation'].includes(block.block_type)) {
        const ab = await prisma.blocoAtividade.findUnique({ where: { block_id: block.id } });
        if (ab) { activityBlockId = ab.id; activityType = ab.activity_type; }
      }

      let content_info: { content_type: string; url: string | null; body_text: string | null } | null = null;
      if (block.block_type === 'content') {
        const cfg = (block.config_json as Record<string, unknown>) ?? {};
        const contentType = (cfg.contentType as string) ?? 'text';
        const url =
          contentType === 'video'    ? ((cfg.videoUrl    as string | null) ?? null) :
          contentType === 'file'     ? ((cfg.fileUrl     as string | null) ?? null) :
          contentType === 'external' ? ((cfg.externalUrl as string | null) ?? null) :
          null;
        const bodyText = (cfg.text as string | null) ?? null;
        content_info = { content_type: contentType, url, body_text: bodyText };
      }

      let interaction_info: { interaction_type: string; min_messages: number } | null = null;
      if (block.block_type === 'interaction') {
        const cfg = (block.config_json as Record<string, unknown>) ?? {};
        const interactionType = (cfg.interactionType as string) ?? 'text';
        const minMessages = typeof cfg.minMessages === 'number' ? cfg.minMessages : 1;
        interaction_info = { interaction_type: interactionType, min_messages: minMessages };
      }

      let consolidation_type: string | null = null;
      if (block.block_type === 'consolidation') {
        const cfg = (block.config_json as Record<string, unknown>) ?? {};
        consolidation_type = (cfg.consolidationType as string) ?? 'summary';
      }

      let evaluation_type: string | null = null;
      if (block.block_type === 'evaluation') {
        const cfg = (block.config_json as Record<string, unknown>) ?? {};
        evaluation_type = (cfg.evaluationType as string) ?? 'simple_average';
      }

      let submission: {
        id: string; submitted_at: Date; score: number | null; total_score: number;
        is_approved: boolean | null; feedback_text: string | null;
        submission_data: unknown; responses: unknown[];
      } | null = null;

      if (activityBlockId) {
        const latestSub = await prisma.submissao.findFirst({
          where: { activity_block_id: activityBlockId, student_id: student.id },
          orderBy: { submitted_at: 'desc' },
          include: { quiz_responses: true },
        });

        if (latestSub) {
          const questionMap = new Map(
            (activity?.quiz?.questions ?? []).map(q => [q.id, q])
          );
          const totalScore = (activity?.quiz?.questions ?? []).reduce(
            (s: number, q: { score: number }) => s + Number(q.score), 0
          );
          submission = {
            id: latestSub.id,
            submitted_at: latestSub.submitted_at,
            score: latestSub.score != null ? Number(latestSub.score) : null,
            total_score: totalScore,
            is_approved: latestSub.is_approved,
            feedback_text: latestSub.feedback_text,
            submission_data: latestSub.submission_data,
            responses: latestSub.quiz_responses.map(r => {
              const q = questionMap.get(r.question_id);
              const opt = q?.options.find(o => o.id === r.selected_option_id);
              return {
                question_id: r.question_id,
                statement: q?.statement ?? `Questão ${r.sequence_order}`,
                is_correct: r.is_correct,
                selected_option_text: opt?.option_text ?? null,
              };
            }),
          };
        }
      }

      const attempts = activityBlockId
        ? await prisma.submissao.count({ where: { activity_block_id: activityBlockId, student_id: student.id } })
        : 0;

      return {
        id: block.id,
        title: block.title,
        block_type: block.block_type,
        sequence_order: block.sequence_order,
        is_completed: prog?.is_completed ?? false,
        completed_at: prog?.completed_at?.toISOString() ?? null,
        latest_score: submission?.score ?? null,
        latest_passed: submission?.is_approved ?? null,
        attempts,
        activity_type: activityType,
        content_info,
        interaction_info,
        consolidation_type,
        evaluation_type,
        submission,
      };
    }));

    res.json({
      student,
      unit: { id: unit.id, title: unit.title },
      progress,
      completed_blocks: completedCount,
      countable_blocks: total,
      status: calcStatus(progressRecords.length, isComplete, progress, lastAccess),
      last_access: lastAccess?.toISOString() ?? null,
      started_at: startedAt?.toISOString() ?? null,
      completed_at: completedAt?.toISOString() ?? null,
      blocks,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch student progress' });
  }
});

router.post('/submissions/:id/grade', async (req: Request, res: Response) => {
  const teacherId = (req as AuthRequest).user!.id;
  const { score, feedback_text, is_approved } = req.body as {
    score: number; feedback_text?: string; is_approved: boolean;
  };

  try {
    const submission = await prisma.submissao.findUnique({
      where: { id: req.params.id },
      include: { activity_block: { include: { block: { select: { id: true, unit_id: true } } } } },
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const unit = await prisma.unidade.findUnique({
      where: { id: submission.activity_block.block.unit_id },
      include: { course: { select: { teacher_id: true } } },
    });
    if (!unit || unit.course.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.submissao.update({
      where: { id: submission.id },
      data: { score, feedback_text: feedback_text ?? null, is_approved, graded_by: teacherId, graded_at: new Date() },
    });

    if (is_approved) {
      await prisma.progressoBloco.upsert({
        where: { block_id_student_id: { block_id: submission.activity_block.block.id, student_id: submission.student_id } },
        update: { is_completed: true, is_approved: true, status: 'completed', completed_at: new Date() },
        create: {
          block_id: submission.activity_block.block.id,
          student_id: submission.student_id,
          status: 'completed', is_completed: true, is_approved: true,
          started_at: submission.submitted_at, completed_at: new Date(),
        },
      });
    }

    await recalculateEvaluationBlocks(submission.activity_block.block.unit_id, submission.student_id);

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
});

router.post('/blocks/:blockId/students/:studentId/grade', async (req: Request, res: Response) => {
  const teacherId = (req as AuthRequest).user!.id;
  const score = Number(req.body.score);
  const blockId = String(req.params.blockId);
  const studentId = String(req.params.studentId);

  if (isNaN(score)) return res.status(400).json({ error: 'Invalid score' });

  try {
    const block = await prisma.bloco.findUnique({ where: { id: blockId } });
    if (!block) return res.status(404).json({ error: 'Block not found' });

    const unit = await prisma.unidade.findUnique({
      where: { id: block.unit_id },
      include: { course: { select: { teacher_id: true } } },
    });
    if (!unit || unit.course.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const activityBlock = await prisma.blocoAtividade.upsert({
      where: { block_id: blockId },
      update: { activity_type: 'manual' },
      create: { block_id: blockId, activity_type: 'manual' },
    });

    const attemptCount = await prisma.submissao.count({
      where: { activity_block_id: activityBlock.id, student_id: studentId },
    });

    await prisma.submissao.create({
      data: {
        activity_block_id: activityBlock.id,
        student_id: studentId,
        attempt_number: attemptCount + 1,
        score,
        is_approved: score > 0,
        graded_by: teacherId,
        graded_at: new Date(),
      },
    });

    await prisma.progressoBloco.upsert({
      where: { block_id_student_id: { block_id: blockId, student_id: studentId } },
      update: { is_completed: true, is_approved: score > 0, status: 'completed', completed_at: new Date() },
      create: {
        block_id: blockId, student_id: studentId,
        status: 'completed', is_completed: true, is_approved: score > 0,
        started_at: new Date(), completed_at: new Date(),
      },
    });

    res.json({ ok: true });
  } catch (e: any) {
    console.error('[grade block]', e?.message ?? e);
    res.status(500).json({ error: e?.message ?? 'Failed to set grade' });
  }
});

router.get('/courses/:courseId/students-progress', async (req: Request, res: Response) => {
  const teacherId = (req as AuthRequest).user!.id;
  try {
    const course = await prisma.curso.findUnique({
      where: { id: req.params.courseId },
      select: { id: true, title: true, teacher_id: true },
    });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.teacher_id !== teacherId) return res.status(403).json({ error: 'Not authorized' });

    const courseUnits = await prisma.unidade.findMany({
      where: { course_id: course.id },
      orderBy: { sequence_order: 'asc' },
      include: {
        blocks: {
          where: { status: { not: 'disabled' } },
          select: { id: true, block_type: true },
        },
      },
    });

    const enrollments = await prisma.matricula.findMany({
      where: { course_id: course.id, status: 'active' },
      include: { student: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    const allBlockIds = courseUnits.flatMap(u => u.blocks.map(b => b.id));
    const allProgressRecords = allBlockIds.length > 0
      ? await prisma.progressoBloco.findMany({ where: { block_id: { in: allBlockIds } } })
      : [];

    const progressByStudent = new Map<string, Map<string, typeof allProgressRecords[0]>>();
    for (const p of allProgressRecords) {
      if (!progressByStudent.has(p.student_id)) progressByStudent.set(p.student_id, new Map());
      progressByStudent.get(p.student_id)!.set(p.block_id, p);
    }

    const units = courseUnits.map(u => ({
      id: u.id,
      title: u.title,
      sequence_order: u.sequence_order,
    }));

    const students = enrollments.map(e => {
      const blockMap = progressByStudent.get(e.student.id) ?? new Map<string, typeof allProgressRecords[0]>();

      let overallCompleted = 0;
      let overallTotal = 0;
      const allLastAccesses: (Date | null)[] = [];

      const unit_statuses: Record<string, {
        status: string; progress: number;
        completed_blocks: number; countable_blocks: number; last_access: string | null;
      }> = {};

      for (const unit of courseUnits) {
        const countableIds = unit.blocks
          .filter(b => b.block_type !== 'evaluation')
          .map(b => b.id);
        const blockIds = unit.blocks.map(b => b.id);

        const unitRecords = blockIds
          .map(id => blockMap.get(id))
          .filter((p): p is typeof allProgressRecords[0] => p !== undefined);

        const completedCount = countableIds.filter(id => blockMap.get(id)?.is_completed).length;
        const total = countableIds.length;
        const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
        const isComplete = total > 0 && completedCount >= total;

        const unitDates = unitRecords.flatMap(p => [p.started_at, p.completed_at]);
        const lastAccess = latestDate(unitDates);
        allLastAccesses.push(lastAccess);

        unit_statuses[unit.id] = {
          status: calcStatus(unitRecords.length, isComplete, progress, lastAccess),
          progress,
          completed_blocks: completedCount,
          countable_blocks: total,
          last_access: lastAccess?.toISOString() ?? null,
        };

        overallCompleted += completedCount;
        overallTotal += total;
      }

      const overallProgress = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;
      const overallLastAccess = latestDate(allLastAccesses);

      const statusValues = Object.values(unit_statuses);
      const overallStatus =
        statusValues.length === 0 || statusValues.every(u => u.status === 'not_started') ? 'not_started'
        : statusValues.every(u => u.status === 'completed') ? 'completed'
        : statusValues.some(u => u.status === 'at_risk') ? 'at_risk'
        : 'in_progress';

      return {
        ...e.student,
        unit_statuses,
        overall_progress: overallProgress,
        overall_status: overallStatus,
        last_access: overallLastAccess?.toISOString() ?? null,
      };
    });

    res.json({ course: { id: course.id, title: course.title }, units, students });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch course students progress' });
  }
});

async function recalculateEvaluationBlocks(unitId: string, studentId: string): Promise<void> {
  const evalBlocks = await prisma.bloco.findMany({
    where: { unit_id: unitId, block_type: 'evaluation', status: { not: 'disabled' } },
  });

  for (const evalBlock of evalBlocks) {
    const cfg = (evalBlock.config_json as Record<string, unknown>) ?? {};
    const selectedBlockIds = (cfg.selectedBlocks as string[] | undefined) ?? [];
    if (selectedBlockIds.length === 0) continue;

    const sourceBlocks = await prisma.bloco.findMany({
      where: { id: { in: selectedBlockIds } },
      include: { activity: true },
    });

    const requiresTeacher = sourceBlocks.some(b => {
      const at = (b.activity as any)?.activity_type;
      return at && at !== 'quiz';
    });

    const progressRecords = await prisma.progressoBloco.findMany({
      where: { student_id: studentId, block_id: { in: selectedBlockIds } },
    });
    const progressMap = new Map(progressRecords.map(p => [p.block_id, p]));

    const allCompleted = selectedBlockIds.every(id => progressMap.get(id)?.is_completed);
    if (!allCompleted) continue;

    const scores: number[] = [];
    let totalScorePossible = 0;

    for (const b of sourceBlocks) {
      if (!b.activity) continue;
      const sub = await prisma.submissao.findFirst({
        where: { activity_block_id: b.activity.id, student_id: studentId },
        orderBy: { submitted_at: 'desc' },
      });
      const score = sub?.score != null ? Number(sub.score) : 0;
      const weight = typeof cfg.weights === 'object' && cfg.weights
        ? Number((cfg.weights as Record<string, number>)[b.id] ?? 1)
        : 1;
      scores.push(score * weight);
      totalScorePossible += weight * (sub ? 100 : 0); // approximate
    }

    const evaluationType = cfg.evaluationType as string ?? 'simple_average';
    let finalScore = 0;
    if (evaluationType === 'simple_average' && scores.length > 0) {
      finalScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    } else if (evaluationType === 'weighted_average' && scores.length > 0) {
      finalScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    } else if (evaluationType === 'sum') {
      finalScore = scores.reduce((a, b) => a + b, 0);
    }

    const passingScore = typeof cfg.passingScore === 'number' ? cfg.passingScore : 60;
    const passed = finalScore >= passingScore;

    await prisma.progressoBloco.upsert({
      where: { block_id_student_id: { block_id: evalBlock.id, student_id: studentId } },
      update: { is_completed: true, is_approved: passed, status: 'completed', completed_at: new Date() },
      create: {
        block_id: evalBlock.id, student_id: studentId,
        status: 'completed', is_completed: true, is_approved: passed,
        started_at: new Date(), completed_at: new Date(),
      },
    });
  }
}

export default router;
