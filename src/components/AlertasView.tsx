import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Gauge,
  User,
  Truck,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { Vehiculo } from '../types';
import { calcularAlertaVehiculo } from '../utils/alertUtils';

interface AlertasViewProps {
  vehiculos: Vehiculo[];
  onProgramarServicio: (placa: string) => void;
}

export const AlertasView: React.FC<AlertasViewProps> = ({ vehiculos, onProgramarServicio }) => {
  const [tabFiltro, setTabFiltro] = useState<'todos' | 'rojo' | 'amarillo' | 'verde'>('todos');

  const vehiculosConAlerta = useMemo(() => {
    return vehiculos.map((v) => ({
      vehiculo: v,
      alerta: calcularAlertaVehiculo(v),
    }));
  }, [vehiculos]);

  const stats = useMemo(() => {
    let rojos = 0, amarillos = 0, verdes = 0;
    vehiculosConAlerta.forEach(({ alerta }) => {
      if (alerta.estado === 'rojo') rojos++;
      else if (alerta.estado === 'amarillo') amarillos++;
      else if (alerta.estado === 'verde') verdes++;
    });
    return { rojos, amarillos, verdes, total: vehiculos.length };
  }, [vehiculosConAlerta, vehiculos.length]);

  const filtrados = useMemo(() => {
    if (tabFiltro === 'todos') return vehiculosConAlerta;
    return vehiculosConAlerta.filter((x) => x.alerta.estado === tabFiltro);
  }, [vehiculosConAlerta, tabFiltro]);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Sistema de Alertas por Colores (TALLERES)</h2>
            <p className="text-xs text-slate-500">
              Supervisión de vencimientos automáticos por Fecha Programada y por Kilometraje
            </p>
          </div>
        </div>

        {/* Guía visual del semáforo */}
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-[11px] font-bold">
          <span className="flex items-center gap-1 text-emerald-800 bg-emerald-100/80 px-2 py-1 rounded-md">
            🟢 Al día
          </span>
          <span className="flex items-center gap-1 text-amber-800 bg-amber-100/80 px-2 py-1 rounded-md">
            🟡 7 Días / 500 km
          </span>
          <span className="flex items-center gap-1 text-red-800 bg-red-100/80 px-2 py-1 rounded-md">
            🔴 Vencido
          </span>
        </div>
      </div>

      {/* Tarjetas de Selección de Alerta */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Rojo: Vencidos */}
        <div
          onClick={() => setTabFiltro('rojo')}
          className={`p-5 rounded-2xl border cursor-pointer transition flex items-center justify-between shadow-xs ${
            tabFiltro === 'rojo'
              ? 'bg-red-900 text-white border-red-900 ring-2 ring-red-500'
              : 'bg-white border-red-200 hover:border-red-400'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-red-600">
                🔴 SERVICIO VENCIDO / FECHA PASADA
              </span>
            </div>
            <p className={`text-3xl font-black mt-2 ${tabFiltro === 'rojo' ? 'text-white' : 'text-red-700'}`}>
              {stats.rojos} <span className="text-xs font-medium text-slate-500">unidades urgentes</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Actúa de inmediato para evitar fallas</p>
          </div>
          <div className="p-3 bg-red-100 text-red-700 rounded-2xl">
            <XCircle className="w-8 h-8" />
          </div>
        </div>

        {/* Amarillo: Por vencer */}
        <div
          onClick={() => setTabFiltro('amarillo')}
          className={`p-5 rounded-2xl border cursor-pointer transition flex items-center justify-between shadow-xs ${
            tabFiltro === 'amarillo'
              ? 'bg-amber-900 text-white border-amber-900 ring-2 ring-amber-500'
              : 'bg-white border-amber-200 hover:border-amber-400'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-600">
                🟡 PRÓXIMO A VENCER (7 DÍAS)
              </span>
            </div>
            <p className={`text-3xl font-black mt-2 ${tabFiltro === 'amarillo' ? 'text-white' : 'text-amber-700'}`}>
              {stats.amarillos} <span className="text-xs font-medium text-slate-500">en riesgo</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Faltan ≤ 7 días o ≤ 500 km</p>
          </div>
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
        </div>

        {/* Verde: Al día */}
        <div
          onClick={() => setTabFiltro('verde')}
          className={`p-5 rounded-2xl border cursor-pointer transition flex items-center justify-between shadow-xs ${
            tabFiltro === 'verde'
              ? 'bg-emerald-900 text-white border-emerald-900 ring-2 ring-emerald-500'
              : 'bg-white border-emerald-200 hover:border-emerald-400'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600">
                🟢 SERVICIO AL DÍA / DENTRO DE TIEMPO
              </span>
            </div>
            <p className={`text-3xl font-black mt-2 ${tabFiltro === 'verde' ? 'text-white' : 'text-emerald-700'}`}>
              {stats.verdes} <span className="text-xs font-medium text-slate-500">unidades ok</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Operando bajo parámetros correctos</p>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Lista detallada de alertas */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Vehículos en Supervisión ({filtrados.length})
            </h3>
            {tabFiltro !== 'todos' && (
              <button
                onClick={() => setTabFiltro('todos')}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                (Mostrar todos)
              </button>
            )}
          </div>
          <span className="text-xs text-slate-500">Monitoreo continuo en tiempo real</span>
        </div>

        <div className="divide-y divide-slate-100">
          {filtrados.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No hay vehículos en esta categoría de alerta.
            </div>
          ) : (
            filtrados.map(({ vehiculo: v, alerta }) => {
              const bgBadge =
                alerta.estado === 'rojo'
                  ? 'bg-red-50 text-red-800 border-red-300'
                  : alerta.estado === 'amarillo'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300';

              return (
                <div
                  key={v.placa}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-2xl shrink-0 mt-0.5 ${
                        alerta.estado === 'rojo'
                          ? 'bg-red-100 text-red-700'
                          : alerta.estado === 'amarillo'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      <Truck className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg font-black text-slate-900">
                          {v.placa}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                          {v.tipo}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${bgBadge}`}
                        >
                          {alerta.estado === 'rojo'
                            ? '🔴 Vencido'
                            : alerta.estado === 'amarillo'
                            ? '🟡 Próximo a vencer'
                            : '🟢 Al día'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs text-slate-600 mt-2">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Piloto: <strong>{v.piloto}</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-slate-400" />
                          Km Actual: <strong className="font-mono">{v.kilometraje.toLocaleString()} km</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Próximo Servicio: <strong className="font-mono">{v.proximaFechaServicio}</strong>
                        </span>
                      </div>

                      <div className="mt-2.5 p-2.5 rounded-xl bg-slate-100/80 border border-slate-200/80 text-xs font-semibold text-slate-800">
                        {alerta.mensaje}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => onProgramarServicio(v.placa)}
                      id={`btn-programar-alerta-${v.placa}`}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs"
                    >
                      <span>Registrar Servicio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
