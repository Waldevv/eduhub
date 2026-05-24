'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, CheckSquare, MessageSquare, Target, ArrowRight, Info } from "lucide-react";
import Link from "next/link";

export function WelcomeBanner({ onDismiss }: { onDismiss?: () => void }) {
  return (
    <Card className="mb-8 border-2 border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-teal-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <Info className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Bem-vindo à Plataforma de Aprendizado com Fluxo Pedagógico Configurável
            </h3>
            <p className="text-sm text-slate-700 mb-4">
              Crie aulas estruturadas com blocos instrucionais que seguem uma sequência pedagógica personalizada.
              Configure dependências entre blocos e integre discussões do Discord para uma experiência de aprendizagem completa.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Conteúdo</p>
                  <p className="text-xs text-slate-600">Vídeos, textos e materiais</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckSquare className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Atividade</p>
                  <p className="text-xs text-slate-600">Quiz, tarefas e exercícios</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Interação</p>
                  <p className="text-xs text-slate-600">Discussões no Discord</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Consolidação</p>
                  <p className="text-xs text-slate-600">Revisão e síntese</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/lessons/create">
                <Button size="sm" className="bg-teal-700 hover:bg-teal-800">
                  Criar Primeira Aula
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              {onDismiss && (
                <Button size="sm" variant="ghost" onClick={onDismiss}>
                  Entendi
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
