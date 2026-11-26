import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
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
  CompraRepuesto,
  EstadoPagoRegistro,
  Vehiculo,
  RepuestoCatalogo,
  Usuario,
} from '../types';
import {
  crearCompraRepuesto,
  updateCompraRepuesto,
  deleteCompraRepuesto,
  formatearCorrelativoPR,
} from '../services/firestoreService';
import { formatQuetzales } from '../utils/alertUtils';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface CompraRepuestosViewProps {
  compras: CompraRepuesto[];
  vehiculos: Vehiculo[];
  repuestosCatalogo: RepuestoCatalogo[];
  currentUser?: Usuario | null;
  onIrAInformes?: () => void;
}

export const CompraRepuestosView: React.FC<CompraRepuestosViewProps> = ({
  compras,
  vehiculos,
  repuestosCatalogo,
  currentUser,
  onIrAInformes,
}) => {
  const hoyStr = new Date().toISOString().split('T')[0];

  const [editandoRegistro, setEditandoRegistro] = useState<CompraRepuesto | null>(null);
  const [fecha, setFecha] = useState(hoyStr);
  const [monto, setMonto] = useState<string>('');
  const [nombreRepuesto, setNombreRepuesto] = useState('');
  const [marcaProveedor, setMarcaProveedor] = useState('');
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
  const [filtroMarca, setFiltroMarca] = useState('TODAS');

  // Eliminación (Solo admin)
  const [registroAEliminar, setRegistroAEliminar] = useState<CompraRepuesto | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const proximoCorrelativo = useMemo(() => {
    const maxSec = compras.reduce((max, c) => Math.max(max, c.numeroSecuencial || 0), 0);
    return formatearCorrelativoPR(maxSec + 1);
  }, [compras]);

  const marcasDisponibles = useMemo(() => {
    const set = new Set<string>();
    compras.forEach((c) => {
      if (c.marcaProveedor && c.marcaProveedor.trim()) {
        set.add(c.marcaProveedor.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [compras]);

  const handleSeleccionarPlaca = (nuevaPlaca: string) => {
    const upper = nuevaPlaca.toUpperCase();
    setPlaca(upper);
    const veh = vehiculos.find((v) => v.placa.toUpperCase() === upper.trim());
    if (veh) {
      setModeloVehiculo(veh.marcaModelo || veh.tipo || '');
    }
  };

  const handleSeleccionarRepuesto = (nombre: string) => {
    setNombreRepuesto(nombre);
    const cat = repuestosCatalogo.find(
      (r) => r.nombre.trim().toLowerCase() === nombre.trim().toLowerCase()
    );
    if (cat && !monto) {
      setMonto(String(cat.precio));
    }
  };

  const limpiarFormulario = () => {
    setEditandoRegistro(null);
    setFecha(hoyStr);
    setMonto('');
    setNombreRepuesto('');
    setMarcaProveedor('');
    setPlaca('');
    setModeloVehiculo('');
    setNumeroRuta('');
    setVoucher('');
    setEstadoPago('Pagado');
    setErrorMsg('');
  };

  const handleEditarRegistro = (reg: CompraRepuesto) => {
    setEditandoRegistro(reg);
    setFecha(reg.fecha || hoyStr);
    setMonto(String(reg.monto ?? ''));
    setNombreRepuesto(reg.nombreRepuesto || '');
    setMarcaProveedor(reg.marcaProveedor || '');
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
      setErrorMsg('Por favor seleccione la fecha de compra.');
      return;
    }
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorMsg('Ingrese un monto válido mayor a Q 0.00.');
      return;
    }
    if (!nombreRepuesto.trim()) {
      setErrorMsg('Ingrese el nombre del repuesto.');
      return;
    }
    if (!marcaProveedor.trim()) {
      setErrorMsg('Ingrese la marca o casa proveedora.');
      return;
    }
    if (!placa.trim()) {
      setErrorMsg('Ingrese o seleccione la placa del vehículo.');
      return;
    }

    setGuardando(true);
    try {
      if (editandoRegistro) {
        const actualizado: CompraRepuesto = {
          ...editandoRegistro,
          fecha,
          monto: montoNum,
          nombreRepuesto: nombreRepuesto.trim(),
          marcaProveedor: marcaProveedor.trim(),
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
        await updateCompraRepuesto(actualizado);
        setMensajeExito(`Registro ${editandoRegistro.correlativo} actualizado correctamente.`);
        limpiarFormulario();
      } else {
        const creada = await crearCompraRepuesto({
          fecha,
          monto: montoNum,
          nombreRepuesto: nombreRepuesto.trim(),
          marcaProveedor: marcaProveedor.trim(),
          modeloVehiculo: modeloVehiculo.trim(),
          placa: placa.trim().toUpperCase(),
          numeroRuta: numeroRuta.trim(),
          voucher: voucher.trim(),
          estadoPago,
          fechaPagoCancelado: estadoPago === 'Al crédito' ? '' : fecha,
        });
        setMensajeExito(`Correlativo ${creada.correlativo} generado y guardado automáticamente.`);
        limpiarFormulario();
      }
    } catch (err) {
      console.error('Error al guardar compra de repuesto:', err);
      setErrorMsg('Ocurrió un error al guardar en Firebase. Intente de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const handleMarcarPagadoRapido = async (reg: CompraRepuesto) => {
    try {
      await updateCompraRepuesto({
        ...reg,
        estadoPago: 'Pagado',
        fechaPagoCancelado: hoyStr,
      });
      setMensajeExito(`El registro ${reg.correlativo} fue marcado como PAGADO.`);
    } catch (err) {
      console.error('Error al marcar compra como pagada:', err);
    }
  };

  const handleConfirmarEliminar = async () => {
    if (!registroAEliminar) return;
    setEliminando(true);
    try {
      await deleteCompraRepuesto(registroAEliminar.id);
      if (editandoRegistro?.id === registroAEliminar.id) {
        limpiarFormulario();
      }
      setRegistroAEliminar(null);
    } catch (err) {
      console.error('Error al eliminar compra de repuesto:', err);
    } finally {
      setEliminando(false);
    }
  };

  const comprasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return compras.filter((c) => {
      if (filtroEstado !== 'TODOS' && c.estadoPago !== filtroEstado) return false;
      if (
        filtroMarca !== 'TODAS' &&
        (c.marcaProveedor || '').trim().toLowerCase() !== filtroMarca.toLowerCase()
      ) {
        return false;
      }
      if (!q) return true;
      return (
        c.correlativo.toLowerCase().includes(q) ||
        (c.nombreRepuesto || '').toLowerCase().includes(q) ||
        (c.marcaProveedor || '').toLowerCase().includes(q) ||
        (c.placa || '').toLowerCase().includes(q) ||
        (c.modeloVehiculo || '').toLowerCase().includes(q) ||
        (c.numeroRuta || '').toLowerCase().includes(q) ||
        (c.voucher || '').toLowerCase().includes(q)
      );
    });
  }, [compras, busqueda, filtroEstado, filtroMarca]);

  const sumaFiltrada = useMemo(
    () => comprasFiltradas.reduce((acc, c) => acc + (Number(c.monto) || 0), 0),
    [comprasFiltradas]
  );

  const totalCredito = useMemo(
    () =>
      compras
        .filter((c) => c.estadoPago === 'Al crédito')
        .reduce((acc, c) => acc + (Number(c.monto) || 0), 0),
    [compras]
  );

  const totalPagado = useMemo(
    () =>
      compras
        .filter((c) => c.estadoPago === 'Pagado' || c.estadoPago === 'Efectivo')
        .reduce((acc, c) => acc + (Number(c.monto) || 0), 0),
    [compras]
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
                  Registro de Compra de Repuestos
                </h2>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-black font-mono">
                  {editandoRegistro ? `Editando: ${editandoRegistro.correlativo}` : `Siguiente: ${proximoCorrelativo}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Control de compras de repuestos por proveedor con correlativo PR automático guardado en Firebase.
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
                Ver Informes PR
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
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-black text-slate-900">
              {editandoRegistro
                ? `Editar Compra ${editandoRegistro.correlativo}`
                : 'Nuevo Registro de Compra de Repuestos'}
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
              Correlativo PR (Automático)
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

          {/* Nombre del Repuesto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nombre del Repuesto *
            </label>
            <input
              type="text"
              list="lista-catalogo-repuestos-pr"
              required
              value={nombreRepuesto}
              onChange={(e) => handleSeleccionarRepuesto(e.target.value)}
              placeholder="Ej: Filtro de Aceite Sintético"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <datalist id="lista-catalogo-repuestos-pr">
              {repuestosCatalogo.map((r) => (
                <option key={r.id} value={r.nombre}>
                  {r.nombre} (Q {r.precio})
                </option>
              ))}
            </datalist>
          </div>

          {/* Marca o Casa Proveedora */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Marca o Casa Proveedora *
            </label>
            <input
              type="text"
              list="lista-marcas-proveedores-pr"
              required
              value={marcaProveedor}
              onChange={(e) => setMarcaProveedor(e.target.value)}
              placeholder="Ej: Figueroa / Cofal / Repuestos Express"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <datalist id="lista-marcas-proveedores-pr">
              {marcasDisponibles.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          {/* Placa */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Placa del Vehículo *</label>
            <input
              type="text"
              list="lista-placas-pr"
              required
              value={placa}
              onChange={(e) => handleSeleccionarPlaca(e.target.value)}
              placeholder="Ej: P-102MYG"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black uppercase text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <datalist id="lista-placas-pr">
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
              placeholder="Ej: Hino Dutro 300"
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
              placeholder="Ej: Ruta 02 / Costa Sur"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Voucher / Factura / Transacción */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Voucher / Factura / Transacción
            </label>
            <input
              type="text"
              value={voucher}
              onChange={(e) => setVoucher(e.target.value)}
              placeholder="N.º de factura, voucher o transacción"
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
                  : `Guardar Compra (${proximoCorrelativo})`}
            </span>
          </button>
        </div>
      </form>

      {/* Tabla de Registros */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Historial de Compras de Repuestos ({comprasFiltradas.length})
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
                placeholder="Buscar PR, repuesto, placa..."
                className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-52"
              />
            </div>

            <select
              value={filtroMarca}
              onChange={(e) => setFiltroMarca(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="TODAS">Todas las marcas/proveedores</option>
              {marcasDisponibles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

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

        {comprasFiltradas.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No hay registros de compra de repuestos con los filtros actuales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Correlativo</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Repuesto</th>
                  <th className="py-2.5 px-3">Marca / Proveedor</th>
                  <th className="py-2.5 px-3">Placa / Modelo</th>
                  <th className="py-2.5 px-3">Ruta</th>
                  <th className="py-2.5 px-3">Voucher / Factura</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Monto (Q)</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comprasFiltradas.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono font-black text-blue-700">
                      {c.correlativo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                      {c.fecha}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {c.nombreRepuesto}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {c.marcaProveedor}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-black text-slate-900 block">{c.placa}</span>
                      <span className="text-[11px] text-slate-500">{c.modeloVehiculo || '—'}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{c.numeroRuta || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-600">{c.voucher || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          c.estadoPago === 'Al crédito'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : c.estadoPago === 'Efectivo'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {c.estadoPago}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                      {formatQuetzales(c.monto)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {c.estadoPago === 'Al crédito' && (
                          <button
                            type="button"
                            onClick={() => handleMarcarPagadoRapido(c)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                            title="Marcar crédito como pagado"
                          >
                            Marcar Pagado
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEditarRegistro(c)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Editar registro"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {currentUser?.rol === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setRegistroAEliminar(c)}
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
        titulo={`Eliminar Compra ${registroAEliminar?.correlativo || ''}`}
        mensaje="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
        isDeleting={eliminando}
        onCancel={() => setRegistroAEliminar(null)}
        onConfirm={handleConfirmarEliminar}
      />
    </div>
  );
};
