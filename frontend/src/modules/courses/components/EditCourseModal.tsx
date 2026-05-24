'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CategoryCombobox } from '@/components/ui/category-combobox';
import { DatePicker } from '@/components/ui/date-picker';

interface EditCourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: {
    id: string;
    name: string;
    category: string;
    description: string;
    learningObjectives?: string;
    start_date?: string | null;
    end_date?: string | null;
  };
  onSave: (data: {
    name: string;
    category: string;
    description: string;
    learningObjectives: string;
    start_date: string;
    end_date: string;
  }) => void;
}

export function EditCourseModal({ open, onOpenChange, course, onSave }: EditCourseModalProps) {
  const [name, setName] = useState(course.name);
  const [category, setCategory] = useState(course.category);
  const [description, setDescription] = useState(course.description);
  const [learningObjectives, setLearningObjectives] = useState(course.learningObjectives ?? '');
  const [startDate, setStartDate] = useState<Date | undefined>(
    course.start_date ? new Date(course.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    course.end_date ? new Date(course.end_date) : undefined
  );

  useEffect(() => {
    if (open) {
      setName(course.name);
      setCategory(course.category);
      setDescription(course.description);
      setLearningObjectives(course.learningObjectives ?? '');
      setStartDate(course.start_date ? new Date(course.start_date) : undefined);
      setEndDate(course.end_date ? new Date(course.end_date) : undefined);
    }
  }, [open, course]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category || !description.trim() || !startDate) return;
    onSave({
      name,
      category,
      description,
      learningObjectives,
      start_date: startDate.toISOString(),
      end_date: endDate ? endDate.toISOString() : '',
    });
    onOpenChange(false);
  };

  const isValid = name.trim() && category && description.trim() && startDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Curso</DialogTitle>
          <DialogDescription>Atualize as informações do curso</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do Curso *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Introdução à Programação"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria *</Label>
              <CategoryCombobox value={category} onChange={setCategory} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição *</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o conteúdo e objetivos do curso..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-objectives">Objetivos de Aprendizagem</Label>
              <Textarea
                id="edit-objectives"
                value={learningObjectives}
                onChange={(e) => setLearningObjectives(e.target.value)}
                placeholder="Liste os principais objetivos de aprendizagem..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início *</Label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Selecionar início"
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Fim <span className="text-slate-400 font-normal">(opcional)</span></Label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Selecionar fim"
                  disabled={startDate ? (date) => date < startDate : undefined}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!isValid} className="bg-violet-600 hover:bg-violet-700">Salvar Alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
