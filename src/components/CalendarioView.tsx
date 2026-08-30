import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Truck,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wrench,
  Info,
} from 'lucide-react';
import { Vehiculo, Servicio } from '../types';
import { calcularAlertaVehiculo } from '../utils/alertUtils';

interface CalendarioViewProps {
  vehiculos: Vehiculo[];
  servicios: Servicio[];
  onProgramarServicio: (placa: string) => void;
}

export const CalendarioView: React.FC<CalendarioViewProps> = ({
  vehiculos,
  servicios,
  onProgramarServicio,
}) => {
  const hoy = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(hoy.toISOString().split('T')[0]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Agrupar servicios y mantenimientos por fecha YYYY-MM-DD
  const eventosPorFecha = useMemo(() => {
    const map = new Map<string, { tipo: 'programado' | 'realizado'; vehiculo: Vehiculo; servicio?: Servicio; estado: 'verde' | 'amarillo' | 'rojo' }[]>();

    // 1. Próximos servicios programados de los vehículos
    vehiculos.forEach((v) => {
      if (v.proximaFechaServicio) {
        const f = v.proximaFechaServicio;
        const alerta = calcularAlertaVehiculo(v);
        const list = map.get(f) || [];
        list.push({
          tipo: 'programado',
          vehiculo: v,
          estado: alerta.estado,
        });
        map.set(f, list);
      }
    });

    // 2. Historial de servicios ya realizados
    servicios.forEach((s) => {
      if (s.fecha) {
        const v = vehiculos.find((x) => x.placa === s.placa) || {
          placa: s.placa,
          piloto: s.piloto,
          tipo: 'Vehículo',
          kilometraje: s.kilometraje,
          proximaFechaServicio: '',
          proximoKmServicio: 0,
          creadoEn: '',
        };
        const list = map.get(s.fecha) || [];
        list.push({
          tipo: 'realizado',
          vehiculo: v,
          servicio: s,
          estado: 'verde',
        });
        map.set(s.fecha, list);
      }
    });

    return map;
  }, [vehiculos, servicios]);

  // Días para renderizar en el mes
  const diasMatriz = useMemo(() => {
    const primerDiaSemana = new Date(year, month, 1).getDay();
    const diasEnMes = new Date(year, month + 1, 0).getDate();

    const dias = [];
    // Espacios vacíos antes del día 1
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push(null);
    }
    // Días del mes
    for (let d = 1; d <= diasEnMes; d++) {
      const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dias.push({
        dia: d,
        fechaStr,
        eventos: eventosPorFecha.get(fechaStr) || [],
        esHoy: fechaStr === hoy.toISOString().split('T')[0],
      });
    }
    return dias;
  }, [year, month, eventosPorFecha, hoy]);

  const mesAnterior = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const mesSiguiente = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const mesHoy = () => {
    setCurrentDate(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    setDiaSeleccionado(hoy.toISOString().split('T')[0]);
  };

  const eventosDiaSeleccionado = diaSeleccionado ? eventosPorFecha.get(diaSeleccionado) || [] : [];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Calendario Visual de Mantenimiento</h2>
            <p className="text-xs text-slate-500">
              Programación interactiva con alertas de color (🟢 Al día, 🟡 7 Días, 🔴 Vencidos)
            </p>
          </div>
        </div>

        {/* Controles de navegación de mes */}
        <div className="flex items-center gap-2">
          <button
            onClick={mesAnterior}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Mes Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="font-bold text-sm text-slate-900 px-3 min-w-[140px] text-center">
            {mesesNombres[month]} {year}
          </span>

          <button
            onClick={mesSiguiente}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Mes Siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={mesHoy}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition ml-2"
          >
            Mes Actual
          </button>
        </div>
      </div>

      {/* Grid del Calendario + Panel Lateral de Día */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario (2 columnas en desktop) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs uppercase text-slate-400 mb-2">
            {diasSemana.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1.5">
            {diasMatriz.map((item, idx) => {
              if (!item) {
                return <div key={`empty-${idx}`} className="h-20 sm:h-24 bg-slate-50/50 rounded-xl" />;
              }

              const isSelected = diaSeleccionado === item.fechaStr;
              const hasRed = item.eventos.some((e) => e.estado === 'rojo');
              const hasYellow = item.eventos.some((e) => e.estado === 'amarillo');
              const hasGreen = item.eventos.some((e) => e.estado === 'verde');

              return (
                <div
                  key={item.fechaStr}
                  onClick={() => setDiaSeleccionado(item.fechaStr)}
                  className={`h-20 sm:h-24 p-1.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-400'
                      : item.esHoy
                      ? 'bg-amber-50/50 border-amber-300'
                      : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        item.esHoy
                          ? 'w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center'
                          : 'text-slate-700'
                      }`}
                    >
                      {item.dia}
                    </span>

                    {item.eventos.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1 rounded">
                        {item.eventos.length}
                      </span>
                    )}
                  </div>

                  {/* Badges de eventos del día */}
                  <div className="space-y-0.5 overflow-hidden">
                    {item.eventos.slice(0, 2).map((ev, ei) => (
                      <div
                        key={ei}
                        className={`text-[9px] sm:text-[10px] font-bold truncate px-1 rounded ${
                          ev.estado === 'rojo'
                            ? 'bg-red-100 text-red-800'
                            : ev.estado === 'amarillo'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {ev.vehiculo.placa}
                      </div>
                    ))}
                    {item.eventos.length > 2 && (
                      <span className="text-[9px] text-slate-400 block text-center font-bold">
                        +{item.eventos.length - 2} más
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel Lateral: Detalle de Eventos del Día Seleccionado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {diaSeleccionado || 'Selecciona un día'}
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {eventosDiaSeleccionado.length} eventos
              </span>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {eventosDiaSeleccionado.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Info className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  No hay servicios programados ni realizados para esta fecha.
                </div>
              ) : (
                eventosDiaSeleccionado.map((ev, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border text-xs ${
                      ev.estado === 'rojo'
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : ev.estado === 'amarillo'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-sm">
                            {ev.vehiculo.placa}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/60">
                            {ev.vehiculo.tipo}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold mt-0.5">
                          Piloto: {ev.vehiculo.piloto}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          ev.estado === 'rojo'
                            ? 'bg-red-600 text-white'
                            : ev.estado === 'amarillo'
                            ? 'bg-amber-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {ev.tipo === 'programado' ? 'Programado' : 'Realizado'}
                      </span>
                    </div>

                    {ev.servicio && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px]">
                        <strong>{ev.servicio.tipoServicio}</strong>
                        <p className="text-slate-600 truncate">{ev.servicio.descripcion}</p>
                      </div>
                    )}

                    {ev.tipo === 'programado' && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => onProgramarServicio(ev.vehiculo.placa)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition"
                        >
                          <Wrench className="w-3 h-3" />
                          <span>Realizar Servicio</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-4 text-[11px] text-slate-500">
            🟢 Verde = Al día | 🟡 Amarillo = 7 días | 🔴 Rojo = Vencido
          </div>
        </div>
      </div>
    </div>
  );
};
