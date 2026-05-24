'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CategoryCombobox } from '@/components/ui/category-combobox';
import { DatePicker } from '@/components/ui/date-picker';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CourseFormData) => void;
}

export interface CourseFormData {
  name: string;
  description: string;
  category: string;
  objective: string;
  start_date: string;
  end_date: string;
}

export function CreateCourseModal({ isOpen, onClose, onSave }: CreateCourseModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [objective, setObjective] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const reset = () => {
    setName(''); setDescription(''); setCategory('');
    setObjective(''); setStartDate(undefined); setEndDate(undefined);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      category,
      objective,
      start_date: startDate ? startDate.toISOString() : '',
      end_date: endDate ? endDate.toISOString() : '',
    });
    handleClose();
  };

  const isValid = name.trim() && description.trim() && category.trim() && startDate;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Curso</DialogTitle>
          <DialogDescription>Preencha as informações básicas do curso</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Curso *</Label>
              <Input
                id="name"
                placeholder="Ex: Introdução à Programação em Python"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria *</Label>
              <CategoryCombobox value={category} onChange={setCategory} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                placeholder="Descreva o conteúdo e escopo do curso..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective">Objetivos de Aprendizagem</Label>
              <Textarea
                id="objective"
                placeholder="Liste os principais objetivos e competências..."
                rows={3}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
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
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" disabled={!isValid} className="bg-violet-600 hover:bg-violet-700">
              Criar Curso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
