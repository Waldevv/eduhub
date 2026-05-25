'use client';

import { useState, useEffect, useRef } from "react";
import { Block } from "@/types/lesson";
import { uploadFile } from "@/lib/supabase";
import { quizzesApi, discordApi, type Quiz, type DiscordServer } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Link2, Hash, Volume2, MessageSquare, AlignLeft, Server } from "lucide-react";

interface BlockConfigModalProps {
  block: Block | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (block: Block) => void;
  allBlocks?: Block[];
  courseId?: string;
}

export function BlockConfigModal({ block, isOpen, onClose, onSave, allBlocks = [], courseId }: BlockConfigModalProps) {
  const [editedBlock, setEditedBlock] = useState<Block | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [materialUploading, setMaterialUploading] = useState(false);
  const [materialUploadError, setMaterialUploadError] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [discordServer, setDiscordServer] = useState<DiscordServer | null | 'loading'>('loading');
  const [botActive, setBotActive] = useState(false);
  const [hasCommunity, setHasCommunity] = useState(false);
  const [existingChannels, setExistingChannels] = useState<{ id: string; name: string; type: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const materialFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (block) {
      const initialized = { ...block };
      if (block.type === 'interaction') {
        initialized.config = {
          interactionType: 'text',
          channelSource: 'new',
          completionCriteria: 'access',
          ...block.config,
        };
      }
      if (block.type === 'exam' || block.type === 'activity' || block.type === 'consolidation') {
        initialized.config = {
          maxScore: 10,
          ...block.config,
        };
      }
      if (block.type === 'evaluation') {
        const examBlockIds = allBlocks
          .filter(b => b.type === 'exam' && b.order < block.order)
          .map(b => b.id);
        initialized.config = {
          evaluationType: 'simple_average',
          weights: {},
          ...block.config,
          selectedBlocks: block.config?.selectedBlocks?.length ? block.config.selectedBlocks : examBlockIds,
        };
      }
      setEditedBlock(initialized);
    }
    setUploadError(null);
    setMaterialUploadError(null);
  }, [block]);

  useEffect(() => {
    if (!isOpen) return;
    quizzesApi.list().then(setQuizzes).catch(() => {});
    if ((block?.type === 'interaction' || block?.type === 'consolidation') && courseId) {
      setDiscordServer('loading');
      discordApi.getServer(courseId)
        .then(async (server) => {
          setDiscordServer(server);
          const { inGuild, hasCommunity: hc } = await discordApi.checkBotStatus(server.discord_guild_id);
          setBotActive(inGuild);
          setHasCommunity(hc ?? false);
          if (inGuild) {
            discordApi.getChannels(server.discord_guild_id).then(setExistingChannels).catch(() => {});
          }
        })
        .catch(() => { setDiscordServer(null); setBotActive(false); });
    }
  }, [isOpen, block?.type, courseId]);

  if (!editedBlock) return null;

  const handleSave = () => {
    const cfg = editedBlock?.config;
    const isQuizBlock =
      ((editedBlock?.type === 'exam' || editedBlock?.type === 'activity') &&
        (!cfg?.activityType || cfg?.activityType === 'quiz')) ||
      (editedBlock?.type === 'consolidation' && cfg?.consolidationType === 'quiz');
    if (isQuizBlock && !cfg?.maxScore) {
      setSaveError('Pontuação Máxima é obrigatória para blocos com quiz.');
      return;
    }
    setSaveError(null);
    onSave(editedBlock);
    onClose();
  };

  const updateConfig = (updates: Partial<Block['config']>) => {
    setEditedBlock({ ...editedBlock, config: { ...editedBlock.config, ...updates } });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadFile(file);
      updateConfig({ fileUrl: url, text: file.name });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  const handleMaterialFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMaterialUploading(true);
    setMaterialUploadError(null);
    try {
      const url = await uploadFile(file);
      updateConfig({ materialUrl: url, estimatedTime: file.name });
    } catch (err) {
      setMaterialUploadError(err instanceof Error ? err.message : 'Erro ao fazer upload');
    } finally {
      setMaterialUploading(false);
    }
  };

  const getTotalWeight = () => {
    const weights = editedBlock.config?.weights || {};
    return Object.values(weights).reduce((sum, w) => sum + w, 0) || 1;
  };

  const prevBlocks = allBlocks.filter(
    (b) => b.id !== editedBlock.id && (b.type === 'activity' || b.type === 'exam' || b.type === 'consolidation')
  );

  const toggleSelectedBlock = (blockId: string, checked: boolean) => {
    const current = editedBlock.config?.selectedBlocks || [];
    updateConfig({ selectedBlocks: checked ? [...current, blockId] : current.filter((id) => id !== blockId) });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Bloco: {editedBlock.title}</DialogTitle>
          <DialogDescription>Configure os detalhes deste bloco instrucional</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título do Bloco</Label>
              <Input
                value={editedBlock.title}
                onChange={(e) => setEditedBlock({ ...editedBlock, title: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Bloco Obrigatório</Label>
                <p className="text-sm text-slate-500">Aluno deve completar para prosseguir</p>
              </div>
              <Switch
                checked={editedBlock.required ?? true}
                onCheckedChange={(checked) => setEditedBlock({ ...editedBlock, required: checked })}
              />
            </div>
          </div>

          {editedBlock.type === 'content' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Conteúdo</Label>
                <Select
                  value={editedBlock.config?.contentType || 'text'}
                  onValueChange={(value) => updateConfig({ contentType: value as 'video' | 'text' | 'file' | 'external' })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="file">Arquivo</SelectItem>
                    <SelectItem value="external">Link Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editedBlock.config?.contentType === 'video' && (
                <div className="space-y-2">
                  <Label>URL do Vídeo</Label>
                  <Input
                    placeholder="https://youtube.com/watch?v=..."
                    value={editedBlock.config?.videoUrl || ''}
                    onChange={(e) => updateConfig({ videoUrl: e.target.value })}
                  />
                </div>
              )}
              {(!editedBlock.config?.contentType || editedBlock.config?.contentType === 'text') && (
                <div className="space-y-2">
                  <Label>Conteúdo em Texto</Label>
                  <Textarea
                    rows={6}
                    placeholder="Digite ou cole o conteúdo..."
                    value={editedBlock.config?.text || ''}
                    onChange={(e) => updateConfig({ text: e.target.value })}
                  />
                </div>
              )}
              {editedBlock.config?.contentType === 'file' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {editedBlock.config?.fileUrl ? (
                    <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-green-800">Arquivo enviado com sucesso</p>
                      <p className="text-xs text-green-700 mt-1 truncate">{editedBlock.config.text}</p>
                      <button
                        type="button"
                        onClick={() => { updateConfig({ fileUrl: undefined, text: undefined }); }}
                        className="text-xs text-red-600 hover:underline mt-2"
                      >
                        Remover arquivo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-teal-400 hover:bg-teal-50 transition-colors disabled:opacity-50"
                    >
                      {uploading ? (
                        <p className="text-sm text-teal-700">Enviando arquivo...</p>
                      ) : (
                        <>
                          <p className="text-sm text-slate-600">Clique para fazer upload</p>
                          <p className="text-xs text-slate-500 mt-1">PDF, DOCX, PPTX, XLSX até 50MB</p>
                        </>
                      )}
                    </button>
                  )}
                  {uploadError && (
                    <p className="text-xs text-red-600">{uploadError}</p>
                  )}
                </div>
              )}
              {editedBlock.config?.contentType === 'external' && (
                <div className="space-y-2">
                  <Label>URL do Material Externo</Label>
                  <Input
                    placeholder="https://..."
                    value={editedBlock.config?.externalUrl || ''}
                    onChange={(e) => updateConfig({ externalUrl: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {(editedBlock.type === 'activity' || editedBlock.type === 'exam') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Atividade</Label>
                <Select
                  value={editedBlock.config?.activityType || 'quiz'}
                  onValueChange={(value) => updateConfig({ activityType: value as 'quiz' | 'assignment' | 'link' })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz / Questionário</SelectItem>
                    <SelectItem value="assignment">Tarefa / Entrega</SelectItem>
                    <SelectItem value="link">Link Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(!editedBlock.config?.activityType || editedBlock.config?.activityType === 'quiz') && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Selecionar Quiz</Label>
                    <Select
                      value={editedBlock.config?.quizId || ''}
                      onValueChange={(value) => updateConfig({ quizId: value })}
                    >
                      <SelectTrigger><SelectValue placeholder={quizzes.length === 0 ? 'Nenhum quiz disponível' : 'Escolha um quiz'} /></SelectTrigger>
                      <SelectContent>
                        {quizzes.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.title} ({q._count?.questions ?? 0} questões)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {quizzes.length === 0 && (
                      <p className="text-xs text-slate-500">
                        Crie quizzes no <a href="/quiz-library" target="_blank" className="text-teal-700 underline">Banco de Questões</a> antes de usar aqui.
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pontuação Máxima <span className="text-red-500 font-normal text-xs ml-1">*obrigatório</span></Label>
                      <Input
                        type="number"
                        min="0"
                        value={String(editedBlock.config?.maxScore ?? 10)}
                        onChange={(e) => updateConfig({ maxScore: e.target.value })}
                        className={!editedBlock.config?.maxScore ? 'border-red-300 focus-visible:ring-red-400' : ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tempo Limite (min) <span className="text-slate-400 font-normal text-xs ml-1">opcional</span></Label>
                      <Input
                        type="number"
                        placeholder="30"
                        value={String(editedBlock.config?.timeLimit || '')}
                        onChange={(e) => updateConfig({ timeLimit: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {editedBlock.config?.activityType === 'assignment' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Descrição da Tarefa</Label>
                    <Textarea
                      rows={4}
                      placeholder="Descreva o que os estudantes devem fazer..."
                      value={editedBlock.config?.description || ''}
                      onChange={(e) => updateConfig({ description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Material de Apoio</Label>
                    <div className="grid grid-cols-3 rounded-lg border border-slate-200 overflow-hidden text-sm font-medium">
                      {(['none', 'file', 'link'] as const).map((opt) => {
                        const labels = { none: 'Nenhum', file: 'Arquivo', link: 'Link' };
                        const current = editedBlock.config?.materialType === opt || (!editedBlock.config?.materialType && opt === 'none');
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => updateConfig({ materialType: opt, materialUrl: undefined, estimatedTime: undefined })}
                            className={`py-2 text-center transition-colors ${current ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                          >
                            {labels[opt]}
                          </button>
                        );
                      })}
                    </div>

                    {editedBlock.config?.materialType === 'file' && (
                      <div className="space-y-2 mt-2">
                        <input
                          ref={materialFileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                          className="hidden"
                          onChange={handleMaterialFileChange}
                        />
                        {editedBlock.config?.materialUrl ? (
                          <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-green-800">Arquivo enviado</p>
                            <p className="text-xs text-green-700 mt-0.5 truncate">{editedBlock.config.estimatedTime}</p>
                            <button
                              type="button"
                              onClick={() => updateConfig({ materialUrl: undefined, estimatedTime: undefined })}
                              className="text-xs text-red-600 hover:underline mt-1"
                            >
                              Remover
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => materialFileInputRef.current?.click()}
                            disabled={materialUploading}
                            className="w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-teal-400 hover:bg-teal-50 transition-colors disabled:opacity-50"
                          >
                            {materialUploading ? (
                              <p className="text-sm text-teal-700">Enviando...</p>
                            ) : (
                              <>
                                <p className="text-sm text-slate-600">Clique para fazer upload</p>
                                <p className="text-xs text-slate-500 mt-0.5">PDF, DOCX, XLSX, ZIP até 50MB</p>
                              </>
                            )}
                          </button>
                        )}
                        {materialUploadError && <p className="text-xs text-red-600">{materialUploadError}</p>}
                      </div>
                    )}

                    {editedBlock.config?.materialType === 'link' && (
                      <div className="mt-2 space-y-1">
                        <Input
                          placeholder="https://..."
                          value={editedBlock.config?.materialUrl || ''}
                          onChange={(e) => updateConfig({ materialUrl: e.target.value })}
                        />
                        <p className="text-xs text-slate-500">Link para material externo (Google Drive, GitHub, etc.)</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pontuação Máxima</Label>
                      <Input
                        type="number"
                        placeholder="100"
                        value={String(editedBlock.config?.maxScore || '')}
                        onChange={(e) => updateConfig({ maxScore: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Prazo (dias)</Label>
                      <Input
                        type="number"
                        placeholder="7"
                        value={String(editedBlock.config?.deadline || '')}
                        onChange={(e) => updateConfig({ deadline: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Entrega</Label>
                    <Select
                      value={editedBlock.config?.submissionType || 'file_upload'}
                      onValueChange={(value) => updateConfig({ submissionType: value as 'file_upload' | 'text' | 'link' | 'file_text' })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="file_upload">Upload de Arquivo</SelectItem>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="link">Link</SelectItem>
                        <SelectItem value="file_text">Arquivo + Texto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Permitir entrega atrasada</Label>
                      <p className="text-sm text-slate-500">Com penalidade de pontos</p>
                    </div>
                    <Switch
                      checked={editedBlock.config?.allowLateSubmission ?? false}
                      onCheckedChange={(checked) => updateConfig({ allowLateSubmission: checked })}
                    />
                  </div>
                </div>
              )}

              {editedBlock.config?.activityType === 'link' && (
                <div className="space-y-2">
                  <Label>URL da Atividade</Label>
                  <Input
                    placeholder="https://..."
                    value={editedBlock.config?.externalUrl || ''}
                    onChange={(e) => updateConfig({ externalUrl: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">Link externo onde o estudante realizará a atividade</p>
                </div>
              )}
            </div>
          )}

          {editedBlock.type === 'interaction' && (
            <div className="space-y-4">
              {(discordServer === null || (discordServer !== 'loading' && !botActive)) && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      {discordServer === null
                        ? 'Nenhum servidor Discord vinculado ao curso'
                        : 'Bot ausente do servidor Discord'}
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      {discordServer === null
                        ? 'Acesse a página do curso e vincule um servidor Discord antes de configurar este bloco.'
                        : 'O bot foi removido do servidor. Acesse a página do curso e reabilite o bot.'}
                    </p>
                  </div>
                </div>
              )}

              {discordServer === 'loading' && (
                <p className="text-sm text-slate-500 text-center py-4">Verificando servidor Discord...</p>
              )}

              {discordServer !== null && discordServer !== 'loading' && botActive && (
                <>
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                    <Server className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800 font-medium">{discordServer.server_name}</span>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Interação</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: 'text',   label: 'Canal de Texto', icon: Hash },
                        { value: 'forum',  label: 'Fórum',          icon: AlignLeft },
                        { value: 'thread', label: 'Tópico',         icon: MessageSquare },
                        { value: 'voice',  label: 'Chamada',        icon: Volume2 },
                      ] as const).map(({ value, label, icon: Icon }) => {
                        const active = (editedBlock.config?.interactionType || 'text') === value;
                        return (
                          <button key={value} type="button"
                            onClick={() => updateConfig({ interactionType: value, ...(value !== 'thread' ? { channelSource: 'new', existingChannelId: undefined } : {}) })}
                            className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                              active ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}>
                            <Icon className="w-4 h-4 flex-shrink-0" />{label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {editedBlock.config?.interactionType === 'thread' && (
                    <div className="space-y-2">
                      <Label>Canal no Discord</Label>
                      <div className="grid grid-cols-2 rounded-lg border border-slate-200 overflow-hidden text-sm font-medium">
                        {(['new', 'existing'] as const).map((opt) => {
                          const current = (editedBlock.config?.channelSource || 'new') === opt;
                          return (
                            <button key={opt} type="button"
                              onClick={() => updateConfig({ channelSource: opt, existingChannelId: undefined })}
                              className={`py-2 text-center transition-colors ${current ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                              {opt === 'new' ? '✦ Criar novo (recomendado)' : 'Selecionar existente'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(editedBlock.config?.channelSource || 'new') === 'new' ? (
                    <div className="space-y-2">
                      <Label>Nome do Canal</Label>
                      <Input
                        placeholder="ex: discussao-aula-1"
                        value={editedBlock.config?.channelName || ''}
                        onChange={(e) => updateConfig({ channelName: e.target.value })}
                      />
                      <p className="text-xs text-slate-500">O canal será criado automaticamente no Discord ao publicar a aula, dentro de uma categoria com o nome da aula.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Canal Existente</Label>
                      <Select
                        value={editedBlock.config?.existingChannelId || ''}
                        onValueChange={(v) => updateConfig({ existingChannelId: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione um canal" /></SelectTrigger>
                        <SelectContent>
                          {existingChannels.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.type === 2 ? '🔊' : c.type === 5 ? '📋' : '#'} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-400">Este canal não será reorganizado — permanece onde está no Discord.</p>
                    </div>
                  )}

                  {editedBlock.config?.interactionType === 'thread' && (
                    <div className="space-y-2">
                      <Label>
                        Nome do Tópico{' '}
                        <span className="text-red-500 font-normal text-xs ml-1">*obrigatório</span>
                      </Label>
                      <Input
                        placeholder="ex: Discussão sobre o tema da aula..."
                        value={editedBlock.config?.topicName || ''}
                        onChange={(e) => updateConfig({ topicName: e.target.value })}
                        className={!editedBlock.config?.topicName ? 'border-red-300 focus-visible:ring-red-400' : ''}
                      />
                      {!editedBlock.config?.topicName && (
                        <p className="text-xs text-red-600">Defina o nome do tópico que será criado dentro do canal.</p>
                      )}
                    </div>
                  )}

                  {editedBlock.config?.interactionType === 'voice' && (
                    <div className="space-y-2">
                      <Label>Tipo de Chamada</Label>
                      <div className="grid grid-cols-2 rounded-lg border border-slate-200 overflow-hidden text-sm font-medium">
                        {(['voice', 'stage'] as const).map((opt) => {
                          const current = (editedBlock.config?.callType || 'voice') === opt;
                          return (
                            <button key={opt} type="button"
                              onClick={() => updateConfig({ callType: opt })}
                              className={`py-2 text-center transition-colors ${current ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                              {opt === 'voice' ? 'Voz' : 'Palco'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {editedBlock.config?.interactionType === 'voice' && editedBlock.config?.callType === 'stage' && !hasCommunity && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                      <p className="text-xs text-amber-800">
                        Seu servidor não tem o <strong>modo Comunidade</strong> ativo. Será criado um canal de voz e o evento será agendado normalmente. Ative o modo Comunidade nas configurações do Discord para aproveitar a experiência completa de Palco.
                      </p>
                    </div>
                  )}

                  {editedBlock.config?.interactionType === 'voice' && editedBlock.config?.callType === 'stage' && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                      <p className="text-xs text-blue-800">
                        Canais de Palco exigem que os participantes <strong>confirmem ter 18 anos ou mais</strong> para falar. Os estudantes conseguem entrar e ouvir normalmente, mas precisam fazer essa verificação uma vez no Discord para serem promovidos a falantes.
                      </p>
                    </div>
                  )}

                  {editedBlock.config?.interactionType === 'voice' && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>
                          Data e Hora do Evento{' '}
                          <span className="text-red-500 font-normal text-xs ml-1">*obrigatório</span>
                        </Label>
                        <Input
                          type="datetime-local"
                          min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + 3600000).toISOString().slice(0, 16)}
                          value={editedBlock.config?.scheduledAt || ''}
                          onChange={(e) => {
                            const minVal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + 3600000).toISOString().slice(0, 16);
                            updateConfig({ scheduledAt: e.target.value < minVal ? minVal : e.target.value });
                          }}
                          className={!editedBlock.config?.scheduledAt ? 'border-red-300 focus-visible:ring-red-400' : ''}
                        />
                        {!editedBlock.config?.scheduledAt && (
                          <p className="text-xs text-red-600">Defina a data e hora para criar o evento no Discord.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição do Evento <span className="text-slate-400 font-normal text-xs ml-1">opcional</span></Label>
                        <Textarea
                          rows={3}
                          placeholder="Descreva o que será abordado nesta chamada..."
                          value={editedBlock.config?.eventDescription || ''}
                          onChange={(e) => updateConfig({ eventDescription: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Janela de entrada <span className="text-slate-400 font-normal text-xs ml-1">minutos após o início</span></Label>
                        <Input
                          type="number"
                          min={5}
                          max={240}
                          value={editedBlock.config?.joinWindowMinutes ?? 30}
                          onChange={(e) => updateConfig({ joinWindowMinutes: Math.max(5, parseInt(e.target.value) || 30) })}
                          className="w-28"
                        />
                        <p className="text-xs text-slate-500">Estudantes que entrarem dentro desse prazo são marcados como presentes. Após o prazo, ausência é registrada automaticamente.</p>
                      </div>
                    </div>
                  )}

                  {editedBlock.config?.interactionType === 'thread' && (
                    <div className="space-y-2">
                      <Label>
                        Mensagem Inicial{' '}
                        <span className="text-red-500 font-normal text-xs ml-1">*obrigatória</span>
                      </Label>
                      <Textarea
                        rows={3}
                        placeholder="Mensagem de abertura do tópico (obrigatória)..."
                        value={editedBlock.config?.initialMessage || ''}
                        onChange={(e) => updateConfig({ initialMessage: e.target.value })}
                        className={
                          !editedBlock.config?.initialMessage
                            ? 'border-red-300 focus-visible:ring-red-400'
                            : ''
                        }
                      />
                      {!editedBlock.config?.initialMessage && (
                        <p className="text-xs text-red-600">A mensagem inicial é necessária para abrir o tópico no Discord.</p>
                      )}
                    </div>
                  )}

                  {editedBlock.config?.interactionType === 'voice' ? (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-600">
                      Conclusão automática quando o estudante entrar no canal de voz/palco.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Mínimo de mensagens para concluir</Label>
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={editedBlock.config?.minMessages ?? 1}
                        onChange={(e) => updateConfig({ minMessages: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-28"
                      />
                      <p className="text-xs text-slate-500">
                        O estudante deve enviar ao menos esse número de mensagens no canal. Este valor não é exibido para o estudante.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {editedBlock.type === 'consolidation' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Consolidação</Label>
                <Select
                  value={editedBlock.config?.consolidationType || 'quiz'}
                  onValueChange={(value) => updateConfig({ consolidationType: value as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz de Revisão</SelectItem>
                    <SelectItem value="guided_stage">Revisão Guiada (Chamada)</SelectItem>
                    <SelectItem value="summary">Resumo / Síntese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(editedBlock.config?.consolidationType === 'quiz' || !editedBlock.config?.consolidationType) && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Selecionar Quiz</Label>
                    <Select
                      value={editedBlock.config?.quizId || ''}
                      onValueChange={(value) => updateConfig({ quizId: value })}
                    >
                      <SelectTrigger><SelectValue placeholder={quizzes.length === 0 ? 'Nenhum quiz disponível' : 'Escolha um quiz'} /></SelectTrigger>
                      <SelectContent>
                        {quizzes.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.title} ({q._count?.questions ?? 0} questões)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pontuação Máxima <span className="text-red-500 font-normal text-xs ml-1">*obrigatório</span></Label>
                      <Input type="number" min="0" value={String(editedBlock.config?.maxScore ?? 10)} onChange={(e) => updateConfig({ maxScore: e.target.value })} className={!editedBlock.config?.maxScore ? 'border-red-300 focus-visible:ring-red-400' : ''} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tempo Limite (min) <span className="text-slate-400 font-normal text-xs ml-1">opcional</span></Label>
                      <Input type="number" placeholder="30" value={String(editedBlock.config?.timeLimit || '')} onChange={(e) => updateConfig({ timeLimit: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Material de Apoio</Label>
                    <div className="grid grid-cols-3 rounded-lg border border-slate-200 overflow-hidden text-sm font-medium">
                      {(['none', 'file', 'link'] as const).map((opt) => {
                        const labels = { none: 'Nenhum', file: 'Arquivo', link: 'Link' };
                        const current = editedBlock.config?.materialType === opt || (!editedBlock.config?.materialType && opt === 'none');
                        return (
                          <button key={opt} type="button"
                            onClick={() => updateConfig({ materialType: opt, materialUrl: undefined, estimatedTime: undefined })}
                            className={`py-2 text-center transition-colors ${current ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                            {labels[opt]}
                          </button>
                        );
                      })}
                    </div>
                    {editedBlock.config?.materialType === 'link' && (
                      <Input placeholder="https://..." value={editedBlock.config?.materialUrl || ''} onChange={(e) => updateConfig({ materialUrl: e.target.value })} className="mt-2" />
                    )}
                    {editedBlock.config?.materialType === 'file' && (
                      <div className="mt-2">
                        {editedBlock.config?.materialUrl ? (
                          <div className="border border-green-200 bg-green-50 rounded-lg px-4 py-3 flex items-center justify-between">
                            <p className="text-sm font-medium text-green-800">Arquivo enviado com sucesso</p>
                            <button type="button" onClick={() => updateConfig({ materialUrl: undefined })} className="text-xs text-red-600 hover:underline ml-4">Remover</button>
                          </div>
                        ) : (
                          <button type="button"
                            className="w-full border-2 border-dashed border-slate-300 rounded-lg p-5 text-center hover:border-teal-400 hover:bg-teal-50 transition-colors"
                            onClick={async () => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = '.pdf,.doc,.docx,.ppt,.pptx';
                              input.onchange = async (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (!file) return;
                                try {
                                  const { uploadFile } = await import('@/lib/supabase');
                                  const url = await uploadFile(file);
                                  updateConfig({ materialUrl: url });
                                } catch {}
                              };
                              input.click();
                            }}>
                            <p className="text-sm text-slate-600">Clique para fazer upload</p>
                            <p className="text-xs text-slate-500 mt-1">PDF, DOCX, PPTX até 50MB</p>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {editedBlock.config?.consolidationType === 'guided_stage' && (
                <div className="space-y-4">
                  {(discordServer === null || (discordServer !== 'loading' && !botActive)) && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">
                        {discordServer === null ? 'Nenhum servidor Discord vinculado ao curso.' : 'Bot ausente do servidor Discord.'}
                      </p>
                    </div>
                  )}
                  {discordServer !== null && discordServer !== 'loading' && botActive && (
                    <>
                      <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                        <Server className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-800 font-medium">{discordServer.server_name}</span>
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Chamada</Label>
                        <div className="grid grid-cols-2 rounded-lg border border-slate-200 overflow-hidden text-sm font-medium">
                          {(['voice', 'stage'] as const).map((opt) => {
                            const current = (editedBlock.config?.callType || 'voice') === opt;
                            return (
                              <button key={opt} type="button"
                                onClick={() => updateConfig({ callType: opt })}
                                className={`py-2 text-center transition-colors ${current ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                                {opt === 'voice' ? 'Voz' : 'Palco'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Nome do Canal</Label>
                        <Input placeholder="ex: revisao-final" value={editedBlock.config?.channelName || ''} onChange={(e) => updateConfig({ channelName: e.target.value })} />
                      </div>
                      {editedBlock.config?.callType === 'stage' && !hasCommunity && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                          <p className="text-xs text-amber-800">Servidor sem <strong>modo Comunidade</strong>. Será criado canal de voz. Ative o modo Comunidade para experiência completa de Palco.</p>
                        </div>
                      )}
                      {editedBlock.config?.callType === 'stage' && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                          <p className="text-xs text-blue-800">Canais de Palco exigem que participantes <strong>confirmem ter 18 anos ou mais</strong> para falar.</p>
                        </div>
                      )}
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Data e Hora do Evento <span className="text-red-500 font-normal text-xs ml-1">*obrigatório</span></Label>
                          <Input type="datetime-local"
                            min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + 3600000).toISOString().slice(0, 16)}
                            value={editedBlock.config?.scheduledAt || ''}
                            onChange={(e) => {
                              const minVal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + 3600000).toISOString().slice(0, 16);
                              updateConfig({ scheduledAt: e.target.value < minVal ? minVal : e.target.value });
                            }}
                            className={!editedBlock.config?.scheduledAt ? 'border-red-300 focus-visible:ring-red-400' : ''} />
                        </div>
                        <div className="space-y-2">
                          <Label>Descrição do Evento <span className="text-slate-400 font-normal text-xs ml-1">opcional</span></Label>
                          <Textarea rows={3} placeholder="Descreva o que será abordado nesta chamada..."
                            value={editedBlock.config?.eventDescription || ''}
                            onChange={(e) => updateConfig({ eventDescription: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Janela de entrada <span className="text-slate-400 font-normal text-xs ml-1">minutos após o início</span></Label>
                          <Input
                            type="number"
                            min={5}
                            max={240}
                            value={editedBlock.config?.joinWindowMinutes ?? 30}
                            onChange={(e) => updateConfig({ joinWindowMinutes: Math.max(5, parseInt(e.target.value) || 30) })}
                            className="w-28"
                          />
                          <p className="text-xs text-slate-500">Estudantes que entrarem dentro desse prazo são marcados como presentes. Após o prazo, ausência é registrada automaticamente.</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {editedBlock.config?.consolidationType === 'summary' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Resumo</Label>
                    <div className="grid grid-cols-2 rounded-lg border border-slate-200 overflow-hidden text-sm font-medium">
                      {(['text', 'file'] as const).map((opt) => {
                        const current = (editedBlock.config?.summaryType || 'text') === opt;
                        return (
                          <button key={opt} type="button"
                            onClick={() => updateConfig({ summaryType: opt })}
                            className={`py-2 text-center transition-colors ${current ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                            {opt === 'text' ? 'Texto' : 'Arquivo'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {(editedBlock.config?.summaryType || 'text') === 'text' && (
                    <div className="space-y-2">
                      <Label>Texto de Encerramento</Label>
                      <Textarea rows={6} placeholder="Escreva o resumo ou síntese desta aula..."
                        value={editedBlock.config?.summaryText || ''}
                        onChange={(e) => updateConfig({ summaryText: e.target.value })} />
                    </div>
                  )}
                  {editedBlock.config?.summaryType === 'file' && (
                    <div className="space-y-2">
                      <Label>Arquivo de Encerramento</Label>
                      {editedBlock.config?.summaryFileUrl ? (
                        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                          <p className="text-sm font-medium text-green-800">Arquivo enviado com sucesso</p>
                          <button type="button" onClick={() => updateConfig({ summaryFileUrl: undefined })} className="text-xs text-red-600 hover:underline mt-2">Remover arquivo</button>
                        </div>
                      ) : (
                        <button type="button"
                          className="w-full border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-teal-400 hover:bg-teal-50 transition-colors"
                          onClick={async () => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.pdf,.doc,.docx,.ppt,.pptx';
                            input.onchange = async (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (!file) return;
                              try {
                                const { uploadFile } = await import('@/lib/supabase');
                                const url = await uploadFile(file);
                                updateConfig({ summaryFileUrl: url });
                              } catch {}
                            };
                            input.click();
                          }}>
                          <p className="text-sm text-slate-600">Clique para fazer upload</p>
                          <p className="text-xs text-slate-500 mt-1">PDF, DOCX, PPTX até 50MB</p>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {editedBlock.type === 'evaluation' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Avaliação</Label>
                <Select
                  value={editedBlock.config?.evaluationType || 'simple_average'}
                  onValueChange={(value) =>
                    updateConfig({ evaluationType: value as 'simple_average' | 'weighted_average' | 'sum' | 'custom', selectedBlocks: [], weights: {} })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple_average">Média Simples</SelectItem>
                    <SelectItem value="weighted_average">Média Ponderada</SelectItem>
                    <SelectItem value="sum">Soma de Notas</SelectItem>
                    <SelectItem value="custom">Avaliação Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(!editedBlock.config?.evaluationType ||
                editedBlock.config?.evaluationType === 'simple_average' ||
                editedBlock.config?.evaluationType === 'sum' ||
                editedBlock.config?.evaluationType === 'weighted_average') && (
                <div className="space-y-3">
                  <Label>Blocos Avaliativos</Label>
                  <div className="border border-slate-200 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                    {prevBlocks.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">
                        Nenhum bloco avaliativo anterior encontrado
                      </p>
                    ) : (
                      prevBlocks.map((b) => {
                        const isSelected = (editedBlock.config?.selectedBlocks || []).includes(b.id);
                        const weight = editedBlock.config?.weights?.[b.id] || 1;
                        return (
                          <div key={b.id} className={`p-3 border rounded ${isSelected ? 'bg-teal-50 border-teal-200' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`eval-${b.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => toggleSelectedBlock(b.id, !!checked)}
                              />
                              <label htmlFor={`eval-${b.id}`} className="flex-1 text-sm font-medium cursor-pointer">
                                {b.title}
                              </label>
                            </div>
                            {isSelected && editedBlock.config?.evaluationType === 'weighted_average' && (
                              <div className="ml-7 mt-2 flex items-center gap-2">
                                <Label className="text-xs">Peso:</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={weight}
                                  onChange={(e) => updateConfig({ weights: { ...(editedBlock.config?.weights || {}), [b.id]: parseFloat(e.target.value) || 1 } })}
                                  className="w-20 h-8 text-sm"
                                />
                                <span className="text-xs text-slate-500">({(weight * 100 / getTotalWeight()).toFixed(0)}%)</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {editedBlock.config?.evaluationType === 'custom' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Fórmula Personalizada</Label>
                    <Textarea
                      rows={4}
                      placeholder="Ex: (B1 + B2) / 2 * 0.7 + B3 * 0.3"
                      value={editedBlock.config?.customFormula || ''}
                      onChange={(e) => updateConfig({ customFormula: e.target.value })}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500">Use B1, B2, B3... para referenciar os blocos na ordem</p>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                  Este bloco não é executado pelo estudante. Ele consolida automaticamente as notas dos blocos selecionados.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <Label>
            Exibir para os Estudantes{' '}
            <span className="text-slate-400 font-normal text-xs ml-1">opcional</span>
          </Label>
          <Textarea
            rows={2}
            placeholder="Breve descrição visível na sequência da aula para os estudantes..."
            value={editedBlock.config?.studentDescription || ''}
            onChange={(e) => updateConfig({ studentDescription: e.target.value })}
          />
          <p className="text-xs text-slate-500">
            Aparece como subtítulo abaixo do nome do bloco. Se não preenchido, uma mensagem padrão será exibida.
          </p>
        </div>

        <DialogFooter className="flex-col items-end gap-2">
          {saveError && <p className="text-xs text-red-600 w-full text-right">{saveError}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700">
              Salvar Configuração
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
