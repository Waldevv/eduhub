'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, FileText, CheckSquare, MessageSquare, Target, Calculator, ClipboardList, Loader2 } from 'lucide-react';
import { Block, BlockType } from '@/types/lesson';
import { BlockCard } from '@/modules/lessons/components/BlockCard';
import { BlockConfigModal } from '@/modules/lessons/components/BlockConfigModal';
import { unitsApi, blocksApi, type Unit, type ApiBlock } from '@/lib/api';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const DRAG_TYPE_BLOCK = 'BLOCK';

interface DraggableBlockProps {
  block: Block;
  index: number;
  isLast: boolean;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onDragEnd: () => void;
  onConfigure: (block: Block) => void;
  onToggle: (blockId: string, enabled: boolean) => void;
  onDelete: (blockId: string) => void;
}

function DraggableBlock({ block, index, isLast, onMove, onDragEnd, onConfigure, onToggle, onDelete }: DraggableBlockProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: DRAG_TYPE_BLOCK,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: onDragEnd,
  });

  const [, drop] = useDrop({
    accept: DRAG_TYPE_BLOCK,
    hover(item: { index: number }) {
      if (item.index === index) return;
      onMove(item.index, index);
      item.index = index;
    },
  });

  drop(dragPreview(ref));

  return (
    <div ref={ref} className={`relative ${isDragging ? 'opacity-40' : ''}`}>
      <div className="absolute -left-3 top-4 w-6 h-6 bg-teal-700 text-white rounded-full flex items-center justify-center text-xs font-medium z-10 select-none">
        {index + 1}
      </div>
      <BlockCard
        block={block}
        dragHandleRef={drag as unknown as React.Ref<HTMLDivElement>}
        onConfigure={onConfigure}
        onToggle={onToggle}
        onDelete={onDelete}
      />
      {!isLast && (
        <div className="flex justify-center my-1">
          <div className="w-0.5 h-4 bg-slate-200" />
        </div>
      )}
    </div>
  );
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ElementType; description: string; color: string }[] = [
  { type: 'content',      label: 'Conteúdo',      icon: FileText,     description: 'Texto, vídeo, arquivo ou link externo',          color: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900' },
  { type: 'activity',     label: 'Atividade',     icon: CheckSquare,   description: 'Quiz, tarefa ou exercício prático',               color: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-900' },
  { type: 'exam',         label: 'Exame',         icon: ClipboardList, description: 'Avaliação formal individual com quiz ou tarefa',   color: 'bg-red-50 hover:bg-red-100 border-red-200 text-red-900' },
  { type: 'interaction',  label: 'Interação',     icon: MessageSquare, description: 'Canal, fórum, thread ou palco no Discord',        color: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900' },
  { type: 'consolidation',label: 'Consolidação',  icon: Target,       description: 'Quiz de revisão, revisão guiada ou resumo',       color: 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-900' },
  { type: 'evaluation',   label: 'Avaliação',     icon: Calculator,   description: 'Cálculo da nota final da aula',                   color: 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900' },
];

function apiBlockToBlock(b: ApiBlock): Block {
  return {
    id: b.id,
    type: b.block_type as BlockType,
    title: b.title,
    enabled: b.status !== 'disabled',
    required: b.is_required,
    order: b.sequence_order,
    config: (b.config_json as Block['config']) ?? {},
    dependencies: [],
  };
}

export default function ConfigureLesson() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;

  const [unit, setUnit] = useState<Unit | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [addedAnnouncementTypes, setAddedAnnouncementTypes] = useState<Set<string>>(new Set());

  const fetchBlocks = useCallback(async () => {
    try {
      const [unitData, blocksData] = await Promise.all([
        unitsApi.get(lessonId),
        blocksApi.listByUnit(lessonId),
      ]);
      setUnit(unitData);
      setBlocks(blocksData.map(apiBlockToBlock));
    } catch {
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  const handleAddBlock = async (type: BlockType) => {
    const label = BLOCK_TYPES.find(b => b.type === type)?.label ?? 'Bloco';
    const created = await blocksApi.create({
      unit_id: lessonId,
      title: `Novo ${label}`,
      block_type: type,
      is_required: true,
    });
    setBlocks(prev => [...prev, apiBlockToBlock(created)]);
    if (unit?.is_published && (type === 'content' || type === 'activity')) {
      setAddedAnnouncementTypes(prev => new Set([...prev, type]));
    }
  };

  const handleConfigure = (block: Block) => {
    setSelectedBlock(block);
    setIsConfigModalOpen(true);
  };

  const handleSaveBlock = async (updated: Block) => {
    await blocksApi.update(updated.id, {
      title: updated.title,
      is_required: updated.required,
      config_json: updated.config as Record<string, unknown>,
    });
    setBlocks(prev => prev.map(b => b.id === updated.id ? updated : b));
  };

  const handleToggle = async (blockId: string, enabled: boolean) => {
    await blocksApi.update(blockId, { status: enabled ? 'draft' : 'disabled' });
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, enabled } : b));
  };

  const handleDelete = async (blockId: string) => {
    try {
      await blocksApi.delete(blockId);
      const remaining = blocks.filter(b => b.id !== blockId);
      const reordered = remaining.map((b, i) => ({ ...b, order: i + 1 }));
      if (reordered.length > 0) {
        await blocksApi.reorder(reordered.map(b => ({ id: b.id, sequence_order: b.order }))).catch(() => {});
      }
      setBlocks(reordered);
    } catch {
      alert('Erro ao excluir bloco. Verifique se o servidor está rodando.');
    }
  };

  const handleMove = useCallback((dragIndex: number, hoverIndex: number) => {
    setBlocks(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, moved);
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(async () => {
    await blocksApi.reorder(
      blocks.map((b, i) => ({ id: b.id, sequence_order: i + 1 }))
    ).catch(() => {});
  }, [blocks]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
    </div>
  );

  const courseId = unit?.course_id;

  return (
    <DndProvider backend={HTML5Backend}>
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={courseId ? `/courses/${courseId}` : '/courses'}>
              <ArrowLeft className="w-4 h-4 mr-2" />Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Configurar Blocos — {unit?.title}
            </h1>
            <p className="text-sm text-slate-500">
              {blocks.length} bloco{blocks.length !== 1 ? 's' : ''} na sequência
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-base">Adicionar Bloco</CardTitle>
                <p className="text-sm text-slate-500">Clique para adicionar à sequência</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {BLOCK_TYPES.map(({ type, label, icon: Icon, description, color }) => (
                  <button
                    key={type}
                    onClick={() => handleAddBlock(type)}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${color} text-left`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs opacity-75 mt-0.5">{description}</p>
                      </div>
                      <Plus className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-60" />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Sequência da Aula</CardTitle>
              </CardHeader>
              <CardContent>
                {blocks.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Plus className="w-7 h-7 text-slate-400" />
                    </div>
                    <h3 className="font-medium text-slate-800 mb-1">Nenhum bloco adicionado</h3>
                    <p className="text-sm text-slate-500">Use o painel ao lado para montar a sequência pedagógica</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blocks.map((block, index) => (
                      <DraggableBlock
                        key={block.id}
                        block={block}
                        index={index}
                        isLast={index === blocks.length - 1}
                        onMove={handleMove}
                        onDragEnd={handleDragEnd}
                        onConfigure={handleConfigure}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button variant="outline" asChild>
                <Link href={courseId ? `/courses/${courseId}` : '/courses'}>Cancelar</Link>
              </Button>
              <Button
                onClick={() => {
                  const params = addedAnnouncementTypes.size > 0
                    ? `?newTypes=${[...addedAnnouncementTypes].join(',')}`
                    : '';
                  router.push(`/lessons/${lessonId}/review${params}`);
                }}
                disabled={blocks.length === 0}
                className="bg-violet-600 hover:bg-violet-700"
              >
                Revisar Aula
              </Button>
            </div>
          </div>
        </div>
      </main>

      <BlockConfigModal
        block={selectedBlock}
        isOpen={isConfigModalOpen}
        onClose={() => { setIsConfigModalOpen(false); setSelectedBlock(null); }}
        onSave={handleSaveBlock}
        allBlocks={blocks}
        courseId={unit?.course_id}
      />
    </div>
    </DndProvider>
  );
}
