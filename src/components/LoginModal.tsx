import React, { useState } from 'react';
import { Lock, User, KeyRound, ShieldAlert, ArrowRight, Truck } from 'lucide-react';
import { Usuario } from '../types';

interface LoginModalProps {
  usuarios: Usuario[];
  onLogin: (user: Usuario) => void;
  isOpen: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ usuarios, onLogin, isOpen }) => {
  const [numeroUsuario, setNumeroUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUser = numeroUsuario.trim().toUpperCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError('Por favor complete el número de usuario y contraseña.');
      return;
    }

    const found = usuarios.find(
      (u) => u.numeroUsuario.toUpperCase() === cleanUser && u.password === cleanPass
    );

    if (found) {
      onLogin(found);
    } else {
      setError('Número de usuario o contraseña incorrectos.');
    }
  };

  const handleQuickLogin = (u: Usuario) => {
    setNumeroUsuario(u.numeroUsuario);
    setPassword(u.password);
    onLogin(u);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Encabezado con branding automotriz */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 text-center relative">
          <div className="w-16 h-16 bg-blue-600/30 border-2 border-blue-400/50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-300 shadow-lg">
            <Truck className="w-9 h-9" />
          </div>
          <h1 className="text-xl font-black tracking-tight">CONTROL DE VEHÍCULOS "MYG"</h1>
          <p className="text-xs text-blue-200 mt-1 font-medium">
            Sistema de Mantenimiento y Flota en Tiempo Real
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Número de Usuario o Código
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-numero-usuario"
                type="text"
                value={numeroUsuario}
                onChange={(e) => setNumeroUsuario(e.target.value.toUpperCase())}
                placeholder="Ej: ADMIN01, TEC01, PILOTO01"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            id="btn-iniciar-sesion"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Ingresar al Sistema</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Accesos rápidos de demostración */}
          <div className="border-t border-slate-100 pt-4 mt-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Credenciales predeterminadas para ingresar:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {usuarios.slice(0, 3).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickLogin(u)}
                  id={`quick-login-${u.numeroUsuario}`}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-[11px] text-left transition flex flex-col items-start"
                >
                  <span className="font-bold text-slate-800">{u.numeroUsuario}</span>
                  <span className="text-[10px] text-slate-500 capitalize">{u.rol}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
