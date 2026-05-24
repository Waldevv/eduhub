'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Navigation } from "@/components/layout/Navigation";
import { Plus, Search, Edit, Trash2, FileQuestion, BookOpen, Loader2 } from "lucide-react";
import { quizzesApi, type Quiz } from "@/lib/api";
import { CreateQuizModal } from "@/modules/quiz-library/components/CreateQuizModal";

export default function QuizLibrary() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchQuizzes = useCallback(async () => {
    try {
      const data = await quizzesApi.list();
      setQuizzes(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  const handleCreate = async (data: { title: string; description?: string }) => {
    await quizzesApi.create(data);
    setIsCreateModalOpen(false);
    fetchQuizzes();
  };

  const handleDelete = async (quiz: Quiz) => {
    if (!confirm(`Excluir o quiz "${quiz.title}"?`)) return;
    await quizzesApi.delete(quiz.id);
    fetchQuizzes();
  };

  const filtered = quizzes.filter((q) =>
    q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.description ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalQuestions = quizzes.reduce((acc, q) => acc + (q._count?.questions ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Banco de Questões</h1>
              <p className="text-sm text-slate-600 mt-1">Crie e gerencie quizzes reutilizáveis para suas aulas</p>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-teal-700 hover:bg-teal-800">
              <Plus className="w-4 h-4 mr-2" />Novo Quiz
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total de Quizzes</p>
                  <p className="text-3xl font-semibold text-slate-900 mt-1">{quizzes.length}</p>
                </div>
                <FileQuestion className="w-8 h-8 text-teal-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total de Questões</p>
                  <p className="text-3xl font-semibold text-slate-900 mt-1">{totalQuestions}</p>
                </div>
                <BookOpen className="w-8 h-8 text-teal-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por título ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{quiz.title}</CardTitle>
                      {quiz.description && (
                        <CardDescription className="line-clamp-2 mt-1">{quiz.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                        {quiz._count?.questions ?? 0} {quiz._count?.questions === 1 ? 'questão' : 'questões'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href={`/quiz-library/${quiz.id}`}>
                          <Edit className="w-3 h-3 mr-1.5" />Editar Questões
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(quiz)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileQuestion className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="font-medium text-slate-900 mb-2">Nenhum quiz encontrado</h3>
              <p className="text-sm text-slate-600 mb-4">
                {searchTerm ? 'Tente outro termo de busca' : 'Comece criando seu primeiro quiz'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateModalOpen(true)} className="bg-teal-700 hover:bg-teal-800">
                  <Plus className="w-4 h-4 mr-2" />Criar Primeiro Quiz
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <CreateQuizModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreate}
      />
    </div>
  );
}
