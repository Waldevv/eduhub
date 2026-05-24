'use client';

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Edit, Settings, TrendingUp, Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { LessonBlocksList } from "@/modules/lessons/components/LessonBlocksList";
import { UnitModal } from "@/modules/courses/components/UnitModal";
import { unitsApi, blocksApi, coursesApi, type Unit, type ApiBlock, type Course } from "@/lib/api";

const subtypeLabels: Record<string, Record<string, string>> = {
  content: { video: 'Vídeo', text: 'Texto', file: 'Arquivo', external: 'Link Externo' },
  activity: { quiz: 'Quiz', assignment: 'Tarefa', link: 'Link Externo' },
  consolidation: { quiz: 'Quiz de Revisão', guided_stage: 'Revisão Guiada', summary: 'Resumo' },
  evaluation: { simple_average: 'Média Simples', weighted_average: 'Média Ponderada', sum: 'Soma', custom: 'Personalizada' },
};

function deriveSubtype(block: ApiBlock): string | undefined {
  const cfg = block.config_json as Record<string, string> | null;
  if (!cfg) return undefined;
  const map = subtypeLabels[block.block_type];
  if (!map) return undefined;
  const key = cfg.contentType ?? cfg.activityType ?? cfg.consolidationType ?? cfg.evaluationType;
  return key ? map[key] : undefined;
}

function deriveSummary(block: ApiBlock): string {
  const cfg = block.config_json as Record<string, unknown> | null;
  if (!cfg) return 'Sem configuração definida';
  if (cfg.text) return String(cfg.text).slice(0, 120) + (String(cfg.text).length > 120 ? '...' : '');
  if (cfg.videoUrl) return `Vídeo: ${cfg.videoUrl}`;
  if (cfg.externalUrl) return `Link: ${cfg.externalUrl}`;
  if (cfg.fileUrl) return `Arquivo: ${cfg.text ?? cfg.fileUrl}`;
  if (cfg.description) return String(cfg.description).slice(0, 120);
  return 'Configurado';
}

function apiBlockToListBlock(block: ApiBlock) {
  const cfg = block.config_json as Record<string, unknown> | null;
  return {
    id: block.id,
    order: block.sequence_order,
    title: block.title,
    type: block.block_type as 'content' | 'activity' | 'interaction' | 'consolidation' | 'evaluation',
    subtype: deriveSubtype(block),
    isRequired: block.is_required,
    configuration: {
      summary: deriveSummary(block),
      points: cfg?.maxScore ? Number(cfg.maxScore) : undefined,
    },
  };
}

export default function LessonDetails() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  const [unit, setUnit] = useState<Unit | null>(null);
  const [blocks, setBlocks] = useState<ApiBlock[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [unitData, blocksData, courseData] = await Promise.all([
        unitsApi.get(lessonId),
        blocksApi.listByUnit(lessonId),
        coursesApi.get(courseId),
      ]);
      setUnit(unitData);
      setBlocks(blocksData);
      setCourse(courseData);
    } finally {
      setLoading(false);
    }
  }, [lessonId, courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveUnit = async (data: { title: string; description?: string; pedagogical_guidance?: string }) => {
    await unitsApi.update(lessonId, data);
    await fetchData();
  };

  const handleArchiveToggle = async () => {
    if (unit?.status === 'archived') {
      await unitsApi.update(lessonId, { status: 'draft' });
      await fetchData();
    } else {
      await unitsApi.update(lessonId, { status: 'archived' });
      router.push(`/courses/${courseId}`);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
    </div>
  );

  if (!unit) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500">Aula não encontrada.</p>
    </div>
  );

  const statusConfig: Record<string, { label: string; className: string }> = {
    published: { label: 'Publicada', className: 'bg-green-100 text-green-800' },
    draft: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700' },
    archived: { label: 'Arquivada', className: 'bg-red-100 text-red-700' },
  };
  const statusInfo = statusConfig[unit.status] ?? statusConfig.draft;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link href="/courses">Cursos</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/courses/${courseId}`}>{course?.title ?? courseId}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{unit.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold">{unit.title}</h1>
                <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
              </div>
              {unit.description && (
                <p className="text-slate-600 mb-4">{unit.description}</p>
              )}
              {unit.pedagogical_guidance && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Orientações Pedagógicas</h3>
                  <p className="text-sm text-blue-800">{unit.pedagogical_guidance}</p>
                </div>
              )}
              <p className="text-sm text-slate-500">
                {blocks.length} bloco{blocks.length !== 1 ? 's' : ''} · Aula nº {unit.sequence_order}
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />Editar Aula
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/lessons/${lessonId}/configure`}>
                  <Settings className="w-4 h-4 mr-2" />Configurar Fluxo
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/lessons/${lessonId}/monitoring`}>
                  <TrendingUp className="w-4 h-4 mr-2" />Monitorar Progresso
                </Link>
              </Button>
              <Button
                variant="outline"
                className="text-slate-600 ml-auto"
                onClick={handleArchiveToggle}
              >
                {unit?.status === 'archived' ? (
                  <><ArchiveRestore className="w-4 h-4 mr-2" />Desarquivar</>
                ) : (
                  <><Archive className="w-4 h-4 mr-2" />Arquivar</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blocos da Aula</CardTitle>
            <p className="text-sm text-slate-600 mt-1">Estrutura pedagógica e sequenciamento da aula</p>
          </CardHeader>
          <CardContent>
            <LessonBlocksList
              blocks={blocks.map(apiBlockToListBlock)}
              onEdit={(id) => window.location.href = `/lessons/${lessonId}/configure`}
            />
          </CardContent>
        </Card>
      </div>

      <UnitModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSave={handleSaveUnit}
        unit={unit}
      />
    </div>
  );
}
