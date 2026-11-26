import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Plus,
  CheckCircle2,
  Clock,
  Banknote,
  Edit3,
  Trash2,
  Search,
  DollarSign,
  X,
  Save,
} from 'lucide-react';
import {
  PagoManoObra,
  EstadoPagoRegistro,
  Vehiculo,
  HojaCampoManual,
  Usuario,
} from '../types';
import {
  crearPagoManoObra,
  updatePagoManoObra,
  deletePagoManoObra,
  formatearCorrelativoPM,
} from '../services/firestoreService';
import { formatQuetzales } from '../utils/alertUtils';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface PagoManoObraViewProps {
  pagos: PagoManoObra[];
  vehiculos: Vehiculo[];
  hojasCampoHC: HojaCampoManual[];
  currentUser?: Usuario | null;
  onIrAInformes?: () => void;
}

const TIPOS_MANTENIMIENTO = [
  'Preventivo',
  'Correctivo',
  'Emergencia en Ruta',
  'Frenos y Suspensión',
  'Motor y Transmisión',
  'Sistema Eléctrico',
  'Cambio de Aceite y Filtros',
  'Otro',
];

export const PagoManoObraView: React.FC<PagoManoObraViewProps> = ({
  pagos,
  vehiculos,
  hojasCampoHC,
  currentUser,
  onIrAInformes,
}) => {
  const hoyStr = new Date().toISOString().split('T')[0];

  const [editandoRegistro, setEditandoRegistro] = useState<PagoManoObra | null>(null);
  const [fecha, setFecha] = useState(hoyStr);
  const [monto, setMonto] = useState<string>('');
  const [tipoMantenimiento, setTipoMantenimiento] = useState('Preventivo');
  const [correlativoHC, setCorrelativoHC] = useState('');
  const [placa, setPlaca] = useState('');
  const [modeloVehiculo, setModeloVehiculo] = useState('');
  const [numeroRuta, setNumeroRuta] = useState('');
  const [voucher, setVoucher] = useState('');
  const [estadoPago, setEstadoPago] = useState<EstadoPagoRegistro>('Pagado');

  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Filtros de listado
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoPagoRegistro>('TODOS');

  // Eliminación (Solo admin)
  const [registroAEliminar, setRegistroAEliminar] = useState<PagoManoObra | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const proximoCorrelativo = useMemo(() => {
    const maxSec = pagos.reduce((max, p) => Math.max(max, p.numeroSecuencial || 0), 0);
    return formatearCorrelativoPM(maxSec + 1);
  }, [pagos]);

  const handleSeleccionarPlaca = (nuevaPlaca: string) => {
    const upper = nuevaPlaca.toUpperCase();
    setPlaca(upper);
    const veh = vehiculos.find((v) => v.placa.toUpperCase() === upper.trim());
    if (veh) {
      setModeloVehiculo(veh.marcaModelo || veh.tipo || '');
    }
  };

  const handleSeleccionarHC = (hcCode: string) => {
    setCorrelativoHC(hcCode.toUpperCase());
    const hc = hojasCampoHC.find((h) => h.correlativo.toUpperCase() === hcCode.trim().toUpperCase());
    if (hc) {
      if (hc.placa && !placa) {
        handleSeleccionarPlaca(hc.placa);
      }
      if (hc.costoManoObra && !monto) {
        setMonto(hc.costoManoObra);
      }
    }
  };

  const limpiarFormulario = () => {
    setEditandoRegistro(null);
    setFecha(hoyStr);
    setMonto('');
    setTipoMantenimiento('Preventivo');
    setCorrelativoHC('');
    setPlaca('');
    setModeloVehiculo('');
    setNumeroRuta('');
    setVoucher('');
    setEstadoPago('Pagado');
    setErrorMsg('');
  };

  const handleEditarRegistro = (reg: PagoManoObra) => {
    setEditandoRegistro(reg);
    setFecha(reg.fecha || hoyStr);
    setMonto(String(reg.monto ?? ''));
    setTipoMantenimiento(reg.tipoMantenimiento || 'Preventivo');
    setCorrelativoHC(reg.correlativoHC || '');
    setPlaca(reg.placa || '');
    setModeloVehiculo(reg.modeloVehiculo || '');
    setNumeroRuta(reg.numeroRuta || '');
    setVoucher(reg.voucher || '');
    setEstadoPago(reg.estadoPago || 'Pagado');
    setErrorMsg('');
    setMensajeExito('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setMensajeExito('');

    const montoNum = parseFloat(monto);
    if (!fecha) {
      setErrorMsg('Por favor seleccione la fecha del registro.');
      return;
    }
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorMsg('Ingrese un monto válido mayor a Q 0.00.');
      return;
    }
    if (!placa.trim()) {
      setErrorMsg('Ingrese o seleccione la placa del vehículo.');
      return;
    }

    setGuardando(true);
    try {
      if (editandoRegistro) {
        const actualizado: PagoManoObra = {
          ...editandoRegistro,
          fecha,
          monto: montoNum,
          tipoMantenimiento: tipoMantenimiento.trim() || 'Mantenimiento',
          correlativoHC: correlativoHC.trim().toUpperCase(),
          modeloVehiculo: modeloVehiculo.trim(),
          placa: placa.trim().toUpperCase(),
          numeroRuta: numeroRuta.trim(),
          voucher: voucher.trim(),
          estadoPago,
          fechaPagoCancelado:
            editandoRegistro.estadoPago === 'Al crédito' && estadoPago !== 'Al crédito'
              ? hoyStr
              : editandoRegistro.fechaPagoCancelado || '',
        };
        await updatePagoManoObra(actualizado);
        setMensajeExito(`Registro ${editandoRegistro.correlativo} actualizado correctamente.`);
        limpiarFormulario();
      } else {
        const creado = await crearPagoManoObra({
          fecha,
          monto: montoNum,
          tipoMantenimiento: tipoMantenimiento.trim() || 'Mantenimiento',
          correlativoHC: correlativoHC.trim().toUpperCase(),
          modeloVehiculo: modeloVehiculo.trim(),
          placa: placa.trim().toUpperCase(),
          numeroRuta: numeroRuta.trim(),
          voucher: voucher.trim(),
          estadoPago,
          fechaPagoCancelado: estadoPago === 'Al crédito' ? '' : fecha,
        });
        setMensajeExito(`Correlativo ${creado.correlativo} generado y guardado automáticamente.`);
        limpiarFormulario();
      }
    } catch (err) {
      console.error('Error al guardar pago de mano de obra:', err);
      setErrorMsg('Ocurrió un error al guardar en Firebase. Intente de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const handleMarcarPagadoRapido = async (reg: PagoManoObra) => {
    try {
      await updatePagoManoObra({
        ...reg,
        estadoPago: 'Pagado',
        fechaPagoCancelado: hoyStr,
      });
      setMensajeExito(`El registro ${reg.correlativo} fue marcado como PAGADO.`);
    } catch (err) {
      console.error('Error al marcar como pagado:', err);
    }
  };

  const handleConfirmarEliminar = async () => {
    if (!registroAEliminar) return;
    setEliminando(true);
    try {
      await deletePagoManoObra(registroAEliminar.id);
      if (editandoRegistro?.id === registroAEliminar.id) {
        limpiarFormulario();
      }
      setRegistroAEliminar(null);
    } catch (err) {
      console.error('Error al eliminar pago de mano de obra:', err);
    } finally {
      setEliminando(false);
    }
  };

  const pagosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return pagos.filter((p) => {
      if (filtroEstado !== 'TODOS' && p.estadoPago !== filtroEstado) return false;
      if (!q) return true;
      return (
        p.correlativo.toLowerCase().includes(q) ||
        (p.placa || '').toLowerCase().includes(q) ||
        (p.modeloVehiculo || '').toLowerCase().includes(q) ||
        (p.correlativoHC || '').toLowerCase().includes(q) ||
        (p.tipoMantenimiento || '').toLowerCase().includes(q) ||
        (p.numeroRuta || '').toLowerCase().includes(q) ||
        (p.voucher || '').toLowerCase().includes(q)
      );
    });
  }, [pagos, busqueda, filtroEstado]);

  const sumaFiltrada = useMemo(
    () => pagosFiltrados.reduce((acc, p) => acc + (Number(p.monto) || 0), 0),
    [pagosFiltrados]
  );

  const totalCredito = useMemo(
    () =>
      pagos
        .filter((p) => p.estadoPago === 'Al crédito')
        .reduce((acc, p) => acc + (Number(p.monto) || 0), 0),
    [pagos]
  );

  const totalPagado = useMemo(
    () =>
      pagos
        .filter((p) => p.estadoPago === 'Pagado' || p.estadoPago === 'Efectivo')
        .reduce((acc, p) => acc + (Number(p.monto) || 0), 0),
    [pagos]
  );

  return (
    <div className="space-y-6">
      {/* Encabezado Oficial con Logo de la Empresa */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/logo_myg.png"
              alt="Logo Empresa MYG"
              className="h-14 sm:h-16 w-auto max-w-[160px] object-contain rounded-xl border border-slate-200 bg-white p-1 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Registro de Pago de Mano de Obra
                </h2>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-black font-mono">
                  {editandoRegistro ? `Editando: ${editandoRegistro.correlativo}` : `Siguiente: ${proximoCorrelativo}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Control de mano de obra por mantenimiento con correlativo PM automático guardado en Firebase.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 text-right">
              <span className="block text-[10px] font-extrabold text-amber-700 uppercase">Al Crédito</span>
              <span className="text-sm font-black text-amber-900">{formatQuetzales(totalCredito)}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 text-right">
              <span className="block text-[10px] font-extrabold text-emerald-700 uppercase">Pagado / Efectivo</span>
              <span className="text-sm font-black text-emerald-900">{formatQuetzales(totalPagado)}</span>
            </div>
            {onIrAInformes && (
              <button
                type="button"
                onClick={onIrAInformes}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Ver Informes PM
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Formulario de Registro */}
      <form
        onSubmit={handleGuardar}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-black text-slate-900">
              {editandoRegistro
                ? `Editar Pago ${editandoRegistro.correlativo}`
                : 'Nuevo Registro de Pago de Mano de Obra'}
            </h3>
          </div>
          {editandoRegistro && (
            <button
              type="button"
              onClick={limpiarFormulario}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancelar Edición</span>
            </button>
          )}
        </div>

        {mensajeExito && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Correlativo Automático */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Correlativo PM (Automático)
            </label>
            <input
              type="text"
              readOnly
              value={editandoRegistro ? editandoRegistro.correlativo : proximoCorrelativo}
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-black font-mono text-blue-700 cursor-not-allowed"
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Fecha *</label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Monto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Monto (Q) *</label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Tipo de Mantenimiento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tipo de Mantenimiento *
            </label>
            <select
              value={tipoMantenimiento}
              onChange={(e) => setTipoMantenimiento(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {TIPOS_MANTENIMIENTO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Correlativo HC de la Hoja de Campo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Correlativo HC (Hoja de Campo)
            </label>
            <input
              type="text"
              list="lista-correlativos-hc-pm"
              value={correlativoHC}
              onChange={(e) => handleSeleccionarHC(e.target.value)}
              placeholder="Ej: HC-0001"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <datalist id="lista-correlativos-hc-pm">
              {hojasCampoHC.map((h) => (
                <option key={h.id} value={h.correlativo}>
                  {h.correlativo} {h.placa ? `- ${h.placa}` : ''}
                </option>
              ))}
            </datalist>
          </div>

          {/* Placa */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Placa del Vehículo *</label>
            <input
              type="text"
              list="lista-placas-pm"
              required
              value={placa}
              onChange={(e) => handleSeleccionarPlaca(e.target.value)}
              placeholder="Ej: P-102MYG"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black uppercase text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <datalist id="lista-placas-pm">
              {vehiculos.map((v) => (
                <option key={v.placa} value={v.placa}>
                  {v.placa} - {v.marcaModelo || v.tipo}
                </option>
              ))}
            </datalist>
          </div>

          {/* Modelo del Vehículo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Modelo del Vehículo</label>
            <input
              type="text"
              value={modeloVehiculo}
              onChange={(e) => setModeloVehiculo(e.target.value)}
              placeholder="Ej: Toyota Hilux 2.8"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Número de Ruta */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Número de Ruta</label>
            <input
              type="text"
              value={numeroRuta}
              onChange={(e) => setNumeroRuta(e.target.value)}
              placeholder="Ej: Ruta 04 / Occidente"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Voucher de Pago / Transacción */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Voucher de Pago / Transacción
            </label>
            <input
              type="text"
              value={voucher}
              onChange={(e) => setVoucher(e.target.value)}
              placeholder="N.º de voucher, recibo o transferencia bancaria"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Opciones: Efectivo / Pagado / Al crédito */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Condición / Estado de Pago *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Efectivo', 'Pagado', 'Al crédito'] as EstadoPagoRegistro[]).map((opcion) => {
                const activo = estadoPago === opcion;
                return (
                  <button
                    key={opcion}
                    type="button"
                    onClick={() => setEstadoPago(opcion)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      activo
                        ? opcion === 'Al crédito'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : opcion === 'Efectivo'
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opcion === 'Efectivo' && <Banknote className="w-3.5 h-3.5" />}
                    {opcion === 'Pagado' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {opcion === 'Al crédito' && <Clock className="w-3.5 h-3.5" />}
                    <span>{opcion}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={guardando}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs sm:text-sm font-black shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            {editandoRegistro ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>
              {guardando
                ? 'Guardando...'
                : editandoRegistro
                  ? `Guardar Cambios (${editandoRegistro.correlativo})`
                  : `Guardar Registro (${proximoCorrelativo})`}
            </span>
          </button>
        </div>
      </form>

      {/* Tabla de Registros */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Historial de Pagos de Mano de Obra ({pagosFiltrados.length})
            </h3>
            <p className="text-xs text-slate-500">
              Total mostrado: <strong className="text-slate-900">{formatQuetzales(sumaFiltrada)}</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar PM, placa, HC, ruta..."
                className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-56"
              />
            </div>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as 'TODOS' | EstadoPagoRegistro)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Pagado">Pagado</option>
              <option value="Al crédito">Al crédito</option>
            </select>
          </div>
        </div>

        {pagosFiltrados.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No hay registros de pago de mano de obra con los filtros actuales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Correlativo</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Placa / Modelo</th>
                  <th className="py-2.5 px-3">Mantenimiento</th>
                  <th className="py-2.5 px-3">HC</th>
                  <th className="py-2.5 px-3">Ruta</th>
                  <th className="py-2.5 px-3">Voucher</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Monto (Q)</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagosFiltrados.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono font-black text-blue-700">
                      {p.correlativo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                      {p.fecha}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-black text-slate-900 block">{p.placa}</span>
                      <span className="text-[11px] text-slate-500">{p.modeloVehiculo || '—'}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold">
                      {p.tipoMantenimiento}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-red-600">
                      {p.correlativoHC || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{p.numeroRuta || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-600">{p.voucher || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          p.estadoPago === 'Al crédito'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : p.estadoPago === 'Efectivo'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {p.estadoPago}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                      {formatQuetzales(p.monto)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {p.estadoPago === 'Al crédito' && (
                          <button
                            type="button"
                            onClick={() => handleMarcarPagadoRapido(p)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                            title="Marcar crédito como pagado"
                          >
                            Marcar Pagado
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEditarRegistro(p)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Editar registro"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {currentUser?.rol === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setRegistroAEliminar(p)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={!!registroAEliminar}
        titulo={`Eliminar Pago ${registroAEliminar?.correlativo || ''}`}
        mensaje="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
        isDeleting={eliminando}
        onCancel={() => setRegistroAEliminar(null)}
        onConfirm={handleConfirmarEliminar}
      />
    </div>
  );
};
