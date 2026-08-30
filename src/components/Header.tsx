import React from 'react';
import {
  Truck,
  Wifi,
  Cloud,
  KeyRound,
  LogOut,
  User,
  AlertTriangle,
  Server,
  HelpCircle,
} from 'lucide-react';
import { Usuario } from '../types';

interface HeaderProps {
  currentUser: Usuario | null;
  contadoresAlertas: { verdes: number; amarillos: number; rojos: number; total: number };
  onOpenCambiarPassword: () => void;
  onOpenVercelModal: () => void;
  onLogout: () => void;
  onSelectTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  contadoresAlertas,
  onOpenCambiarPassword,
  onOpenVercelModal,
  onLogout,
  onSelectTab,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Marca & Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('vehiculos')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base sm:text-lg tracking-tight text-white leading-none">
                CONTROL DE VEHÍCULOS <span className="text-blue-400">"MYG"</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Tiempo Real (Firebase)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Resumen Rápido de Semáforo de Alertas */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => onSelectTab('alertas')}
            id="btn-quick-alert-green"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] font-bold text-emerald-400 border border-emerald-500/20 transition"
            title="Servicios al día"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Al día: {contadoresAlertas.verdes}</span>
          </button>

          <button
            onClick={() => onSelectTab('alertas')}
            id="btn-quick-alert-yellow"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] font-bold text-amber-400 border border-amber-500/20 transition"
            title="Por vencer en 7 días o 500 km"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Por vencer: {contadoresAlertas.amarillos}</span>
          </button>

          <button
            onClick={() => onSelectTab('alertas')}
            id="btn-quick-alert-red"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] font-bold text-red-400 border border-red-500/20 transition"
            title="Servicios vencidos urgentes"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>Vencidos: {contadoresAlertas.rojos}</span>
          </button>
        </div>

        {/* Acciones de Usuario & Despliegue Vercel */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenVercelModal}
            id="btn-guia-vercel-header"
            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Ver variables e instrucciones de despliegue a Vercel"
          >
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Despliegue Vercel</span>
          </button>

          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <div className="hidden sm:block text-right">
                <span className="block text-xs font-bold text-white truncate max-w-[130px]">
                  {currentUser.nombre}
                </span>
                <span className="block text-[10px] font-mono text-slate-400 uppercase">
                  {currentUser.numeroUsuario} ({currentUser.rol})
                </span>
              </div>

              <button
                onClick={onOpenCambiarPassword}
                id="btn-header-change-pass"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                title="Cambiar Contraseña"
              >
                <KeyRound className="w-4 h-4" />
              </button>

              <button
                onClick={onLogout}
                id="btn-header-logout"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
