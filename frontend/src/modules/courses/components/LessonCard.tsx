'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Settings, TrendingUp, Edit, Trash2, Send } from 'lucide-react';
import Link from 'next/link';
import { type Unit } from '@/lib/api';

interface LessonCardProps {
  courseId: string;
  unit: Unit;
  index: number;
  onEdit: (unit: Unit) => void;
  onDelete: (unit: Unit) => void;
  onPublish?: (unit: Unit) => void;
  publishing?: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Rascunho',   className: 'bg-slate-100 text-slate-700' },
  published: { label: 'Publicada',  className: 'bg-green-100 text-green-800' },
  archived:  { label: 'Arquivada',  className: 'bg-yellow-100 text-yellow-800' },
};

export function LessonCard({ courseId, unit, index, onEdit, onDelete, onPublish, publishing }: LessonCardProps) {
  const status = statusConfig[unit.status] ?? statusConfig.draft;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-slate-400">Aula {index}</span>
              <Badge className={status.className}>{status.label}</Badge>
            </div>
            <h3 className="font-semibold text-lg leading-tight truncate">{unit.title}</h3>
            {unit.description && (
              <p className="text-sm text-slate-600 mt-1 line-clamp-2">{unit.description}</p>
            )}
          </div>
          <div className="flex gap-1 ml-4 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onEdit(unit)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(unit)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            {unit._count.blocks} {unit._count.blocks === 1 ? 'bloco' : 'blocos'}
          </span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/courses/${courseId}/lessons/${unit.id}`}>Ver Aula</Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/lessons/${unit.id}/configure`}>
              <Settings className="w-4 h-4 mr-1" />Configurar
            </Link>
          </Button>
          {!unit.is_published && onPublish ? (
            <Button
              size="sm"
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
              disabled={publishing}
              onClick={() => onPublish(unit)}
            >
              <Send className="w-4 h-4 mr-1" />
              {publishing ? 'Publicando...' : 'Publicar'}
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href={`/lessons/${unit.id}/monitoring`}>
                <TrendingUp className="w-4 h-4 mr-1" />Monitorar
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
