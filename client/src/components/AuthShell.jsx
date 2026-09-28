import React from 'react';
import { Shield, Sparkles, Users, MapPin, Siren, FileLock2 } from 'lucide-react';

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-navy-800 via-navy-700 to-violet-600 text-white relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-navy-400/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-tight">SAHAYA</p>
            <p className="text-xs text-white/70">Prepare. Connect. Respond.</p>
          </div>
        </div>

        <div className="relative z-10 space-y-5">
          <h2 className="text-3xl font-bold leading-tight">
            Your personal safety<br />coordination platform.
          </h2>
          <p className="text-white/80 leading-relaxed max-w-md">
            Plan journeys. Notify trusted contacts. Activate an emergency response with one tap.
            All data is encrypted and yours alone.
          </p>
          <ul className="space-y-3 text-white/90">
            <li className="flex items-center gap-3"><Sparkles className="w-5 h-5 text-violet-300" /> AI Safety Assistant (Gemini-powered)</li>
            <li className="flex items-center gap-3"><Users className="w-5 h-5 text-violet-300" /> Trusted Circle with primary contact</li>
            <li className="flex items-center gap-3"><MapPin className="w-5 h-5 text-violet-300" /> Journey tracking with check-ins</li>
            <li className="flex items-center gap-3"><Siren className="w-5 h-5 text-violet-300" /> Emergency mode with delivery status</li>
            <li className="flex items-center gap-3"><FileLock2 className="w-5 h-5 text-violet-300" /> Private incident vault with AI summaries</li>
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/60">
          SAHAYA does not replace emergency services. Always call your local emergency number when in immediate danger.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-700 to-violet-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-800 leading-tight">SAHAYA</p>
              <p className="text-xs text-navy-400">Prepare. Connect. Respond.</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-navy-800">{title}</h1>
          {subtitle && <p className="mt-1.5 text-navy-500 text-sm">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, type = 'text', value, onChange, placeholder, autoComplete, required = true }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="input"
      />
    </label>
  );
}
