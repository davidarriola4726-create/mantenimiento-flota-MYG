import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Trash2,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Mail,
  Edit3,
  AlertTriangle,
  Database,
  Lock,
  Search,
  Check,
  X,
  Info
} from 'lucide-react';
import { Usuario } from '../types';
import { saveUsuario, deleteUsuario, cambiarPasswordUsuario } from '../services/firestoreService';

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
  // Modal de nuevo usuario
  const [showAddModal, setShowAddModal] = useState(false);
  const [numeroUsuario, setNumeroUsuario] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [rol, setRol] = useState<'admin' | 'tecnico' | 'piloto'>('piloto');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para búsqueda y visualización de contraseñas
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Estado para eliminar usuario
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado para editar contraseña rápidamente
  const [editingPasswordUser, setEditingPasswordUser] = useState<Usuario | null>(null);
  const [newQuickPassword, setNewQuickPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showQuickPassword, setShowQuickPassword] = useState(false);

  // Alternar visibilidad de contraseña de un usuario
  const toggleRevealPassword = (id: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Autogenerar código de usuario sugerido si está vacío
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (!numeroUsuario && val.includes('@')) {
      const prefix = val.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (prefix) {
        setNumeroUsuario(prefix.slice(0, 10));
      }
    }
  };

  // Crear y guardar un nuevo usuario
  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanUser = numeroUsuario.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanNombre = nombre.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanNombre || !cleanPass) {
      setError('Por favor complete todos los campos obligatorios: Código de usuario, Nombre y Contraseña.');
      return;
    }

    if (!cleanEmail) {
      setError('Por favor ingrese el correo electrónico del usuario.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Por favor ingrese un correo electrónico válido (ejemplo: usuario@correo.com).');
      return;
    }

    if (usuarios.some((u) => u.numeroUsuario.toUpperCase() === cleanUser)) {
      setError(`El código de usuario "${cleanUser}" ya existe en el sistema. Elija otro identificador.`);
      return;
    }

    if (usuarios.some((u) => (u.email || '').toLowerCase().trim() === cleanEmail)) {
      setError(`El correo "${cleanEmail}" ya está registrado con otro usuario.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const nuevoUsuario: Usuario = {
        id: cleanUser,
        numeroUsuario: cleanUser,
        nombre: cleanNombre,
        email: cleanEmail,
        password: cleanPass,
        rol,
        creadoEn: new Date().toISOString(),
      };

      await saveUsuario(nuevoUsuario);

      setSuccessMessage(`Usuario ${cleanNombre} (${cleanEmail}) guardado correctamente.`);
      setTimeout(() => setSuccessMessage(''), 4000);

      setShowAddModal(false);
      setNumeroUsuario('');
      setNombre('');
      setEmail('');
      setPassword('');
      setRol('piloto');
    } catch (err: any) {
      setError('Error al guardar el usuario en la base de datos: ' + (err.message || 'Intente nuevamente'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmar y eliminar usuario
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    if (userToDelete.numeroUsuario === currentUser.numeroUsuario) {
      alert('Por seguridad no puedes eliminar tu propia sesión activa.');
      setUserToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteUsuario(userToDelete.numeroUsuario);
      setUserToDelete(null);
      setSuccessMessage(`El usuario ${userToDelete.nombre} ha sido eliminado del sistema.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      alert('Error al eliminar usuario: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Guardar nueva contraseña editada directamente
  const handleGuardarNuevaPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPasswordUser || !newQuickPassword.trim()) return;

    setIsUpdatingPassword(true);
    try {
      await cambiarPasswordUsuario(editingPasswordUser.numeroUsuario, newQuickPassword.trim());
      setSuccessMessage(`Contraseña actualizada para ${editingPasswordUser.nombre}.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      setEditingPasswordUser(null);
      setNewQuickPassword('');
    } catch (err: any) {
      alert('Error al actualizar contraseña: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Filtrado de usuarios
  const filteredUsuarios = usuarios.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.nombre.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      u.numeroUsuario.toLowerCase().includes(q) ||
      u.rol.toLowerCase().includes(q)
    );
  });

  const adminsCount = usuarios.filter((u) => u.rol === 'admin').length;
  const tecnicosCount = usuarios.filter((u) => u.rol === 'tecnico').length;
  const pilotosCount = usuarios.filter((u) => u.rol === 'piloto').length;

  return (
    <div className="space-y-6">
      {/* 1. Encabezado principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 shadow-xs">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">Administración de Usuarios y Contraseñas</h2>
              </div>
              <p className="text-xs text-slate-500">
                Gestión centralizada de credenciales, accesos y roles del Sistema de Control de Vehículos MYG
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenCambiarPassword}
            id="btn-mi-clave-top"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-2 border border-slate-200"
          >
            <KeyRound className="w-4 h-4 text-blue-600" />
            <span>Mi Contraseña</span>
          </button>
          {currentUser.rol === 'admin' && (
            <button
              onClick={() => {
                setError('');
                setShowAddModal(true);
              }}
              id="btn-crear-nuevo-usuario"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Nuevo Usuario</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerta de confirmación global */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-3 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 2. Banner informativo: ¿Dónde están guardados los correos y contraseñas? */}
      <div className="bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50/40 p-5 rounded-2xl border border-blue-200 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
            <Database className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 text-sm">
                ¿Dónde están guardados los correos y contraseñas?
              </h3>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md uppercase tracking-wider">
                Firestore en Tiempo Real
              </span>
            </div>
            <p>
              Todos los usuarios, correos electrónicos y contraseñas se almacenan de forma segura en la base de datos en la colección: <code className="px-1.5 py-0.5 bg-white border border-blue-200 rounded font-mono font-bold text-blue-700">usuarios</code>.
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 font-medium text-slate-600">
              <li className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1.5 rounded-lg border border-slate-200">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span><strong>Sincronización total:</strong> Cambios inmediatos al iniciar sesión</span>
              </li>
              <li className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1.5 rounded-lg border border-slate-200">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span><strong>Aislamiento seguro:</strong> No afecta vehículos ni mantenimientos</span>
              </li>
              <li className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1.5 rounded-lg border border-slate-200">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span><strong>Control de claves:</strong> Puedes ver, renovar y eliminar usuarios</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Espacio para escribir y guardar usuarios nuevos (Tarjeta directa) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
              <UserPlus className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold tracking-wide">
              Espacio para Escribir y Guardar Usuarios Nuevos
            </h3>
          </div>
          <span className="text-xs text-blue-300 font-medium hidden sm:inline">
            Renueva credenciales sin alterar el resto del sistema
          </span>
        </div>

        <form onSubmit={handleCrearUsuario} className="p-5 bg-white border-b border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Nombre Completo */}
            <div className="lg:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Daniel Morales"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Correo Electrónico */}
            <div className="lg:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Código / Número de Usuario */}
            <div className="lg:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Código / ID Usuario *
              </label>
              <input
                type="text"
                value={numeroUsuario}
                onChange={(e) => setNumeroUsuario(e.target.value.toUpperCase())}
                placeholder="Ej: PILOTO02, TEC03"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Contraseña */}
            <div className="lg:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Escribe la clave"
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Rol y Botón Guardar */}
            <div className="lg:col-span-1 flex flex-col justify-end">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Rol Asignado
              </label>
              <select
                value={rol}
                onChange={(e: any) => setRol(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="piloto">Piloto / Conductor</option>
                <option value="tecnico">Técnico / Mecánico</option>
                <option value="admin">Administrador General</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">
              * El usuario nuevo podrá iniciar sesión inmediatamente con su correo y contraseña.
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando en Base de Datos...' : 'Guardar Nuevo Usuario'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 4. Tarjeta de Usuario Actual */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center font-bold text-lg text-blue-300">
            {currentUser.numeroUsuario.substring(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold">
                {currentUser.nombre.replace(/\s*-\s*TALLERES E\. GARCÍA/gi, '').replace(/\s*-\s*Sistema M[Y]?G/gi, '')}
              </span>
              {/* En lugar del texto 'Administrador', muestra este mismo logo en tamaño pequeño al lado del nombre */}
              {currentUser.rol === 'admin' ? (
                <img
                  src="/logo_myg.png"
                  alt="Logo MYG"
                  className="h-5 sm:h-6 w-auto max-w-[32px] object-contain rounded-md border border-slate-300 bg-white p-0.5 shadow-sm inline-block"
                  title="Sistema de Control de Vehículos MYG"
                />
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-400/20 text-blue-200 border border-blue-300/30 uppercase">
                  {currentUser.rol}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-3 flex-wrap">
              <span>Código: <strong className="font-mono text-white">{currentUser.numeroUsuario}</strong></span>
              {currentUser.email && (
                <>
                  <span>•</span>
                  <span>Correo: <strong className="text-blue-200">{currentUser.email}</strong></span>
                </>
              )}
              <span>•</span>
              <span className="text-emerald-300 font-medium">● Sesión Activa</span>
            </p>
          </div>
        </div>
        <button
          onClick={onOpenCambiarPassword}
          id="btn-cambiar-pass-card"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition border border-white/20 flex items-center gap-2 shrink-0"
        >
          <KeyRound className="w-4 h-4 text-blue-300" />
          <span>Cambiar mi contraseña</span>
        </button>
      </div>

      {/* 5. Lista de Usuarios Registrados con gestión de eliminación y visualización de contraseñas */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Barra de Filtros y Resumen */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Usuarios y Contraseñas Registradas ({usuarios.length})
            </h3>
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                {adminsCount} Admin{adminsCount !== 1 ? 's' : ''}
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                {tecnicosCount} Técnico{tecnicosCount !== 1 ? 's' : ''}
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">
                {pilotosCount} Piloto{pilotosCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="w-full md:w-72 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, correo o ID..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Tabla / Tarjetas de usuarios */}
        <div className="divide-y divide-slate-100">
          {filteredUsuarios.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No se encontraron usuarios con el término "{searchQuery}".
            </div>
          ) : (
            filteredUsuarios.map((u) => {
              const isRevealed = !!revealedPasswords[u.id];
              const isCurrent = u.numeroUsuario === currentUser.numeroUsuario;

              return (
                <div
                  key={u.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                >
                  {/* Información Principal del Usuario */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 mt-0.5 sm:mt-0 ${
                        u.rol === 'admin'
                          ? 'bg-amber-100 text-amber-800'
                          : u.rol === 'tecnico'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      <UserCheck className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {u.nombre.replace(/\s*-\s*TALLERES E\. GARCÍA/gi, '').replace(/\s*-\s*Sistema M[Y]?G/gi, '')}
                        </span>

                        {u.rol === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 text-blue-300 text-[11px] font-bold border border-slate-700 shadow-xs">
                            <img
                              src="/logo_myg.png"
                              alt="Logo MYG"
                              className="h-3.5 w-auto max-w-[20px] object-contain rounded-xs bg-white p-0.5"
                            />
                            <span>MYG Admin</span>
                          </span>
                        ) : (
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md uppercase ${
                              u.rol === 'tecnico'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {u.rol}
                          </span>
                        )}

                        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold">
                          ID: {u.numeroUsuario}
                        </span>

                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                            Tu usuario
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                        {/* Correo Electrónico destacado */}
                        <div className="flex items-center gap-1.5 font-medium">
                          <Mail className="w-3.5 h-3.5 text-blue-600" />
                          <span className="font-mono text-blue-700 bg-blue-50/70 px-2 py-0.5 rounded border border-blue-100 text-[11px]">
                            {u.email || 'Sin correo asignado'}
                          </span>
                        </div>

                        <span>•</span>

                        {/* Contraseña con botón de Ver/Ocultar */}
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-500 font-medium">Clave:</span>
                          <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800 text-xs tracking-wider">
                            {isRevealed ? u.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealPassword(u.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition"
                            title={isRevealed ? 'Ocultar contraseña' : 'Ver contraseña'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5 text-blue-600" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones: Editar contraseña y Eliminar usuario */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Botón rápido para renovar/cambiar contraseña */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPasswordUser(u);
                        setNewQuickPassword('');
                        setShowQuickPassword(false);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition flex items-center gap-1.5"
                      title="Cambiar o renovar la contraseña de este usuario"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                      <span>Renovar Clave</span>
                    </button>

                    {/* Botón para Eliminar usuario antiguo */}
                    {currentUser.rol === 'admin' && (
                      <button
                        type="button"
                        onClick={() => setUserToDelete(u)}
                        disabled={isCurrent}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                          isCurrent
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                            : 'bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border-red-200 cursor-pointer'
                        }`}
                        title={isCurrent ? 'No puedes eliminar tu propia sesión activa' : 'Eliminar este usuario antiguo'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Modal de Confirmación para Eliminar Usuario */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-red-100 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 text-white rounded-lg">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Eliminar Usuario Antiguo</h3>
                  <p className="text-xs text-red-100">Confirmación de baja de credenciales</p>
                </div>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="text-red-200 hover:text-white p-1 rounded-lg hover:bg-red-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm text-slate-700">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold mb-1 text-sm text-slate-900 leading-snug">
                    ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
                  </strong>
                  <p>
                    Se removerá el acceso de <strong>{userToDelete.nombre}</strong> con correo <span className="font-mono font-bold text-blue-700">{userToDelete.email}</span> e ID <span className="font-mono font-bold">{userToDelete.numeroUsuario}</span>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <p className="font-bold text-slate-800 mb-1">🛡️ Seguridad de datos garantizada:</p>
                <p>
                  Esta acción únicamente elimina las credenciales del usuario de la colección de acceso. <strong>NO borra</strong> ningún vehículo, registro de mantenimiento, consumo de combustible ni hojas de campo.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar Usuario'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Rápido para Renovar/Cambiar Contraseña de cualquier usuario */}
      {editingPasswordUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Renovar Contraseña</h3>
                  <p className="text-xs text-slate-300">
                    {editingPasswordUser.nombre} ({editingPasswordUser.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingPasswordUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarNuevaPassword} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nueva Contraseña para el Usuario
                </label>
                <div className="relative">
                  <input
                    type={showQuickPassword ? 'text' : 'password'}
                    value={newQuickPassword}
                    onChange={(e) => setNewQuickPassword(e.target.value)}
                    className="w-full px-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Escribe la nueva clave..."
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowQuickPassword(!showQuickPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showQuickPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Esta contraseña reemplazará la anterior en Firestore para este usuario inmediatamente.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPasswordUser(null)}
                  disabled={isUpdatingPassword}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword || !newQuickPassword.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isUpdatingPassword ? 'Actualizando...' : 'Guardar Nueva Contraseña'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal Secundario "Nuevo Usuario" (Accesible también desde el botón superior) */}
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
                  <p className="text-xs text-slate-300">Asigna correo, contraseña y rol</p>
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
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej: Daniel Morales"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="usuario@correo.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Código o Identificador de Usuario *
                </label>
                <input
                  type="text"
                  value={numeroUsuario}
                  onChange={(e) => setNumeroUsuario(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej: PILOTO02, TEC02"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Rol en el Sistema
                </label>
                <select
                  value={rol}
                  onChange={(e: any) => setRol(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
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
                  <span>{isSubmitting ? 'Guardando...' : 'Crear Usuario'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
