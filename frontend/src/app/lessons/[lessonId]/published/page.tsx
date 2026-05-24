'use client';

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, FileText, CheckSquare, MessageSquare, Target,
  Lock, Unlock, Users, Eye, BarChart3, ExternalLink,
} from "lucide-react";

const mockLesson = {
  title: 'Introdução às Variáveis em Python',
  description: 'Aprenda os conceitos fundamentais de variáveis, tipos de dados e como utilizá-los em Python',
  course: 'Introdução à Programação',
  publishedDate: '25 de março, 2026',
  studentsEnrolled: 45,
  studentsCompleted: 12,
  blocks: [
    { id: '1', type: 'content', title: 'Vídeo: O que são Variáveis?', status: 'unlocked', required: true, studentsCompleted: 38, studentsAccessed: 42, dependencies: [] },
    { id: '2', type: 'activity', title: 'Quiz: Tipos de Dados', status: 'unlocked', required: true, studentsCompleted: 28, studentsAccessed: 35, dependencies: ['1'] },
    { id: '3', type: 'interaction', title: 'Discussão: Aplicações Práticas', status: 'unlocked', required: false, studentsCompleted: 22, studentsAccessed: 30, discordLink: 'https://discord.com/channels/...', dependencies: ['2'] },
    { id: '4', type: 'consolidation', title: 'Revisão: Conceitos Principais', status: 'locked', required: true, studentsCompleted: 12, studentsAccessed: 15, dependencies: ['3'] },
  ],
};

const blockIcons: Record<string, React.ElementType> = {
  content: FileText, activity: CheckSquare, interaction: MessageSquare, consolidation: Target,
};

const blockColors: Record<string, string> = {
  content: 'bg-blue-50 border-blue-200', activity: 'bg-purple-50 border-purple-200',
  interaction: 'bg-green-50 border-green-200', consolidation: 'bg-orange-50 border-orange-200',
};

const blockTextColors: Record<string, string> = {
  content: 'text-blue-700', activity: 'text-purple-700',
  interaction: 'text-green-700', consolidation: 'text-orange-700',
};

const blockLabels: Record<string, string> = {
  content: 'Conteúdo', activity: 'Atividade', interaction: 'Interação', consolidation: 'Consolidação',
};

export default function PublishedLesson() {
  const params = useParams();
  const lessonId = params.lessonId as string;
  const completionRate = Math.round((mockLesson.studentsCompleted / mockLesson.studentsEnrolled) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Dashboard</Button>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold text-slate-900">{mockLesson.title}</h1>
                  <Badge className="bg-green-100 text-green-700 border-green-200">Publicada</Badge>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  {mockLesson.course} • Publicada em {mockLesson.publishedDate}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/lessons/${lessonId}/monitoring`}>
                <Button variant="outline"><BarChart3 className="w-4 h-4 mr-2" />Monitoramento</Button>
              </Link>
              <Button variant="outline"><Eye className="w-4 h-4 mr-2" />Visualizar como Estudante</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-slate-600">Estudantes Matriculados</p><p className="text-3xl font-semibold text-slate-900 mt-1">{mockLesson.studentsEnrolled}</p></div>
                <Users className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-slate-600">Concluíram</p><p className="text-3xl font-semibold text-slate-900 mt-1">{mockLesson.studentsCompleted}</p></div>
                <CheckSquare className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-slate-600">Taxa de Conclusão</p><p className="text-3xl font-semibold text-slate-900 mt-1">{completionRate}%</p></div>
                <Target className="w-8 h-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-slate-600">Blocos Ativos</p><p className="text-3xl font-semibold text-slate-900 mt-1">{mockLesson.blocks.length}</p></div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Fluxo da Aula (Visão do Estudante)</CardTitle>
            <p className="text-sm text-slate-600">Como os estudantes visualizam e acessam os blocos da aula</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockLesson.blocks.map((block, index) => {
                const Icon = blockIcons[block.type];
                const bgColor = blockColors[block.type];
                const textColor = blockTextColors[block.type];
                const label = blockLabels[block.type];
                const isLocked = block.status === 'locked';

                return (
                  <div key={block.id} className={`border-2 rounded-lg p-5 ${bgColor} ${isLocked ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-12 h-12 bg-white rounded-lg flex items-center justify-center ${isLocked ? 'opacity-50' : ''}`}>
                          {isLocked ? <Lock className="w-6 h-6 text-slate-400" /> : <Icon className={`w-6 h-6 ${textColor}`} />}
                        </div>
                        <span className="text-xs font-medium text-slate-600">#{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="bg-white">{label}</Badge>
                              {block.required && <Badge variant="outline" className="bg-white text-red-700 border-red-200">Obrigatório</Badge>}
                              {isLocked ? (
                                <Badge variant="outline" className="bg-white"><Lock className="w-3 h-3 mr-1" />Bloqueado</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-white text-green-700 border-green-200"><Unlock className="w-3 h-3 mr-1" />Liberado</Badge>
                              )}
                            </div>
                            <h4 className="font-medium text-slate-900 text-lg">{block.title}</h4>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-slate-600 mb-1">Acessaram: {block.studentsAccessed}/{mockLesson.studentsEnrolled}</p>
                            <Progress value={(block.studentsAccessed / mockLesson.studentsEnrolled) * 100} className="h-2" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 mb-1">Completaram: {block.studentsCompleted}/{mockLesson.studentsEnrolled}</p>
                            <Progress value={(block.studentsCompleted / mockLesson.studentsEnrolled) * 100} className="h-2" />
                          </div>
                        </div>

                        {'discordLink' in block && block.type === 'interaction' && !isLocked && (
                          <a href={(block as any).discordLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium">
                            <MessageSquare className="w-4 h-4" />Abrir no Discord<ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {block.dependencies && block.dependencies.length > 0 && (
                          <p className="text-sm text-slate-600 mt-2">
                            {isLocked ? '🔒 Requer' : '✓ Liberado após'}:{' '}
                            {block.dependencies.map((depId) => mockLesson.blocks.find((b) => b.id === depId)?.title).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <BarChart3 className="w-8 h-8 text-indigo-600 mb-3" />
              <h3 className="font-medium text-slate-900 mb-2">Monitoramento Detalhado</h3>
              <p className="text-sm text-slate-600 mb-4">Acompanhe o progresso individual de cada estudante</p>
              <Link href={`/lessons/${lessonId}/monitoring`}>
                <Button variant="outline" size="sm" className="w-full">Ver Detalhes</Button>
              </Link>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <MessageSquare className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-medium text-slate-900 mb-2">Discussões no Discord</h3>
              <p className="text-sm text-slate-600 mb-4">Acesse as conversas e interações dos estudantes</p>
              <Button variant="outline" size="sm" className="w-full">Abrir Discord</Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <Target className="w-8 h-8 text-orange-600 mb-3" />
              <h3 className="font-medium text-slate-900 mb-2">Editar Aula</h3>
              <p className="text-sm text-slate-600 mb-4">Modificar blocos, regras ou conteúdo da aula</p>
              <Link href={`/lessons/${lessonId}/configure`}>
                <Button variant="outline" size="sm" className="w-full">Editar</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
