'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, ApiUser } from '../../lib/api';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('aninditatiara1706@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    setSessionExpired(new URLSearchParams(window.location.search).get('reason') === 'session');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await apiRequest<{ user: ApiUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      router.replace('/dashboard');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login gagal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">

      <div className="bg-white p-7 rounded-3xl shadow-xl max-w-sm w-full text-center border border-gray-100">
        
        <div className="flex flex-col items-center justify-center mb-3">
          <div className="w-16 h-16 relative flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Logo Pelita"
              width={64}
              height={64}
              className="object-contain"
              priority
            />
          </div>
          <span className="font-extrabold text-xl tracking-wider text-black mt-1">
            PELITA
          </span>
        </div>

        <h1 className="text-xl font-bold text-black mb-6">Login Admin</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          {sessionExpired && (
            <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-left text-xs text-amber-800">
              Sesi berakhir. Silakan masuk kembali.
            </p>
          )}
          {errorMessage && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-left text-xs text-red-700">
              {errorMessage}
            </p>
          )}

          <div>
            <input
              name="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800"
            />
          </div>

          <div className="relative">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800"
            />
            
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1 transition-colors"
            >
              {showPassword ? (

                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (

                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.016 10.016 0 014.122-.863c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                </svg>
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8648BB] to-[#C75BD5] text-white font-semibold text-sm shadow-md hover:opacity-90 transition cursor-pointer mt-2 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}