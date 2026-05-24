'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Search, AlertCircle, CheckCircle, Clock,
  MessageSquare, TrendingUp, TrendingDown, Filter, Loader2,
} from 'lucide-react';
import { teacherApi, UnitProgressData } from '@/lib/api';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed:   { label: 'Concluído',    color: 'bg-green-100 text-green-700 border-green-200',   icon: CheckCircle },
  in_progress: { label: 'Em Progresso', color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: Clock },
  at_risk:     { label: 'Em Risco',     color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertCircle },
  not_started: { label: 'Não Iniciado', color: 'bg-slate-100 text-slate-700 border-slate-200',  icon: AlertCircle },
};

const blockTypeColor: Record<string, string> = {
  content:      'bg-blue-100 text-blue-700',
  activity:     'bg-green-100 text-green-700',
  exam:         'bg-red-100 text-red-700',
  interaction:  'bg-purple-100 text-purple-700',
  consolidation:'bg-orange-100 text-orange-700',
  evaluation:   'bg-slate-100 text-slate-700',
};

function formatRelativeDate(isoString: string | null): string {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days} dia${days !== 1 ? 's' : ''} atrás`;
}

export default function Monitoring() {
  const params = useParams();
  const lessonId = params.lessonId as string;

  const [data, setData] = useState<UnitProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    teacherApi.getUnitProgress(lessonId)
      .then(setData)
      .catch(() => setError('Não foi possível carregar os dados de monitoramento.'))
      .finally(() => setLoading(false));
  }, [lessonId]);

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

  const { unit, blocks, students } = data;

  const filtered = students.filter((s) => {
    const matchName = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchName && matchStatus;
  });

  const stats = {
    total:       students.length,
    completed:   students.filter(s => s.status === 'completed').length,
    inProgress:  students.filter(s => s.status === 'in_progress').length,
    atRisk:      students.filter(s => s.status === 'at_risk' || s.status === 'not_started').length,
    avgProgress: students.length > 0
      ? Math.round(students.reduce((acc, s) => acc + s.progress, 0) / students.length)
      : 0,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href={`/courses/${unit.course_id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />Voltar ao Curso
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Monitoramento — {unit.title}</h1>
            <p className="text-sm text-slate-600 mt-1">Progresso e participação individual dos estudantes</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600">Total</p>
              <p className="text-3xl font-semibold text-slate-900 mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600">Concluíram</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-semibold text-green-600 mt-1">{stats.completed}</p>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600">Em Progresso</p>
              <p className="text-3xl font-semibold text-blue-600 mt-1">{stats.inProgress}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600">Em Risco</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-semibold text-orange-600 mt-1">{stats.atRisk}</p>
                <TrendingDown className="w-5 h-5 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600">Progresso Médio</p>
              <p className="text-3xl font-semibold text-indigo-600 mt-1">{stats.avgProgress}%</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome do estudante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="at_risk">Em Risco</SelectItem>
                  <SelectItem value="not_started">Não Iniciado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estudantes ({filtered.length})</CardTitle>
            <p className="text-sm text-slate-600">Clique em "Ver Detalhes" para visualizar as entregas</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white z-10 min-w-[180px]">Estudante</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                    <TableHead className="min-w-[140px]">Progresso</TableHead>
                    {blocks.map((block) => (
                      <TableHead key={block.id} className="text-center min-w-[110px]">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${blockTypeColor[block.block_type] ?? 'bg-slate-100 text-slate-700'}`}
                          >
                            {block.block_type === 'content' ? 'Conteúdo'
                              : block.block_type === 'activity' ? 'Atividade'
                              : block.block_type === 'exam' ? 'Exame'
                              : block.block_type === 'interaction' ? 'Interação'
                              : block.block_type === 'consolidation' ? 'Consolidação'
                              : 'Avaliação'}
                          </span>
                          <span className="text-xs text-slate-600 max-w-[100px] truncate" title={block.title}>
                            {block.title}
                          </span>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="min-w-[110px]">Último Acesso</TableHead>
                    <TableHead className="sticky right-0 bg-white z-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((student) => {
                    const statusInfo = statusConfig[student.status];
                    const StatusIcon = statusInfo.icon;
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                                {student.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate max-w-[130px]">{student.name}</p>
                              <p className="text-xs text-slate-500 truncate max-w-[130px]">{student.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusInfo.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[120px]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">{student.completed_blocks}/{student.countable_blocks}</span>
                              <span className="font-medium">{student.progress}%</span>
                            </div>
                            <Progress value={student.progress} className="h-1.5" />
                          </div>
                        </TableCell>
                        {blocks.map((block) => (
                          <TableCell key={block.id} className="text-center">
                            {student.block_completions[block.id]
                              ? <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                              : <div className="w-5 h-5 border-2 border-slate-300 rounded-full mx-auto" />}
                          </TableCell>
                        ))}
                        <TableCell>
                          <span className="text-xs text-slate-600 whitespace-nowrap">
                            {formatRelativeDate(student.last_access)}
                          </span>
                        </TableCell>
                        <TableCell className="sticky right-0 bg-white z-10">
                          <Link href={`/lessons/${lessonId}/students/${student.id}`}>
                            <Button variant="ghost" size="sm">Ver Detalhes</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={blocks.length + 5} className="text-center py-10 text-slate-500">
                        Nenhum estudante encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />Estudantes em Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-800">
                {stats.atRisk} estudante{stats.atRisk !== 1 ? 's' : ''} {stats.atRisk !== 1 ? 'estão' : 'está'} com baixo progresso ou sem acessar há mais de 2 dias.
              </p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />Desempenho Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-800">
                {stats.completed} estudante{stats.completed !== 1 ? 's já concluíram' : ' já concluiu'} a aula.
                Progresso médio de {stats.avgProgress}%.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
