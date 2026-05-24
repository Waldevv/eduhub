'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Navigation } from "@/components/layout/Navigation";
import { Plus, BookOpen, Users, Clock, Edit, Trash2, Search, MoreVertical, Settings, Loader2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateCourseModal } from "@/modules/courses/components/CreateCourseModal";
import { EditCourseModal } from "@/modules/courses/components/EditCourseModal";
import { DeleteConfirmationModal } from "@/modules/courses/components/DeleteConfirmationModal";
import { coursesApi, type Course } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function Courses() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const fetchCourses = useCallback(async () => {
    try {
      setError(null);
      const data = await coursesApi.list();
      setCourses(data);
    } catch {
      setError('Não foi possível carregar os cursos. Verifique se o servidor está rodando.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleCreateCourse = async (formData: { name: string; description: string; category: string; objective: string; start_date: string; end_date: string }) => {
    try {
      await coursesApi.create({
        title: formData.name,
        description: formData.description,
        category: formData.category,
        objectives: formData.objective,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
      });
      fetchCourses();
    } catch {
      alert('Erro ao criar curso. Tente novamente.');
    }
  };

  const handleEditCourse = async (formData: { name: string; category: string; description: string; learningObjectives: string; start_date: string; end_date: string }) => {
    if (!editingCourse) return;
    try {
      await coursesApi.update(editingCourse.id, {
        title: formData.name,
        description: formData.description,
        category: formData.category,
        objectives: formData.learningObjectives,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
      });
      setEditingCourse(null);
      fetchCourses();
    } catch {
      alert('Erro ao atualizar curso. Tente novamente.');
    }
  };

  const handleDeleteCourse = async () => {
    if (!deletingCourse) return;
    try {
      await coursesApi.delete(deletingCourse.id);
      setDeletingCourse(null);
      fetchCourses();
    } catch {
      alert('Erro ao excluir curso. Tente novamente.');
    }
  };

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.category ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Gerenciar Cursos</h1>
              <p className="text-sm text-slate-600 mt-1">Crie e organize seus cursos e turmas</p>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-violet-600 hover:bg-violet-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Curso
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total de Cursos</p>
                  <p className="text-3xl font-semibold text-slate-900 mt-1">{courses.length}</p>
                </div>
                <BookOpen className="w-8 h-8 text-teal-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total de Aulas</p>
                  <p className="text-3xl font-semibold text-slate-900 mt-1">
                    {courses.reduce((acc, c) => acc + c._count.units, 0)}
                  </p>
                </div>
                <Settings className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total de Alunos</p>
                  <p className="text-3xl font-semibold text-slate-900 mt-1">
                    {courses.reduce((acc, c) => acc + c._count.enrollments, 0)}
                  </p>
                </div>
                <Users className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Publicados</p>
                  <p className="text-3xl font-semibold text-slate-900 mt-1">
                    {courses.filter(c => c.status === 'published').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, descrição ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-red-600 font-medium">{error}</p>
              <Button onClick={fetchCourses} variant="outline" className="mt-4">
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && filteredCourses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Todos os Cursos ({filteredCourses.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {course.category && (
                          <Badge variant="outline" className="mb-2 bg-green-50 text-green-700 border-green-200">
                            {course.category}
                          </Badge>
                        )}
                        <CardTitle className="text-lg mb-1">{course.title}</CardTitle>
                        <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingCourse(course)}>
                            <Edit className="w-4 h-4 mr-2" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Users className="w-4 h-4 mr-2" />Gerenciar Alunos
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => setDeletingCourse(course)}>
                            <Trash2 className="w-4 h-4 mr-2" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">
                          <BookOpen className="w-4 h-4 inline mr-1" />{course._count.units} aulas
                        </span>
                        <span className="text-slate-600">
                          <Users className="w-4 h-4 inline mr-1" />{course._count.enrollments} estudantes
                        </span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Link href={`/courses/${course.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <Plus className="w-3 h-3 mr-1" />Nova Aula
                          </Button>
                        </Link>
                        <Link href={`/courses/${course.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">Ver Detalhes</Button>
                        </Link>
                      </div>
                      <p className="text-xs text-slate-500">
                        Criado em {new Date(course.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && filteredCourses.length === 0 && (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="font-medium text-slate-900 mb-2">Nenhum curso encontrado</h3>
              <p className="text-sm text-slate-600 mb-4">
                {searchTerm ? 'Tente outro termo de busca' : 'Comece criando seu primeiro curso'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateModalOpen(true)} className="bg-teal-700 hover:bg-teal-800">
                  <Plus className="w-4 h-4 mr-2" />Criar Primeiro Curso
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <CreateCourseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateCourse}
      />

      {editingCourse && (
        <EditCourseModal
          open={true}
          onOpenChange={(open) => !open && setEditingCourse(null)}
          course={{
            id: editingCourse.id,
            name: editingCourse.title,
            category: editingCourse.category ?? '',
            description: editingCourse.description ?? '',
            learningObjectives: editingCourse.objectives ?? '',
            start_date: editingCourse.start_date,
            end_date: editingCourse.end_date,
          }}
          onSave={handleEditCourse}
        />
      )}

      {deletingCourse && (
        <DeleteConfirmationModal
          open={true}
          onOpenChange={(open) => !open && setDeletingCourse(null)}
          onConfirm={handleDeleteCourse}
          title="Excluir Curso"
          description="Você está prestes a excluir este curso permanentemente."
          itemName={deletingCourse.title}
          warningMessage="Este curso pode conter aulas e estudantes vinculados que também serão removidos."
        />
      )}
    </div>
  );
}
