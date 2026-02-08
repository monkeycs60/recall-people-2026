'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Footer from '@/components/Footer';

const DEEP_LINK_SCHEME = 'recall-people://';
const DEEP_LINK_DELAY_MS = 1500;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!token) return;

    const deepLinkUrl = `${DEEP_LINK_SCHEME}reset-password?token=${token}`;
    window.location.href = deepLinkUrl;

    const timer = setTimeout(() => setAttempted(true), DEEP_LINK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [token]);

  const handleOpenApp = () => {
    if (!token) return;
    window.location.href = `${DEEP_LINK_SCHEME}reset-password?token=${token}`;
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-3">Invalid reset link</h1>
        <p className="text-text-secondary max-w-md mb-8">
          This password reset link is invalid or has expired. Please request a new one from the app.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      </div>

      {!attempted ? (
        <>
          <h1 className="text-2xl font-bold text-text-primary mb-3">Opening Recall People...</h1>
          <p className="text-text-secondary max-w-md mb-8">
            You should be redirected to the app automatically.
          </p>
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-text-primary mb-3">Reset your password</h1>
          <p className="text-text-secondary max-w-md mb-8">
            Tap the button below to open Recall People and set your new password.
            Make sure the app is installed on your device.
          </p>
          <button
            onClick={handleOpenApp}
            className="bg-primary hover:bg-primary-hover text-white font-semibold py-4 px-8 rounded-xl shadow-lg shadow-primary/25 transition-all duration-200 mb-4 cursor-pointer"
          >
            Open in Recall People
          </button>
          <p className="text-text-muted text-sm mt-4">
            Don&apos;t have the app?{' '}
            <a href="/" className="text-primary hover:underline">
              Download Recall People
            </a>
          </p>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex-1 flex items-center justify-center pt-24">
        <div className="max-w-lg mx-auto w-full">
          <div className="bg-surface rounded-2xl shadow-sm p-8">
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center text-center px-6 py-16">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <ResetPasswordContent />
            </Suspense>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
