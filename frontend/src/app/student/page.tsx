'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { studentApi, coursesApi, StudentCourse } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Users, Plus, Loader2, GraduationCap, Search } from 'lucide-react';

function JoinSection({ onJoined }: { onJoined: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true); setError(null); setSuccess(null);
    try {
      await coursesApi.joinByCode(trimmed);
      setSuccess('Matriculado com sucesso!');
      setCode('');
      setTimeout(() => { setSuccess(null); onJoined(); }, 1500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao entrar no curso';
      setError(msg === 'Already enrolled' ? 'Você já está matriculado neste curso.' : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-medium text-slate-800">Entrar em um curso</p>
            <p className="text-sm text-slate-500 mt-0.5">Insira o código de convite fornecido pelo seu professor.</p>
          </div>
          <div className="flex flex-col gap-2 sm:min-w-72">
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="Código (ex: AB1C23)"
                maxLength={8}
                className="font-mono tracking-widest uppercase"
              />
              <Button
                onClick={handleJoin}
                disabled={loading || !code.trim()}
                className="bg-violet-600 hover:bg-violet-700 flex-shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Entrar
              </Button>
            </div>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            {success && <p className="text-green-600 text-xs font-medium">{success}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudentDashboard() {
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    try {
      setCourses(await studentApi.getCourses());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Seus Cursos</h1>
          <p className="text-sm text-slate-600 mt-1">Acompanhe seu progresso e acesse suas aulas</p>
        </div>
      </div>

      <JoinSection onJoined={load} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Cursos Matriculados</p>
                <p className="text-3xl font-semibold text-slate-900 mt-1">{courses.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Cursos Concluídos</p>
                <p className="text-3xl font-semibold text-slate-900 mt-1">
                  {courses.filter(c => c.progress === 100).length}
                </p>
              </div>
              <GraduationCap className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Progresso Médio</p>
                <p className="text-3xl font-semibold text-slate-900 mt-1">
                  {courses.length > 0
                    ? Math.round(courses.reduce((s, c) => s + c.progress, 0) / courses.length)
                    : 0}%
                </p>
              </div>
              <Users className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {courses.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
        </div>
      )}

      {!loading && filtered.length === 0 && courses.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-medium text-slate-900 mb-2">Nenhum curso ainda</h3>
            <p className="text-sm text-slate-600">Use o código de convite acima para entrar no seu primeiro curso.</p>
          </CardContent>
        </Card>
      )}

      {!loading && filtered.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Todos os Cursos ({filtered.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(course => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {course.category && (
                        <Badge variant="outline" className="mb-2 bg-green-50 text-green-700 border-green-200">
                          {course.category}
                        </Badge>
                      )}
                      <CardTitle className="text-lg mb-1">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span><BookOpen className="w-4 h-4 inline mr-1" />{course.total_units} aulas</span>
                      <span className="text-slate-500 text-xs">{course.teacher.name}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Progresso</span>
                        <span className="font-medium text-teal-700">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Link href={`/student/courses/${course.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">Ver Curso</Button>
                      </Link>
                    </div>
                    <p className="text-xs text-slate-500">
                      Matriculado em {new Date(course.enrolled_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
