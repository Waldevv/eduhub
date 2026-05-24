'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle,
  FileText, CheckSquare, MessageSquare, Target, Calculator, ClipboardList,
  Award, ChevronDown, ChevronRight, ExternalLink, Pencil,
} from 'lucide-react';
import { teacherApi, StudentProgressDetail, TeacherBlockDetail } from '@/lib/api';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed:   { label: 'Concluído',    color: 'bg-green-100 text-green-700 border-green-200',    icon: CheckCircle },
  in_progress: { label: 'Em Progresso', color: 'bg-blue-100 text-blue-700 border-blue-200',      icon: Clock },
  at_risk:     { label: 'Em Risco',     color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertCircle },
  not_started: { label: 'Não Iniciado', color: 'bg-slate-100 text-slate-700 border-slate-200',   icon: AlertCircle },
};

const blockTypeIcon: Record<string, React.ElementType> = {
  content:      FileText,
  activity:     CheckSquare,
  exam:         ClipboardList,
  interaction:  MessageSquare,
  consolidation:Target,
  evaluation:   Calculator,
};

const blockTypeLabel: Record<string, string> = {
  content:      'Conteúdo',
  activity:     'Atividade',
  exam:         'Exame',
  interaction:  'Interação',
  consolidation:'Consolidação',
  evaluation:   'Avaliação',
};

const blockTypeBadge: Record<string, string> = {
  content:      'bg-blue-100 text-blue-700',
  activity:     'bg-green-100 text-green-700',
  exam:         'bg-red-100 text-red-700',
  interaction:  'bg-purple-100 text-purple-700',
  consolidation:'bg-orange-100 text-orange-700',
  evaluation:   'bg-slate-100 text-slate-700',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
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

function EvaluationBlockContent({
  block, allBlocks, studentId, onGraded,
}: {
  block: TeacherBlockDetail;
  allBlocks: TeacherBlockDetail[];
  studentId: string;
  onGraded: () => void;
}) {
  const scoringBlocks = allBlocks.filter(b =>
    b.block_type !== 'evaluation' && b.block_type !== 'content' && b.block_type !== 'interaction'
  );
  const scores = scoringBlocks.map(b => b.latest_score).filter((s): s is number => s != null);
  const evalType = block.evaluation_type ?? 'simple_average';
  const evalLabels: Record<string, string> = {
    simple_average: 'Média Simples', weighted_average: 'Média Ponderada',
    sum: 'Soma de Notas', custom: 'Fórmula Personalizada',
  };

  let autoGrade: number | null = null;
  if (scores.length > 0) {
    autoGrade = evalType === 'sum'
      ? parseFloat(scores.reduce((a, b) => a + b, 0).toFixed(1))
      : parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
  }

  const displayGrade = block.latest_score ?? autoGrade;
  const [editOpen, setEditOpen] = useState(false);
  const [manualScore, setManualScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function openEdit() {
    setManualScore(displayGrade?.toString() ?? '');
    setSaveError(null);
    setEditOpen(true);
  }

  async function handleSave() {
    const scoreNum = parseFloat(manualScore);
    if (isNaN(scoreNum)) { setSaveError('Pontuação inválida'); return; }
    setSaving(true); setSaveError(null);
    try {
      await teacherApi.setBlockGrade(block.id, studentId, { score: scoreNum, is_approved: scoreNum > 0 });
      setEditOpen(false);
      onGraded();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Erro ao salvar nota');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-2">
      {scoringBlocks.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma atividade avaliável nesta aula.</p>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {scoringBlocks.map(b => (
            <div key={b.id} className="flex items-center justify-between px-3 py-2.5 bg-white">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${blockTypeBadge[b.block_type] ?? 'bg-slate-100 text-slate-600'}`}>
                  {blockTypeLabel[b.block_type] ?? b.block_type}
                </span>
                <span className="text-sm text-slate-700 truncate">{b.title}</span>
              </div>
              {b.latest_score != null ? (
                <span className="ml-3 flex-shrink-0 text-sm font-semibold text-slate-700 tabular-nums">
                  {b.latest_score} pts
                </span>
              ) : b.is_completed ? (
                <span className="ml-3 flex-shrink-0 text-xs text-amber-600">Aguardando nota</span>
              ) : (
                <span className="ml-3 flex-shrink-0 text-xs text-slate-400">Não concluído</span>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between px-3 py-3 bg-slate-50">
            <div>
              <p className="text-xs font-semibold text-slate-600">Nota Final</p>
              <p className="text-xs text-slate-400">{evalLabels[evalType] ?? 'Avaliação'}</p>
            </div>
            <div className="flex items-center gap-2">
              {autoGrade != null ? (
                <span className="text-sm font-bold text-teal-700 tabular-nums">{autoGrade} pts</span>
              ) : (
                <span className="text-xs text-slate-400">{scores.length}/{scoringBlocks.length} notas atribuídas</span>
              )}
              <button
                onClick={openEdit}
                className="p-1 rounded hover:bg-slate-200 transition-colors"
                title="Ajustar nota manualmente"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>
          {block.latest_score != null && block.latest_score !== autoGrade && (
            <div className="flex items-center justify-between px-3 py-2.5 bg-teal-50 border-t border-teal-100">
              <p className="text-xs font-semibold text-teal-700">Nota Final (Reajustada)</p>
              <span className="text-sm font-bold text-teal-700 tabular-nums">{block.latest_score} pts</span>
            </div>
          )}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Ajustar Nota Final</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Pontuação</label>
              <Input
                type="number"
                step="0.1"
                placeholder="Ex: 8.5"
                value={manualScore}
                onChange={e => setManualScore(e.target.value)}
                className="text-sm"
                autoFocus
              />
            </div>
            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
                onClick={handleSave} disabled={saving || !manualScore}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface BlockCardProps {
  block: TeacherBlockDetail;
  allBlocks: TeacherBlockDetail[];
  studentId: string;
  studentName: string;
  onGraded: () => void;
}

function BlockCard({ block, allBlocks, studentId, studentName, onGraded }: BlockCardProps) {
  const [open, setOpen] = useState(false);
  const [gradeScore, setGradeScore] = useState(block.submission?.score?.toString() ?? '10');
  const [gradeFeedback, setGradeFeedback] = useState(block.submission?.feedback_text ?? '');
  const [gradeApproved, setGradeApproved] = useState<boolean>(block.submission?.is_approved ?? false);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  const Icon = blockTypeIcon[block.block_type] ?? FileText;
  const badgeColor = blockTypeBadge[block.block_type] ?? 'bg-slate-100 text-slate-700';
  const label = blockTypeLabel[block.block_type] ?? block.block_type;
  const alreadyGraded =
    block.submission !== null &&
    block.submission?.is_approved !== null &&
    block.submission?.score !== null;

  async function handleGrade() {
    if (!block.submission?.id) return;
    const scoreNum = parseFloat(gradeScore);
    if (isNaN(scoreNum)) { setGradeError('Pontuação inválida'); return; }
    setGrading(true);
    setGradeError(null);
    try {
      await teacherApi.gradeSubmission(block.submission.id, {
        score: scoreNum,
        feedback_text: gradeFeedback || undefined,
        is_approved: gradeApproved,
      });
      onGraded();
    } catch (e: unknown) {
      setGradeError(e instanceof Error ? e.message : 'Erro ao salvar nota');
    } finally {
      setGrading(false);
    }
  }

  function renderQuizResponses() {
    if (!block.submission) return <p className="text-sm text-slate-500">Nenhuma resposta registrada ainda.</p>;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {block.attempts > 0 && <span className="text-xs text-slate-500">Tentativa {block.attempts}</span>}
          <span className="text-xs text-slate-500">Enviado em {formatDate(block.submission.submitted_at)}</span>
          {block.submission.score !== null && (
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-indigo-700">
                {block.submission.score}/{block.submission.total_score} pts
              </span>
              {block.submission.is_approved !== null && (
                block.submission.is_approved
                  ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Aprovado</Badge>
                  : <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Reprovado</Badge>
              )}
            </div>
          )}
        </div>
        {block.submission.responses.length > 0 && (
          <div className="space-y-2">
            {block.submission.responses.map((r, i) => (
              <div key={r.question_id} className="flex items-start gap-2 bg-slate-50 rounded-lg p-2.5">
                {r.is_correct
                  ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700">Q{i + 1}: {r.statement}</p>
                  {r.selected_option_text && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Resposta:{' '}
                      <span className={r.is_correct ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                        {r.selected_option_text}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderAssignmentGradeForm() {
    const sd = block.submission?.submission_data as Record<string, unknown> | null | undefined;
    const fileUrl = typeof sd?.file_url === 'string' ? sd.file_url : null;
    const textContent = typeof sd?.text_content === 'string' ? sd.text_content : null;
    const linkUrl = typeof sd?.link_url === 'string' ? sd.link_url : null;

    return (
      <div className="space-y-4">
        {block.submission ? (
          <>
            <div>
              <p className="text-xs text-slate-500 mb-2">
                Enviado em {formatDate(block.submission.submitted_at)} — Tentativa {block.attempts}
              </p>
              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                {fileUrl && (
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
                    <FileText className="w-4 h-4" />Ver arquivo enviado
                  </a>
                )}
                {textContent && (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{textContent}</p>
                )}
                {linkUrl && (
                  <a href={linkUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
                    <ExternalLink className="w-4 h-4" />{linkUrl}
                  </a>
                )}
                {!fileUrl && !textContent && !linkUrl && (
                  <p className="text-sm text-slate-500">Entrega sem conteúdo visível.</p>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">Atribuir Nota</p>
              {alreadyGraded && (
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                  <Award className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-indigo-700">
                    Nota atual: {block.submission.score} pts
                  </span>
                  {block.submission.is_approved
                    ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Aprovado</Badge>
                    : <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Reprovado</Badge>}
                </div>
              )}
              <div className="flex items-end gap-3">
                <div className="w-32">
                  <label className="text-xs text-slate-500 mb-1 block">Pontuação</label>
                  <Input
                    type="number"
                    placeholder="Ex: 85"
                    value={gradeScore}
                    onChange={(e) => setGradeScore(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Resultado</label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      type="button"
                      variant={gradeApproved ? 'default' : 'outline'}
                      className={`h-8 ${gradeApproved ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                      onClick={() => setGradeApproved(true)}
                    >
                      Aprovado
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant={!gradeApproved ? 'default' : 'outline'}
                      className={`h-8 ${!gradeApproved ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                      onClick={() => setGradeApproved(false)}
                    >
                      Reprovado
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Feedback (opcional)</label>
                <Textarea
                  placeholder="Deixe um comentário para o estudante..."
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  className="text-sm min-h-[60px]"
                />
              </div>
              {gradeError && <p className="text-xs text-red-600">{gradeError}</p>}
              <Button
                size="sm"
                type="button"
                onClick={handleGrade}
                disabled={grading || !gradeScore}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {grading ? 'Salvando...' : alreadyGraded ? 'Atualizar Nota' : 'Validar Entrega'}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">Nenhuma entrega realizada ainda.</p>
        )}
      </div>
    );
  }

  function renderContent() {
    if (block.block_type === 'content') {
      const ci = block.content_info;
      const ct = ci?.content_type ?? '';
      const url = ci?.url ?? null;
      const bodyText = ci?.body_text ?? null;
      const isPdf = !!url && (url.toLowerCase().includes('.pdf') || ct === 'pdf');
      const videoEmbed = ct === 'video' && url ? getLinkEmbed(url) : null;
      const externalEmbed = (ct === 'external' || ct === 'link') && url ? getLinkEmbed(url) : null;

      return (
        <div className="space-y-3">
          {ct === 'text' && bodyText && (
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-100">
              {bodyText}
            </div>
          )}

          {ct === 'video' && url && (
            <>
              {videoEmbed && <LinkEmbed url={url} />}
              <div className="flex justify-end">
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600">
                  <ExternalLink className="w-3.5 h-3.5" />Abrir em nova aba
                </a>
              </div>
            </>
          )}

          {(ct === 'file' || ct === 'pdf') && url && (
            <div className="space-y-2">
              {isPdf && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <iframe
                    src={`https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(url)}`}
                    className="w-full"
                    style={{ height: 360 }}
                    title="Visualizador de PDF"
                  />
                </div>
              )}
              <div className="flex justify-end">
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600">
                  <FileText className="w-3.5 h-3.5" />Baixar material
                </a>
              </div>
            </div>
          )}

          {(ct === 'external' || ct === 'link') && url && (
            <>
              {externalEmbed && <LinkEmbed url={url} />}
              <div className="flex justify-end">
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600">
                  <ExternalLink className="w-3.5 h-3.5" />Acessar link externo
                </a>
              </div>
            </>
          )}

          {block.is_completed && block.completed_at ? (
            <p className="text-sm text-green-700 pt-1">
              O estudante {studentName} concluiu a visualização desse bloco em {formatDate(block.completed_at)}.
            </p>
          ) : (
            <p className="text-sm text-slate-500 pt-1">Ainda não visualizado.</p>
          )}
        </div>
      );
    }

    if (block.block_type === 'activity' || block.block_type === 'exam') {
      if (block.activity_type === 'quiz') return renderQuizResponses();
      if (block.activity_type === 'assignment' || block.activity_type === 'link') return renderAssignmentGradeForm();
      return (
        <p className="text-sm text-slate-500">
          {block.is_completed ? `Concluído em ${formatDate(block.completed_at)}` : 'Ainda não concluído.'}
        </p>
      );
    }

    if (block.block_type === 'interaction') {
      const minMsgs = block.interaction_info?.min_messages ?? 1;
      const pct = block.is_completed ? 100 : 0;
      const done = block.is_completed ? minMsgs : 0;
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Mensagens enviadas</span>
              <span className="font-medium">{done}/{minMsgs}</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
          {block.is_completed ? (
            <p className="text-sm text-green-700">
              O estudante {studentName} completou a interação em {formatDate(block.completed_at)}.
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              Aguardando participação (mínimo {minMsgs} {minMsgs === 1 ? 'mensagem' : 'mensagens'}).
            </p>
          )}
        </div>
      );
    }

    if (block.block_type === 'consolidation') {
      if (block.consolidation_type === 'quiz') return renderQuizResponses();
      if (block.consolidation_type === 'summary') {
        const ci = block.content_info;
        return (
          <div className="space-y-3">
            {ci?.url && (
              <a href={ci.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
                <FileText className="w-4 h-4" />Acessar material de síntese
              </a>
            )}
            {block.is_completed ? (
              <p className="text-sm text-green-700">
                O estudante {studentName} concluiu esse bloco em {formatDate(block.completed_at)}.
              </p>
            ) : (
              <p className="text-sm text-slate-500">Ainda não concluído.</p>
            )}
          </div>
        );
      }
      return (
        <p className="text-sm">
          {block.is_completed
            ? <span className="text-green-700">O estudante {studentName} concluiu esse bloco em {formatDate(block.completed_at)}.</span>
            : <span className="text-slate-500">Ainda não concluído.</span>}
        </p>
      );
    }

    if (block.block_type === 'evaluation') {
      return <EvaluationBlockContent block={block} allBlocks={allBlocks} studentId={studentId} onGraded={onGraded} />;
    }

    return (
      <p className="text-sm text-slate-500">
        {block.is_completed ? `Concluído em ${formatDate(block.completed_at)}` : 'Ainda não concluído.'}
      </p>
    );
  }

  return (
    <Card className={`transition-colors ${block.is_completed ? 'border-green-200' : 'border-slate-200'}`}>
      <button
        type="button"
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 rounded-t-lg transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 flex items-center gap-1 ${badgeColor}`}>
          <Icon className="w-3 h-3" />{label}
        </span>
        <span className="flex-1 text-sm font-medium text-slate-900 truncate">{block.title}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {block.is_completed
            ? <CheckCircle className="w-4 h-4 text-green-600" />
            : <div className="w-4 h-4 border-2 border-slate-300 rounded-full" />}
          {open
            ? <ChevronDown className="w-4 h-4 text-slate-400" />
            : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {open && (
        <CardContent className="pt-0 pb-4 px-4 border-t border-slate-100">
          <div className="pt-3">{renderContent()}</div>
        </CardContent>
      )}
    </Card>
  );
}

export default function StudentProgressPage() {
  const params = useParams();
  const lessonId = params.lessonId as string;
  const studentId = params.studentId as string;

  const [data, setData] = useState<StudentProgressDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    teacherApi.getStudentProgress(lessonId, studentId)
      .then(setData)
      .catch(() => setError('Não foi possível carregar os dados do estudante.'))
      .finally(() => setLoading(false));
  }, [lessonId, studentId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-red-500">{error ?? 'Erro desconhecido.'}</p>
    </div>
  );

  const {
    student, unit, blocks, progress,
    completed_blocks, countable_blocks, status,
    last_access, started_at, completed_at,
  } = data;
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;
  const initials = student.name.split(' ').map(n => n[0]).slice(0, 2).join('');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href={`/lessons/${lessonId}/monitoring`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />Voltar ao Monitoramento
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Detalhe do Estudante</h1>
            <p className="text-sm text-slate-500">{unit.title}</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-semibold text-slate-900">{student.name}</h2>
                  <Badge variant="outline" className={statusInfo.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />{statusInfo.label}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">{student.email}</p>
              </div>
              <div className="text-right space-y-1 min-w-[140px]">
                <p className="text-sm text-slate-500">Progresso geral</p>
                <p className="text-3xl font-semibold text-indigo-600">{progress}%</p>
                <p className="text-xs text-slate-500">{completed_blocks}/{countable_blocks} blocos</p>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-slate-600">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Iniciado em</p>
                <p>{formatDate(started_at)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Último acesso</p>
                <p>{formatDate(last_access)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Concluído em</p>
                <p>{formatDate(completed_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h3 className="text-base font-semibold text-slate-800 mb-3">Blocos da Aula</h3>
          <div className="space-y-2">
            {blocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                allBlocks={blocks}
                studentId={studentId}
                studentName={student.name}
                onGraded={load}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
