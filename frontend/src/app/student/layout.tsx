'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { BookOpen, LogOut, User } from 'lucide-react';

interface AuthUser {
  name: string;
  avatar: string | null;
  role: string;
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { router.replace('/'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.profile_completed) { router.replace('/complete-profile'); return; }
      if (payload.role !== 'student') { router.replace('/courses'); return; }
    } catch {
      localStorage.removeItem('auth_token');
      router.replace('/');
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(u => setUser(u))
      .catch(() => {});
  }, [router]);

  const logout = () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/';
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-violet-600 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/student" className="flex items-center mr-4 flex-shrink-0">
            <Image
              src="/logo-lateral.png"
              alt="EduHub"
              width={100}
              height={28}
              className="object-contain brightness-0 invert"
            />
          </Link>

          <Link
            href="/student"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${isActive('/student') ? 'bg-white/20 text-white' : 'text-violet-100 hover:text-white hover:bg-white/10'}`}
          >
            <BookOpen className="w-4 h-4" />
            Meus Cursos
          </Link>

          <div className="ml-auto flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 bg-violet-400 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                <span className="text-white text-sm font-medium hidden sm:block">{user.name}</span>
              </div>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-violet-200 hover:text-white transition-colors text-sm"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sair</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
