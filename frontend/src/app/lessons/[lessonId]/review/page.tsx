'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, CheckSquare, MessageSquare, Target, Edit, Link2, CheckCircle, Calculator, Check, Save, ClipboardList, Loader2 } from "lucide-react";
import { unitsApi, blocksApi, discordApi, type Unit, type ApiBlock } from "@/lib/api";

const blockIcons: Record<string, React.ElementType> = {
  content: FileText,
  activity: CheckSquare,
  exam: ClipboardList,
  interaction: MessageSquare,
  consolidation: Target,
  evaluation: Calculator,
};

const blockColors: Record<string, string> = {
  content: 'bg-blue-100 text-blue-700',
  activity: 'bg-purple-100 text-purple-700',
  exam: 'bg-red-100 text-red-700',
  interaction: 'bg-green-100 text-green-700',
  consolidation: 'bg-orange-100 text-orange-700',
  evaluation: 'bg-slate-100 text-slate-700',
};

const blockLabels: Record<string, string> = {
  content: 'Conteúdo',
  activity: 'Atividade',
  exam: 'Exame',
  interaction: 'Interação',
  consolidation: 'Consolidação',
  evaluation: 'Avaliação',
};

export default function ReviewLesson() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;
  const newTypes = searchParams.get('newTypes')?.split(',').filter(Boolean) ?? [];

  const [unit, setUnit] = useState<Unit | null>(null);
  const [blocks, setBlocks] = useState<ApiBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [unitData, blocksData] = await Promise.all([
        unitsApi.get(lessonId),
        blocksApi.listByUnit(lessonId),
      ]);
      setUnit(unitData);
      setBlocks(blocksData);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
    </div>
  );

  const activeBlocks = blocks.filter(b => b.status !== 'disabled');
  const requiredBlocks = blocks.filter(b => b.is_required);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href={`/lessons/${lessonId}/configure`}>
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Revisar Aula</h1>
              <p className="text-sm text-slate-600 mt-1">Passo 3 de 3: Confira os detalhes da aula</p>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center"><Check className="w-4 h-4" /></div>
              <span className="text-sm text-slate-600">Informações</span>
            </div>
            <div className="flex-1 h-0.5 bg-teal-700"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center"><Check className="w-4 h-4" /></div>
              <span className="text-sm text-slate-600">Estrutura</span>
            </div>
            <div className="flex-1 h-0.5 bg-teal-700"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-700 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
              <span className="text-sm font-medium text-slate-900">Revisão</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-2xl">{unit?.title}</CardTitle>
                  <Link href={`/lessons/${lessonId}/configure`}>
                    <Button variant="ghost" size="sm"><Edit className="w-4 h-4" /></Button>
                  </Link>
                </div>
                {unit?.description && (
                  <p className="text-slate-600">{unit.description}</p>
                )}
                {unit?.is_published && (
                  <Badge className="mt-2 bg-green-100 text-green-700 border-green-200">Publicada</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          {unit?.pedagogical_guidance && (
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Orientações Pedagógicas</h4>
                <p className="text-sm text-blue-800">{unit.pedagogical_guidance}</p>
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Fluxo da Aula</CardTitle>
            <p className="text-sm text-slate-600">Sequência pedagógica configurada</p>
          </CardHeader>
          <CardContent>
            {blocks.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>Nenhum bloco configurado.</p>
                <Link href={`/lessons/${lessonId}/configure`}>
                  <Button variant="outline" className="mt-4">Adicionar Blocos</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {blocks.map((block, index) => {
                  const Icon = blockIcons[block.block_type] ?? FileText;
                  const color = blockColors[block.block_type] ?? 'bg-slate-100 text-slate-700';
                  const label = blockLabels[block.block_type] ?? block.block_type;
                  const isDisabled = block.status === 'disabled';
                  const hasConfig = block.config_json && Object.keys(block.config_json).length > 0;

                  return (
                    <div key={block.id}>
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 bg-teal-700 text-white rounded-full flex items-center justify-center font-medium">
                            {index + 1}
                          </div>
                          {index < blocks.length - 1 && (
                            <div className="w-0.5 h-16 bg-slate-200 my-2"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${isDisabled ? 'opacity-50 border-slate-200' : 'border-slate-200'}`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                                  <Icon className={`w-5 h-5 ${color.split(' ')[1]}`} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <Badge variant="outline" className={color}>{label}</Badge>
                                    {block.is_required && (
                                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Obrigatório</Badge>
                                    )}
                                    {isDisabled && (
                                      <Badge variant="outline" className="bg-slate-100 text-slate-600">Inativo</Badge>
                                    )}
                                  </div>
                                  <h4 className="font-medium text-slate-900">{block.title}</h4>
                                </div>
                              </div>
                            </div>

                            {hasConfig && (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-2 text-sm">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="text-slate-600">Configurado</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="pt-6"><p className="text-sm text-slate-600">Total de Blocos</p><p className="text-2xl font-semibold text-slate-900 mt-1">{blocks.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-slate-600">Obrigatórios</p><p className="text-2xl font-semibold text-slate-900 mt-1">{requiredBlocks.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-slate-600">Ativos</p><p className="text-2xl font-semibold text-slate-900 mt-1">{activeBlocks.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-slate-600">Status</p><p className="text-sm font-semibold text-slate-900 mt-1">{unit?.is_published ? 'Publicada' : 'Rascunho'}</p></CardContent></Card>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href={`/lessons/${lessonId}/configure`}>
              <Button variant="outline"><Edit className="w-4 h-4 mr-2" />Editar Estrutura</Button>
            </Link>
            <Link href={unit?.course_id ? `/courses/${unit.course_id}` : '/courses'}>
              <Button variant="outline">Cancelar</Button>
            </Link>
          </div>
          <Button
            className="bg-violet-600 hover:bg-violet-700"
            onClick={async () => {
              if (unit?.is_published) {
                await discordApi.publishLesson(lessonId, { newBlockTypes: newTypes }).catch(() => {});
              }
              router.push(unit?.course_id ? `/courses/${unit.course_id}` : '/courses');
            }}
          >
            <Save className="w-4 h-4 mr-2" />Salvar e Fechar
          </Button>
        </div>
      </main>
    </div>
  );
}
