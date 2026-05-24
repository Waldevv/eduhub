'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { discordApi } from '@/lib/api';
import { Check, ExternalLink, ServerCrash, Bot, Loader2, AlertCircle } from 'lucide-react';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
}

interface Props {
  courseId: string;
  onLinked: () => void;
  onClose: () => void;
  preselectedGuild?: { id: string; name: string; icon: string | null };
}

const BOT_PERMISSIONS = '8';

export function LinkDiscordServerModal({ courseId, onLinked, onClose, preselectedGuild }: Props) {
  const [step, setStep] = useState<1 | 2>(preselectedGuild ? 2 : 1);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Guild | null>(
    preselectedGuild ? { ...preselectedGuild, owner: false } : null
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [inviteOpened, setInviteOpened] = useState(false);
  const [botDetected, setBotDetected] = useState(false);
  const [checking, setChecking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    discordApi.getUserGuilds()
      .then(setGuilds)
      .catch((e: Error) => {
        setLoadError(
          e.message.includes('token') || e.message.includes('login')
            ? 'Sessão Discord expirada. Saia e entre novamente para atualizar.'
            : 'Não foi possível carregar seus servidores.',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (step === 2 && selected) {
      discordApi.checkBotStatus(selected.id)
        .then(({ inGuild }) => { if (inGuild) setBotDetected(true); })
        .catch(() => {});
    }
  }, [step, selected]);

  const startPolling = (guildId: string) => {
    if (pollRef.current) return;
    setChecking(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const { inGuild } = await discordApi.checkBotStatus(guildId);
        if (inGuild) {
          setBotDetected(true);
          setChecking(false);
          clearInterval(pollRef.current!);
          pollRef.current = null;
        }
      } catch {}
      if (attempts >= 40) {
        setChecking(false);
        clearInterval(pollRef.current!);
        pollRef.current = null;
      }
    }, 3000);
  };

  const botInviteUrl = selected
    ? `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=${BOT_PERMISSIONS}&scope=bot&guild_id=${selected.id}&disable_guild_select=true`
    : '#';

  const handleOpenInvite = () => {
    window.open(botInviteUrl, '_blank');
    setInviteOpened(true);
    if (selected) startPolling(selected.id);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    try {
      await discordApi.linkServer({
        course_id: courseId,
        teacher_id: '',
        discord_guild_id: selected.id,
        server_name: selected.name,
      });
      onLinked();
    } catch {
      setSaveError('Erro ao vincular servidor. Tente novamente.');
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular Servidor Discord</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full
            ${step === 1 ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
              ${step === 1 ? 'bg-teal-600 text-white' : 'bg-slate-400 text-white'}`}>1</span>
            Selecionar servidor
          </div>
          <div className="flex-1 h-px bg-slate-200" />
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full
            ${step === 2 ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
              ${step === 2 ? 'bg-teal-600 text-white' : 'bg-slate-400 text-white'}`}>2</span>
            Adicionar bot
          </div>
        </div>

        {step === 1 && (
          <>
            <p className="text-sm text-slate-500 mb-3">
              Selecione o servidor Discord que representa este curso. São exibidos os servidores onde você é dono ou tem permissão de gerenciar.
            </p>

            {loading && (
              <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando servidores...
              </div>
            )}

            {!loading && loadError && (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {loadError}
              </div>
            )}

            {!loading && !loadError && guilds.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ServerCrash className="w-8 h-8 text-slate-300" />
                <p className="text-sm text-slate-500">Nenhum servidor encontrado onde você tem permissão de gerenciar.</p>
              </div>
            )}

            {!loading && guilds.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {guilds.map((guild) => (
                  <button
                    key={guild.id}
                    onClick={() => setSelected(guild)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors
                      ${selected?.id === guild.id
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    {guild.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={guild.icon} alt={guild.name} className="w-9 h-9 rounded-full flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                        {guild.name[0]}
                      </div>
                    )}
                    <span className="flex-1 text-sm font-medium text-slate-800 truncate">{guild.name}</span>
                    {guild.owner && (
                      <span className="text-xs text-slate-400 flex-shrink-0">Dono</span>
                    )}
                    {selected?.id === guild.id && (
                      <Check className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!selected}
                className="bg-teal-700 hover:bg-teal-800"
              >
                Próximo
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && selected && (
          <>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
              {selected.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.icon} alt={selected.name} className="w-9 h-9 rounded-full" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                  {selected.name[0]}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-slate-800">{selected.name}</p>
                <p className="text-xs text-slate-500">Servidor selecionado</p>
              </div>
            </div>

            <div className={`rounded-xl border p-4 mb-4 transition-colors
              ${botDetected ? 'border-green-200 bg-green-50' : 'border-indigo-100 bg-indigo-50'}`}>
              <div className="flex items-start gap-3">
                <Bot className={`w-5 h-5 flex-shrink-0 mt-0.5 ${botDetected ? 'text-green-600' : 'text-indigo-600'}`} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold mb-1 ${botDetected ? 'text-green-900' : 'text-indigo-900'}`}>
                    {botDetected ? 'Bot detectado no servidor!' : 'Adicione o bot EduHub ao servidor'}
                  </p>

                  {!botDetected && (
                    <p className="text-xs text-indigo-700 mb-3">
                      O bot é necessário para publicar atividades, criar canais e monitorar respostas dos estudantes. Clique no botão abaixo e confirme no Discord.
                    </p>
                  )}

                  {botDetected ? (
                    <div className="flex items-center gap-2 text-green-700 text-sm">
                      <Check className="w-4 h-4" />
                      Pronto! Você já pode concluir a vinculação.
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 flex-wrap">
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={handleOpenInvite}
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-2" />
                        {inviteOpened ? 'Abrir convite novamente' : 'Adicionar Bot ao Servidor'}
                      </Button>
                      {checking && (
                        <span className="flex items-center gap-1.5 text-xs text-indigo-600">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Aguardando confirmação...
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {saveError && <p className="text-sm text-red-600 mb-3">{saveError}</p>}

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => { setStep(1); setBotDetected(false); setInviteOpened(false); setChecking(false); if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } }}
                disabled={saving}
              >
                Voltar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!botDetected || saving}
                className="bg-teal-700 hover:bg-teal-800"
              >
                {saving ? 'Vinculando...' : 'Concluir'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
