'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  CheckSquare,
  MessageSquare,
  Target,
  Calculator,
  ClipboardList,
  Star,
  Link as LinkIcon,
} from "lucide-react";

interface LessonBlock {
  id: string;
  order: number;
  title: string;
  type: "content" | "activity" | "interaction" | "consolidation" | "evaluation";
  subtype?: string;
  isRequired: boolean;
  configuration: {
    summary: string;
    completionCriteria?: string;
    points?: number;
    discordSpace?: string;
    evaluationRule?: string;
  };
  dependencies?: string[];
}

interface LessonBlocksListProps {
  blocks: LessonBlock[];
  onEdit?: (blockId: string) => void;
}

const blockTypeConfig = {
  content:      { icon: FileText,      color: "bg-blue-100 text-blue-700",   label: "Conteúdo" },
  activity:     { icon: CheckSquare,   color: "bg-green-100 text-green-700", label: "Atividade" },
  exam:         { icon: ClipboardList, color: "bg-red-100 text-red-700",     label: "Exame" },
  interaction:  { icon: MessageSquare, color: "bg-purple-100 text-purple-700", label: "Interação" },
  consolidation:{ icon: Target,        color: "bg-orange-100 text-orange-700", label: "Consolidação" },
  evaluation:   { icon: Calculator,    color: "bg-slate-100 text-slate-700", label: "Avaliação" },
};

export function LessonBlocksList({ blocks, onEdit }: LessonBlocksListProps) {
  if (blocks.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600">Nenhum bloco adicionado a esta aula ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        const config = blockTypeConfig[block.type as keyof typeof blockTypeConfig]
          ?? { icon: FileText, color: 'bg-slate-100 text-slate-700', label: block.type };
        const Icon = config.icon;

        return (
          <Card key={block.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    {block.order}
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{block.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                          {block.subtype && (
                            <Badge variant="secondary" className="text-xs">
                              {block.subtype}
                            </Badge>
                          )}
                          {block.isRequired && (
                            <Badge className="bg-amber-100 text-amber-800">
                              <Star className="w-3 h-3 mr-1" />
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-slate-700">{block.configuration.summary}</p>

                    {block.configuration.completionCriteria && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="font-medium text-slate-700">Critérios de conclusão:</span>
                        <span className="text-slate-600">{block.configuration.completionCriteria}</span>
                      </div>
                    )}

                    {block.configuration.points !== undefined && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-slate-700">Pontuação:</span>
                        <span className="text-teal-700 font-semibold">{block.configuration.points} pontos</span>
                      </div>
                    )}

                    {block.configuration.discordSpace && (
                      <div className="flex items-center gap-2 text-sm">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                        <span className="font-medium text-slate-700">Discord:</span>
                        <span className="text-slate-600">{block.configuration.discordSpace}</span>
                      </div>
                    )}

                    {block.configuration.evaluationRule && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calculator className="w-4 h-4 text-slate-600" />
                        <span className="font-medium text-slate-700">Regra de avaliação:</span>
                        <span className="text-slate-600">{block.configuration.evaluationRule}</span>
                      </div>
                    )}
                  </div>

                  {block.dependencies && block.dependencies.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon className="w-4 h-4 text-teal-700" />
                      <span className="font-medium text-slate-700">Liberado após:</span>
                      <span className="text-slate-600">{block.dependencies.join(", ")}</span>
                    </div>
                  )}

                  {onEdit && (
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(block.id)}>
                        Editar Configuração
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
