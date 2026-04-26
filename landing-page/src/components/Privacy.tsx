'use client';

import { ShieldCheck, Database, WifiOff } from 'lucide-react';

export default function Privacy() {
  return (
    <section id="privacy" className="py-24 bg-surface-alt border-y border-border-light relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-light/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-voice-light/30 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-text-primary mb-6">
            Your data stays yours.
          </h2>
          <p className="text-lg md:text-xl text-text-secondary leading-relaxed">
            Unlike traditional CRMs, Recall People stores <strong className="text-text-primary">EVERYTHING</strong> locally on your device&apos;s SQLite database.
            AI processes information only when you ask it to. We don&apos;t own your contacts.
            <span className="block mt-2 font-medium text-text-primary">No contact cloud. No ad profiles. No data mining.</span>
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-surface p-8 rounded-2xl border border-border shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center mb-4 text-primary">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2">Local SQLite</h3>
            <p className="text-text-secondary text-sm">Your database lives on your phone. Even if we disappear, your data remains accessible.</p>
          </div>
          
          <div className="bg-surface p-8 rounded-2xl border border-border shadow-sm flex flex-col items-center text-center">
             <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center mb-4 text-primary">
              <WifiOff className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2">Offline First</h3>
            <p className="text-text-secondary text-sm">Works perfectly without internet. Zero latency, 100% reliability.</p>
          </div>

          <div className="bg-surface p-8 rounded-2xl border border-border shadow-sm flex flex-col items-center text-center">
             <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center mb-4 text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2">Ephemeral AI</h3>
            <p className="text-text-secondary text-sm">Data is sent to AI providers only for processing and is not used to train models.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
