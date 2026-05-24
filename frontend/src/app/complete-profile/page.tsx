'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BookOpen, Users, Calendar, Loader2 } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function calcAge(birthDate: string): number | null {
  if (!birthDate) return null;

  const birth = new Date(birthDate);

  if (isNaN(birth.getTime())) return null;

  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const m = today.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

  return age >= 0 && age < 120 ? age : null;
}

export default function CompleteProfilePage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [role, setRole] = useState<'teacher' | 'student' | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const age = calcAge(birthDate);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      if (payload.profile_completed) {
        router.replace('/courses');
        return;
      }
    } catch {
      localStorage.removeItem('auth_token');
      router.replace('/login');
      return;
    }

    fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
    })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(user => {
        setName(user.name ?? '');

        if (user.birth_date) {
          setBirthDate(user.birth_date.split('T')[0]);
        }

        if (user.gender) {
          setGender(user.gender);
        }

        if (user.role === 'teacher' || user.role === 'student') {
          setRole(user.role);
        }
      })
      .catch(() => {})
      .finally(() => {
        const storedRole = sessionStorage.getItem(
          'signup_role'
        ) as 'teacher' | 'student' | null;

        if (storedRole) {
          setRole(storedRole);
        }

        setReady(true);
      });
  }, [router]);

  const handleConfirm = async () => {
    if (!role) {
      setError('Selecione seu perfil para continuar.');
      return;
    }

    if (!name.trim()) {
      setError('Informe seu nome.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token')!;

      const res = await fetch(`${BASE_URL}/api/auth/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role,
          name: name.trim(),
          birth_date: birthDate || undefined,
          gender: gender || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha ao salvar');
      }

      const { token: newToken } = await res.json();

      localStorage.setItem('auth_token', newToken);

      sessionStorage.removeItem('signup_role');

      window.location.href =
        role === 'student' ? '/student' : '/courses';
    } catch {
      setError('Não foi possível salvar. Tente novamente.');
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-violet-950">
        <Loader2 className="w-8 h-8 animate-spin text-violet-300" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-violet-950 p-4">
      <div className="my-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8">
        <div className="mb-7 flex flex-col items-center">
          <div className="mb-4">
            <Image
              src="/logo-lateral.png"
              alt="EduHub"
              width={130}
              height={36}
              className="object-contain"
            />
          </div>

          <h1 className="mt-1 text-xl font-bold text-slate-900">
            Complete seu perfil
          </h1>

          <p className="mt-1 text-center text-sm text-slate-500">
            Precisamos de mais algumas informações para configurar sua conta.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Nome
            </label>

            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-violet-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                <Calendar className="mr-1 inline h-3.5 w-3.5" />
                Data de nascimento
              </label>

              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition-colors focus:border-violet-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Idade
              </label>

              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 select-none">
                {age !== null ? `${age} anos` : '—'}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Gênero
            </label>

            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition-colors focus:border-violet-400 focus:outline-none"
            >
              <option value="">Selecione...</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700">
              Perfil
            </label>

            <div className="grid grid-cols-2 gap-3">
              {([
                {
                  value: 'teacher',
                  label: 'Professor',
                  icon: BookOpen,
                  desc: 'Cria e publica cursos',
                },
                {
                  value: 'student',
                  label: 'Estudante',
                  icon: Users,
                  desc: 'Acessa cursos',
                },
              ] as const).map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                    role === value
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40'
                  }`}
                >
                  {role === value && (
                    <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}

                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      role === value
                        ? 'bg-violet-100'
                        : 'bg-slate-100'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        role === value
                          ? 'text-violet-700'
                          : 'text-slate-600'
                      }`}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {label}
                    </p>

                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-red-500">
            {error}
          </p>
        )}

        <button
          onClick={handleConfirm}
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-violet-600 py-3.5 font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Confirmar e entrar'}
        </button>

        <p className="mt-3 text-center text-xs text-slate-400">
          Você pode editar essas informações depois nas configurações do perfil.
        </p>
      </div>
    </div>
  );
}