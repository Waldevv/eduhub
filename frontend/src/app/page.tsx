'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Users,
  Layers,
  MessageSquare,
  ArrowRight,
  BarChart3,
  X,
  Youtube,
  Instagram,
  Linkedin,
} from 'lucide-react';

const DISCORD_AUTH_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/auth/discord`;

function LoginModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-violet-100 bg-white p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 transition-colors hover:bg-violet-200"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-10 w-28 items-center justify-center">
            <Image
              src="/logo-lateral.png"
              alt="EduHub"
              width={120}
              height={34}
              className="object-contain"
            />
          </div>

          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Entrar no EduHub
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Use sua conta Discord para acessar
          </p>
        </div>

        <a href={DISCORD_AUTH_URL} className="block">
          <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#5865F2] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-[#4752C4]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.045.032.057a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            Continuar com Discord
          </button>
        </a>

        <p className="mt-4 text-center text-xs text-slate-400">
          Ao entrar, você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');

    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      if (payload.profile_completed) {
        router.replace(payload.role === 'student' ? '/student' : '/courses');
      } else {
        router.replace('/complete-profile');
      }
    } catch {
      localStorage.removeItem('auth_token');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}

      <header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between border-b border-violet-100 px-6">
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/logo-lateral.png"
            alt="EduHub"
            width={120}
            height={34}
            className="object-contain"
          />
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLoginOpen(true)}
            className="rounded-full border border-violet-200 px-5 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50"
          >
            Entrar
          </button>

          <Link href="/signup">
            <Button className="rounded-full bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700">
              Cadastro
            </Button>
          </Link>
        </div>
      </header>

      <section className="bg-white">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <h1 className="text-5xl font-extrabold leading-tight text-slate-900 lg:text-6xl">
              Aprendizado
              <br />
              com propósito.
              <br />
              <span className="text-violet-600">Interação que</span>
              <br />
              funciona.
            </h1>

            <p className="max-w-md text-lg leading-relaxed text-slate-500">
              Crie aulas com fluxo pedagógico configurável, integre ao Discord e
              acompanhe o progresso dos seus estudantes em tempo real.
            </p>

            <div className="flex">
              <Link href="/signup">
                <Button className="rounded-full bg-violet-600 px-8 py-6 text-base font-semibold text-white hover:bg-violet-700">
                  Começar agora
                </Button>
              </Link>
            </div>
          </div>

          <div className="hidden justify-center lg:flex">
            <Image
              src="/img1-top.png"
              alt="Integração EduHub com Discord"
              width={1040}
              height={780}
              className="w-full object-contain"
              priority
            />
          </div>
        </div>
      </section>

      <section className="bg-violet-50/50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-3 text-center text-3xl font-bold text-slate-900">
            Tudo que você precisa para o aprendizado
          </h2>

          <p className="mx-auto mb-12 max-w-xl text-center text-slate-500">
            Uma plataforma pensada para professores que querem além de um repositório, para os que buscam interação social.
          </p>

          <div className="mb-16 grid grid-cols-1 gap-16 md:grid-cols-2">
            <div className="flex flex-col justify-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100">
                <Layers className="h-6 w-6 text-violet-600" />
              </div>

              <h3 className="text-2xl font-bold text-slate-900">
                Fluxo pedagógico
                <br />
                configurável
              </h3>

              <p className="leading-relaxed text-slate-500">
                Monte a sequência de cada aula com blocos de conteúdo,
                atividade, interação e avaliação. Defina dependências, critérios
                de conclusão e muito mais.
              </p>
            </div>

            <div className="flex justify-center">
              <Image
                src="/message-mid1.png"
                alt="Visualização do fluxo pedagógico configurável"
                width={760}
                height={520}
                className="w-full max-w-md object-contain"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
            <div className="order-2 flex justify-center md:order-1">
              <Image
                src="/message-mid2.png"
                alt="Visualização da integração nativa com Discord"
                width={760}
                height={520}
                className="w-full max-w-md object-contain"
              />
            </div>

            <div className="order-1 flex flex-col justify-center gap-4 md:order-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100">
                <MessageSquare className="h-6 w-6 text-violet-600" />
              </div>

              <h3 className="text-2xl font-bold text-slate-900">
                Integração nativa
                <br />
                com Discord
              </h3>

              <p className="leading-relaxed text-slate-500">
                Vincule seu servidor e publique aulas criando automaticamente
                canais, fóruns, tópicos e eventos agendados.
              </p>
            </div>
          </div>
        </div>
      </section>

<section className="bg-white py-20">
  <div className="mx-auto max-w-7xl px-6">
    <h2 className="mb-3 text-center text-3xl font-bold text-slate-900">
      Por que usar o EduHub?
    </h2>

    <p className="mb-12 text-center text-slate-500">
      Desenvolvido para quem quer unir o aprendizado e as interações sociais.
    </p>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        {
          icon: Layers,
          title: 'Blocos configuráveis',
          desc: 'Monte qualquer sequência pedagógica com diferentes tipos de bloco.',
        },
        {
          icon: Users,
          title: 'Gestão de turmas',
          desc: 'Códigos de convite, matrículas e controle de estudantes por curso.',
        },
        {
          icon: BarChart3,
          title: 'Progresso visível',
          desc: 'Acompanhe a evolução individual e coletiva em tempo real.',
        },
        {
          icon: MessageSquare,
          title: 'Discord integrado',
          desc: 'Canais, fóruns e eventos criados automaticamente ao publicar.',
        },
      ].map(({ icon: Icon, title, desc }) => (
        <div
          key={title}
          className="group cursor-default rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-violet-200 hover:bg-violet-50/40"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100">
            <Icon className="h-6 w-6 text-violet-600" />
          </div>

          <h4 className="mb-2 font-bold text-slate-900">{title}</h4>

          <p className="text-sm leading-relaxed text-slate-500">
            {desc}
          </p>
        </div>
      ))}
    </div>

    <div className="mt-12 flex justify-center">
      <Button
        onClick={() => setLoginOpen(true)}
        className="rounded-full bg-violet-600 px-8 py-6 text-base font-semibold text-white hover:bg-violet-700"
      >
        Entrar
      </Button>
    </div>
  </div>
</section>

      <footer className="bg-violet-950 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 grid grid-cols-1 gap-10 border-t border-white/10 pt-12 md:grid-cols-3">
            <div>
              <div className="mb-4">
                <Image
                  src="/logo-lateral.png"
                  alt="EduHub"
                  width={110}
                  height={30}
                  className="object-contain brightness-0 invert opacity-80"
                />
              </div>

              <p className="text-sm leading-relaxed text-violet-200/70">
                Plataforma educacional com fluxo pedagógico configurável e
                integração Discord.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">Plataforma</h4>

              <ul className="space-y-2 text-sm text-violet-200/70">
                <li>Criar cursos</li>
                <li>Configurar aulas</li>
                <li>Banco de questões</li>
                <li>Integração Discord</li>
              </ul>
            </div>

            <div className="flex flex-col items-start gap-4 md:items-end">
              <div className="flex gap-3">
                {[Youtube, Instagram, Linkedin].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                  >
                    <Icon className="h-4 w-4 text-violet-100" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-violet-200/60 md:flex-row">
            <span>© 2025 EduHub</span>

            <div className="flex gap-6">
              <a href="#" className="transition-colors hover:text-white">
                Termos
              </a>

              <a href="#" className="transition-colors hover:text-white">
                Privacidade
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}