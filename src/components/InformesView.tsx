import React, { useState, useMemo } from 'react';
import {
  FileBarChart,
  Printer,
  Download,
  Calendar,
  Filter,
  Truck,
  DollarSign,
  Fuel,
  Wrench,
  User,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Vehiculo, Servicio, RegistroCombustible, HojaTrabajo } from '../types';
import { formatQuetzales } from '../utils/alertUtils';

interface InformesViewProps {
  vehiculos: Vehiculo[];
  servicios: Servicio[];
  combustibles: RegistroCombustible[];
  hojasTrabajo: HojaTrabajo[];
}

export const InformesView: React.FC<InformesViewProps> = ({
  vehiculos,
  servicios,
  combustibles,
  hojasTrabajo,
}) => {
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  const hoyStr = hoy.toISOString().split('T')[0];

  const [tipoInforme, setTipoInforme] = useState<'vehiculo' | 'fechas'>('vehiculo');
  const [placaSeleccionada, setPlacaSeleccionada] = useState<string>(vehiculos[0]?.placa || '');
  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(hoyStr);

  // Filtrado de servicios e historial
  const { serviciosFiltrados, combustibleFiltrado, vehiculoActual } = useMemo(() => {
    if (tipoInforme === 'vehiculo') {
      const v = vehiculos.find((x) => x.placa === placaSeleccionada);
      const s = servicios.filter((x) => x.placa.toUpperCase() === placaSeleccionada.toUpperCase());
      const c = combustibles.filter((x) => x.placa.toUpperCase() === placaSeleccionada.toUpperCase());
      return { serviciosFiltrados: s, combustibleFiltrado: c, vehiculoActual: v };
    } else {
      const s = servicios.filter((x) => x.fecha >= fechaInicio && x.fecha <= fechaFin);
      const c = combustibles.filter((x) => x.fecha >= fechaInicio && x.fecha <= fechaFin);
      return { serviciosFiltrados: s, combustibleFiltrado: c, vehiculoActual: null };
    }
  }, [tipoInforme, placaSeleccionada, fechaInicio, fechaFin, vehiculos, servicios, combustibles]);

  // Cálculos de totales
  const totales = useMemo(() => {
    let totalServicios = 0;
    let totalRepuestos = 0;
    let totalManoObra = 0;
    let totalCombustible = 0;

    serviciosFiltrados.forEach((s) => {
      totalServicios += Number(s.costoTotal) || 0;
      totalRepuestos += Number(s.costoRepuestos) || 0;
      totalManoObra += Number(s.costoManoObra) || 0;
    });

    combustibleFiltrado.forEach((c) => {
      totalCombustible += Number(c.montoQuetzales) || 0;
    });

    return {
      totalServicios,
      totalRepuestos,
      totalManoObra,
      totalCombustible,
      granTotal: totalServicios + totalCombustible,
    };
  }, [serviciosFiltrados, combustibleFiltrado]);

  const handleImprimir = () => {
    try {
      if (typeof window !== 'undefined') {
        window.focus();
        setTimeout(() => {
          window.print();
        }, 50);
      }
    } catch (error) {
      console.error('Error al invocar window.print():', error);
    }
  };

  const handleExportarCSV = () => {
    const rows = [
      ['MYG CONTROL DE MANTENIMIENTO - REPORTE OFICIAL'],
      [`Generado: ${new Date().toLocaleString('es-GT')}`],
      [`Tipo de Informe: ${tipoInforme === 'vehiculo' ? `Vehículo Placa ${placaSeleccionada}` : `Rango ${fechaInicio} a ${fechaFin}`}`],
      [''],
      ['--- SERVICIOS Y MANTENIMIENTO ---'],
      ['Fecha', 'Placa', 'Piloto', 'Técnico', 'Tipo Servicio', 'Repuestos', 'Mano de Obra (Q)', 'Total Servicio (Q)'],
    ];

    serviciosFiltrados.forEach((s) => {
      const repStr = (s.repuestos || []).map((r) => `${r.cantidad}x ${r.nombre}`).join('; ');
      rows.push([
        s.fecha,
        s.placa,
        s.piloto,
        s.tecnico || '',
        s.tipoServicio,
        `"${repStr}"`,
        s.costoManoObra?.toString() || '0',
        s.costoTotal?.toString() || '0',
      ]);
    });

    rows.push(['']);
    rows.push(['--- REGISTRO DE COMBUSTIBLE ---']);
    rows.push(['Fecha', 'Semana', 'Placa', 'Piloto', 'Galones', 'Monto en Quetzales (Q)']);

    combustibleFiltrado.forEach((c) => {
      rows.push([
        c.fecha,
        `Semana ${c.semana}`,
        c.placa,
        c.piloto || '',
        c.galones?.toString() || '',
        c.montoQuetzales?.toString() || '0',
      ]);
    });

    rows.push(['']);
    rows.push(['TOTAL GENERAL (Q)', '', '', '', '', totales.granTotal.toString()]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_MYG_${tipoInforme}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Panel Superior de Filtro (Oculto en Impresión) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <FileBarChart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Generador de Informes e Impresión</h2>
              <p className="text-xs text-slate-500">
                Informes oficiales por Vehículo (Placa) o por Rango de Fechas en formato limpio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportarCSV}
              id="btn-exportar-csv"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Exportar Excel / CSV</span>
            </button>
            <button
              onClick={handleImprimir}
              id="btn-imprimir-informe"
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Informe</span>
            </button>
          </div>
        </div>

        {/* Selector de Tipo de Informe */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={() => setTipoInforme('vehiculo')}
            className={`p-3 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between ${
              tipoInforme === 'vehiculo'
                ? 'bg-blue-50 border-blue-500 text-blue-900'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>Opción 1: Informe por VEHÍCULO (Placa)</span>
            </div>
            {tipoInforme === 'vehiculo' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
          </button>

          <button
            onClick={() => setTipoInforme('fechas')}
            className={`p-3 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between ${
              tipoInforme === 'fechas'
                ? 'bg-blue-50 border-blue-500 text-blue-900'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Opción 2: Informe por RANGO DE FECHAS</span>
            </div>
            {tipoInforme === 'fechas' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
          </button>
        </div>

        {/* Filtros específicos según tipo */}
        <div className="pt-2">
          {tipoInforme === 'vehiculo' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Seleccione la Placa del Vehículo:
              </label>
              <select
                value={placaSeleccionada}
                onChange={(e) => setPlacaSeleccionada(e.target.value)}
                className="w-full sm:w-80 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {vehiculos.map((v) => (
                  <option key={v.placa} value={v.placa}>
                    {v.placa} — {v.piloto} ({v.tipo})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Fecha Inicial
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Fecha Final
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DOCUMENTO FORMATEADO Y LISTO PARA IMPRIMIR (@media print) */}
      <div
        id="formato-impresion-informe"
        className="printable-document printable-area bg-white rounded-2xl border border-slate-300 p-8 space-y-6 shadow-sm print:p-0 print:border-none print:shadow-none"
      >
        {/* Encabezado Oficial Membretado */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo_myg.png"
              alt="Logo MYG"
              className="h-11 w-auto object-contain rounded-lg border border-slate-300"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">
                CONTROL DE VEHÍCULOS "MYG"
              </h1>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Informe Oficial de Mantenimiento, Repuestos y Combustible
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Generado el {new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block bg-slate-900 text-white text-xs font-mono font-bold px-3 py-1 rounded-md">
              {tipoInforme === 'vehiculo' ? `PLACA: ${placaSeleccionada}` : 'REPORTE GENERAL'}
            </span>
            <span className="block text-[11px] text-slate-500 mt-1">
              {tipoInforme === 'vehiculo'
                ? `Piloto: ${vehiculoActual?.piloto || 'Asignado'}`
                : `Período: ${fechaInicio} al ${fechaFin}`}
            </span>
          </div>
        </div>

        {/* Ficha rápida del vehículo si el informe es por placa */}
        {tipoInforme === 'vehiculo' && vehiculoActual && (
          <div className="grid grid-cols-4 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 block">Número de Placa:</span>
              <strong className="text-sm font-mono text-slate-900">{vehiculoActual.placa}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Piloto Asignado:</span>
              <strong className="text-slate-900">{vehiculoActual.piloto}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Tipo / Modelo:</span>
              <strong className="text-slate-900">{vehiculoActual.tipo} {vehiculoActual.marcaModelo || ''}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Kilometraje Odómetro:</span>
              <strong className="text-sm font-mono text-slate-900">{vehiculoActual.kilometraje.toLocaleString()} km</strong>
            </div>
          </div>
        )}

        {/* Resumen Financiero en Quetzales (Q) */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Mano de Obra
            </span>
            <p className="text-base font-black font-mono text-slate-800 mt-0.5">
              {formatQuetzales(totales.totalManoObra)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Repuestos
            </span>
            <p className="text-base font-black font-mono text-purple-900 mt-0.5">
              {formatQuetzales(totales.totalRepuestos)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Combustible
            </span>
            <p className="text-base font-black font-mono text-blue-900 mt-0.5">
              {formatQuetzales(totales.totalCombustible)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 text-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block">
              TOTAL GENERAL (Q)
            </span>
            <p className="text-lg font-black font-mono text-white mt-0.5">
              {formatQuetzales(totales.granTotal)}
            </p>
          </div>
        </div>

        {/* TABLA 1: SERVICIOS Y MANTENIMIENTOS */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-blue-600" />
            <span>1. Servicios, Mantenimientos y Reparaciones Realizadas</span>
          </h3>

          <table className="w-full text-xs text-left border border-slate-300">
            <thead className="bg-slate-100 border-b border-slate-300 font-bold">
              <tr>
                <th className="p-2 border-r border-slate-300">Fecha</th>
                <th className="p-2 border-r border-slate-300">Placa / Piloto</th>
                <th className="p-2 border-r border-slate-300">Tipo de Servicio</th>
                <th className="p-2 border-r border-slate-300">Repuestos Utilizados</th>
                <th className="p-2 text-right w-28">Total (Q)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {serviciosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                    No se registran servicios en este período o vehículo.
                  </td>
                </tr>
              ) : (
                serviciosFiltrados.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 font-semibold whitespace-nowrap">
                      {s.fecha}
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      <strong className="font-mono">{s.placa}</strong>
                      <span className="block text-[10px] text-slate-500">{s.piloto}</span>
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      <span className="font-medium">{s.tipoServicio}</span>
                      {s.descripcion && (
                        <span className="block text-[10px] text-slate-500">{s.descripcion}</span>
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      {(s.repuestos && s.repuestos.length > 0) ? (
                        <div className="space-y-0.5">
                          {s.repuestos.map((r, ri) => (
                            <span key={ri} className="block text-[10px]">
                              • {r.cantidad}x {r.nombre} ({formatQuetzales(r.total)})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Mano de obra</span>
                      )}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                      {formatQuetzales(s.costoTotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold">
              <tr>
                <td colSpan={4} className="p-2 text-right">Subtotal Mantenimientos:</td>
                <td className="p-2 text-right font-mono text-emerald-900">
                  {formatQuetzales(totales.totalServicios)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* TABLA 2: CONSUMO DE COMBUSTIBLE */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Fuel className="w-4 h-4 text-blue-600" />
            <span>2. Consumo y Vales de Combustible Semanales</span>
          </h3>

          <table className="w-full text-xs text-left border border-slate-300">
            <thead className="bg-slate-100 border-b border-slate-300 font-bold">
              <tr>
                <th className="p-2 border-r border-slate-300">Fecha</th>
                <th className="p-2 border-r border-slate-300">Semana</th>
                <th className="p-2 border-r border-slate-300">Placa</th>
                <th className="p-2 border-r border-slate-300">Piloto</th>
                <th className="p-2 border-r border-slate-300 text-right">Galones</th>
                <th className="p-2 text-right w-28">Monto (Q)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {combustibleFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                    No se registran consumos de combustible en este período o vehículo.
                  </td>
                </tr>
              ) : (
                combustibleFiltrado.map((c) => (
                  <tr key={c.id}>
                    <td className="p-2 border-r border-slate-200">{c.fecha}</td>
                    <td className="p-2 border-r border-slate-200 font-bold">Semana {c.semana}</td>
                    <td className="p-2 border-r border-slate-200 font-mono font-bold">{c.placa}</td>
                    <td className="p-2 border-r border-slate-200">{c.piloto || 'N/A'}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono">{c.galones ? `${c.galones} gal` : '-'}</td>
                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                      {formatQuetzales(c.montoQuetzales)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold">
              <tr>
                <td colSpan={5} className="p-2 text-right">Subtotal Combustible:</td>
                <td className="p-2 text-right font-mono text-emerald-900">
                  {formatQuetzales(totales.totalCombustible)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Firmas de Autorización */}
        <div className="grid grid-cols-2 gap-12 pt-12 text-center text-xs">
          <div className="border-t border-slate-400 pt-2">
            <span className="font-bold text-slate-900 block">Jefe de Taller y Mantenimiento</span>
            <span className="text-slate-500">Control Flota MYG</span>
          </div>
          <div className="border-t border-slate-400 pt-2">
            <span className="font-bold text-slate-900 block">Administración / Gerencia General</span>
            <span className="text-slate-500">Aprobación de Costos</span>
          </div>
        </div>
      </div>
    </div>
  );
};
