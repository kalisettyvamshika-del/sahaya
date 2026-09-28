import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <ShieldCheck className="w-12 h-12 text-violet-500 animate-pulse-soft" />
        <div className="absolute -inset-2 rounded-full bg-violet-200/30 blur-xl animate-pulse-soft" />
      </div>
      <p className="text-navy-500 text-sm">Loading SAHAYA…</p>
    </div>
  );
}
