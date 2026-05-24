'use client';

import { Block, BlockType } from "@/types/lesson";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  FileText, CheckSquare, MessageSquare, Target, Calculator, ClipboardList,
  GripVertical, Settings, Trash2, Lock, CheckCircle2,
} from "lucide-react";

interface BlockCardProps {
  block: Block;
  onConfigure: (block: Block) => void;
  onToggle: (blockId: string, enabled: boolean) => void;
  onDelete: (blockId: string) => void;
  hasDependendencies?: boolean;
  dragHandleRef?: React.Ref<HTMLDivElement>;
}

const blockIcons: Record<BlockType, React.ElementType> = {
  content: FileText,
  activity: CheckSquare,
  exam: ClipboardList,
  interaction: MessageSquare,
  consolidation: Target,
  evaluation: Calculator,
};

const blockColors: Record<BlockType, { bg: string; text: string; icon: string }> = {
  content: { bg: 'bg-blue-50', text: 'text-blue-900', icon: 'text-blue-600' },
  activity: { bg: 'bg-green-50', text: 'text-green-900', icon: 'text-green-600' },
  exam: { bg: 'bg-red-50', text: 'text-red-900', icon: 'text-red-600' },
  interaction: { bg: 'bg-purple-50', text: 'text-purple-900', icon: 'text-purple-600' },
  consolidation: { bg: 'bg-orange-50', text: 'text-orange-900', icon: 'text-orange-600' },
  evaluation: { bg: 'bg-slate-50', text: 'text-slate-900', icon: 'text-slate-600' },
};

const blockLabels: Record<BlockType, string> = {
  content: 'Conteúdo',
  activity: 'Atividade',
  exam: 'Exame',
  interaction: 'Interação',
  consolidation: 'Consolidação',
  evaluation: 'Avaliação',
};

export function BlockCard({ block, onConfigure, onToggle, onDelete, hasDependendencies, dragHandleRef }: BlockCardProps) {
  const Icon = blockIcons[block.type];
  const colors = blockColors[block.type];
  const label = blockLabels[block.type];

  return (
    <Card className={`p-4 ${!block.enabled ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div ref={dragHandleRef} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors self-center">
          <GripVertical className="w-5 h-5" />
        </div>

        <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 ${colors.bg} ${colors.text} rounded`}>
                  {label}
                </span>
                {block.required && (
                  <span className="text-xs font-medium px-2 py-0.5 bg-red-50 text-red-700 rounded">
                    Obrigatório
                  </span>
                )}
                {hasDependendencies && <Lock className="w-3 h-3 text-slate-400" />}
              </div>
              <h4 className="font-medium text-slate-900">{block.title}</h4>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">{block.enabled ? 'Ativo' : 'Inativo'}</span>
              <Switch
                checked={block.enabled}
                onCheckedChange={(checked) => onToggle(block.id, checked)}
              />
            </div>
          </div>

          {block.config && Object.keys(block.config).length > 0 ? (
            <p className="text-sm text-slate-600 mb-3 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />Configurado
            </p>
          ) : (
            <p className="text-sm text-slate-500 mb-3 italic">Não configurado</p>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onConfigure(block)}>
              <Settings className="w-3 h-3 mr-1.5" />
              Configurar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(block.id)}>
              <Trash2 className="w-3 h-3 mr-1.5" />
              Remover
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
