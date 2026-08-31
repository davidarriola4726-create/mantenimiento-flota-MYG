import React, { useState, useEffect } from 'react';
import { KeyRound, Check, X, ShieldCheck, ShieldAlert } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { db, auth } from '../firebase';
import { Usuario } from '../types';
import { cambiarPasswordUsuario } from '../services/firestoreService';

interface CambiarPasswordModalProps {
  usuario: Usuario;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedPass: string) => void;
}

export const CambiarPasswordModal: React.FC<CambiarPasswordModalProps> = ({
  usuario,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [actualPassword, setActualPassword] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Limpiar campos al abrir o cerrar
  useEffect(() => {
    if (isOpen) {
      setActualPassword('');
      setNuevaPassword('');
      setConfirmarPassword('');
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCancelar = () => {
    setActualPassword('');
    setNuevaPassword('');
    setConfirmarPassword('');
    setError('');
    setSuccessMsg('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // 1. Validar contraseña actual (consultando en tiempo real en Firebase Firestore / sesión)
    let passwordValida = usuario.password;
    try {
      const userRef = doc(db, 'usuarios', usuario.numeroUsuario.trim().toUpperCase());
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().password) {
        passwordValida = userSnap.data().password;
      }
    } catch (e) {
      console.warn('Verificación local de credenciales:', e);
    }

    if (actualPassword !== passwordValida) {
      setError('La contraseña actual no es correcta');
      return;
    }

    // 2. Validar que la nueva contraseña tenga al menos 6 caracteres (requisito de Firebase)
    if (nuevaPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // 3. Validar que la confirmación coincida exactamente con la nueva
    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    // 4. Actualizar en Firebase
    setLoading(true);
    try {
      // Actualizar en colección Firestore
      await cambiarPasswordUsuario(usuario.numeroUsuario, nuevaPassword);

      // Si hay un usuario activo en Firebase Auth, actualizar también
      if (auth.currentUser) {
        try {
          await updatePassword(auth.currentUser, nuevaPassword);
        } catch (authErr) {
          console.warn('Firebase Auth update (opcional):', authErr);
        }
      }

      setSuccessMsg('Contraseña cambiada exitosamente');

      setTimeout(() => {
        onSuccess(nuevaPassword);
        handleCancelar();
      }, 1300);
    } catch (err: any) {
      console.error('Error al cambiar contraseña:', err);
      setError('Error al actualizar contraseña: ' + (err.message || 'Intente nuevamente'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Cambiar Contraseña</h3>
              <p className="text-xs text-slate-300">
                Usuario: <span className="font-bold text-white">{usuario.numeroUsuario} (MYG)</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelar}
            id="btn-close-cambiar-pass"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Contraseña Actual
            </label>
            <input
              type="password"
              id="input-pass-actual"
              value={actualPassword}
              onChange={(e) => {
                setActualPassword(e.target.value);
                if (error) setError('');
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="••••••••"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nueva Contraseña
            </label>
            <input
              type="password"
              id="input-pass-nueva"
              value={nuevaPassword}
              onChange={(e) => {
                setNuevaPassword(e.target.value);
                if (error) setError('');
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              id="input-pass-confirmar"
              value={confirmarPassword}
              onChange={(e) => {
                setConfirmarPassword(e.target.value);
                if (error) setError('');
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Repite la nueva contraseña"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>⚠️ {error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">✅ {successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancelar}
              id="btn-cancelar-cambio-pass"
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              id="btn-guardar-nueva-pass"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar Contraseña</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
