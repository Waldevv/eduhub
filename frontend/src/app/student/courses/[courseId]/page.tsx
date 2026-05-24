'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { studentApi, StudentCourseDetail, StudentUnit } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, BookOpen, CheckCircle2, Clock, Loader2, GraduationCap,
  CalendarDays, CalendarRange, ServerIcon, ExternalLink, KeyRound,
  Copy, Check as CheckIcon, Lock,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function UnitRow({ unit, index, courseId }: { unit: StudentUnit; index: number; courseId: string }) {
  const isLocked = unit.is_locked;
  return (
    <div className="flex items-start gap-4">
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isLocked ? 'bg-slate-200 text-slate-400' : 'bg-violet-500 text-white'}`}>
        {isLocked ? <Lock className="w-4 h-4" /> : index + 1}
      </div>
      <div className={`flex-1 border rounded-lg p-4 transition-all ${isLocked ? 'border-slate-200 opacity-60' : 'border-slate-200 hover:border-teal-200 hover:shadow-sm'}`}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800">{unit.title}</h3>
              {unit.is_complete && (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />Concluída
                </Badge>
              )}
              {isLocked && (
                <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-xs">
                  <Lock className="w-3 h-3 mr-1" />Bloqueada
                </Badge>
              )}
            </div>
            {unit.description && (
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{unit.description}</p>
            )}
          </div>
        </div>
        <div className="mb-3 space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{unit.completed_blocks}/{unit.countable_blocks} blocos concluídos</span>
            <span className={`font-medium ${unit.is_complete ? 'text-green-600' : 'text-teal-700'}`}>{unit.progress}%</span>
          </div>
          <Progress value={unit.progress} className="h-1.5" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            <BookOpen className="w-3.5 h-3.5 inline mr-1" />
            {unit.total_blocks} bloco{unit.total_blocks !== 1 ? 's' : ''}
          </span>
          {isLocked ? (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3" />Conclua a aula anterior
            </span>
          ) : (
            <Link href={`/student/courses/${courseId}/lessons/${unit.id}`}>
              <Button variant="outline" size="sm">Ver Aula</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<StudentCourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    studentApi.getCourse(courseId)
      .then(setCourse)
      .catch(() => setError('Não foi possível carregar o curso.'))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
    </div>
  );

  if (error || !course) return (
    <div className="text-center py-16 text-slate-500">
      {error ?? 'Curso não encontrado.'}
      <div className="mt-4">
        <Link href="/student" className="text-teal-600 hover:underline text-sm">
          Voltar aos meus cursos
        </Link>
      </div>
    </div>
  );

  const completedUnits = course.units.filter(u => u.is_complete).length;
  const formatDate = (d: string | null) =>
    d ? format(new Date(d), "dd 'de' MMM 'de' yyyy", { locale: ptBR }) : '—';

  return (
    <div>
      <Link
        href="/student"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Meus Cursos
      </Link>

      <Card className="mb-6">
        <CardContent className="p-8">
          <div className="flex items-start gap-3 mb-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
            {course.category && (
              <Badge className="bg-teal-100 text-teal-800">{course.category}</Badge>
            )}
          </div>

          {course.description && (
            <p className="text-slate-600 mb-4">{course.description}</p>
          )}

          {course.objectives && (
            <div className="mb-5">
              <h3 className="font-semibold text-sm text-slate-700 mb-1">Objetivos de Aprendizagem</h3>
              <p className="text-sm text-slate-600 whitespace-pre-line">{course.objectives}</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-teal-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-teal-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{course.units.length}</p>
                <p className="text-xs text-slate-500">Aulas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-green-100 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{completedUnits}</p>
                <p className="text-xs text-slate-500">Concluídas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-blue-100 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{formatDate(course.start_date)}</p>
                <p className="text-xs text-slate-500">Início</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-amber-100 flex items-center justify-center">
                <CalendarRange className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{formatDate(course.end_date)}</p>
                <p className="text-xs text-slate-500">Término</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{completedUnits} de {course.units.length} aulas concluídas</span>
              <span className="font-semibold text-teal-700">{course.progress}%</span>
            </div>
            <Progress value={course.progress} className="h-2" />
          </div>

          <p className="text-xs text-slate-400 mt-4">
            Professor: <span className="text-slate-600">{course.teacher.name}</span>
          </p>
        </CardContent>
      </Card>

      {course.invite_code && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-teal-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Código da Turma</p>
                <p className="text-xs text-slate-500">Compartilhe com outros estudantes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              <span className="text-lg font-bold text-teal-700 tracking-widest font-mono">
                {course.invite_code}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(course.invite_code!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="ml-auto text-slate-400 hover:text-teal-600 transition-colors"
              >
                {copied
                  ? <CheckIcon className="w-4 h-4 text-green-600" />
                  : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {course.discord_server?.is_active && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <ServerIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Servidor Discord</p>
                  <p className="text-sm text-slate-500">{course.discord_server.server_name}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://discord.com/channels/${course.discord_server.discord_guild_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Entrar no Servidor
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Aulas do Curso ({course.units.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {course.units.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600">Nenhuma aula publicada ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {course.units.map((unit, i) => (
                <UnitRow key={unit.id} unit={unit} index={i} courseId={courseId} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
