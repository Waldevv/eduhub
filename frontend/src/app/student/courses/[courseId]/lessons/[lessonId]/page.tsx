'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  studentApi, StudentUnitDetail, StudentBlock,
  StudentBlockQuizQuestion, QuizSubmitResult,
} from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, CheckCircle2, Lock, ChevronDown, ChevronUp,
  FileText, CheckSquare, MessageSquare, Target, Calculator, ClipboardList,
  Loader2, ExternalLink, Trophy, XCircle, RefreshCw, AlertCircle,
  Download, Upload, Clock, UserX,
} from 'lucide-react';
import { uploadFile } from '@/lib/supabase';

type BType = 'content' | 'activity' | 'exam' | 'interaction' | 'consolidation' | 'evaluation';

const BLOCK_STYLES: Record<BType, {
  bg: string; text: string; icon: string; badge: string; border: string; Icon: React.ElementType;
}> = {
  content:      { bg: 'bg-blue-50',   text: 'text-blue-900',   icon: 'text-blue-600',   badge: 'bg-blue-100 text-blue-800',   border: 'border-blue-100',   Icon: FileText },
  activity:     { bg: 'bg-green-50',  text: 'text-green-900',  icon: 'text-green-600',  badge: 'bg-green-100 text-green-800', border: 'border-green-100',  Icon: CheckSquare },
  exam:         { bg: 'bg-red-50',    text: 'text-red-900',    icon: 'text-red-600',    badge: 'bg-red-100 text-red-800',     border: 'border-red-100',    Icon: ClipboardList },
  interaction:  { bg: 'bg-purple-50', text: 'text-purple-900', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-800', border: 'border-purple-100', Icon: MessageSquare },
  consolidation:{ bg: 'bg-orange-50', text: 'text-orange-900', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-800', border: 'border-orange-100', Icon: Target },
  evaluation:   { bg: 'bg-slate-50',  text: 'text-slate-900',  icon: 'text-slate-600',  badge: 'bg-slate-100 text-slate-700', border: 'border-slate-100',  Icon: Calculator },
};

function blockStyle(type: string) {
  return BLOCK_STYLES[type as BType] ?? {
    bg: 'bg-slate-50', text: 'text-slate-900', icon: 'text-slate-600',
    badge: 'bg-slate-100 text-slate-700', border: 'border-slate-100', Icon: FileText,
  };
}

const BLOCK_LABELS: Record<string, string> = {
  content: 'Conteúdo', activity: 'Atividade', exam: 'Exame',
  interaction: 'Interação', consolidation: 'Consolidação', evaluation: 'Avaliação',
};

function cfg(block: StudentBlock): Record<string, unknown> {
  return (block.config_json as Record<string, unknown>) ?? {};
}

function getLinkEmbed(url: string): { type: 'youtube' | 'drive'; src: string } | null {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    if (url.includes('youtube.com/embed/')) return { type: 'youtube', src: url };
    const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (short) return { type: 'youtube', src: `https://www.youtube.com/embed/${short[1]}` };
    const watch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watch) return { type: 'youtube', src: `https://www.youtube.com/embed/${watch[1]}` };
  }
  if (url.includes('drive.google.com')) {
    const fileId = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
      ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1]
      ?? '';
    if (fileId) return { type: 'drive', src: `https://drive.google.com/file/d/${fileId}/preview` };
  }
  return null;
}

function LinkEmbed({ url }: { url: string }) {
  const embed = getLinkEmbed(url);
  if (!embed) return null;
  if (embed.type === 'youtube') {
    return (
      <div className="aspect-video rounded-xl overflow-hidden bg-black">
        <iframe src={embed.src} className="w-full h-full" allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
      </div>
    );
  }
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
      <iframe src={embed.src} className="w-full" style={{ height: 360 }} allowFullScreen title="Visualizador" />
    </div>
  );
}

function linkButtonLabel(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'Abrir no YouTube';
  if (url.includes('drive.google.com')) return 'Abrir no Google Drive';
  return 'Acessar link externo';
}

function ContentRenderer({ block, onComplete }: { block: StudentBlock; onComplete: () => void }) {
  const c = cfg(block);
  const contentType = (c.contentType as string) || 'text';
  const bodyText = c.text as string | undefined;
  const videoUrl = c.videoUrl as string | undefined;
  const fileUrl = c.fileUrl as string | undefined;
  const externalUrl = c.externalUrl as string | undefined;

  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(block.student_status === 'completed');

  const isPdf = !!fileUrl && fileUrl.toLowerCase().includes('.pdf');
  const videoEmbed = videoUrl ? getLinkEmbed(videoUrl) : null;

  const handleComplete = async () => {
    if (done) return;
    setCompleting(true);
    try { await studentApi.completeBlock(block.id); setDone(true); onComplete(); }
    finally { setCompleting(false); }
  };

  const hasBottomLink =
    (contentType === 'file' && !!fileUrl) ||
    (contentType === 'external' && !!externalUrl) ||
    (contentType === 'video' && !!videoUrl && videoEmbed?.type !== 'youtube');
  const showBottomActions = hasBottomLink || block.completion_mode === 'manual';

  return (
    <div className="space-y-4">
      {contentType === 'text' && bodyText && (
        <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-100">
          {bodyText}
        </div>
      )}
      {contentType === 'text' && !bodyText && (
        <p className="text-sm text-slate-500 italic bg-slate-50 rounded-xl p-4 border border-slate-100">
          Seu professor não adicionou texto a este bloco ainda.
        </p>
      )}

      {contentType === 'video' && videoUrl && <LinkEmbed url={videoUrl} />}
      {contentType === 'video' && !videoUrl && (
        <p className="text-sm text-slate-500 italic bg-blue-50 rounded-xl p-4 border border-blue-100">
          Seu professor disponibilizou um vídeo nesta aula. O link ainda não foi configurado.
        </p>
      )}

      {contentType === 'file' && fileUrl && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 bg-blue-50 rounded-xl p-3 border border-blue-100">
            <FileText className="w-4 h-4 inline mr-1.5 text-blue-500" />
            Seu professor disponibilizou este documento como material de apoio para a aula.
          </p>
          {isPdf && (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              <iframe src={`https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(fileUrl)}`}
                className="w-full" style={{ height: 360 }} title="Visualizador de PDF" />
            </div>
          )}
        </div>
      )}
      {contentType === 'file' && !fileUrl && (
        <p className="text-sm text-slate-500 italic bg-blue-50 rounded-xl p-4 border border-blue-100">
          Seu professor disponibilizou um arquivo para download nesta aula.
        </p>
      )}

      {contentType === 'external' && !externalUrl && (
        <p className="text-sm text-slate-500 italic bg-blue-50 rounded-xl p-4 border border-blue-100">
          Seu professor compartilhou um link externo nesta aula.
        </p>
      )}
      {contentType === 'external' && externalUrl && <LinkEmbed url={externalUrl} />}

      {showBottomActions && (
        <div className="flex items-center justify-end gap-2 pt-1">
          {contentType === 'file' && fileUrl && (
            <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" asChild>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4 mr-2" />Baixar material
              </a>
            </Button>
          )}
          {contentType === 'external' && externalUrl && (
            <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" asChild>
              <a href={externalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />{linkButtonLabel(externalUrl)}
              </a>
            </Button>
          )}
          {contentType === 'video' && videoUrl && videoEmbed?.type !== 'youtube' && (
            <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" asChild>
              <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />{linkButtonLabel(videoUrl)}
              </a>
            </Button>
          )}
          {block.completion_mode === 'manual' && (
            <Button onClick={!done ? handleComplete : undefined} disabled={completing || done} size="sm"
              className={`bg-blue-600 hover:bg-blue-700 ${done ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {completing
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
                : <><CheckCircle2 className="w-4 h-4 mr-2" />{done ? 'Concluído' : 'Marcar como concluído'}</>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function QuizRenderer({ block, onComplete }: { block: StudentBlock; onComplete: () => void }) {
  const activity = block.activity;
  const quiz = activity?.quiz;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);

  const isCompleted = block.student_status === 'completed';
  const maxAttempts = activity?.max_attempts;
  const attemptsLeft = maxAttempts != null ? maxAttempts - block.attempts_done : null;
  const canAttempt = !isCompleted && (attemptsLeft == null || attemptsLeft > 0);

  if (!activity || !quiz) return <p className="text-slate-400 text-sm">Questionário não configurado.</p>;

  const allAnswered = quiz.questions.every(q => answers[q.id]);

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setSubmitting(true); setError(null);
    try {
      const res = await studentApi.submitQuiz(block.id,
        quiz.questions.map(q => ({ question_id: q.id, option_id: answers[q.id] })));
      setResult(res);
      if (res.passed) onComplete();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar respostas.');
    } finally { setSubmitting(false); }
  };

  if (isCompleted && !result && !showRetry) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <Trophy className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-700 text-sm">Atividade concluída!</p>
            {block.latest_score != null && (
              <p className="text-green-600 text-xs mt-0.5">
                Última pontuação: {block.latest_score} pts
                {block.latest_passed != null && ` — ${block.latest_passed ? 'Aprovado' : 'Não aprovado'}`}
              </p>
            )}
            <p className="text-green-500 text-xs">Tentativas: {block.attempts_done}</p>
          </div>
        </div>
        {canAttempt && (
          <button onClick={() => setShowRetry(true)}
            className="flex items-center gap-1.5 text-sm text-teal-600 hover:underline">
            <RefreshCw className="w-3.5 h-3.5" />Tentar novamente
          </button>
        )}
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className={`flex items-start gap-3 rounded-xl p-4 border ${result.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {result.passed
            ? <Trophy className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            : <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />}
          <div>
            <p className={`font-bold ${result.passed ? 'text-green-700' : 'text-red-600'}`}>
              {result.passed ? 'Aprovado!' : 'Não aprovado'}
            </p>
            <p className={`text-sm mt-0.5 ${result.passed ? 'text-green-600' : 'text-red-500'}`}>
              {result.score} / {result.total_score} pts · {result.score_percent}%
            </p>
            <p className="text-xs text-slate-400">
              Tentativa {result.attempt_number}{result.max_attempts < 9999 ? ` de ${result.max_attempts}` : ''}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {quiz.questions.map((q, i) => {
            const resp = result.responses.find(r => r.question_id === q.id);
            return (
              <div key={q.id} className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${resp?.is_correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {resp?.is_correct ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span>Q{i + 1}: {q.statement}</span>
              </div>
            );
          })}
        </div>
        {!result.passed && (attemptsLeft == null || attemptsLeft > 1) && (
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700"
            onClick={() => { setResult(null); setAnswers({}); setError(null); setShowRetry(false); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente{attemptsLeft != null ? ` (${attemptsLeft - 1} restante${attemptsLeft - 1 !== 1 ? 's' : ''})` : ''}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {activity.description && <p className="text-sm text-slate-500 italic">{activity.description}</p>}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        {activity.passing_score != null && <span>Aprovação: {activity.passing_score}%</span>}
        {maxAttempts != null && maxAttempts < 9999 && <span>Tentativas: {block.attempts_done}/{maxAttempts}</span>}
        {attemptsLeft != null && attemptsLeft === 0 && <span className="text-red-500 font-medium">Sem tentativas restantes</span>}
      </div>
      {quiz.questions.map((q: StudentBlockQuizQuestion, idx: number) => (
        <div key={q.id} className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            <span className="text-slate-400 mr-2">{idx + 1}.</span>{q.statement}
          </p>
          <div className="space-y-1.5 pl-4">
            {q.options.map(opt => (
              <label key={opt.id}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer border transition-all text-sm ${answers[q.id] === opt.id ? 'bg-teal-50 border-teal-400 text-teal-800' : 'bg-slate-50 border-slate-200 hover:border-teal-300 text-slate-700'}`}>
                <input type="radio" name={q.id} value={opt.id}
                  checked={answers[q.id] === opt.id}
                  onChange={() => setAnswers(p => ({ ...p, [q.id]: opt.id }))}
                  className="mt-0.5 accent-teal-600" />
                {opt.option_text}
              </label>
            ))}
          </div>
        </div>
      ))}
      {error && <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
      <div className="flex justify-end pt-1">
        <Button size="sm" className="bg-green-600 hover:bg-green-700"
          disabled={!allAnswered || submitting || !canAttempt} onClick={handleSubmit}>
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Enviar respostas</>}
        </Button>
      </div>
    </div>
  );
}

function ExamBlockRenderer({ block, onComplete }: { block: StudentBlock; onComplete: () => void }) {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const activity = block.activity;
  const isCompleted = block.student_status === 'completed';

  if (!activity) {
    return (
      <p className="text-sm text-slate-500 italic bg-red-50 rounded-xl p-4 border border-red-100">
        Este exame ainda não foi configurado pelo professor.
      </p>
    );
  }

  if (activity.activity_type === 'assignment') {
    return <AssignmentRenderer block={block} onComplete={onComplete} />;
  }

  const quiz = activity.quiz;
  if (!quiz) {
    return (
      <p className="text-sm text-slate-500 italic bg-red-50 rounded-xl p-4 border border-red-100">
        Este exame ainda não foi configurado pelo professor.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3">
        <p className="font-semibold text-red-900 text-sm">{quiz.title}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-red-700">
          <span>{quiz.questions.length} questão{quiz.questions.length !== 1 ? 'ões' : ''}</span>
          {activity.time_limit_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{activity.time_limit_minutes} minutos
            </span>
          )}
          {activity.passing_score != null && (
            <span>Mínimo para aprovação: {activity.passing_score}%</span>
          )}
          {activity.max_attempts != null && activity.max_attempts < 9999 && (
            <span>Máx. tentativas: {activity.max_attempts}</span>
          )}
        </div>
        {activity.description && (
          <p className="text-xs text-red-700 leading-relaxed">{activity.description}</p>
        )}
      </div>

      {block.attempts_done > 0 && (
        <div className={`flex items-center gap-3 rounded-xl p-3 border text-sm ${block.latest_passed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          {block.latest_passed
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" />
            : <XCircle className="w-4 h-4 flex-shrink-0 text-slate-400" />}
          <span>
            Tentativa {block.attempts_done}: {block.latest_score} pts
            {block.latest_passed !== null && ` — ${block.latest_passed ? 'Aprovado' : 'Não aprovado'}`}
          </span>
        </div>
      )}

      {isCompleted && !(activity.max_attempts != null && block.attempts_done < activity.max_attempts) ? (
        <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" />Exame concluído
        </div>
      ) : (
        <Link href={`/student/courses/${courseId}/lessons/${lessonId}/exam/${block.id}`}>
          <Button className="w-full bg-red-600 hover:bg-red-700">
            <ClipboardList className="w-4 h-4 mr-2" />
            {block.attempts_done > 0 ? 'Tentar novamente' : 'Iniciar Exame'}
          </Button>
        </Link>
      )}
    </div>
  );
}

function AssignmentRenderer({ block, onComplete }: { block: StudentBlock; onComplete: () => void }) {
  const c = cfg(block);
  const submissionType = (c.submissionType as string) || 'file_upload';
  const description = c.description as string | undefined;
  const materialType = c.materialType as string | undefined;
  const materialUrl = c.materialUrl as string | undefined;

  const [textContent, setTextContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(block.student_status === 'completed');
  const fileRef = useRef<HTMLInputElement>(null);

  const isMaterialPdf = !!materialUrl && materialUrl.toLowerCase().includes('.pdf');
  const isExam = block.block_type === 'exam';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null);
    try { const url = await uploadFile(file); setFileUrl(url); setFileName(file.name); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erro ao fazer upload'); }
    finally { setUploading(false); }
  };

  const canSubmit = submissionType === 'file_upload' ? !!fileUrl
    : submissionType === 'text' ? !!textContent.trim()
    : submissionType === 'link' ? !!linkUrl.trim()
    : !!fileUrl && !!textContent.trim();

  const handleSubmit = async () => {
    setSubmitting(true); setError(null);
    try {
      await studentApi.submitAssignment(block.id, {
        submission_type: submissionType,
        file_url: fileUrl || undefined,
        text_content: textContent || undefined,
        link_url: linkUrl || undefined,
      });
      setDone(true); onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar entrega');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      {description && (
        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
          {description}
        </div>
      )}

      {materialType === 'file' && materialUrl && isMaterialPdf && (
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <iframe src={`https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(materialUrl)}`}
            className="w-full" style={{ height: 360 }} title="Material de apoio" />
        </div>
      )}
      {materialType === 'link' && materialUrl && (
        <div className="space-y-2">
          <LinkEmbed url={materialUrl} />
          {!getLinkEmbed(materialUrl) && (
            <a
              href={materialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 hover:bg-green-100 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-green-200 flex items-center justify-center flex-shrink-0">
                <ExternalLink className="w-4 h-4 text-green-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-green-800">Material de Apoio</p>
                <p className="text-xs text-green-600 truncate mt-0.5">{materialUrl}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-green-400 group-hover:text-green-600 flex-shrink-0" />
            </a>
          )}
        </div>
      )}

      {done ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-700 text-sm">Entrega realizada!</p>
            <p className="text-green-500 text-xs mt-0.5">Tentativa {block.attempts_done + 1}</p>
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sua entrega</p>
          {(submissionType === 'file_upload' || submissionType === 'file_text') && (
            <div>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
              {fileUrl ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-green-700 font-medium truncate">{fileName}</span>
                  <button onClick={() => { setFileUrl(''); setFileName(''); }}
                    className="ml-auto text-xs text-red-500 hover:underline flex-shrink-0">
                    Remover
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-teal-300 hover:bg-teal-50/50 transition-colors disabled:opacity-50">
                  {uploading
                    ? <p className="text-sm text-teal-700"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Enviando...</p>
                    : <><Upload className="w-5 h-5 mx-auto mb-1 text-slate-400" /><p className="text-sm text-slate-600">Clique para selecionar um arquivo</p></>}
                </button>
              )}
            </div>
          )}
          {(submissionType === 'text' || submissionType === 'file_text') && (
            <textarea rows={4} placeholder="Escreva sua resposta..." value={textContent}
              onChange={e => setTextContent(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
          )}
          {submissionType === 'link' && (
            <input type="url" placeholder="https://..." value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          )}
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}

      <div className="flex items-center justify-end gap-2 pt-1">
        {materialType === 'file' && materialUrl && (
          <Button size="sm" variant="outline"
            className={isExam ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'}
            asChild>
            <a href={materialUrl} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4 mr-2" />Baixar material
            </a>
          </Button>
        )}
        {materialType === 'link' && materialUrl && (
          <Button size="sm" variant="outline"
            className={isExam ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'}
            asChild>
            <a href={materialUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />Acessar material
            </a>
          </Button>
        )}
        <Button size="sm"
          className={`${isExam ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} ${done ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={(!canSubmit && !done) || submitting || done}
          onClick={!done ? handleSubmit : undefined}>
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</> : <><Upload className="w-4 h-4 mr-2" />{done ? 'Entregue' : 'Entregar'}</>}
        </Button>
      </div>
    </div>
  );
}

function ActivityRenderer({ block, onComplete }: { block: StudentBlock; onComplete: () => void }) {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const c = cfg(block);
  const activityType = (c.activityType as string) || 'quiz';
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(block.student_status === 'completed');

  if (activityType === 'quiz') {
    const activity = block.activity;
    const quiz = activity?.quiz;
    const isCompleted = block.student_status === 'completed';
    if (!activity || !quiz) {
      return <p className="text-sm text-slate-500 italic bg-green-50 rounded-xl p-4 border border-green-100">Atividade não configurada pelo professor.</p>;
    }
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-2">
          <p className="font-semibold text-green-900 text-sm">{quiz.title}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-green-700">
            <span>{quiz.questions.length} questão{quiz.questions.length !== 1 ? 'ões' : ''}</span>
            {activity.time_limit_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{activity.time_limit_minutes} minutos</span>}
            {activity.passing_score != null && <span>Mínimo: {activity.passing_score}%</span>}
            {activity.max_attempts != null && activity.max_attempts < 9999 && <span>Máx. tentativas: {activity.max_attempts}</span>}
          </div>
          {activity.description && <p className="text-xs text-green-700 leading-relaxed">{activity.description}</p>}
        </div>
        {block.attempts_done > 0 && (
          <div className={`flex items-center gap-3 rounded-xl p-3 border text-sm ${block.latest_passed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            {block.latest_passed ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" /> : <XCircle className="w-4 h-4 flex-shrink-0 text-slate-400" />}
            <span>Tentativa {block.attempts_done}: {block.latest_score} pts{block.latest_passed !== null ? ` — ${block.latest_passed ? 'Aprovado' : 'Não aprovado'}` : ''}</span>
          </div>
        )}
        {isCompleted && !(activity.max_attempts != null && block.attempts_done < activity.max_attempts) ? (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />Atividade concluída
          </div>
        ) : (
          <Link href={`/student/courses/${courseId}/lessons/${lessonId}/exam/${block.id}`}>
            <Button className="w-full bg-green-600 hover:bg-green-700">
              <CheckSquare className="w-4 h-4 mr-2" />
              {block.attempts_done > 0 ? 'Tentar novamente' : 'Iniciar Atividade'}
            </Button>
          </Link>
        )}
      </div>
    );
  }
  if (activityType === 'assignment') return <AssignmentRenderer block={block} onComplete={onComplete} />;

  const externalUrl = c.externalUrl as string | undefined;
  const handleComplete = async () => {
    setCompleting(true);
    try { await studentApi.completeBlock(block.id); setDone(true); onComplete(); }
    finally { setCompleting(false); }
  };

  return (
    <div className="space-y-4">
      {externalUrl && <LinkEmbed url={externalUrl} />}
      <div className="flex items-center justify-end gap-2 pt-1">
        {externalUrl && (
          <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50" asChild>
            <a href={externalUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />{linkButtonLabel(externalUrl)}
            </a>
          </Button>
        )}
        <Button size="sm" className={`bg-green-600 hover:bg-green-700 ${done ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={completing || done} onClick={!done ? handleComplete : undefined}>
          {completing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />{done ? 'Concluído' : 'Marcar como concluído'}</>}
        </Button>
      </div>
    </div>
  );
}

function InteractionRenderer({ block, unitId, onRefresh }: { block: StudentBlock; unitId: string; onRefresh: () => void }) {
  const inter = block.interaction;
  const done = block.student_status === 'completed';
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    try {
      await studentApi.syncDiscord(unitId);
      await onRefresh();
    } finally { setChecking(false); }
  };

  return (
    <div className="space-y-4">
      {inter?.channel ? (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-purple-900 text-sm">#{inter.channel.name}</p>
              <p className="text-purple-500 text-xs capitalize">{inter.channel.channel_type}</p>
            </div>
          </div>
          {inter.initial_message && (
            <p className="text-purple-700 text-sm mt-2 italic">"{inter.initial_message}"</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic bg-purple-50 rounded-xl p-4 border border-purple-100">
          Seu professor configurou uma atividade de interação neste espaço.
        </p>
      )}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 text-sm text-purple-700">
          {done
            ? <><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-green-700 font-medium">Participação registrada</span></>
            : <><Clock className="w-4 h-4" /><span>Participe no Discord — será registrado automaticamente.</span></>}
        </div>
        {!done && (
          <Button size="sm" variant="ghost" className="text-purple-600 hover:text-purple-800" onClick={handleCheck} disabled={checking}>
            {checking ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Verificar
          </Button>
        )}
      </div>
    </div>
  );
}

function ConsolidationRenderer({ block, onComplete }: { block: StudentBlock; onComplete: () => void }) {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const c = cfg(block);
  const consolidationType = (c.consolidationType as string) || 'quiz';
  const done = block.student_status === 'completed';
  const [completing, setCompleting] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    try { await studentApi.completeBlock(block.id); onComplete(); }
    finally { setCompleting(false); }
  };

  if (consolidationType === 'quiz') {
    const activity = block.activity;
    const quiz = activity?.quiz;
    const materialType = c.materialType as string | undefined;
    const materialUrl = c.materialUrl as string | undefined;
    const isPdfMaterial = !!materialUrl && materialUrl.toLowerCase().includes('.pdf');

    if (!activity || !quiz) {
      return (
        <p className="text-sm text-slate-500 italic bg-orange-50 rounded-xl p-4 border border-orange-100">
          Quiz de consolidação não configurado.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {materialType === 'file' && materialUrl && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600 bg-orange-50 rounded-xl p-3 border border-orange-100">
              <FileText className="w-4 h-4 inline mr-1.5 text-orange-500" />
              Material de apoio disponibilizado pelo professor
            </p>
            {isPdfMaterial && (
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <iframe
                  src={`https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(materialUrl)}`}
                  className="w-full" style={{ height: 360 }}
                  title="Material de apoio"
                />
              </div>
            )}
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50" asChild>
                <a href={materialUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />Baixar material
                </a>
              </Button>
            </div>
          </div>
        )}

        {materialType === 'link' && materialUrl && (
          <div className="space-y-2">
            <LinkEmbed url={materialUrl} />
            {!getLinkEmbed(materialUrl) && (
              <a
                href={materialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4 hover:bg-orange-100 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-orange-200 flex items-center justify-center flex-shrink-0">
                  <ExternalLink className="w-4 h-4 text-orange-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-orange-800">Material de Apoio</p>
                  <p className="text-xs text-orange-600 truncate mt-0.5">{materialUrl}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-orange-400 group-hover:text-orange-600 flex-shrink-0" />
              </a>
            )}
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50" asChild>
                <a href={materialUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />Acessar material
                </a>
              </Button>
            </div>
          </div>
        )}

        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-2">
          <p className="font-semibold text-orange-900 text-sm">{quiz.title}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-orange-700">
            <span>{quiz.questions.length} questão{quiz.questions.length !== 1 ? 'ões' : ''}</span>
            {activity.time_limit_minutes && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{activity.time_limit_minutes} min</span>
            )}
            {activity.passing_score != null && <span>Mínimo: {activity.passing_score}%</span>}
          </div>
        </div>

        {block.attempts_done > 0 && (
          <div className={`flex items-center gap-3 rounded-xl p-3 border text-sm ${block.latest_passed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            {block.latest_passed
              ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" />
              : <XCircle className="w-4 h-4 flex-shrink-0 text-slate-400" />}
            <span>
              Tentativa {block.attempts_done}: {block.latest_score} pts
              {block.latest_passed !== null ? ` — ${block.latest_passed ? 'Aprovado' : 'Não aprovado'}` : ''}
            </span>
          </div>
        )}

        {done && !(activity.max_attempts != null && block.attempts_done < activity.max_attempts) ? (
          <div className="flex items-center justify-end gap-2 text-orange-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />Consolidação concluída
          </div>
        ) : (
          <Link href={`/student/courses/${courseId}/lessons/${lessonId}/exam/${block.id}`}>
            <Button className="w-full bg-orange-600 hover:bg-orange-700">
              <Target className="w-4 h-4 mr-2" />
              {block.attempts_done > 0 ? 'Tentar novamente' : 'Iniciar Quiz de Consolidação'}
            </Button>
          </Link>
        )}
      </div>
    );
  }

  if (consolidationType === 'guided_stage') {
    const scheduledAt = c.scheduledAt as string | undefined;
    const eventDescription = c.eventDescription as string | undefined;
    const callType = (c.callType as string) ?? 'voice';

    return (
      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-2">
          <p className="font-medium text-orange-900 text-sm">
            Revisão guiada — {callType === 'stage' ? 'Palco' : 'Chamada de voz'}
          </p>
          {scheduledAt && (
            <p className="text-orange-700 text-xs flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(scheduledAt).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          )}
          {eventDescription && (
            <p className="text-orange-700 text-sm mt-1 leading-relaxed">{eventDescription}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-sm">
            {done
              ? <><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-green-700 font-medium">Participação registrada</span></>
              : <><Clock className="w-4 h-4 text-orange-400" /><span className="text-slate-600">Entre na chamada no Discord — será registrado automaticamente.</span></>}
          </div>
          {!done && (
            <Button size="sm" variant="ghost" className="text-orange-600 hover:text-orange-800 flex-shrink-0 ml-2"
              disabled={checking}
              onClick={async () => { setChecking(true); try { onComplete(); } finally { setChecking(false); } }}>
              {checking ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Verificar
            </Button>
          )}
        </div>
      </div>
    );
  }

  const summaryText = c.summaryText as string | undefined;
  const summaryFileUrl = c.summaryFileUrl as string | undefined;
  const isPdf = !!summaryFileUrl && summaryFileUrl.toLowerCase().includes('.pdf');

  return (
    <div className="space-y-4">
      {summaryText && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
          <p className="text-orange-800 text-sm leading-relaxed whitespace-pre-wrap">{summaryText}</p>
        </div>
      )}
      {!summaryText && !summaryFileUrl && (
        <p className="text-sm text-slate-500 italic bg-orange-50 rounded-xl p-4 border border-orange-100">
          Seu professor preparou uma consolidação do conteúdo desta aula.
        </p>
      )}
      {summaryFileUrl && (
        <>
          <p className="text-sm text-slate-600 bg-orange-50 rounded-xl p-3 border border-orange-100">
            <FileText className="w-4 h-4 inline mr-1.5 text-orange-500" />
            Seu professor disponibilizou um material de encerramento para esta aula.
          </p>
          {isPdf && (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              <iframe
                src={`https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(summaryFileUrl)}`}
                className="w-full" style={{ height: 360 }}
                title="Visualizador de PDF"
              />
            </div>
          )}
        </>
      )}
      <div className="flex items-center justify-end gap-2 pt-1">
        {summaryFileUrl && (
          <Button size="sm" variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50" asChild>
            <a href={summaryFileUrl} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4 mr-2" />Baixar material
            </a>
          </Button>
        )}
        <Button size="sm"
          className={`bg-orange-600 hover:bg-orange-700 ${done ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={completing || done}
          onClick={!done ? handleComplete : undefined}>
          {completing
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
            : <><CheckCircle2 className="w-4 h-4 mr-2" />{done ? 'Concluído' : 'Concluir consolidação'}</>}
        </Button>
      </div>
    </div>
  );
}

function EvaluationRenderer({ block, allBlocks }: { block: StudentBlock; allBlocks: StudentBlock[] }) {
  const c = cfg(block);
  const evaluationType = (c.evaluationType as string) ?? 'simple_average';
  const labels: Record<string, string> = {
    simple_average: 'Média Simples', weighted_average: 'Média Ponderada',
    sum: 'Soma de Notas', custom: 'Fórmula Personalizada',
  };

  const scoringBlocks = allBlocks.filter(b =>
    b.block_type !== 'evaluation' &&
    b.block_type !== 'content' &&
    b.block_type !== 'interaction'
  );
  const scores = scoringBlocks.map(b => b.latest_score).filter((s): s is number => s != null);

  let finalGrade: number | null = null;
  if (scores.length > 0) {
    finalGrade = evaluationType === 'sum'
      ? parseFloat(scores.reduce((a, b) => a + b, 0).toFixed(1))
      : parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
  }

  return (
    <div className="space-y-2">
      {scoringBlocks.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhuma atividade avaliável nesta aula.</p>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {scoringBlocks.map(b => {
            const { badge } = blockStyle(b.block_type);
            const typeLabel = BLOCK_LABELS[b.block_type] ?? b.block_type;
            return (
              <div key={b.id} className="flex items-center justify-between px-3 py-2.5 bg-white">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${badge}`}>
                    {typeLabel}
                  </span>
                  <span className="text-sm text-slate-700 truncate">{b.title}</span>
                </div>
                {b.latest_score != null ? (
                  <span className="ml-3 flex-shrink-0 text-sm font-semibold text-slate-700 tabular-nums">
                    {b.latest_score} pts
                  </span>
                ) : b.student_status === 'completed' ? (
                  <span className="ml-3 flex-shrink-0 text-xs text-amber-600">Aguardando avaliação</span>
                ) : (
                  <span className="ml-3 flex-shrink-0 text-xs text-slate-400">Não concluído</span>
                )}
              </div>
            );
          })}

          <div className="flex items-center justify-between px-3 py-3 bg-slate-50">
            <div>
              <p className="text-xs font-semibold text-slate-600">Nota Final</p>
              <p className="text-xs text-slate-400">{labels[evaluationType] ?? 'Avaliação'}</p>
            </div>
            {finalGrade !== null ? (
              <span className="text-sm font-bold text-teal-700 tabular-nums">{finalGrade} pts</span>
            ) : (
              <span className="text-xs text-slate-400">
                {scores.length}/{scoringBlocks.length} notas atribuídas
              </span>
            )}
          </div>
          {block.latest_score != null && block.latest_score !== finalGrade && (
            <div className="flex items-center justify-between px-3 py-2.5 bg-teal-50 border-t border-teal-100">
              <p className="text-xs font-semibold text-teal-700">Nota Final (Reajustada)</p>
              <span className="text-sm font-bold text-teal-700 tabular-nums">{block.latest_score} pts</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getDefaultDescription(block: StudentBlock): string {
  const c = (block.config_json ?? {}) as Record<string, unknown>;
  switch (block.block_type) {
    case 'content': {
      const t = (c.contentType as string) || 'text';
      if (t === 'video')    return 'Assista ao vídeo disponibilizado para esta aula.';
      if (t === 'file')     return 'Acesse o documento disponibilizado pelo professor.';
      if (t === 'external') return 'Acesse o link externo indicado para esta aula.';
      return 'Leia o material disponibilizado nesta aula.';
    }
    case 'activity': {
      const t = (c.activityType as string) || 'quiz';
      if (t === 'assignment') return 'Realize a tarefa proposta pelo professor.';
      if (t === 'link')       return 'Acesse a atividade externa disponibilizada.';
      return 'Responda as questões para fixar o conteúdo.';
    }
    case 'exam':
      return 'Realize a avaliação desta aula.';
    case 'interaction': {
      const t = (c.interactionType as string) || 'text';
      if (t === 'forum')  return 'Participe da discussão no fórum.';
      if (t === 'thread') return 'Participe da discussão proposta no tópico.';
      if (t === 'voice')  return 'Participe da chamada agendada pelo professor.';
      return 'Escreva sua resposta de forma dissertativa.';
    }
    case 'consolidation': {
      const t = (c.consolidationType as string) || 'quiz';
      if (t === 'guided_stage') return 'Participe da revisão guiada ao vivo.';
      if (t === 'summary')      return 'Revise a síntese do conteúdo desta aula.';
      return 'Responda o quiz de revisão desta aula.';
    }
    case 'evaluation':
      return 'Este bloco calculará sua nota final nesta aula.';
    default:
      return '';
  }
}

function BlockCard({ block, allBlocks, unitId, onComplete, openBlockId, setOpenBlockId }: {
  block: StudentBlock;
  allBlocks: StudentBlock[];
  unitId: string;
  onComplete: (id: string) => void;
  openBlockId: string | null;
  setOpenBlockId: (id: string | null) => void;
}) {
  const open = openBlockId === block.id;
  const isLocked = block.student_status === 'locked' && block.block_type !== 'evaluation';
  const isCompleted = block.student_status === 'completed';
  const isAbsent = block.student_status === 'absent';
  const { bg, icon, badge, border, Icon } = blockStyle(block.block_type);
  const label = BLOCK_LABELS[block.block_type] ?? block.block_type;
  const c = (block.config_json ?? {}) as Record<string, unknown>;
  const description = (c.studentDescription as string | undefined) || getDefaultDescription(block);

  const handleComplete = useCallback(() => onComplete(block.id), [block.id, onComplete]);

  return (
    <Card className={`overflow-hidden transition-all ${isLocked ? 'opacity-60' : ''}`}>
      <button
        onClick={() => !isLocked && setOpenBlockId(open ? null : block.id)}
        disabled={isLocked}
        className={`w-full flex items-center gap-3 p-4 text-left bg-white transition-colors ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}
      >
        <div className={`flex-shrink-0 w-11 h-11 ${bg} border ${border} rounded-xl flex items-center justify-center`}>
          {isLocked
            ? <Lock className="w-5 h-5 text-slate-400" />
            : isAbsent
            ? <UserX className={`w-5 h-5 ${icon}`} />
            : <Icon className={`w-6 h-6 ${icon}`} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 ${badge} rounded`}>{label}</span>
            {block.is_required && (
              <span className="text-xs font-medium px-2 py-0.5 bg-red-50 text-red-600 rounded">Obrigatório</span>
            )}
          </div>
          <h4 className="font-semibold text-sm text-slate-800 truncate">{block.title}</h4>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          {isCompleted && block.latest_score != null && block.block_type !== 'evaluation' && (
            <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-lg">
              {block.latest_score} pts
            </span>
          )}
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
            isCompleted ? 'bg-green-100 text-green-700' :
            isAbsent    ? 'bg-red-100 text-red-600' :
            isLocked    ? 'bg-slate-100 text-slate-500' :
                          'bg-amber-100 text-amber-700'
          }`}>
            {isCompleted
              ? <CheckCircle2 className="w-3.5 h-3.5" />
              : isAbsent
              ? <UserX className="w-3.5 h-3.5" />
              : isLocked
              ? <Lock className="w-3.5 h-3.5" />
              : <Clock className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {isCompleted ? 'Concluído' : isAbsent ? 'Ausente' : isLocked ? 'Bloqueado' : 'Pendente'}
            </span>
          </span>
          {isLocked
            ? <Lock className="w-4 h-4 text-slate-300" />
            : open
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {open && !isLocked && (
        <div className="p-4 border-t border-slate-100">
          {isAbsent && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
              <UserX className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">Ausência registrada</p>
                <p className="text-xs text-red-500 mt-0.5">Você não entrou dentro do prazo do evento. O próximo bloco foi liberado.</p>
              </div>
            </div>
          )}
          {block.block_type === 'content'      && <ContentRenderer      block={block} onComplete={handleComplete} />}
          {block.block_type === 'activity'     && <ActivityRenderer     block={block} onComplete={handleComplete} />}
          {block.block_type === 'exam'         && <ExamBlockRenderer    block={block} onComplete={handleComplete} />}
          {block.block_type === 'interaction'  && <InteractionRenderer  block={block} unitId={unitId} onRefresh={handleComplete} />}
          {block.block_type === 'consolidation'&& <ConsolidationRenderer block={block} onComplete={handleComplete} />}
          {block.block_type === 'evaluation'   && <EvaluationRenderer   block={block} allBlocks={allBlocks} />}
        </div>
      )}
    </Card>
  );
}

export default function StudentLessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const [unit, setUnit] = useState<StudentUnitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openBlockId, setOpenBlockId] = useState<string | null>(null);

  const loadUnit = useCallback(async () => {
    try { setUnit(await studentApi.getUnit(lessonId)); }
    catch { setError('Não foi possível carregar a aula.'); }
    finally { setLoading(false); }
  }, [lessonId]);

  useEffect(() => { loadUnit(); }, [loadUnit]);

  const handleBlockComplete = useCallback(() => {
    studentApi.getUnit(lessonId).then(setUnit).catch(() => {});
  }, [lessonId]);

  useEffect(() => {
    if (!unit) return;
    const hasPendingInteraction = unit.blocks.some(
      b => b.block_type === 'interaction' && b.student_status !== 'completed'
    );
    if (!hasPendingInteraction) return;

    const interval = setInterval(() => {
      studentApi.getUnit(lessonId).then(setUnit).catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [unit, lessonId]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
    </div>
  );

  if (error || !unit) return (
    <div className="text-center py-16 text-slate-500">
      {error ?? 'Aula não encontrada.'}
      <div className="mt-4">
        <Link href={`/student/courses/${courseId}`} className="text-teal-600 hover:underline text-sm">
          Voltar ao curso
        </Link>
      </div>
    </div>
  );

  const countableBlocks = unit.blocks.filter(b => b.block_type !== 'evaluation');
  const completedBlocks = countableBlocks.filter(b => b.student_status === 'completed').length;
  const totalCountable = countableBlocks.length;
  const progress = totalCountable > 0 ? Math.round((completedBlocks / totalCountable) * 100) : 0;
  const isComplete = totalCountable > 0 && completedBlocks >= totalCountable;

  return (
    <div>
      <Link href={`/student/courses/${courseId}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />{unit.course.title}
      </Link>

      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-800">{unit.title}</h1>
              {unit.description && <p className="text-slate-500 text-sm mt-1">{unit.description}</p>}
            </div>
            {isComplete && (
              <Badge className="flex-shrink-0 bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Concluída
              </Badge>
            )}
          </div>
          {unit.pedagogical_guidance && (
            <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 mb-4">
              <p className="text-teal-700 text-xs leading-relaxed">{unit.pedagogical_guidance}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{completedBlocks}/{totalCountable} blocos concluídos</span>
              <span className={`font-semibold ${isComplete ? 'text-green-600' : 'text-teal-700'}`}>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </Card>

      {unit.blocks.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum bloco nesta aula.</p>
        </div>
      ) : (
        <div>
          {unit.blocks.map((block, idx) => {
            const isLast = idx === unit.blocks.length - 1;
            const isCompleted = block.student_status === 'completed';
            const isAbsent = block.student_status === 'absent';
            const isLocked = block.student_status === 'locked';
            return (
              <div key={block.id} className="flex gap-3">
                <div className="flex flex-col items-center w-10 flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center z-10 border-2 transition-colors ${
                    isCompleted
                      ? 'bg-green-100 border-green-200 text-green-700'
                      : isAbsent
                      ? 'bg-red-50 border-red-200 text-red-400'
                      : isLocked
                      ? 'bg-white border-slate-200 text-slate-400'
                      : 'bg-violet-400 border-violet-400 text-white'
                  }`}>
                    {isCompleted
                      ? <CheckCircle2 className="w-5 h-5" />
                      : isAbsent
                      ? <UserX className="w-4 h-4" />
                      : <span className="text-xs font-bold">{idx + 1}</span>}
                  </div>
                  {!isLast && <div className="w-0.5 flex-1 bg-slate-200 mt-1" />}
                </div>

                <div className={`flex-1 min-w-0 ${!isLast ? 'pb-3' : ''}`}>
                  <BlockCard
                    block={block}
                    allBlocks={unit.blocks}
                    unitId={unit.id}
                    onComplete={handleBlockComplete}
                    openBlockId={openBlockId}
                    setOpenBlockId={setOpenBlockId}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
