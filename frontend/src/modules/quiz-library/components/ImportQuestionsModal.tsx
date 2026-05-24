'use client';

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Search, ChevronDown, ChevronUp } from "lucide-react";
import { quizzesApi, type Quiz } from "@/lib/api";

interface ImportQuestionsModalProps {
  open: boolean;
  currentQuizId: string;
  onClose: () => void;
  onImport: (questionIds: { statement: string; score: number; options: { option_text: string; is_correct: boolean }[] }[]) => Promise<void>;
}

export function ImportQuestionsModal({ open, currentQuizId, onClose, onImport }: ImportQuestionsModalProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(new Set());
    setSearch('');
    Promise.all(
      []
    );
    quizzesApi.list().then(async (list) => {
      const others = list.filter((q) => q.id !== currentQuizId);
      const full = await Promise.all(others.map((q) => quizzesApi.get(q.id)));
      setQuizzes(full);
    }).finally(() => setLoading(false));
  }, [open, currentQuizId]);

  const allQuestions = quizzes.flatMap((q) =>
    (q.questions ?? []).map((question) => ({ ...question, quizTitle: q.title }))
  );

  const filtered = search.trim()
    ? allQuestions.filter((q) => q.statement.toLowerCase().includes(search.toLowerCase()) || q.quizTitle.toLowerCase().includes(search.toLowerCase()))
    : null;

  const toggleQuestion = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    const toImport = allQuestions
      .filter((q) => selected.has(q.id))
      .map((q) => ({
        statement: q.statement,
        score: Number(q.score),
        options: (q.options ?? []).map((o) => ({ option_text: o.option_text, is_correct: o.is_correct })),
      }));
    setImporting(true);
    try {
      await onImport(toImport);
      onClose();
    } finally {
      setImporting(false);
    }
  };

  const renderQuestion = (q: typeof allQuestions[0]) => {
    const isSelected = selected.has(q.id);
    return (
      <button
        key={q.id}
        onClick={() => toggleQuestion(q.id)}
        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${isSelected ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
      >
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${isSelected ? 'bg-teal-600 border-teal-600' : 'border-slate-300'}`}>
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-800">{q.statement}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{q.score} pt{Number(q.score) !== 1 ? 's' : ''}</Badge>
              <span className="text-xs text-slate-400">{q.options?.length ?? 0} alternativas</span>
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Questões</DialogTitle>
          <p className="text-sm text-slate-500">Selecione questões de outros quizzes para copiar para este.</p>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar questões..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">Carregando quizzes...</p>
          ) : quizzes.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Nenhum outro quiz disponível.</p>
          ) : filtered !== null ? (
            filtered.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Nenhuma questão encontrada.</p>
            ) : (
              <div className="space-y-2">{filtered.map(renderQuestion)}</div>
            )
          ) : (
            quizzes.map((quiz) => {
              const questions = quiz.questions ?? [];
              if (questions.length === 0) return null;
              const isExpanded = expandedQuiz === quiz.id;
              return (
                <div key={quiz.id}>
                  <button
                    onClick={() => setExpandedQuiz(isExpanded ? null : quiz.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-sm font-medium text-slate-700"
                  >
                    <span>{quiz.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{questions.length} questões</Badge>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="mt-2 space-y-2 pl-2">
                      {questions.map((q) => renderQuestion({ ...q, quizTitle: quiz.title }))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {selected.size > 0 ? `${selected.size} questão${selected.size > 1 ? 'ões' : ''} selecionada${selected.size > 1 ? 's' : ''}` : 'Nenhuma selecionada'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              disabled={selected.size === 0 || importing}
              onClick={handleImport}
              className="bg-teal-700 hover:bg-teal-800"
            >
              {importing ? 'Importando...' : `Importar ${selected.size > 0 ? `(${selected.size})` : ''}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
