import React, { useState } from 'react';
import {
  Lock,
  User,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase';
import { Usuario } from '../types';
import { saveUsuario } from '../services/firestoreService';

interface LoginModalProps {
  usuarios: Usuario[];
  onLogin: (user: Usuario) => void;
  isOpen: boolean;
}

type TabType = 'login' | 'registro' | 'recuperar';

export const LoginModal: React.FC<LoginModalProps> = ({ usuarios, onLogin, isOpen }) => {
  const [activeTab, setActiveTab] = useState<TabType>('login');

  // Estados Formulario Inicio de Sesión
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Estados Formulario Registro
  const [regEmail, setRegEmail] = useState('');
  const [regUsuario, setRegUsuario] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Estados Formulario Recuperación de Contraseña
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  if (!isOpen) return null;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ----------------------------------------------------
  // 1. INICIAR SESIÓN (CORREO Y CONTRASEÑA OBLIGATORIOS)
  // Identifica automáticamente el usuario y su rol según su correo
  // ----------------------------------------------------
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const email = loginEmail.trim().toLowerCase();
    const password = loginPassword.trim();

    if (!email) {
      setLoginError('Por favor ingresa tu correo electrónico.');
      return;
    }

    if (!emailRegex.test(email)) {
      setLoginError('Por favor escribe un correo electrónico válido (ej: usuario@empresa.com).');
      return;
    }

    if (!password) {
      setLoginError('Por favor ingresa tu contraseña.');
      return;
    }

    setLoginLoading(true);

    try {
      // 1. Intentar autenticación con Firebase Authentication
      let authSucceeded = false;
      try {
        await signInWithEmailAndPassword(auth, email, password);
        authSucceeded = true;
      } catch (authErr: any) {
        console.warn('Firebase Auth signIn info:', authErr.code);
        if (authErr.code === 'auth/too-many-requests') {
          setLoginError('Demasiados intentos fallidos. Por favor intenta más tarde.');
          setLoginLoading(false);
          return;
        }
      }

      // 2. Identificar el usuario y su rol automáticamente en la base de datos Firestore
      const foundUser = usuarios.find((u) => {
        const uEmail = (u.email || '').toLowerCase().trim();
        const matchesEmail = uEmail === email;
        const matchesPass = u.password === password;
        return matchesEmail && (matchesPass || authSucceeded);
      });

      if (foundUser) {
        // Usuario identificado con su rol asignado automáticamente
        onLogin(foundUser);
      } else if (authSucceeded) {
        // Usuario autenticado en Firebase Auth pero sin perfil previo en Firestore
        const genericUser: Usuario = {
          id: email.split('@')[0].toUpperCase(),
          numeroUsuario: email.split('@')[0].toUpperCase(),
          nombre: email.split('@')[0],
          email: email,
          password: password,
          rol: 'tecnico',
          creadoEn: new Date().toISOString(),
        };
        await saveUsuario(genericUser);
        onLogin(genericUser);
      } else {
        // Buscar si el correo existe con otra contraseña
        const userExists = usuarios.find((u) => (u.email || '').toLowerCase().trim() === email);
        if (userExists) {
          setLoginError('Contraseña incorrecta. Verifica tus credenciales o recupera tu contraseña.');
        } else {
          setLoginError('No se encontró ninguna cuenta registrada con este correo electrónico.');
        }
      }
    } catch (err: any) {
      console.error('Error durante el inicio de sesión:', err);
      setLoginError(err.message || 'Error al iniciar sesión. Verifica tus datos.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ----------------------------------------------------
  // 2. REGISTRARSE (CORREO, PASS >= 6, CONFIRMAR, CÓDIGO)
  // ----------------------------------------------------
  const handleRegistroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    const email = regEmail.trim().toLowerCase();
    const codigoUsuario = regUsuario.trim().toUpperCase();
    const password = regPassword.trim();
    const confirmPassword = regConfirmPassword.trim();

    // Validaciones
    if (!email) {
      setRegError('El correo electrónico es obligatorio.');
      return;
    }

    if (!emailRegex.test(email)) {
      setRegError('Por favor escribe un correo electrónico válido.');
      return;
    }

    if (!codigoUsuario) {
      setRegError('Por favor escribe un nombre o código de usuario (ej: TEC01, PILOTO02).');
      return;
    }

    if (codigoUsuario.length < 3) {
      setRegError('El nombre o código de usuario debe tener al menos 3 caracteres.');
      return;
    }

    if (!password) {
      setRegError('La contraseña es obligatoria.');
      return;
    }

    if (password.length < 6) {
      setRegError('La contraseña debe tener al menos 6 caracteres (requisito de Firebase).');
      return;
    }

    if (password !== confirmPassword) {
      setRegError('Las contraseñas no coinciden.');
      return;
    }

    // Verificar si el usuario ya existe en Firestore
    const existeCodigo = usuarios.some(
      (u) => u.numeroUsuario.toUpperCase() === codigoUsuario
    );
    if (existeCodigo) {
      setRegError(`El código de usuario "${codigoUsuario}" ya está en uso. Por favor elige otro.`);
      return;
    }

    const existeEmail = usuarios.some(
      (u) => (u.email || '').toLowerCase().trim() === email
    );
    if (existeEmail) {
      setRegError(`El correo "${email}" ya está registrado. Inicia sesión o recupera tu contraseña.`);
      return;
    }

    setRegLoading(true);

    try {
      // 1. Guardar en Firebase Authentication
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (authErr: any) {
        console.warn('Firebase Auth createUser code:', authErr.code);
        if (authErr.code === 'auth/email-already-in-use') {
          setRegError('Este correo electrónico ya está registrado en Firebase Authentication.');
          setRegLoading(false);
          return;
        } else if (authErr.code === 'auth/invalid-email') {
          setRegError('El correo electrónico no es válido.');
          setRegLoading(false);
          return;
        } else if (authErr.code === 'auth/weak-password') {
          setRegError('La contraseña debe tener al menos 6 caracteres.');
          setRegLoading(false);
          return;
        }
      }

      // 2. Guardar perfil en Firestore
      const nuevoUsuario: Usuario = {
        id: codigoUsuario,
        numeroUsuario: codigoUsuario,
        nombre: codigoUsuario,
        email: email,
        password: password,
        rol: codigoUsuario.startsWith('ADMIN') ? 'admin' : codigoUsuario.startsWith('PILOTO') ? 'piloto' : 'tecnico',
        creadoEn: new Date().toISOString(),
      };

      await saveUsuario(nuevoUsuario);

      setRegSuccess('¡Cuenta creada exitosamente en Firebase! Iniciando sesión...');

      setTimeout(() => {
        onLogin(nuevoUsuario);
      }, 1200);
    } catch (err: any) {
      console.error('Error al registrar usuario:', err);
      setRegError('Error al crear la cuenta: ' + (err.message || 'Intente nuevamente'));
    } finally {
      setRegLoading(false);
    }
  };

  // ----------------------------------------------------
  // 3. RECUPERACIÓN DE CONTRASEÑA (FIREBASE AUTH)
  // ----------------------------------------------------
  const handleRecuperarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    const emailLimpio = resetEmail.trim().toLowerCase();

    if (!emailLimpio || !emailRegex.test(emailLimpio)) {
      setResetError('Por favor escribe un correo válido');
      return;
    }

    setResetLoading(true);
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
      setResetLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Encabezado con branding corporativo */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-7 text-center relative">
          <div className="relative mx-auto mb-3.5 flex items-center justify-center">
            <img
              src="/logo_talleres.png"
              alt="Logo E. GARCÍA - TALLERES"
              className="h-32 sm:h-36 w-auto aspect-square object-contain rounded-2xl shadow-2xl border border-slate-700/60 bg-slate-950 p-1.5"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">E. GARCÍA</h1>
          <h2 className="text-sm font-bold text-blue-400 tracking-wide uppercase mt-0.5">TALLERES E. GARCÍA</h2>
          <p className="text-xs text-blue-200 mt-1.5 font-medium">
            Sistema de Control de Mantenimiento y Flota en Tiempo Real
          </p>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* VISTA 1: INICIAR SESIÓN (ÚNICAMENTE CORREO Y CONTRASEÑA)   */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4 animate-in fade-in duration-150">
            {/* Campo: Correo Electrónico */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                <span>📧 Correo Electrónico</span>
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="usuario@talleresegarcia.com"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Campo: Contraseña */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                <span>🔑 Contraseña</span>
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error de validación */}
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Botón: Iniciar Sesión */}
            <button
              type="submit"
              disabled={loginLoading}
              id="btn-iniciar-sesion"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Lock className="w-4 h-4" />
              <span>{loginLoading ? 'Ingresando al sistema...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Enlaces de Acción */}
            <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-100">
              {/* Enlace: ¿Olvidaste tu contraseña? */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('recuperar');
                  setResetError('');
                  setResetSuccess('');
                  setResetEmail(loginEmail);
                }}
                id="btn-olvido-contrasena"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition py-1 cursor-pointer"
              >
                🔑 ¿Olvidaste tu contraseña?
              </button>

              {/* Enlace: ¿No tienes cuenta? Regístrate */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('registro');
                  setRegError('');
                  setRegSuccess('');
                  setRegEmail(loginEmail);
                }}
                id="btn-ir-registro"
                className="text-xs text-slate-600 hover:text-slate-900 transition py-1 cursor-pointer"
              >
                ¿No tienes cuenta? <span className="font-bold text-blue-600 hover:underline">Regístrate</span>
              </button>
            </div>
          </form>
        )}

        {/* ----------------------------------------------------------- */}
        {/* VISTA 2: REGISTRARSE (CORREO, PASS >= 6, CONFIRMAR, CÓDIGO)  */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'registro' && (
          <form onSubmit={handleRegistroSubmit} className="p-6 space-y-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Crear Cuenta
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                <span>👤 Nombre de Usuario o Código</span>
                <span className="text-[10px] text-slate-400 font-normal">Ej: TEC01, PILOTO02</span>
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-reg-usuario"
                  type="text"
                  value={regUsuario}
                  onChange={(e) => {
                    setRegUsuario(e.target.value.toUpperCase());
                    if (regError) setRegError('');
                  }}
                  placeholder="Ej: TEC02"
                  className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                📧 Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-reg-email"
                  type="email"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    if (regError) setRegError('');
                  }}
                  placeholder="tecnico@talleresegarcia.com"
                  className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                <span>🔑 Contraseña</span>
                <span className="text-[10px] text-blue-600 font-medium">Mínimo 6 caracteres</span>
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-reg-password"
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => {
                    setRegPassword(e.target.value);
                    if (regError) setRegError('');
                  }}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-11 pr-11 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                🔑 Confirmar Contraseña
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-reg-confirm-password"
                  type={showRegPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={(e) => {
                    setRegConfirmPassword(e.target.value);
                    if (regError) setRegError('');
                  }}
                  placeholder="Repite la contraseña exacta"
                  className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {regError && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>⚠️ {regError}</span>
              </div>
            )}

            {regSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>✅ {regSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={regLoading}
              id="btn-confirmar-registro"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <UserPlus className="w-4 h-4" />
              <span>{regLoading ? 'Registrando en Firebase...' : 'Crear Cuenta en Firebase'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-xs text-slate-600 hover:text-blue-600 font-semibold cursor-pointer"
              >
                ¿Ya tienes una cuenta? <span className="text-blue-600 underline">Inicia Sesión aquí</span>
              </button>
            </div>
          </form>
        )}

        {/* ----------------------------------------------------------- */}
        {/* VISTA 3: RECUPERAR CONTRASEÑA (FIREBASE AUTH)               */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'recuperar' && (
          <form onSubmit={handleRecuperarSubmit} className="p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-base">🔑</span>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Recuperar Contraseña
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ingresa tu correo electrónico registrado 📧 para recibir un enlace de restablecimiento seguro de Firebase:
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
                  placeholder="usuario@talleresegarcia.com"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  required
                />
              </div>
            </div>

            {resetError && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>⚠️ {resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>✅ {resetSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={resetLoading}
              id="btn-confirmar-recuperar"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Mail className="w-4 h-4" />
              <span>{resetLoading ? 'Enviando enlace...' : 'Enviar Enlace de Recuperación'}</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-xs text-slate-500 hover:text-slate-800 hover:underline font-medium cursor-pointer"
              >
                ← Regresar al inicio de sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
