'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function AuthCallbackInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      window.location.href = '/login?error=' + error;
      return;
    }

    if (!token) {
      window.location.href = '/login';
      return;
    }

    localStorage.setItem('auth_token', token);

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      if (!payload.profile_completed) {
        window.location.href = '/complete-profile';
        return;
      }

      const redirect = sessionStorage.getItem('join_redirect');

      if (redirect) {
        sessionStorage.removeItem('join_redirect');
        window.location.href = redirect;
      } else {
        window.location.href =
          payload.role === 'student' ? '/student' : '/courses';
      }
    } catch {
      window.location.href = '/courses';
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-200 border-t-violet-950" />

        <p className="text-sm font-medium text-violet-950">
          Autenticando...
        </p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-200 border-t-violet-950" />

            <p className="text-sm font-medium text-violet-950">
              Autenticando...
            </p>
          </div>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}