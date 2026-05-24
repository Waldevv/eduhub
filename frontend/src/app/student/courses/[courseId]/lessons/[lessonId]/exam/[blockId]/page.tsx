'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  studentApi, StudentBlock, StudentBlockQuizQuestion, QuizSubmitResult,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Clock, AlertTriangle, CheckCircle2, XCircle, Trophy, Loader2,
} from 'lucide-react';

const sessionKey = (id: string) => `exam_session_${id}`;

interface ExamSession {
  answers: Record<string, string>;
  startTime: number;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ExamPage() {
  const { courseId, lessonId, blockId } = useParams<{
    courseId: string; lessonId: string; blockId: string;
  }>();
  const router = useRouter();

  const [block, setBlock] = useState<StudentBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);

  const hasSubmitted = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    studentApi.getUnit(lessonId)
      .then(unit => {
        const b = unit.blocks.find(b => b.id === blockId);
        if (!b) { setError('Bloco não encontrado.'); return; }
        if (!['exam', 'activity', 'consolidation'].includes(b.block_type)) {
          setError('Este bloco não possui quiz.');
          return;
        }
        setBlock(b);

        const key = sessionKey(blockId);
        const saved = sessionStorage.getItem(key);
        const timeLimitMin = b.activity?.time_limit_minutes ?? null;

        if (saved) {
          const session: ExamSession = JSON.parse(saved);
          setAnswers(session.answers);
          if (timeLimitMin) {
            const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
            const remaining = timeLimitMin * 60 - elapsed;
            setTimeLeft(remaining > 0 ? remaining : 0);
          }
        } else {
          sessionStorage.setItem(key, JSON.stringify({ answers: {}, startTime: Date.now() }));
          if (timeLimitMin) setTimeLeft(timeLimitMin * 60);
        }
      })
      .catch(() => setError('Não foi possível carregar o exame.'))
      .finally(() => setLoading(false));
  }, [lessonId, blockId]);

  const saveSession = useCallback((newAnswers: Record<string, string>) => {
    const key = sessionKey(blockId);
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const session: ExamSession = JSON.parse(saved);
      sessionStorage.setItem(key, JSON.stringify({ ...session, answers: newAnswers }));
    }
  }, [blockId]);

  const handleSubmit = useCallback(async () => {
    if (!block?.activity?.quiz || hasSubmitted.current) return;
    hasSubmitted.current = true;
    setSubmitting(true);
    setSubmitError(null);
    if (timerRef.current) clearTimeout(timerRef.current);

    const answersArr = Object.entries(answers).map(([question_id, option_id]) => ({
      question_id, option_id,
    }));

    try {
      const res = await studentApi.submitQuiz(blockId, answersArr);
      sessionStorage.removeItem(sessionKey(blockId));
      setResult(res);
      setTimeLeft(null);
    } catch (e: unknown) {
      hasSubmitted.current = false;
      setSubmitError(e instanceof Error ? e.message : 'Erro ao enviar respostas.');
    } finally {
      setSubmitting(false);
    }
  }, [block, answers, blockId]);

  useEffect(() => {
    if (timeLeft === null || result) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => (t ?? 1) - 1), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, result, handleSubmit]);

  useEffect(() => {
    if (result) return;
    window.history.pushState(null, '', window.location.href);
    const onPop = () => {
      window.history.pushState(null, '', window.location.href);
      setShowLeaveWarning(true);
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return (e.returnValue = '');
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [result]);

  const handleLeaveConfirm = async () => {
    setShowLeaveWarning(false);
    if (!result && !hasSubmitted.current) await handleSubmit();
    sessionStorage.removeItem(sessionKey(blockId));
    router.push(`/student/courses/${courseId}/lessons/${lessonId}`);
  };

  const setAnswer = (qId: string, optId: string) => {
    const next = { ...answers, [qId]: optId };
    setAnswers(next);
    saveSession(next);
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
    </div>
  );

  if (error || !block) return (
    <div className="text-center py-16 text-slate-500">
      {error ?? 'Erro ao carregar exame.'}
      <div className="mt-4">
        <Link href={`/student/courses/${courseId}/lessons/${lessonId}`}
          className="text-teal-600 hover:underline text-sm">
          Voltar à aula
        </Link>
      </div>
    </div>
  );

  const quiz = block.activity?.quiz;
  if (!quiz) return (
    <div className="text-center py-16 text-slate-500">
      Quiz não configurado neste bloco.
      <div className="mt-4">
        <Link href={`/student/courses/${courseId}/lessons/${lessonId}`}
          className="text-teal-600 hover:underline text-sm">
          Voltar à aula
        </Link>
      </div>
    </div>
  );

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = quiz.questions.length;
  const progressPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const isTimeWarning = timeLeft !== null && timeLeft <= 120;

  const blockColors = {
    exam:         { header: 'bg-red-50 border-red-100',   info: 'text-red-700',   btn: 'bg-red-600 hover:bg-red-700',   spinner: 'text-red-600' },
    activity:     { header: 'bg-green-50 border-green-100', info: 'text-green-700', btn: 'bg-green-600 hover:bg-green-700', spinner: 'text-green-600' },
    consolidation:{ header: 'bg-orange-50 border-orange-100', info: 'text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700', spinner: 'text-orange-600' },
  } as const;
  const colors = blockColors[(block.block_type as keyof typeof blockColors)] ?? blockColors.exam;

  if (result) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className={`rounded-2xl border p-8 text-center mb-6 ${result.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {result.passed
            ? <Trophy className="w-16 h-16 text-green-500 mx-auto mb-4" />
            : <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />}
          <h1 className={`text-2xl font-bold mb-2 ${result.passed ? 'text-green-700' : 'text-red-600'}`}>
            {result.passed ? 'Aprovado!' : 'Não aprovado'}
          </h1>
          <p className={`text-lg mb-1 ${result.passed ? 'text-green-600' : 'text-red-500'}`}>
            {result.score} / {result.total_score} pts · {result.score_percent}%
          </p>
          {block.activity?.passing_score != null && (
            <p className="text-sm text-slate-500 mb-2">
              Mínimo para aprovação: {block.activity.passing_score}%
            </p>
          )}
          <p className="text-sm text-slate-400 mb-6">
            Tentativa {result.attempt_number}
            {result.max_attempts < 9999 ? ` de ${result.max_attempts}` : ''}
          </p>

          <div className="space-y-2 text-left mb-6">
            {quiz.questions.map((q, i) => {
              const resp = result.responses.find(r => r.question_id === q.id);
              return (
                <div key={q.id}
                  className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${resp?.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {resp?.is_correct
                    ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                  <span>Q{i + 1}: {q.statement}</span>
                </div>
              );
            })}
          </div>

          <Link href={`/student/courses/${courseId}/lessons/${lessonId}`}>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar à Aula
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {showLeaveWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-800">Sair do exame?</h3>
            </div>
            <p className="text-slate-600 text-sm mb-5 leading-relaxed">
              Suas respostas preenchidas até agora serão enviadas automaticamente e uma nota será atribuída com base no que você respondeu.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowLeaveWarning(false)}>
                Continuar exame
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleLeaveConfirm}>
                Sair e enviar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 bg-white border-b border-slate-200 py-3 mb-6 z-10">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setShowLeaveWarning(true)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-800 truncate">{block.title}</h1>
            <p className="text-xs text-slate-500">
              {answeredCount}/{totalQuestions} questões respondidas
            </p>
          </div>
          {timeLeft !== null && (
            <div className={`flex items-center gap-1.5 text-sm font-mono font-bold px-3 py-1.5 rounded-lg flex-shrink-0 ${isTimeWarning ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      <div className={`${colors.header} border rounded-xl p-4 mb-6 flex flex-wrap gap-4 text-sm ${colors.info}`}>
        <span className="font-medium">{quiz.title}</span>
        <span className="opacity-40">·</span>
        <span>{totalQuestions} questões</span>
        {block.activity?.time_limit_minutes && (
          <><span className="opacity-40">·</span>
          <span>{block.activity.time_limit_minutes} min</span></>
        )}
        {block.activity?.passing_score && (
          <><span className="opacity-40">·</span>
          <span>Aprovação: {block.activity.passing_score}%</span></>
        )}
      </div>

      <div className="space-y-5">
        {quiz.questions.map((q: StudentBlockQuizQuestion, idx: number) => (
          <div key={q.id}
            className={`rounded-xl border p-5 transition-colors ${answers[q.id] ? 'border-teal-200 bg-white' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-start gap-3 mb-4">
              <span className={`flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${answers[q.id] ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
                {idx + 1}
              </span>
              <p className="font-medium text-slate-800 text-sm leading-relaxed">{q.statement}</p>
            </div>
            <div className="space-y-2 pl-10">
              {q.options.map(opt => (
                <label key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all text-sm ${answers[q.id] === opt.id ? 'bg-teal-50 border-teal-400 text-teal-800 font-medium' : 'bg-slate-50 border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 text-slate-700'}`}>
                  <input type="radio" name={q.id} value={opt.id}
                    checked={answers[q.id] === opt.id}
                    onChange={() => setAnswer(q.id, opt.id)}
                    className="mt-0.5 accent-teal-600 flex-shrink-0" />
                  {opt.option_text}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-200 space-y-3">
        {submitError && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertTriangle className="w-4 h-4" />{submitError}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>
            {totalQuestions - answeredCount > 0
              ? `${totalQuestions - answeredCount} questão(ões) sem resposta — contarão como zero`
              : 'Todas as questões respondidas'}
          </span>
          <Badge variant="outline" className={progressPct === 100 ? 'text-teal-600 border-teal-300' : ''}>
            {progressPct}%
          </Badge>
        </div>
        <Button onClick={handleSubmit} disabled={submitting || answeredCount === 0}
          className={`w-full ${colors.btn} text-white`} size="lg">
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</>
            : <><CheckCircle2 className="w-4 h-4 mr-2" />Finalizar Exame ({answeredCount}/{totalQuestions})</>}
        </Button>
      </div>
    </div>
  );
}
