import React, { useState, useMemo, useEffect } from 'react';
import {
  Fuel,
  Plus,
  Calendar,
  DollarSign,
  Trash2,
  Filter,
  BarChart3,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { RegistroCombustible, Vehiculo } from '../types';
import { saveCombustible, deleteCombustible, getCombustiblesDirectly } from '../services/firestoreService';
import { formatQuetzales } from '../utils/alertUtils';

interface CombustibleViewProps {
  combustibles: RegistroCombustible[];
  vehiculos: Vehiculo[];
}

export const CombustibleView: React.FC<CombustibleViewProps> = ({ combustibles, vehiculos }) => {
  const hoy = new Date();
  const mesActualStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

  const [combustiblesLocales, setCombustiblesLocales] = useState<RegistroCombustible[]>(combustibles);
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActualStr);
  const [placaSeleccionada, setPlacaSeleccionada] = useState<string>('TODOS');
  const [modalAbierto, setModalAbierto] = useState(false);

  // Estados de eliminación y mensajes
  const [registroAEliminar, setRegistroAEliminar] = useState<RegistroCombustible | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  // Campos de formulario
  const [formPlaca, setFormPlaca] = useState(vehiculos[0]?.placa || '');
  const [formMes, setFormMes] = useState(mesActualStr);
  const [formSemana, setFormSemana] = useState<number>(1);
  const [formFecha, setFormFecha] = useState(hoy.toISOString().split('T')[0]);
  const [formMonto, setFormMonto] = useState<number | string>('');
  const [formGalones, setFormGalones] = useState<number | string>('');
  const [formKm, setFormKm] = useState<number | string>('');
  const [formPiloto, setFormPiloto] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Sincronizar estado local cuando cambie la colección Firestore
  useEffect(() => {
    setCombustiblesLocales(combustibles);
  }, [combustibles]);

  // Limpiar mensaje de éxito después de 4 segundos
  useEffect(() => {
    if (mensajeExito) {
      const timer = setTimeout(() => {
        setMensajeExito('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [mensajeExito]);

  // Al cambiar la placa del form, rellenar piloto automáticamente
  const handlePlacaChange = (placaVal: string) => {
    setFormPlaca(placaVal);
    const v = vehiculos.find((x) => x.placa === placaVal);
    if (v && v.piloto) {
      setFormPiloto(v.piloto);
    }
  };

  // Filtrado por mes y placa
  const registrosFiltrados = useMemo(() => {
    return combustiblesLocales.filter((c) => {
      const matchMes = !mesSeleccionado || c.mes === mesSeleccionado;
      const matchPlaca = placaSeleccionada === 'TODOS' || c.placa === placaSeleccionada;
      return matchMes && matchPlaca;
    });
  }, [combustiblesLocales, mesSeleccionado, placaSeleccionada]);

  // Cálculo automático del total mensual y desglose por semanas (1, 2, 3, 4)
  const resumenSemanas = useMemo(() => {
    let s1 = 0, s2 = 0, s3 = 0, s4 = 0;
    let galonesTotal = 0;

    registrosFiltrados.forEach((r) => {
      const monto = Number(r.montoQuetzales) || 0;
      galonesTotal += Number(r.galones) || 0;

      if (r.semana === 1) s1 += monto;
      else if (r.semana === 2) s2 += monto;
      else if (r.semana === 3) s3 += monto;
      else if (r.semana === 4) s4 += monto;
      else s1 += monto; // fallback
    });

    const totalMes = s1 + s2 + s3 + s4;
    const promedioSemanal = totalMes / 4;

    const chartData = [
      { name: 'Semana 1', Quetzales: s1, Semana: 1 },
      { name: 'Semana 2', Quetzales: s2, Semana: 2 },
      { name: 'Semana 3', Quetzales: s3, Semana: 3 },
      { name: 'Semana 4', Quetzales: s4, Semana: 4 },
    ];

    return { s1, s2, s3, s4, totalMes, promedioSemanal, galonesTotal, chartData };
  }, [registrosFiltrados]);

  // Lista de meses disponibles
  const mesesDisponibles = useMemo(() => {
    const set = new Set<string>();
    set.add(mesActualStr);
    combustiblesLocales.forEach((c) => {
      if (c.mes) set.add(c.mes);
    });
    return Array.from(set).sort().reverse();
  }, [combustiblesLocales, mesActualStr]);

  const abrirModalNuevo = () => {
    const defaultPlaca = vehiculos[0]?.placa || '';
    setFormPlaca(defaultPlaca);
    const v = vehiculos.find((x) => x.placa === defaultPlaca);
    setFormPiloto(v ? v.piloto : '');
    setFormMes(mesSeleccionado || mesActualStr);
    setFormSemana(1);
    setFormFecha(new Date().toISOString().split('T')[0]);
    setFormMonto('');
    setFormGalones('');
    setFormKm(v ? v.kilometraje : '');
    setError('');
    setModalAbierto(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numMonto = Number(formMonto);
    if (!formPlaca || isNaN(numMonto) || numMonto <= 0) {
      setError('Por favor seleccione la placa del vehículo e ingrese un monto en Quetzales válido.');
      return;
    }

    setGuardando(true);
    try {
      const nuevoRegistro: RegistroCombustible = {
        id: `comb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        placa: formPlaca.trim().toUpperCase(),
        mes: formMes,
        semana: Number(formSemana),
        fecha: formFecha,
        montoQuetzales: numMonto,
        galones: formGalones ? Number(formGalones) : undefined,
        kilometraje: formKm ? Number(formKm) : undefined,
        piloto: formPiloto || undefined,
        creadoEn: new Date().toISOString(),
      };

      await saveCombustible(nuevoRegistro);
      setModalAbierto(false);
      setMensajeExito('✅ Registro de combustible agregado correctamente');
    } catch (err: any) {
      setError('Error al registrar combustible: ' + (err.message || 'Error'));
    } finally {
      setGuardando(false);
    }
  };

  const solicitarEliminar = (registro: RegistroCombustible) => {
    setRegistroAEliminar(registro);
    setErrorEliminar('');
  };

  const handleConfirmarEliminar = async () => {
    if (!registroAEliminar || !registroAEliminar.id) {
      setErrorEliminar('No se pudo eliminar: ID de registro no válido o indefinido ⚠️');
      return;
    }

    const idAEliminar = registroAEliminar.id.trim();
    setEliminando(true);
    setErrorEliminar('');

    try {
      // 1. Ejecutar deleteDoc con el ID exacto en Firestore
      await deleteCombustible(idAEliminar);

      // 2. Limpiar la lista local inmediatamente
      setCombustiblesLocales((prev) => prev.filter((item) => item.id !== idAEliminar));

      // 3. Volver a leer directamente desde Firebase Firestore para confirmar la eliminación
      const datosConfirmados = await getCombustiblesDirectly();
      const todaviaExiste = datosConfirmados.some((item) => item.id === idAEliminar);

      if (todaviaExiste) {
        throw new Error('El servidor no confirmó la eliminación del documento. Intente de nuevo.');
      }

      // 4. Actualizar la vista con los datos confirmados desde el servidor
      setCombustiblesLocales(datosConfirmados);

      // 5. Cerrar diálogo de confirmación y mostrar mensaje de éxito
      setRegistroAEliminar(null);
      setMensajeExito('✅ Registro de combustible eliminado correctamente');
    } catch (err: any) {
      console.error('Error al eliminar registro de combustible de Firestore:', err);
      const motivo = err?.message || 'Error de conexión o permisos con Firebase Firestore';
      setErrorEliminar(`No se pudo eliminar: ${motivo} ⚠️`);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Notificación de Éxito */}
      {mensajeExito && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold text-sm">{mensajeExito}</span>
          </div>
          <button
            onClick={() => setMensajeExito('')}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg hover:bg-emerald-100/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100">
            <Fuel className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Control de Consumo de Combustible (Q)</h2>
            <p className="text-xs text-slate-500">
              Registro por semanas (Semana 1 a 4 = 1 mes) y cálculo automático del total
            </p>
          </div>
        </div>

        <button
          onClick={abrirModalNuevo}
          id="btn-nuevo-combustible"
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Consumo Semanal</span>
        </button>
      </div>

      {/* Filtros de Mes y Placa */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            Mes a Consultar
          </label>
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {mesesDisponibles.map((m) => (
              <option key={m} value={m}>
                {m} (Mes Completo)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-blue-600" />
            Vehículo / Placa
          </label>
          <select
            value={placaSeleccionada}
            onChange={(e) => setPlacaSeleccionada(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="TODOS">Toda la Flota (Consolidado)</option>
            {vehiculos.map((v) => (
              <option key={v.placa} value={v.placa}>
                {v.placa} - {v.piloto} ({v.tipo})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tarjetas de Suma Automática Semanal y Mensual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Mensual Destacado */}
        <div className="sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
            Suma Total Mensual
          </span>
          <div className="my-2">
            <p className="text-2xl lg:text-3xl font-black text-white">
              {formatQuetzales(resumenSemanas.totalMes)}
            </p>
            <span className="text-[11px] text-blue-300">
              {resumenSemanas.galonesTotal > 0 ? `${resumenSemanas.galonesTotal.toFixed(1)} Galones` : 'Mes completo'}
            </span>
          </div>
          <span className="text-[10px] text-blue-300 bg-white/10 px-2 py-1 rounded-lg self-start">
            Calculado Automáticamente
          </span>
        </div>

        {/* Semana 1 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semana 1</span>
          <p className="text-xl font-black text-slate-900 mt-1">{formatQuetzales(resumenSemanas.s1)}</p>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            {resumenSemanas.totalMes > 0
              ? `${((resumenSemanas.s1 / resumenSemanas.totalMes) * 100).toFixed(0)}% del mes`
              : '0%'}
          </div>
        </div>

        {/* Semana 2 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semana 2</span>
          <p className="text-xl font-black text-slate-900 mt-1">{formatQuetzales(resumenSemanas.s2)}</p>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            {resumenSemanas.totalMes > 0
              ? `${((resumenSemanas.s2 / resumenSemanas.totalMes) * 100).toFixed(0)}% del mes`
              : '0%'}
          </div>
        </div>

        {/* Semana 3 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semana 3</span>
          <p className="text-xl font-black text-slate-900 mt-1">{formatQuetzales(resumenSemanas.s3)}</p>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            {resumenSemanas.totalMes > 0
              ? `${((resumenSemanas.s3 / resumenSemanas.totalMes) * 100).toFixed(0)}% del mes`
              : '0%'}
          </div>
        </div>

        {/* Semana 4 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semana 4</span>
          <p className="text-xl font-black text-slate-900 mt-1">{formatQuetzales(resumenSemanas.s4)}</p>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            {resumenSemanas.totalMes > 0
              ? `${((resumenSemanas.s4 / resumenSemanas.totalMes) * 100).toFixed(0)}% del mes`
              : '0%'}
          </div>
        </div>
      </div>

      {/* Gráfica Comparativa Semanal Requerida */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Gráfica Comparativa Semanal de Consumo ({mesSeleccionado})
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">Monto en Quetzales (Q)</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={resumenSemanas.chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `Q${val}`} />
              <Tooltip
                formatter={(val: any) => [formatQuetzales(Number(val)), 'Gasto en Combustible']}
                contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none' }}
              />
              <Bar dataKey="Quetzales" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Listado de Registros de Combustible */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Detalle de Vales y Cargas de Combustible ({registrosFiltrados.length})
          </h3>
          <span className="text-xs font-mono font-bold text-emerald-800">
            Total Período: {formatQuetzales(resumenSemanas.totalMes)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Semana</th>
                <th className="py-3 px-4">Vehículo (Placa)</th>
                <th className="py-3 px-4">Piloto</th>
                <th className="py-3 px-4 text-right">Galones</th>
                <th className="py-3 px-4 text-right">Monto en Quetzales (Q)</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registrosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No hay registros de combustible para este mes y filtro.
                  </td>
                </tr>
              ) : (
                registrosFiltrados.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-medium text-slate-700">{r.fecha}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                        Semana {r.semana}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">{r.placa}</td>
                    <td className="py-3 px-4 text-slate-600">{r.piloto || 'N/A'}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {r.galones ? `${r.galones} gal` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-black font-mono text-emerald-800 text-base">
                      {formatQuetzales(r.montoQuetzales)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => solicitarEliminar(r)}
                        id={`btn-del-combustible-${r.id}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Eliminar registro de combustible"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Registro Combustible */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Registrar Combustible Semanal</h3>
                  <p className="text-xs text-slate-300">Ingreso por semana y monto en Quetzales (Q)</p>
                </div>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Vehículo (Placa) *
                </label>
                <select
                  value={formPlaca}
                  onChange={(e) => handlePlacaChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Seleccione un vehículo...</option>
                  {vehiculos.map((v) => (
                    <option key={v.placa} value={v.placa}>
                      {v.placa} - {v.piloto} ({v.tipo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mes
                  </label>
                  <input
                    type="month"
                    value={formMes}
                    onChange={(e) => setFormMes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Semana del Mes *
                  </label>
                  <select
                    value={formSemana}
                    onChange={(e) => setFormSemana(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value={1}>Semana 1</option>
                    <option value={2}>Semana 2</option>
                    <option value={3}>Semana 3</option>
                    <option value={4}>Semana 4</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Monto en QUETZALES (Q) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-500">Q</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="input-combustible-monto"
                    value={formMonto}
                    onChange={(e) => setFormMonto(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono font-black text-base focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Galones (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formGalones}
                    onChange={(e) => setFormGalones(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Ej: 15.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Fecha Exacta
                  </label>
                  <input
                    type="date"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre del Piloto
                </label>
                <input
                  type="text"
                  value={formPiloto}
                  onChange={(e) => setFormPiloto(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Nombre del piloto asignado"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  id="btn-guardar-combustible-modal"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  {guardando ? 'Guardando...' : 'Guardar Consumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {registroAEliminar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera modal */}
            <div className="p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Eliminar Registro de Combustible</h3>
                  <p className="text-xs text-red-100 font-medium">TALLERES E. GARCÍA</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRegistroAEliminar(null)}
                disabled={eliminando}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido y mensaje de advertencia requerido */}
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                <span className="text-lg">⚠️</span>
                <p className="font-semibold leading-relaxed">
                  ¿Estás seguro de eliminar este repuesto? Esta acción no se puede deshacer.
                </p>
              </div>

              {/* Ficha del registro de combustible seleccionado */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase">Vehículo / Placa:</span>
                  <span className="font-extrabold text-slate-900 font-mono text-sm">{registroAEliminar.placa}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase">Período:</span>
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-200">
                    Mes: {registroAEliminar.mes} • Semana {registroAEliminar.semana}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase">Fecha:</span>
                  <span className="font-medium text-slate-700">{registroAEliminar.fecha}</span>
                </div>
                {registroAEliminar.piloto && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold uppercase">Piloto:</span>
                    <span className="font-medium text-slate-700">{registroAEliminar.piloto}</span>
                  </div>
                )}
                {registroAEliminar.galones !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold uppercase">Galones:</span>
                    <span className="font-mono text-slate-700">{registroAEliminar.galones} gal</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-bold uppercase">Monto en Quetzales:</span>
                  <span className="font-mono font-black text-sm text-emerald-700">
                    {formatQuetzales(registroAEliminar.montoQuetzales)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>ID Registro:</span>
                  <span>{registroAEliminar.id}</span>
                </div>
              </div>

              {errorEliminar && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorEliminar}</span>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRegistroAEliminar(null)}
                  disabled={eliminando}
                  id="btn-cancelar-eliminar-combustible"
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarEliminar}
                  disabled={eliminando}
                  id="btn-confirmar-eliminar-combustible"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{eliminando ? 'Eliminando del servidor...' : 'Sí, Eliminar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
