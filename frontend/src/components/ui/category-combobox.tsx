'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { cn } from './utils';

const CATEGORIES = [
  'Programação', 'Desenvolvimento Web', 'Desenvolvimento Mobile', 'Banco de Dados',
  'DevOps', 'Cloud Computing', 'Segurança da Informação', 'Inteligência Artificial',
  'Machine Learning', 'Ciência de Dados', 'Redes de Computadores', 'Sistemas Embarcados',
  'Engenharia de Software', 'Arquitetura de Software', 'Testes de Software',
  'Design Gráfico', 'UI/UX Design', 'Design de Produto', 'Motion Design',
  'Fotografia', 'Edição de Vídeo', 'Modelagem 3D',
  'Física', 'Química', 'Biologia', 'Matemática', 'Estatística',
  'Astronomia', 'Ciências Ambientais', 'Engenharia Civil', 'Engenharia Elétrica',
  'Engenharia Mecânica', 'Engenharia Química',
  'História', 'Filosofia', 'Sociologia', 'Psicologia', 'Antropologia',
  'Ciências Políticas', 'Relações Internacionais', 'Direito', 'Economia',
  'Língua Portuguesa', 'Língua Inglesa', 'Língua Espanhola', 'Língua Francesa',
  'Língua Alemã', 'Literatura', 'Redação', 'Comunicação',
  'Administração', 'Marketing', 'Gestão de Projetos', 'Empreendedorismo',
  'Finanças', 'Contabilidade', 'Recursos Humanos', 'Logística', 'Vendas',
  'Medicina', 'Enfermagem', 'Nutrição', 'Educação Física', 'Psicologia Clínica',
  'Fisioterapia', 'Farmácia',
  'Pedagogia', 'Didática', 'Educação Inclusiva', 'Educação a Distância',
  'Metodologias Ativas',
  'Música', 'Teatro', 'Dança', 'Artes Visuais', 'Cinema',
  'Gastronomia', 'Turismo', 'Arquitetura', 'Urbanismo', 'Agronomia', 'Veterinária',
];

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CategoryCombobox({ value, onChange, placeholder = 'Buscar ou digitar categoria...' }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputValue(value); }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (inputValue.trim()) onChange(inputValue.trim());
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, onChange]);

  const filtered = inputValue.trim()
    ? CATEGORIES.filter(c => c.toLowerCase().includes(inputValue.toLowerCase()))
    : CATEGORIES;

  const handleSelect = (category: string) => {
    onChange(category);
    setInputValue(category);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
          onClick={() => setOpen(o => !o)}
        >
          <ChevronsUpDown className="w-4 h-4 text-slate-400" />
        </Button>
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">
              Nenhuma categoria encontrada.{' '}
              <span className="font-medium text-slate-700">"{inputValue}"</span> será usada como categoria.
            </div>
          ) : (
            filtered.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => handleSelect(category)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between',
                  value === category && 'bg-indigo-50 text-indigo-700'
                )}
              >
                {category}
                {value === category && <Check className="w-4 h-4" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
