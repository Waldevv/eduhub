'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { coursesApi, unitsApi, type Course } from "@/lib/api";

export default function CreateLesson() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: '',
    pedagogicalGuidance: '',
  });

  useEffect(() => {
    coursesApi.list()
      .then(setCourses)
      .finally(() => setLoadingCourses(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const unit = await unitsApi.create(formData.courseId, {
        title: formData.title,
        description: formData.description,
        pedagogical_guidance: formData.pedagogicalGuidance || undefined,
      });
      router.push(`/lessons/${unit.id}/configure`);
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = formData.title && formData.description && formData.courseId;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Criar Nova Aula</h1>
              <p className="text-sm text-slate-600 mt-1">Passo 1 de 3: Informações básicas</p>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-700 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
              <span className="text-sm font-medium text-slate-900">Informações</span>
            </div>
            <div className="flex-1 h-0.5 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
              <span className="text-sm text-slate-600">Estrutura</span>
            </div>
            <div className="flex-1 h-0.5 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
              <span className="text-sm text-slate-600">Revisão</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informações da Aula</CardTitle>
              <CardDescription>Defina o título, descrição e orientações pedagógicas para sua aula</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="course">Curso / Turma *</Label>
                <Select
                  value={formData.courseId}
                  onValueChange={(value) => setFormData({ ...formData, courseId: value })}
                  disabled={loadingCourses}
                >
                  <SelectTrigger id="course">
                    <SelectValue placeholder={loadingCourses ? 'Carregando cursos...' : 'Selecione um curso'} />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título da Aula *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Introdução às Variáveis em Python"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva brevemente o conteúdo e objetivos desta aula..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
                <p className="text-xs text-slate-500">Esta descrição será visível para os estudantes</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guidance">Orientações Pedagógicas</Label>
                <Textarea
                  id="guidance"
                  placeholder="Defina metodologias, abordagens e objetivos de aprendizagem desta aula..."
                  rows={6}
                  value={formData.pedagogicalGuidance}
                  onChange={(e) => setFormData({ ...formData, pedagogicalGuidance: e.target.value })}
                />
                <p className="text-xs text-slate-500">
                  Opcional: Use este espaço para documentar sua estratégia pedagógica, metodologia aplicada,
                  e como os blocos da aula contribuem para os objetivos de aprendizagem
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Dica Pedagógica</h4>
                <p className="text-sm text-blue-800">
                  Uma aula bem estruturada geralmente inclui: (1) Apresentação do conteúdo,
                  (2) Prática guiada através de atividades, (3) Interação e discussão,
                  e (4) Consolidação do aprendizado. No próximo passo você poderá configurar
                  esta sequência de forma personalizada.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mt-6">
            <Link href="/">
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
            <Button
              type="submit"
              disabled={!isFormValid || submitting}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {submitting ? 'Criando...' : 'Configurar Estrutura da Aula'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
