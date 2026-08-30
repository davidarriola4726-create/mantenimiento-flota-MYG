import React, { useState } from 'react';
import { Users, UserPlus, Shield, KeyRound, Trash2, CheckCircle2, UserCheck, ShieldAlert } from 'lucide-react';
import { Usuario } from '../types';
import { saveUsuario } from '../services/firestoreService';

interface UsuariosViewProps {
  usuarios: Usuario[];
  currentUser: Usuario;
  onOpenCambiarPassword: () => void;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  usuarios,
  currentUser,
  onOpenCambiarPassword,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [numeroUsuario, setNumeroUsuario] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'admin' | 'tecnico' | 'piloto'>('piloto');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUser = numeroUsuario.trim().toUpperCase();
    if (!cleanUser || !nombre.trim() || !password.trim()) {
      setError('Por favor complete todos los campos requeridos.');
      return;
    }

    if (usuarios.some((u) => u.numeroUsuario.toUpperCase() === cleanUser)) {
      setError('El número de usuario ya existe. Elija otro código.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nuevoUsuario: Usuario = {
        id: cleanUser,
        numeroUsuario: cleanUser,
        nombre: nombre.trim(),
        password: password.trim(),
        rol,
        creadoEn: new Date().toISOString(),
      };
      await saveUsuario(nuevoUsuario);
      setShowAddModal(false);
      setNumeroUsuario('');
      setNombre('');
      setPassword('');
      setRol('piloto');
    } catch (err: any) {
      setError('Error al guardar usuario: ' + (err.message || 'Intente nuevamente'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Control de Usuarios y Seguridad</h2>
              <p className="text-xs text-slate-500">Gestión de accesos, roles y contraseñas de la flota MYG</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCambiarPassword}
            id="btn-mi-clave-top"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-2"
          >
            <KeyRound className="w-4 h-4 text-blue-600" />
            <span>Mi Contraseña</span>
          </button>
          {currentUser.rol === 'admin' && (
            <button
              onClick={() => setShowAddModal(true)}
              id="btn-crear-nuevo-usuario"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Usuario</span>
            </button>
          )}
        </div>
      </div>

      {/* Tarjeta de usuario actual */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center font-bold text-lg text-blue-300">
            {currentUser.numeroUsuario.substring(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">{currentUser.nombre}</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-400/20 text-blue-200 border border-blue-300/30 uppercase">
                {currentUser.rol}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Número de Usuario: <strong className="font-mono text-white">{currentUser.numeroUsuario}</strong> • Sesión activa
            </p>
          </div>
        </div>
        <button
          onClick={onOpenCambiarPassword}
          id="btn-cambiar-pass-card"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition border border-white/20 flex items-center gap-2"
        >
          <KeyRound className="w-4 h-4" />
          <span>Cambiar mi contraseña</span>
        </button>
      </div>

      {/* Lista de usuarios registrados */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Usuarios del Sistema ({usuarios.length})
          </h3>
          <span className="text-xs text-slate-500 font-medium">Sincronización en tiempo real</span>
        </div>

        <div className="divide-y divide-slate-100">
          {usuarios.map((u) => (
            <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  u.rol === 'admin' ? 'bg-amber-100 text-amber-800' :
                  u.rol === 'tecnico' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{u.nombre}</span>
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {u.numeroUsuario}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="capitalize font-medium">Rol: {u.rol}</span>
                    <span>•</span>
                    <span>Contraseña: ••••••••</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                  u.rol === 'admin' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  u.rol === 'tecnico' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {u.rol}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Nuevo Usuario */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Registrar Nuevo Usuario</h3>
                  <p className="text-xs text-slate-300">Asigna credenciales y rol</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearUsuario} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Número de Usuario o Código
                </label>
                <input
                  type="text"
                  value={numeroUsuario}
                  onChange={(e) => setNumeroUsuario(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej: TEC02, PILOTO04"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej: Roberto Morales"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Contraseña Inicial
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Rol en el Sistema
                </label>
                <select
                  value={rol}
                  onChange={(e: any) => setRol(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="piloto">Piloto / Conductor</option>
                  <option value="tecnico">Técnico / Mecánico</option>
                  <option value="admin">Administrador General</option>
                </select>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Crear Usuario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
