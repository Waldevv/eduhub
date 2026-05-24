'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { BookOpen, Users, CalendarDays, Edit, Trash2, Plus, UserPlus, CalendarRange, GripVertical, ServerIcon, Link2, Link2Off, Copy, Check as CheckIcon, Loader2 } from 'lucide-react';
import { LessonCard } from '@/modules/courses/components/LessonCard';
import { UnitModal } from '@/modules/courses/components/UnitModal';
import { EditCourseModal } from '@/modules/courses/components/EditCourseModal';
import { DeleteConfirmationModal } from '@/modules/courses/components/DeleteConfirmationModal';
import { coursesApi, unitsApi, discordApi, type Course, type Unit, type DiscordServer } from '@/lib/api';
import { LinkDiscordServerModal } from '@/modules/courses/components/LinkDiscordServerModal';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const DRAG_TYPE = 'LESSON';

interface DraggableLessonRowProps {
  unit: Unit;
  index: number;
  courseId: string;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onDragEnd: () => void;
  onEdit: (unit: Unit) => void;
  onDelete: (unit: Unit) => void;
  onPublish: (unit: Unit) => void;
  publishing: boolean;
}

function DraggableLessonRow({ unit, index, courseId, onMove, onDragEnd, onEdit, onDelete, onPublish, publishing }: DraggableLessonRowProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: DRAG_TYPE,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: onDragEnd,
  });

  const [, drop] = useDrop({
    accept: DRAG_TYPE,
    hover(item: { index: number }) {
      if (item.index === index) return;
      onMove(item.index, index);
      item.index = index;
    },
  });

  drop(dragPreview(ref));

  return (
    <div ref={ref} className={`flex items-start gap-4 ${isDragging ? 'opacity-40' : ''}`}>
      <div
        ref={drag as unknown as React.Ref<HTMLDivElement>}
        className="flex-shrink-0 flex items-center self-stretch cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-500 text-white flex items-center justify-center font-bold">
        {index + 1}
      </div>
      <div className="flex-1">
        <LessonCard
          courseId={courseId}
          unit={unit}
          index={index + 1}
          onEdit={onEdit}
          onDelete={onDelete}
          onPublish={onPublish}
          publishing={publishing}
        />
      </div>
    </div>
  );
}

export default function CourseDetails() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [discordServer, setDiscordServer] = useState<DiscordServer | null>(null);
  const [botMissing, setBotMissing] = useState(false);
  const [linkDiscordOpen, setLinkDiscordOpen] = useState(false);
  const [publishingUnitId, setPublishingUnitId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [courseData, unitsData] = await Promise.all([
        coursesApi.get(courseId),
        unitsApi.listByCourse(courseId),
      ]);
      setCourse(courseData);
      setUnits(unitsData);
      discordApi.getServer(courseId)
        .then(async (server) => {
          setDiscordServer(server);
          const { inGuild } = await discordApi.checkBotStatus(server.discord_guild_id);
          setBotMissing(!inGuild);
        })
        .catch(() => { setDiscordServer(null); setBotMissing(false); });
    } catch {
      setError('Não foi possível carregar o curso.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const handlePublishLesson = async (unit: Unit) => {
    setPublishingUnitId(unit.id);
    try {
      await discordApi.publishLesson(unit.id).catch(() => {});
      await unitsApi.update(unit.id, { is_published: true, status: 'published' });
      fetchData();
    } finally {
      setPublishingUnitId(null);
    }
  };

  const handleUnlinkServer = async () => {
    await discordApi.unlinkServer(courseId).catch(() => {});
    setDiscordServer(null);
  };

  const handleRegenerateInvite = async () => {
    if (!discordServer) return;
    setGeneratingInvite(true);
    try {
      const { discord_invite_url } = await discordApi.regenerateInvite(courseId);
      setDiscordServer(prev => prev ? { ...prev, discord_invite_url } : prev);
    } catch {
    } finally {
      setGeneratingInvite(false);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEditCourse = async (formData: {
    name: string; category: string; description: string;
    learningObjectives: string; start_date: string; end_date: string;
  }) => {
    if (!course) return;
    await coursesApi.update(course.id, {
      title: formData.name,
      description: formData.description,
      category: formData.category,
      objectives: formData.learningObjectives,
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
    });
    setEditCourseOpen(false);
    fetchData();
  };

  const handleDeleteCourse = async () => {
    if (!course) return;
    await coursesApi.delete(course.id);
    router.push('/courses');
  };

  const handleCreateUnit = async (data: { title: string; description: string; pedagogical_guidance: string }) => {
    await unitsApi.create(courseId, data);
    fetchData();
  };

  const handleEditUnit = async (data: { title: string; description: string; pedagogical_guidance: string }) => {
    if (!editingUnit) return;
    await unitsApi.update(editingUnit.id, data);
    setEditingUnit(null);
    fetchData();
  };

  const handleDeleteUnit = async () => {
    if (!deletingUnit) return;
    await unitsApi.delete(deletingUnit.id);
    setDeletingUnit(null);
    fetchData();
  };

  const handleMove = useCallback((dragIndex: number, hoverIndex: number) => {
    setUnits((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, moved);
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(async () => {
    await unitsApi.reorder(
      units.map((u, i) => ({ id: u.id, sequence_order: i + 1 }))
    ).catch(() => {});
  }, [units]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), "dd 'de' MMM 'de' yyyy", { locale: ptBR });
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
    </div>
  );

  if (error || !course) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-600 font-medium mb-4">{error ?? 'Curso não encontrado'}</p>
        <Button variant="outline" asChild><Link href="/courses">Voltar aos Cursos</Link></Button>
      </div>
    </div>
  );

  return (
    <DndProvider backend={HTML5Backend}>
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link href="/courses">Cursos</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{course.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <h1 className="text-3xl font-bold text-slate-900">{course.title}</h1>
                  {course.category && (
                    <Badge className="bg-teal-100 text-teal-800">{course.category}</Badge>
                  )}
                </div>
                {course.description && (
                  <p className="text-slate-600 mb-4">{course.description}</p>
                )}
                {course.objectives && (
                  <div>
                    <h3 className="font-semibold text-sm text-slate-700 mb-1">Objetivos de Aprendizagem</h3>
                    <p className="text-sm text-slate-600 whitespace-pre-line">{course.objectives}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-teal-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{units.length}</p>
                  <p className="text-xs text-slate-500">Aulas</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-green-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{course._count.enrollments}</p>
                  <p className="text-xs text-slate-500">Alunos</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{formatDate(course.start_date) ?? '—'}</p>
                  <p className="text-xs text-slate-500">Início</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-amber-100 flex items-center justify-center">
                  <CalendarRange className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{formatDate(course.end_date) ?? '—'}</p>
                  <p className="text-xs text-slate-500">Fim</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-5">
              Criado em {formatDate(course.created_at)}
            </p>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setEditCourseOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />Editar Curso
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/courses/${courseId}/students`}>
                  <UserPlus className="w-4 h-4 mr-2" />Gerenciar Alunos
                </Link>
              </Button>
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 ml-auto"
                onClick={() => setDeleteCourseOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />Excluir Curso
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={`mb-8 ${botMissing ? 'border-red-300' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${botMissing ? 'bg-red-100' : 'bg-indigo-100'}`}>
                  <ServerIcon className={`w-5 h-5 ${botMissing ? 'text-red-600' : 'text-indigo-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Servidor Discord</p>
                  {discordServer ? (
                    <p className="text-sm text-slate-500">{discordServer.server_name}</p>
                  ) : (
                    <p className="text-sm text-slate-400">Nenhum servidor vinculado</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {discordServer && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleRegenerateInvite} disabled={generatingInvite}>
                      {generatingInvite ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                      {discordServer.discord_invite_url ? 'Regerar Link' : 'Gerar Link de Entrada'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleUnlinkServer}
                      className="text-red-600 border-red-200 hover:bg-red-50">
                      <Link2Off className="w-4 h-4 mr-2" />Desvincular
                    </Button>
                  </>
                )}
                {!discordServer && (
                  <Button variant="outline" size="sm" onClick={() => setLinkDiscordOpen(true)}>
                    <Link2 className="w-4 h-4 mr-2" />Vincular Servidor
                  </Button>
                )}
              </div>
            </div>

            {discordServer?.discord_invite_url && !botMissing && (
              <div className="mt-4 flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
                <span className="text-xs text-slate-500">Link de entrada:</span>
                <span className="text-sm font-mono text-indigo-700 flex-1 truncate">{discordServer.discord_invite_url}</span>
                <button onClick={() => navigator.clipboard.writeText(discordServer.discord_invite_url!)}
                  className="text-slate-400 hover:text-indigo-600 transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}

            {botMissing && discordServer && (
              <div className="mt-4 flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <div className="flex items-center gap-2 text-red-700 text-sm">
                  <span className="font-semibold">⚠ Bot ausente do servidor.</span>
                  <span className="text-red-600">As funcionalidades de interação estão desativadas.</span>
                </div>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white ml-4 flex-shrink-0"
                  onClick={() => setLinkDiscordOpen(true)}>
                  Reabilitar Bot
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {course.invite_code && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Convite para Alunos</p>
                  <p className="text-xs text-slate-500">Compartilhe o código ou link abaixo</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2 flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                  <span className="text-xs text-slate-500 font-medium">Código:</span>
                  <span className="text-lg font-bold text-teal-700 tracking-widest">{course.invite_code}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(course.invite_code!);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="ml-auto text-slate-400 hover:text-teal-600 transition-colors"
                    title="Copiar código"
                  >
                    {copiedCode ? <CheckIcon className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                  <span className="text-xs text-slate-500 font-medium">Link:</span>
                  <span className="text-sm text-slate-700 truncate flex-1">/join/{course.invite_code}</span>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/join/${course.invite_code}`;
                      navigator.clipboard.writeText(url);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="ml-auto text-slate-400 hover:text-teal-600 transition-colors"
                    title="Copiar link"
                  >
                    {copiedLink ? <CheckIcon className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Aulas do Curso ({units.length})</span>
              <Button onClick={() => setUnitModalOpen(true)} className="bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4 mr-2" />Adicionar Aula
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {units.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600">Este curso ainda não possui aulas cadastradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {units.map((unit, index) => (
                  <DraggableLessonRow
                    key={unit.id}
                    unit={unit}
                    index={index}
                    courseId={courseId}
                    onMove={handleMove}
                    onDragEnd={handleDragEnd}
                    onEdit={(u) => setEditingUnit(u)}
                    onDelete={(u) => setDeletingUnit(u)}
                    onPublish={handlePublishLesson}
                    publishing={publishingUnitId === unit.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UnitModal
        open={unitModalOpen}
        onOpenChange={setUnitModalOpen}
        onSave={handleCreateUnit}
      />

      {editingUnit && (
        <UnitModal
          open={true}
          onOpenChange={(open) => !open && setEditingUnit(null)}
          unit={editingUnit}
          onSave={handleEditUnit}
        />
      )}

      {deletingUnit && (
        <DeleteConfirmationModal
          open={true}
          onOpenChange={(open) => !open && setDeletingUnit(null)}
          onConfirm={handleDeleteUnit}
          title="Excluir Aula"
          description="Você está prestes a excluir esta aula permanentemente."
          itemName={deletingUnit.title}
          warningMessage="Todos os blocos configurados nesta aula também serão removidos."
        />
      )}

      {course && (
        <EditCourseModal
          open={editCourseOpen}
          onOpenChange={setEditCourseOpen}
          course={{
            id: course.id,
            name: course.title,
            category: course.category ?? '',
            description: course.description ?? '',
            learningObjectives: course.objectives ?? '',
            start_date: course.start_date,
            end_date: course.end_date,
          }}
          onSave={handleEditCourse}
        />
      )}

      <DeleteConfirmationModal
        open={deleteCourseOpen}
        onOpenChange={setDeleteCourseOpen}
        onConfirm={handleDeleteCourse}
        title="Excluir Curso"
        description="Você está prestes a excluir este curso permanentemente."
        itemName={course.title}
        warningMessage="Todas as aulas e blocos vinculados também serão removidos."
      />
    </div>

    {linkDiscordOpen && (
      <LinkDiscordServerModal
        courseId={courseId}
        onLinked={() => { setLinkDiscordOpen(false); fetchData(); }}
        onClose={() => setLinkDiscordOpen(false)}
        preselectedGuild={botMissing && discordServer ? {
          id: discordServer.discord_guild_id,
          name: discordServer.server_name,
          icon: null,
        } : undefined}
      />
    )}
    </DndProvider>
  );
}
