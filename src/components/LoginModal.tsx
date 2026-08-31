import React, { useState } from 'react';
import { Lock, User, KeyRound, ShieldAlert, ArrowRight, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
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

  // Estados para recuperación de contraseña
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [enviandoReset, setEnviandoReset] = useState(false);

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

  const handleRecuperarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    const emailLimpio = resetEmail.trim();

    // Validación básica de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailLimpio || !emailRegex.test(emailLimpio)) {
      setResetError('Por favor escribe un correo válido');
      return;
    }

    setEnviandoReset(true);
    try {
      await sendPasswordResetEmail(auth, emailLimpio);
      setResetSuccess('Correo enviado. Revisa tu bandeja de entrada para crear tu nueva contraseña');
      setResetEmail('');
    } catch (err: any) {
      console.error('Error al enviar correo de recuperación:', err);
      if (err.code === 'auth/too-many-requests') {
        setResetError('Demasiados intentos. Intenta más tarde');
      } else if (err.code === 'auth/invalid-email') {
        setResetError('Por favor escribe un correo válido');
      } else if (err.code === 'auth/user-not-found') {
        setResetError('No se encontró ninguna cuenta asociada a este correo electrónico.');
      } else {
        setResetError(err.message || 'Error al enviar el enlace de recuperación. Intenta más tarde.');
      }
    } finally {
      setEnviandoReset(false);
    }
  };

  const abrirFormularioRecuperacion = () => {
    setMostrarRecuperar(true);
    setResetError('');
    setResetSuccess('');
    setResetEmail('');
  };

  const volverAlLogin = () => {
    setMostrarRecuperar(false);
    setResetError('');
    setResetSuccess('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Encabezado con branding automotriz */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 text-center relative">
          <div className="relative mx-auto mb-3 flex items-center justify-center">
            <img
              src="/logo_myg.png"
              alt="Logo Control de Vehículos MYG"
              className="h-16 w-auto object-contain rounded-2xl shadow-xl border border-slate-700/60 bg-slate-950/80"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-xl font-black tracking-tight">CONTROL DE VEHÍCULOS "MYG"</h1>
          <p className="text-xs text-blue-200 mt-1 font-medium">
            Sistema de Mantenimiento y Flota en Tiempo Real
          </p>
        </div>

        {/* Vista 1: Formulario de Recuperación de Contraseña */}
        {mostrarRecuperar ? (
          <form onSubmit={handleRecuperarPassword} className="p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-base">🔑</span>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Recuperar Contraseña
                </h2>
              </div>
              <button
                type="button"
                onClick={volverAlLogin}
                className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ingresa tu correo electrónico registrado 📧 para recibir un enlace de restablecimiento seguro:
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => {
                    setResetEmail(e.target.value);
                    if (resetError) setResetError('');
                  }}
                  placeholder="ejemplo@correo.com"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  required
                />
              </div>
            </div>

            {resetError && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>⚠️ {resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>✅ {resetSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={enviandoReset}
              id="btn-confirmar-recuperar"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Mail className="w-4 h-4" />
              <span>{enviandoReset ? 'Enviando enlace...' : 'Enviar Enlace de Recuperación'}</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={volverAlLogin}
                className="text-xs text-slate-500 hover:text-slate-800 hover:underline font-medium cursor-pointer"
              >
                ← Regresar al inicio de sesión
              </button>
            </div>
          </form>
        ) : (
          /* Vista 2: Formulario de Inicio de Sesión Estándar */
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
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Ingresar al Sistema</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Enlace de recuperación de contraseña solicitado */}
            <div className="text-center pt-1 pb-1">
              <button
                type="button"
                onClick={abrirFormularioRecuperacion}
                id="btn-olvido-contrasena"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition py-1 px-2.5 rounded-lg cursor-pointer"
              >
                <span>🔑</span>
                <span>¿Olvidaste tu contraseña?</span>
              </button>
            </div>

            {/* Accesos rápidos de demostración */}
            <div className="border-t border-slate-100 pt-4 mt-1">
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
                    className="p-2 rounded-lg bg-slate-100 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-[11px] text-left transition flex flex-col items-start cursor-pointer"
                  >
                    <span className="font-bold text-slate-800">{u.numeroUsuario}</span>
                    <span className="text-[10px] text-slate-500 capitalize">{u.rol}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

