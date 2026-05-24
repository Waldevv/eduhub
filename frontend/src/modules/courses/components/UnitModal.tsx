'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type Unit } from '@/lib/api';

interface UnitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit?: Unit;
  onSave: (data: { title: string; description: string; pedagogical_guidance: string }) => void;
}

export function UnitModal({ open, onOpenChange, unit, onSave }: UnitModalProps) {
  const isEditing = !!unit;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pedagogicalGuidance, setPedagogicalGuidance] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(unit?.title ?? '');
      setDescription(unit?.description ?? '');
      setPedagogicalGuidance(unit?.pedagogical_guidance ?? '');
    }
  }, [open, unit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), description: description.trim(), pedagogical_guidance: pedagogicalGuidance.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Aula' : 'Nova Aula'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações da aula' : 'Defina os dados iniciais da aula antes de configurar os blocos'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="unit-title">Título da Aula *</Label>
              <Input
                id="unit-title"
                placeholder="Ex: Introdução ao HTML e CSS"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit-description">Descrição</Label>
              <Textarea
                id="unit-description"
                placeholder="Descreva o conteúdo e os objetivos desta aula..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit-guidance">
                Orientações Pedagógicas{' '}
                <span className="text-slate-400 font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="unit-guidance"
                placeholder="Metodologia, abordagem de aprendizado, observações para o professor..."
                rows={3}
                value={pedagogicalGuidance}
                onChange={(e) => setPedagogicalGuidance(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Visível apenas para o professor como suporte ao planejamento didático
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim()} className="bg-violet-600 hover:bg-violet-700">
              {isEditing ? 'Salvar Alterações' : 'Criar Aula'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
