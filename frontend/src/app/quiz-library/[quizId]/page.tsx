'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Check, X, GripVertical, ChevronDown, ChevronUp, Download, Loader2 } from "lucide-react";
import { quizzesApi, type Quiz, type QuizQuestion, type QuizOption } from "@/lib/api";
import { ImportQuestionsModal } from "@/modules/quiz-library/components/ImportQuestionsModal";

export default function QuizEditor() {
  const params = useParams();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [descValue, setDescValue] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [newStatement, setNewStatement] = useState('');
  const [newScore, setNewScore] = useState('1');
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editStmt, setEditStmt] = useState('');
  const [editScore, setEditScore] = useState('');
  const [newOptionText, setNewOptionText] = useState<Record<string, string>>({});

  const fetchQuiz = useCallback(async () => {
    try {
      const data = await quizzesApi.get(quizId);
      setQuiz(data);
      setTitleValue(data.title);
      setDescValue(data.description ?? '');
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  const handleSaveTitle = async () => {
    if (!titleValue.trim()) return;
    await quizzesApi.update(quizId, { title: titleValue.trim(), description: descValue.trim() || undefined });
    setEditingTitle(false);
    fetchQuiz();
  };

  const handleAddQuestion = async () => {
    if (!newStatement.trim()) return;
    setSavingQuestion(true);
    try {
      await quizzesApi.addQuestion(quizId, { statement: newStatement.trim(), score: parseFloat(newScore) || 1 });
      setNewStatement('');
      setNewScore('1');
      setAddingQuestion(false);
      fetchQuiz();
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Excluir esta questão?')) return;
    await quizzesApi.deleteQuestion(questionId);
    fetchQuiz();
  };

  const handleSaveQuestion = async (questionId: string) => {
    await quizzesApi.updateQuestion(questionId, { statement: editStmt, score: parseFloat(editScore) || 1 });
    setEditingQuestion(null);
    fetchQuiz();
  };

  const handleAddOption = async (questionId: string) => {
    const text = newOptionText[questionId]?.trim();
    if (!text) return;
    await quizzesApi.addOption(questionId, { option_text: text, is_correct: false });
    setNewOptionText((prev) => ({ ...prev, [questionId]: '' }));
    fetchQuiz();
  };

  const handleToggleCorrect = async (option: QuizOption, question: QuizQuestion) => {
    await Promise.all(
      question.options.map((o) =>
        quizzesApi.updateOption(o.id, { is_correct: o.id === option.id })
      )
    );
    fetchQuiz();
  };

  const handleDeleteOption = async (optionId: string) => {
    await quizzesApi.deleteOption(optionId);
    fetchQuiz();
  };

  const handleImportQuestions = async (
    questions: { statement: string; score: number; options: { option_text: string; is_correct: boolean }[] }[]
  ) => {
    for (const q of questions) {
      const created = await quizzesApi.addQuestion(quizId, { statement: q.statement, score: q.score });
      for (const opt of q.options) {
        await quizzesApi.addOption(created.id, { option_text: opt.option_text, is_correct: opt.is_correct });
      }
    }
    fetchQuiz();
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
    </div>
  );

  if (!quiz) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500">Quiz não encontrado.</p>
    </div>
  );

  const questions = quiz.questions ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/quiz-library"><ArrowLeft className="w-4 h-4 mr-2" />Banco de Questões</Link>
          </Button>
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="space-y-2">
                <Input value={titleValue} onChange={(e) => setTitleValue(e.target.value)} className="text-lg font-semibold" />
                <Input value={descValue} onChange={(e) => setDescValue(e.target.value)} placeholder="Descrição (opcional)" className="text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveTitle} className="bg-teal-700 hover:bg-teal-800">Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setEditingTitle(true)} className="text-left group">
                <h1 className="text-xl font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">{quiz.title}</h1>
                {quiz.description && <p className="text-sm text-slate-500 mt-0.5">{quiz.description}</p>}
                <p className="text-xs text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">Clique para editar</p>
              </button>
            )}
          </div>
          <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 flex-shrink-0">
            {questions.length} {questions.length === 1 ? 'questão' : 'questões'}
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">

        {questions.map((question, qIndex) => (
          <Card key={question.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-medium mt-0.5">
                  {qIndex + 1}
                </div>
                <div className="flex-1 min-w-0">
                  {editingQuestion === question.id ? (
                    <div className="space-y-2">
                      <Input value={editStmt} onChange={(e) => setEditStmt(e.target.value)} placeholder="Enunciado da questão" />
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-slate-600 flex-shrink-0">Pontuação:</Label>
                        <Input type="number" min="0.5" step="0.5" value={editScore} onChange={(e) => setEditScore(e.target.value)} className="w-24 text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveQuestion(question.id)} className="bg-teal-700 hover:bg-teal-800">Salvar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingQuestion(null)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-900">{question.statement}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">{question.score} pt{Number(question.score) !== 1 ? 's' : ''}</Badge>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                          setEditingQuestion(question.id);
                          setEditStmt(question.statement);
                          setEditScore(String(question.score));
                        }}>
                          <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedQuestion(expandedQuestion === question.id ? null : question.id)}>
                          {expandedQuestion === question.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteQuestion(question.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedQuestion === question.id && (
              <CardContent className="pt-0">
                <div className="ml-10 space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Alternativas</p>

                  {question.options.length === 0 && (
                    <p className="text-sm text-slate-400 italic">Nenhuma alternativa adicionada</p>
                  )}

                  {question.options.map((option, oIndex) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${option.is_correct ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-300 text-slate-500'}`}>
                        {String.fromCharCode(65 + oIndex)}
                      </div>
                    <div className={`flex flex-1 items-center gap-2 p-2.5 rounded-lg border ${option.is_correct ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                      <button
                        onClick={() => handleToggleCorrect(option, question)}
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${option.is_correct ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-teal-400'}`}
                      >
                        {option.is_correct && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <span className={`flex-1 text-sm ${option.is_correct ? 'text-green-800 font-medium' : 'text-slate-700'}`}>
                        {option.option_text}
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteOption(option.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    </div>
                  ))}

                  <div className="flex gap-2 mt-3">
                    <Input
                      placeholder="Nova alternativa..."
                      value={newOptionText[question.id] ?? ''}
                      onChange={(e) => setNewOptionText((prev) => ({ ...prev, [question.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddOption(question.id)}
                      className="text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={() => handleAddOption(question.id)}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {question.options.length > 0 && !question.options.some((o) => o.is_correct) && (
                    <p className="text-xs text-amber-600 mt-1">Nenhuma alternativa marcada como correta</p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {addingQuestion ? (
          <Card className="border-teal-200">
            <CardContent className="pt-6 space-y-3">
              <div className="space-y-2">
                <Label>Enunciado da questão *</Label>
                <Input
                  placeholder="Digite o enunciado..."
                  value={newStatement}
                  onChange={(e) => setNewStatement(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-slate-600 flex-shrink-0">Pontuação:</Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={newScore}
                  onChange={(e) => setNewScore(e.target.value)}
                  className="w-24 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddQuestion} disabled={!newStatement.trim() || savingQuestion} className="bg-teal-700 hover:bg-teal-800">
                  {savingQuestion ? 'Salvando...' : 'Adicionar Questão'}
                </Button>
                <Button variant="ghost" onClick={() => { setAddingQuestion(false); setNewStatement(''); setNewScore('1'); }}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            variant="outline"
            className="w-full border-dashed border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400"
            onClick={() => setAddingQuestion(true)}
          >
            <Plus className="w-4 h-4 mr-2" />Adicionar Questão
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full border-slate-200 text-slate-600 hover:bg-slate-50"
          onClick={() => setImportModalOpen(true)}
        >
          <Download className="w-4 h-4 mr-2" />Importar de outro Quiz
        </Button>
      </main>

      <ImportQuestionsModal
        open={importModalOpen}
        currentQuizId={quizId}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImportQuestions}
      />
    </div>
  );
}
