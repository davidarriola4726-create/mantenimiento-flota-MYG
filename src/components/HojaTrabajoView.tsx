import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  Calendar,
  Truck,
  User,
  Wrench,
  DollarSign,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { HojaTrabajo, RepuestoCatalogo, RepuestoItem, Servicio, Vehiculo } from '../types';
import { saveHojaTrabajo, saveServicio, deleteHojaTrabajo } from '../services/firestoreService';
import { SignaturePad } from './SignaturePad';
import { formatQuetzales } from '../utils/alertUtils';

interface HojaTrabajoViewProps {
  hojas: HojaTrabajo[];
  vehiculos: Vehiculo[];
  repuestosCatalogo: RepuestoCatalogo[];
  onVerVehiculo?: (placa: string) => void;
}

export const HojaTrabajoView: React.FC<HojaTrabajoViewProps> = ({
  hojas,
  vehiculos,
  repuestosCatalogo,
}) => {
  const [modoCreacion, setModoCreacion] = useState(false);
  const [hojaSeleccionadaImprimir, setHojaSeleccionadaImprimir] = useState<HojaTrabajo | null>(null);

  // Campos formulario
  const [placa, setPlaca] = useState('');
  const [piloto, setPiloto] = useState('');
  const [tecnico, setTecnico] = useState('');
  const [tipoServicio, setTipoServicio] = useState('Mantenimiento Preventivo');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [kilometraje, setKilometraje] = useState<number | string>('');
  const [observaciones, setObservaciones] = useState('');
  const [costoManoObra, setCostoManoObra] = useState<number | string>(150);
  const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<RepuestoItem[]>([]);

  // Repuesto temporal para agregar a la lista
  const [repuestoTempId, setRepuestoTempId] = useState('');
  const [repuestoTempNombreManual, setRepuestoTempNombreManual] = useState('');
  const [repuestoTempPrecio, setRepuestoTempPrecio] = useState<number | string>('');
  const [repuestoTempCantidad, setRepuestoTempCantidad] = useState<number>(1);

  // Firmas
  const [firmaPiloto, setFirmaPiloto] = useState('');
  const [firmaTecnico, setFirmaTecnico] = useState('');

  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [exitoMsg, setExitoMsg] = useState('');

  const handleSelectPlaca = (selectedPlaca: string) => {
    setPlaca(selectedPlaca);
    const v = vehiculos.find((x) => x.placa === selectedPlaca);
    if (v) {
      if (v.piloto) setPiloto(v.piloto);
      if (v.kilometraje) setKilometraje(v.kilometraje);
    }
  };

  const handleSelectRepuestoCatalogo = (id: string) => {
    setRepuestoTempId(id);
    if (id === 'MANUAL') {
      setRepuestoTempNombreManual('');
      setRepuestoTempPrecio('');
      return;
    }
    const found = repuestosCatalogo.find((r) => r.id === id);
    if (found) {
      setRepuestoTempNombreManual(found.nombre);
      setRepuestoTempPrecio(found.precio);
    }
  };

  const handleAgregarRepuestoALista = () => {
    const p = Number(repuestoTempPrecio);
    const c = Number(repuestoTempCantidad) || 1;
    const n = repuestoTempNombreManual.trim();

    if (!n || isNaN(p) || p < 0 || c <= 0) {
      alert('Por favor ingrese un nombre de repuesto, precio y cantidad válidos.');
      return;
    }

    const nuevoItem: RepuestoItem = {
      nombre: n,
      precio: p,
      cantidad: c,
      total: p * c,
    };

    setRepuestosSeleccionados([...repuestosSeleccionados, nuevoItem]);
    setRepuestoTempId('');
    setRepuestoTempNombreManual('');
    setRepuestoTempPrecio('');
    setRepuestoTempCantidad(1);
  };

  const handleEliminarRepuestoLista = (idx: number) => {
    setRepuestosSeleccionados(repuestosSeleccionados.filter((_, i) => i !== idx));
  };

  // Cálculo automático del total
  const subtotalRepuestos = repuestosSeleccionados.reduce((acc, r) => acc + (r.total || 0), 0);
  const totalGeneralQ = subtotalRepuestos + (Number(costoManoObra) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setExitoMsg('');

    if (!placa.trim()) {
      setError('Debe seleccionar o ingresar el número de placa.');
      return;
    }
    if (!piloto.trim()) {
      setError('Debe ingresar el nombre del piloto.');
      return;
    }
    if (!tecnico.trim()) {
      setError('Debe ingresar el nombre del técnico.');
      return;
    }

    setGuardando(true);
    try {
      const numOrden = `OT-${Date.now().toString().slice(-6)}`;
      const hojaId = `ht_${Date.now()}`;

      const nuevaHoja: HojaTrabajo = {
        id: hojaId,
        numeroOrden: numOrden,
        placa: placa.trim().toUpperCase(),
        piloto: piloto.trim(),
        tecnico: tecnico.trim(),
        tipoServicio,
        fecha,
        kilometraje: Number(kilometraje) || 0,
        repuestos: repuestosSeleccionados,
        costoManoObra: Number(costoManoObra) || 0,
        totalQuetzales: totalGeneralQ,
        observaciones: observaciones.trim(),
        firmaPiloto,
        firmaTecnico,
        creadoEn: new Date().toISOString(),
      };

      // Guardar en colección hojas_trabajo
      await saveHojaTrabajo(nuevaHoja);

      // También registrar en el historial de servicios del vehículo
      const nuevoServicio: Servicio = {
        id: `srv_ht_${Date.now()}`,
        placa: placa.trim().toUpperCase(),
        piloto: piloto.trim(),
        tecnico: tecnico.trim(),
        tipoServicio,
        fecha,
        kilometraje: Number(kilometraje) || 0,
        repuestos: repuestosSeleccionados,
        costoManoObra: Number(costoManoObra) || 0,
        costoRepuestos: subtotalRepuestos,
        costoTotal: totalGeneralQ,
        descripcion: `Hoja de Trabajo ${numOrden}: ${observaciones || tipoServicio}`,
        estado: 'completado',
        firmaPiloto,
        firmaTecnico,
        hojaTrabajoId: hojaId,
        creadoEn: new Date().toISOString(),
      };
      await saveServicio(nuevoServicio);

      setExitoMsg(`¡Hoja de Trabajo ${numOrden} guardada y sincronizada en tiempo real!`);
      setTimeout(() => {
        setModoCreacion(false);
        setHojaSeleccionadaImprimir(nuevaHoja);
        setExitoMsg('');
      }, 1000);
    } catch (err: any) {
      setError('Error al guardar hoja de trabajo: ' + (err.message || 'Error'));
    } finally {
      setGuardando(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Hoja de Trabajo en Campo (MYG)</h2>
            <p className="text-xs text-slate-500">
              Orden de servicio digital, repuestos en Q, firmas digitales y cálculo automático
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setModoCreacion(!modoCreacion);
            setHojaSeleccionadaImprimir(null);
          }}
          id="btn-toggle-nueva-hoja"
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
        >
          {modoCreacion ? (
            <span>Ver Hojas Guardadas</span>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Nueva Hoja de Trabajo</span>
            </>
          )}
        </button>
      </div>

      {/* FORMULARIO DE CREACIÓN */}
      {modoCreacion && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-150 print:hidden">
          <div className="p-4 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-sm">Crear Nueva Hoja de Trabajo en Campo</h3>
            </div>
            <span className="text-[11px] bg-blue-500/20 text-blue-200 px-2.5 py-1 rounded-full border border-blue-400/30">
              Sincronización en la Nube
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 text-sm">
            {/* Fila 1: Placa, Piloto, Técnico */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Número de Placa *
                </label>
                <select
                  value={placa}
                  onChange={(e) => handleSelectPlaca(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Seleccione vehículo por placa...</option>
                  {vehiculos.map((v) => (
                    <option key={v.placa} value={v.placa}>
                      {v.placa} — {v.piloto} ({v.tipo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre del Piloto *
                </label>
                <input
                  type="text"
                  value={piloto}
                  onChange={(e) => setPiloto(e.target.value)}
                  placeholder="Piloto asignado"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre del Técnico / Mecánico *
                </label>
                <input
                  type="text"
                  value={tecnico}
                  onChange={(e) => setTecnico(e.target.value)}
                  placeholder="Ej: Carlos Ramos"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Fila 2: Tipo de Servicio, Fecha, Kilometraje */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tipo de Servicio *
                </label>
                <select
                  value={tipoServicio}
                  onChange={(e) => setTipoServicio(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Mantenimiento Preventivo">Mantenimiento Preventivo</option>
                  <option value="Cambio de Aceite y Filtros">Cambio de Aceite y Filtros</option>
                  <option value="Servicio de Frenos">Servicio de Frenos</option>
                  <option value="Reparación Correctiva">Reparación Correctiva</option>
                  <option value="Suspensión y Dirección">Suspensión y Dirección</option>
                  <option value="Sistema Eléctrico">Sistema Eléctrico</option>
                  <option value="Alineación y Llantas">Alineación y Llantas</option>
                  <option value="Revisión de Rutina en Campo">Revisión de Rutina en Campo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Fecha del Servicio *
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Kilometraje al Momento *
                </label>
                <input
                  type="number"
                  value={kilometraje}
                  onChange={(e) => setKilometraje(e.target.value)}
                  placeholder="Ej: 45000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* SECCIÓN DE CONTROL DE REPUESTOS EN ESTE SERVICIO */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Listado de Repuestos Utilizados en este Servicio
                  </h4>
                </div>
                <span className="text-xs font-bold text-slate-600 font-mono">
                  Subtotal Repuestos: {formatQuetzales(subtotalRepuestos)}
                </span>
              </div>

              {/* Selector de repuesto del catálogo o manual */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-3 rounded-xl border border-slate-200">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Cargar del Catálogo
                  </label>
                  <select
                    value={repuestoTempId}
                    onChange={(e) => handleSelectRepuestoCatalogo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="">Seleccionar repuesto...</option>
                    <option value="MANUAL">+ Ingresar repuesto manual</option>
                    {repuestosCatalogo.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre} (Q{r.precio})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Nombre del Repuesto
                  </label>
                  <input
                    type="text"
                    value={repuestoTempNombreManual}
                    onChange={(e) => setRepuestoTempNombreManual(e.target.value)}
                    placeholder="Nombre de la pieza"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Precio (Q)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={repuestoTempPrecio}
                    onChange={(e) => setRepuestoTempPrecio(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Cant.
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={repuestoTempCantidad}
                    onChange={(e) => setRepuestoTempCantidad(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-center"
                  />
                </div>

                <div className="sm:col-span-2 flex items-end">
                  <button
                    type="button"
                    onClick={handleAgregarRepuestoALista}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar</span>
                  </button>
                </div>
              </div>

              {/* Tabla de repuestos agregados */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Repuesto</th>
                      <th className="p-2.5 text-center">Cant.</th>
                      <th className="p-2.5 text-right">Precio Unit. (Q)</th>
                      <th className="p-2.5 text-right">Total (Q)</th>
                      <th className="p-2.5 text-center w-12">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {repuestosSeleccionados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          No se han agregado repuestos aún (si no se utilizaron repuestos, dejar vacío).
                        </td>
                      </tr>
                    ) : (
                      repuestosSeleccionados.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-semibold text-slate-800">{item.nombre}</td>
                          <td className="p-2.5 text-center font-bold">{item.cantidad}</td>
                          <td className="p-2.5 text-right font-mono">{formatQuetzales(item.precio)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-800">
                            {formatQuetzales(item.total)}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleEliminarRepuestoLista(idx)}
                              className="text-slate-400 hover:text-red-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mano de Obra y Total Automático */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Costo Mano de Obra (Q):
                  </label>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                      Q
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costoManoObra}
                      onChange={(e) => setCostoManoObra(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl flex items-center gap-3">
                  <span className="text-xs font-bold uppercase text-emerald-900">
                    CÁLCULO AUTOMÁTICO TOTAL SERVICIO:
                  </span>
                  <span className="text-lg font-black font-mono text-emerald-800">
                    {formatQuetzales(totalGeneralQ)}
                  </span>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Observaciones y Trabajos Realizados
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
                placeholder="Detalle técnico de las reparaciones, ajustes, cambios realizados..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* SECCIÓN DE FIRMAS DIGITALES REQUERIDAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <SignaturePad
                label="Firma del Piloto Asignado"
                id="firma-piloto"
                initialValue={firmaPiloto}
                onSave={(dataUrl) => setFirmaPiloto(dataUrl)}
              />
              <SignaturePad
                label="Firma del Técnico / Mecánico"
                id="firma-tecnico"
                initialValue={firmaTecnico}
                onSave={(dataUrl) => setFirmaTecnico(dataUrl)}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {exitoMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{exitoMsg}</span>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModoCreacion(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                id="btn-guardar-hoja-campo"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{guardando ? 'Guardando en la Nube...' : 'Guardar y Sincronizar Hoja'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VISTA PREVIA LIMPIA E IMPRESIÓN DE HOJA SELECCIONADA */}
      {hojaSeleccionadaImprimir && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Vista de Impresión / Orden: {hojaSeleccionadaImprimir.numeroOrden}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImprimir}
                id="btn-imprimir-hoja-campo"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Hoja de Trabajo</span>
              </button>
              <button
                onClick={() => setHojaSeleccionadaImprimir(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cerrar Vista
              </button>
            </div>
          </div>

          {/* Formato Membretado para Impresión */}
          <div
            id="formato-impresion-hoja"
            className="printable-document printable-area p-4 border border-slate-300 rounded-xl space-y-6 text-slate-900 print:p-0 print:border-none"
          >
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/logo_myg.png"
                  alt="Logo MYG"
                  className="h-10 w-auto object-contain rounded-lg border border-slate-300"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h1 className="text-xl font-black tracking-tight">CONTROL DE VEHÍCULOS "MYG"</h1>
                  <p className="text-xs text-slate-600">Hoja de Trabajo y Servicio Técnico en Campo</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-base text-blue-900 block">
                  {hojaSeleccionadaImprimir.numeroOrden}
                </span>
                <span className="text-xs text-slate-500">Fecha: {hojaSeleccionadaImprimir.fecha}</span>
              </div>
            </div>

            {/* Datos generales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-slate-50 rounded-lg text-xs">
              <div>
                <span className="text-slate-500 block">Número de Placa:</span>
                <strong className="text-sm font-mono text-slate-900">{hojaSeleccionadaImprimir.placa}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Piloto Asignado:</span>
                <strong className="text-sm text-slate-900">{hojaSeleccionadaImprimir.piloto}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Técnico Responsable:</span>
                <strong className="text-sm text-slate-900">{hojaSeleccionadaImprimir.tecnico}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Kilometraje:</span>
                <strong className="text-sm font-mono text-slate-900">
                  {hojaSeleccionadaImprimir.kilometraje.toLocaleString()} km
                </strong>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">
                Tipo de Servicio Realizado:
              </span>
              <p className="text-sm font-semibold text-slate-800">{hojaSeleccionadaImprimir.tipoServicio}</p>
              {hojaSeleccionadaImprimir.observaciones && (
                <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded">
                  {hojaSeleccionadaImprimir.observaciones}
                </p>
              )}
            </div>

            {/* Tabla de repuestos */}
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase block mb-2">
                Repuestos y Materiales Utilizados:
              </span>
              <table className="w-full text-xs text-left border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                  <tr>
                    <th className="p-2 border-r border-slate-300">Nombre del Repuesto</th>
                    <th className="p-2 border-r border-slate-300 text-center w-16">Cant.</th>
                    <th className="p-2 border-r border-slate-300 text-right w-28">Precio Unit. (Q)</th>
                    <th className="p-2 text-right w-28">Total (Q)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(!hojaSeleccionadaImprimir.repuestos || hojaSeleccionadaImprimir.repuestos.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-slate-400 italic">
                        Sin repuestos registrados en esta orden.
                      </td>
                    </tr>
                  ) : (
                    hojaSeleccionadaImprimir.repuestos.map((r, i) => (
                      <tr key={i}>
                        <td className="p-2 border-r border-slate-200 font-medium">{r.nombre}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold">{r.cantidad}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono">{formatQuetzales(r.precio)}</td>
                        <td className="p-2 text-right font-mono font-bold">{formatQuetzales(r.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                  <tr>
                    <td colSpan={3} className="p-2 text-right">Mano de Obra:</td>
                    <td className="p-2 text-right font-mono">
                      {formatQuetzales(hojaSeleccionadaImprimir.costoManoObra || 0)}
                    </td>
                  </tr>
                  <tr className="text-sm bg-slate-100">
                    <td colSpan={3} className="p-2 text-right font-black">TOTAL GENERAL (Q):</td>
                    <td className="p-2 text-right font-mono font-black text-emerald-900">
                      {formatQuetzales(hojaSeleccionadaImprimir.totalQuetzales)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Firmas */}
            <div className="grid grid-cols-2 gap-8 pt-8">
              <div className="text-center border-t border-slate-400 pt-2">
                {hojaSeleccionadaImprimir.firmaPiloto ? (
                  <img
                    src={hojaSeleccionadaImprimir.firmaPiloto}
                    alt="Firma Piloto"
                    className="h-16 mx-auto mb-1 object-contain"
                  />
                ) : (
                  <div className="h-16 flex items-center justify-center text-slate-300 text-xs italic">
                    Sin firma digital registrada
                  </div>
                )}
                <span className="font-bold text-xs block text-slate-800">{hojaSeleccionadaImprimir.piloto}</span>
                <span className="text-[11px] text-slate-500">Firma del Piloto Asignado</span>
              </div>

              <div className="text-center border-t border-slate-400 pt-2">
                {hojaSeleccionadaImprimir.firmaTecnico ? (
                  <img
                    src={hojaSeleccionadaImprimir.firmaTecnico}
                    alt="Firma Técnico"
                    className="h-16 mx-auto mb-1 object-contain"
                  />
                ) : (
                  <div className="h-16 flex items-center justify-center text-slate-300 text-xs italic">
                    Sin firma digital registrada
                  </div>
                )}
                <span className="font-bold text-xs block text-slate-800">{hojaSeleccionadaImprimir.tecnico}</span>
                <span className="text-[11px] text-slate-500">Firma del Técnico Mecánico</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LISTADO DE HOJAS DE TRABAJO REGISTRADAS */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs print:hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Historial de Hojas de Trabajo en Campo ({hojas.length})
          </h3>
          <span className="text-xs text-slate-500">Sincronizado en tiempo real</span>
        </div>

        <div className="divide-y divide-slate-100">
          {hojas.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No hay hojas de trabajo registradas todavía. Crea la primera con el botón superior.
            </div>
          ) : (
            hojas.map((h) => (
              <div
                key={h.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-blue-900 text-sm">{h.numeroOrden}</span>
                      <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                        {h.placa}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {h.fecha}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 mt-1">{h.tipoServicio}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      <span>Piloto: {h.piloto}</span>
                      <span>•</span>
                      <span>Técnico: {h.tecnico}</span>
                      <span>•</span>
                      <span>{h.repuestos?.length || 0} repuestos</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Servicio</span>
                    <span className="font-mono font-black text-emerald-800 text-sm">
                      {formatQuetzales(h.totalQuetzales)}
                    </span>
                  </div>

                  <button
                    onClick={() => setHojaSeleccionadaImprimir(h)}
                    id={`btn-ver-hoja-${h.id}`}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Ver / Imprimir</span>
                  </button>

                  <button
                    onClick={async () => {
                      if (confirm(`¿Eliminar hoja ${h.numeroOrden}?`)) {
                        await deleteHojaTrabajo(h.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
