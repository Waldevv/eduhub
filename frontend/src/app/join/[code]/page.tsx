'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, CalendarDays, LogIn, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { coursesApi, type CoursePublic } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function JoinCoursePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [course, setCourse] = useState<CoursePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    coursesApi.getByInviteCode(code)
      .then(setCourse)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [code]);

  const handleJoin = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      sessionStorage.setItem('join_redirect', `/join/${code}`);
      router.push('/login');
      return;
    }
    setJoining(true);
    setError(null);
    try {
      await coursesApi.joinByCode(code);
      setJoined(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar no curso');
    } finally {
      setJoining(false);
    }
  };

  const formatDate = (d: string | null) =>
    d ? format(new Date(d), "dd 'de' MMM yyyy", { locale: ptBR }) : null;

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Código inválido</h2>
          <p className="text-slate-500 text-sm">O código <span className="font-bold text-slate-700">{code}</span> não corresponde a nenhum curso.</p>
        </CardContent>
      </Card>
    </div>
  );

  if (!course) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-teal-700" />
            </div>
            <p className="text-xs font-medium text-teal-600 uppercase tracking-wider mb-2">Convite para o curso</p>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{course.title}</h1>
            {course.category && (
              <Badge className="bg-teal-100 text-teal-800">{course.category}</Badge>
            )}
          </div>

          {course.description && (
            <p className="text-slate-600 text-sm text-center mb-6">{course.description}</p>
          )}

          <div className="flex justify-center gap-6 mb-6 text-sm text-slate-500">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{course.enrollments} estudante{course.enrollments !== 1 ? 's' : ''}</span>
            </div>
            {course.start_date && (
              <div className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />
                <span>{formatDate(course.start_date)}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-3 mb-6">
            {course.teacher.avatar ? (
              <img src={course.teacher.avatar} alt={course.teacher.name} className="w-9 h-9 rounded-full" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-medium">
                {course.teacher.name[0]}
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500">Professor</p>
              <p className="text-sm font-medium text-slate-800">{course.teacher.name}</p>
            </div>
          </div>

          {joined ? (
            <div className="text-center">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-slate-800 mb-1">Você entrou no curso!</p>
              <p className="text-sm text-slate-500 mb-4">Em breve você poderá acessar as aulas.</p>
              <Button className="bg-teal-700 hover:bg-teal-800 w-full" onClick={() => router.push('/student')}>
                Ver Meus Cursos
              </Button>
            </div>
          ) : (
            <>
              {error && (
                <p className="text-sm text-red-600 text-center mb-3">{error}</p>
              )}
              <Button
                className="bg-teal-700 hover:bg-teal-800 w-full"
                onClick={handleJoin}
                disabled={joining}
              >
                <LogIn className="w-4 h-4 mr-2" />
                {joining ? 'Entrando...' : 'Entrar no Curso'}
              </Button>
              <p className="text-xs text-slate-400 text-center mt-3">
                É necessário fazer login com Discord para entrar no curso.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
