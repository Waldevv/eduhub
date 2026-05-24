'use client';

import { Block } from "@/types/lesson";
import { FileText, CheckSquare, MessageSquare, Target, ArrowDown } from "lucide-react";

interface LessonFlowDiagramProps {
  blocks: Block[];
}

const blockIcons: Record<string, React.ElementType> = {
  content: FileText,
  activity: CheckSquare,
  interaction: MessageSquare,
  consolidation: Target,
};

const blockColors: Record<string, { bg: string; light: string; text: string }> = {
  content: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700' },
  activity: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700' },
  interaction: { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-700' },
  consolidation: { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-700' },
};

export function LessonFlowDiagram({ blocks }: LessonFlowDiagramProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {blocks.map((block, index) => {
        const Icon = blockIcons[block.type] ?? FileText;
        const colors = blockColors[block.type] ?? blockColors.content;

        return (
          <div key={block.id} className="flex flex-col items-center">
            <div className={`relative ${colors.light} border-2 border-slate-200 rounded-xl p-4 min-w-[300px] shadow-sm`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                    Bloco {index + 1}
                  </p>
                  <p className="font-medium text-slate-900">{block.title}</p>
                </div>
              </div>

              <div className="absolute -top-3 -left-3 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                {index + 1}
              </div>
            </div>

            {index < blocks.length - 1 && (
              <div className="flex flex-col items-center py-2">
                <ArrowDown className="w-5 h-5 text-slate-400" />
                {block.dependencies && block.dependencies.length > 0 && (
                  <span className="text-xs text-slate-500 mt-1">Dependência</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
