'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Users, ArrowLeft } from 'lucide-react';

const DISCORD_AUTH_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/auth/discord`;

export default function SignupPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<'teacher' | 'student' | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');

    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      if (payload.profile_completed) {
        router.replace('/courses');
      } else {
        router.replace('/complete-profile');
      }
    } catch {
      localStorage.removeItem('auth_token');
    }
  }, [router]);

  const handleContinue = () => {
    if (!selected) return;

    sessionStorage.setItem('signup_role', selected);
    window.location.href = DISCORD_AUTH_URL;
  };

  return (
    <div className="flex min-h-screen flex-col bg-violet-950">
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
        aria-label="Voltar"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-10 md:px-10">
          <div className="mb-10 flex flex-col items-center">
            <div className="mb-5">
              <Image
                src="/logo-lateral.png"
                alt="EduHub"
                width={140}
                height={40}
                className="object-contain brightness-0 invert"
              />
            </div>

            <h1 className="text-2xl font-bold text-white">Criar conta</h1>

            <p className="mt-2 text-center text-sm text-violet-200/70">
              Primeiro, nos diga como você vai usar a plataforma.
            </p>
          </div>

          <div className="mx-auto mb-10 w-full max-w-md">
            <div className="grid grid-cols-[1fr_4rem_1fr_4rem_1fr] items-center">
              <div className="flex justify-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-violet-900">
                  1
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div className="flex justify-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-sm font-bold text-white/40">
                  2
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div className="flex justify-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-sm font-bold text-white/40">
                  3
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_4rem_1fr_4rem_1fr] text-center text-xs leading-snug text-violet-200/55">
              <span>Escolha seu perfil</span>
              <span />
              <span>Conecte o Discord</span>
              <span />
              <span>Complete o cadastro</span>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => setSelected('teacher')}
              className={`group relative flex flex-col items-center gap-4 rounded-2xl border p-8 text-center transition-all ${
                selected === 'teacher'
                  ? 'border-violet-300 bg-white text-violet-950'
                  : 'border-white/10 bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.05]'
              }`}
            >
              {selected === 'teacher' && (
                <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
              )}

              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
                  selected === 'teacher'
                    ? 'bg-violet-100'
                    : 'bg-white/[0.04] group-hover:bg-white/[0.07]'
                }`}
              >
                <BookOpen
                  className={`h-8 w-8 ${
                    selected === 'teacher'
                      ? 'text-violet-700'
                      : 'text-violet-100'
                  }`}
                />
              </div>

              <div>
                <p
                  className={`text-lg font-bold ${
                    selected === 'teacher' ? 'text-violet-950' : 'text-white'
                  }`}
                >
                  Sou Professor
                </p>

                <p
                  className={`mt-1 text-sm leading-relaxed ${
                    selected === 'teacher'
                      ? 'text-slate-500'
                      : 'text-violet-200/65'
                  }`}
                >
                  Crio cursos, configuro aulas e acompanho estudantes.
                </p>
              </div>
            </button>

            <button
              onClick={() => setSelected('student')}
              className={`group relative flex flex-col items-center gap-4 rounded-2xl border p-8 text-center transition-all ${
                selected === 'student'
                  ? 'border-violet-300 bg-white text-violet-950'
                  : 'border-white/10 bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.05]'
              }`}
            >
              {selected === 'student' && (
                <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
              )}

              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
                  selected === 'student'
                    ? 'bg-violet-100'
                    : 'bg-white/[0.04] group-hover:bg-white/[0.07]'
                }`}
              >
                <Users
                  className={`h-8 w-8 ${
                    selected === 'student'
                      ? 'text-violet-700'
                      : 'text-violet-100'
                  }`}
                />
              </div>

              <div>
                <p
                  className={`text-lg font-bold ${
                    selected === 'student' ? 'text-violet-950' : 'text-white'
                  }`}
                >
                  Sou Estudante
                </p>

                <p
                  className={`mt-1 text-sm leading-relaxed ${
                    selected === 'student'
                      ? 'text-slate-500'
                      : 'text-violet-200/65'
                  }`}
                >
                  Acesso cursos pelos quais fui convidado.
                </p>
              </div>
            </button>
          </div>

          <button
            onClick={handleContinue}
            disabled={!selected}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 font-semibold text-violet-800 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Continuar com Discord
          </button>

          <p className="mt-4 text-center text-xs text-violet-200/45">
            Já tem conta?{' '}
            <Link
              href="/"
              className="text-white underline underline-offset-2 transition-colors hover:text-violet-100"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}