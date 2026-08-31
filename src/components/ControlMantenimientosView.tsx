import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Printer,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Truck,
  DollarSign,
  ShieldCheck,
  Hammer,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Gauge,
} from 'lucide-react';
import { Vehiculo, Servicio, RepuestoItem, RepuestoCatalogo } from '../types';
import { saveServicio, deleteServicio } from '../services/firestoreService';
import { formatQuetzales } from '../utils/alertUtils';

interface ControlMantenimientosViewProps {
  vehiculos: Vehiculo[];
  servicios: Servicio[];
  repuestosCatalogo: RepuestoCatalogo[];
  onSeleccionarPlaca?: (placa: string) => void;
}

export const ControlMantenimientosView: React.FC<ControlMantenimientosViewProps> = ({
  vehiculos,
  servicios,
  repuestosCatalogo,
  onSeleccionarPlaca,
}) => {
  // Estado para el formulario de nuevo mantenimiento
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  // Campos del Formulario
  const [placaSeleccionada, setPlacaSeleccionada] = useState('');
  const [pilotoNombre, setPilotoNombre] = useState('');
  const [tipoProblema, setTipoProblema] = useState('');
  const [fechaEjecucion, setFechaEjecucion] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [tipoMantenimiento, setTipoMantenimiento] = useState<'Preventivo' | 'Correctivo'>('Preventivo');
  const [kilometrajeForm, setKilometrajeForm] = useState<number | string>('');
  const [tecnicoNombre, setTecnicoNombre] = useState('');
  const [costoManoObra, setCostoManoObra] = useState<number | string>(0);
  const [proximaFecha, setProximaFecha] = useState('');
  const [proximoKm, setProximoKm] = useState<number | string>('');
  const [notasAdicionales, setNotasAdicionales] = useState('');

  // Lista de repuestos/piezas instaladas en el formulario
  const [repuestosItems, setRepuestosItems] = useState<RepuestoItem[]>([
    { nombre: '', cantidad: 1, precio: 0, total: 0 },
  ]);

  // Filtros y búsqueda en la tabla de registros
  const [busqueda, setBusqueda] = useState('');
  const [filtroPlaca, setFiltroPlaca] = useState('TODAS');
  const [filtroTipoMantenimiento, setFiltroTipoMantenimiento] = useState('TODOS');

  // Estado para el Modal de Impresión
  const [servicioAImprimir, setServicioAImprimir] = useState<Servicio | null>(null);

  // Función segura para invocar el diálogo de impresión del navegador
  const ejecutarImpresion = () => {
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

  const handleAbrirEImprimir = (servicio: Servicio, autoPrint = false) => {
    setServicioAImprimir(servicio);
    if (autoPrint) {
      setTimeout(() => {
        ejecutarImpresion();
      }, 150);
    }
  };

  // Al seleccionar placa, autocompletar el chofer/piloto y kilometraje
  const handleCambioPlaca = (placa: string) => {
    setPlacaSeleccionada(placa);
    const v = vehiculos.find((veh) => veh.placa.toUpperCase() === placa.toUpperCase());
    if (v) {
      setPilotoNombre(v.piloto || '');
      setKilometrajeForm(v.kilometraje || '');
      if (v.kilometraje) {
        setProximoKm(v.kilometraje + 5000);
      }
      const prox = new Date();
      prox.setMonth(prox.getMonth() + 3);
      setProximaFecha(prox.toISOString().split('T')[0]);
    }
  };

  // Manejadores para la lista de repuestos
  const handleAgregarFilaRepuesto = () => {
    setRepuestosItems((prev) => [
      ...prev,
      { nombre: '', cantidad: 1, precio: 0, total: 0 },
    ]);
  };

  const handleEliminarFilaRepuesto = (index: number) => {
    if (repuestosItems.length === 1) {
      setRepuestosItems([{ nombre: '', cantidad: 1, precio: 0, total: 0 }]);
      return;
    }
    setRepuestosItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCambioRepuesto = (
    index: number,
    campo: keyof RepuestoItem,
    valor: any
  ) => {
    setRepuestosItems((prev) => {
      const nuevo = [...prev];
      const actual = { ...nuevo[index], [campo]: valor };

      // Si selecciona un repuesto del catálogo sugerido
      if (campo === 'nombre') {
        const encontrado = repuestosCatalogo.find(
          (r) => r.nombre.toLowerCase() === String(valor).toLowerCase()
        );
        if (encontrado) {
          actual.precio = encontrado.precio;
        }
      }

      // CÁLCULO AUTOMÁTICO: Costo total del repuesto = Cantidad × Precio unitario
      const cant = Number(actual.cantidad) || 0;
      const prec = Number(actual.precio) || 0;
      actual.total = cant * prec;

      nuevo[index] = actual;
      return nuevo;
    });
  };

  // CÁLCULO AUTOMÁTICO: Suma total de todos los repuestos usados en ese mantenimiento
  const sumaTotalRepuestos = useMemo(() => {
    return repuestosItems.reduce((acc, item) => {
      const cant = Number(item.cantidad) || 0;
      const prec = Number(item.precio) || 0;
      return acc + cant * prec;
    }, 0);
  }, [repuestosItems]);

  // CÁLCULO AUTOMÁTICO: Costo Total General (Repuestos + Mano de Obra)
  const costoTotalServicio = useMemo(() => {
    const mo = Number(costoManoObra) || 0;
    return sumaTotalRepuestos + mo;
  }, [sumaTotalRepuestos, costoManoObra]);

  // Resetear Formulario
  const resetearFormulario = () => {
    setPlacaSeleccionada('');
    setPilotoNombre('');
    setTipoProblema('');
    setFechaEjecucion(new Date().toISOString().split('T')[0]);
    setTipoMantenimiento('Preventivo');
    setKilometrajeForm('');
    setTecnicoNombre('');
    setCostoManoObra(0);
    setProximaFecha('');
    setProximoKm('');
    setNotasAdicionales('');
    setRepuestosItems([{ nombre: '', cantidad: 1, precio: 0, total: 0 }]);
    setErrorForm('');
  };

  // Guardar Mantenimiento en Firebase Firestore
  const handleGuardarMantenimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm('');
    setMensajeExito('');

    const cleanPlaca = placaSeleccionada.trim().toUpperCase();
    if (!cleanPlaca) {
      setErrorForm('Debe seleccionar el número de placa del vehículo.');
      return;
    }
    if (!pilotoNombre.trim()) {
      setErrorForm('Debe ingresar el nombre del chofer o piloto.');
      return;
    }
    if (!tipoProblema.trim()) {
      setErrorForm('Debe describir el tipo de problema reportado o trabajo a realizar.');
      return;
    }
    if (!fechaEjecucion) {
      setErrorForm('Debe especificar la fecha de ejecución del mantenimiento.');
      return;
    }

    // Filtrar repuestos válidos (que tengan nombre o precio)
    const repuestosValidos = repuestosItems
      .filter((r) => r.nombre.trim().length > 0)
      .map((r) => ({
        nombre: r.nombre.trim(),
        cantidad: Number(r.cantidad) || 1,
        precio: Number(r.precio) || 0,
        total: (Number(r.cantidad) || 1) * (Number(r.precio) || 0),
      }));

    setGuardando(true);
    try {
      const nuevoServicio: Servicio = {
        id: `mto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        placa: cleanPlaca,
        piloto: pilotoNombre.trim(),
        tipoProblema: tipoProblema.trim(),
        tipoMantenimiento: tipoMantenimiento,
        tipoServicio: `${tipoMantenimiento}: ${tipoProblema.trim()}`,
        fecha: fechaEjecucion,
        kilometraje: Number(kilometrajeForm) || 0,
        proximaFecha: proximaFecha || undefined,
        proximoKm: proximoKm ? Number(proximoKm) : undefined,
        repuestos: repuestosValidos,
        costoRepuestos: sumaTotalRepuestos,
        costoManoObra: Number(costoManoObra) || 0,
        costoTotal: costoTotalServicio,
        tecnico: tecnicoNombre.trim() || 'Taller MYG',
        descripcion: notasAdicionales.trim() || tipoProblema.trim(),
        estado: 'completado',
        creadoEn: new Date().toISOString(),
      };

      await saveServicio(nuevoServicio);
      setMensajeExito(
        `¡Mantenimiento de la placa ${cleanPlaca} guardado exitosamente en Firebase y en la ficha del vehículo!`
      );
      resetearFormulario();
      setFormularioAbierto(false);

      // Auto-abrir la vista de impresión si el usuario lo desea
      setServicioAImprimir(nuevoServicio);
    } catch (err: any) {
      console.error('Error al guardar mantenimiento:', err);
      setErrorForm('Error al guardar en Firebase: ' + (err.message || 'Error'));
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar Registro
  const handleEliminarServicio = async (id: string, placa: string) => {
    if (
      confirm(
        `¿Está seguro de eliminar este registro de mantenimiento de la placa ${placa}?`
      )
    ) {
      try {
        await deleteServicio(id);
      } catch (err) {
        console.error('Error eliminando mantenimiento:', err);
      }
    }
  };

  // Filtrado de servicios
  const serviciosFiltrados = useMemo(() => {
    return servicios.filter((s) => {
      const matchPlaca =
        filtroPlaca === 'TODAS' || s.placa.toUpperCase() === filtroPlaca.toUpperCase();

      const tipoMtoS = s.tipoMantenimiento || (s.tipoServicio?.toLowerCase().includes('preventivo') ? 'Preventivo' : 'Correctivo');
      const matchTipo =
        filtroTipoMantenimiento === 'TODOS' ||
        tipoMtoS.toLowerCase() === filtroTipoMantenimiento.toLowerCase();

      const term = busqueda.toLowerCase();
      const matchBusqueda =
        s.placa.toLowerCase().includes(term) ||
        s.piloto.toLowerCase().includes(term) ||
        (s.tipoProblema && s.tipoProblema.toLowerCase().includes(term)) ||
        (s.tipoServicio && s.tipoServicio.toLowerCase().includes(term)) ||
        (s.tecnico && s.tecnico.toLowerCase().includes(term)) ||
        s.repuestos.some((r) => r.nombre.toLowerCase().includes(term));

      return matchPlaca && matchTipo && matchBusqueda;
    });
  }, [servicios, filtroPlaca, filtroTipoMantenimiento, busqueda]);

  // Métricas de resumen
  const metricas = useMemo(() => {
    let preventivos = 0;
    let correctivos = 0;
    let gastoRepuestos = 0;
    let gastoTotal = 0;

    servicios.forEach((s) => {
      const tipo = s.tipoMantenimiento || (s.tipoServicio?.toLowerCase().includes('preventivo') ? 'Preventivo' : 'Correctivo');
      if (tipo.toLowerCase().includes('preventivo')) {
        preventivos++;
      } else {
        correctivos++;
      }
      gastoRepuestos += s.costoRepuestos || 0;
      gastoTotal += s.costoTotal || 0;
    });

    return {
      total: servicios.length,
      preventivos,
      correctivos,
      gastoRepuestos,
      gastoTotal,
    };
  }, [servicios]);

  return (
    <div className="space-y-6">
      {/* 1. ENCABEZADO Y ACCIONES PRINCIPALES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-sm">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                CONTROL DE MANTENIMIENTOS
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase">
                Por Placa
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro detallado de problemas, piezas instaladas, cálculo automático de costos y formato oficial para imprimir
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setFormularioAbierto(!formularioAbierto);
            if (!formularioAbierto) {
              setMensajeExito('');
              setErrorForm('');
            }
          }}
          id="btn-toggle-nuevo-mantenimiento"
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
        >
          {formularioAbierto ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Ocultar Formulario</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Nuevo Registro de Mantenimiento</span>
            </>
          )}
        </button>
      </div>

      {/* 2. TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Mantenimientos
            </span>
            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-700">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {metricas.total}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Registrados en Firebase</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Preventivos
            </span>
            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">
            {metricas.preventivos}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Servicios programados</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Correctivos
            </span>
            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700">
              <Hammer className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700 mt-1 font-mono">
            {metricas.correctivos}
          </p>
          <span className="text-[11px] text-amber-600 font-medium">Reparación de fallas</span>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
              Total Invertido en Flota
            </span>
            <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-1 font-mono">
            {formatQuetzales(metricas.gastoTotal)}
          </p>
          <span className="text-[11px] text-slate-300 font-medium">
            Repuestos: {formatQuetzales(metricas.gastoRepuestos)}
          </span>
        </div>
      </div>

      {/* MENSAJE DE ÉXITO */}
      {mensajeExito && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs print:hidden animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
          <button
            onClick={() => setMensajeExito('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. FORMULARIO COMPLETO DE REGISTRO DE MANTENIMIENTO */}
      {formularioAbierto && (
        <div className="bg-white rounded-3xl border border-blue-200 shadow-lg p-6 sm:p-8 space-y-6 print:hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Formulario de Registro de Mantenimiento
                </h3>
                <p className="text-xs text-slate-500">
                  Los datos se asociarán automáticamente a la placa y se guardarán en Firebase Firestore
                </p>
              </div>
            </div>

            <button
              onClick={() => setFormularioAbierto(false)}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleGuardarMantenimiento} className="space-y-6 text-sm">
            {/* Fila 1: Placa (Seleccionable), Piloto, Fecha y Kilometraje */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Número de placa */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  1. Número de Placa *
                </label>
                <select
                  value={placaSeleccionada}
                  onChange={(e) => handleCambioPlaca(e.target.value)}
                  id="select-placa-mantenimiento"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                  required
                >
                  <option value="">-- Seleccionar Placa --</option>
                  {vehiculos.map((v) => (
                    <option key={v.placa} value={v.placa}>
                      {v.placa} - {v.tipo} ({v.piloto})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Autocompleta chofer y odómetro
                </span>
              </div>

              {/* Nombre del Chofer / Piloto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  2. Nombre del Chofer / Piloto *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="input-piloto-mantenimiento"
                    value={pilotoNombre}
                    onChange={(e) => setPilotoNombre(e.target.value)}
                    placeholder="Nombre del chofer"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Fecha de Ejecución */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  3. Fecha de Ejecución *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    id="input-fecha-mantenimiento"
                    value={fechaEjecucion}
                    onChange={(e) => setFechaEjecucion(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Odómetro / Kilometraje */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Odómetro (Kilometraje)
                </label>
                <div className="relative">
                  <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    value={kilometrajeForm}
                    onChange={(e) => setKilometrajeForm(e.target.value)}
                    placeholder="Ej: 45000"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Fila 2: Tipo de Mantenimiento y Tipo de Problema */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Tipo de Mantenimiento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  4. Tipo de Mantenimiento *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoMantenimiento('Preventivo')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      tipoMantenimiento === 'Preventivo'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Preventivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoMantenimiento('Correctivo')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      tipoMantenimiento === 'Correctivo'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Hammer className="w-4 h-4" />
                    <span>Correctivo</span>
                  </button>
                </div>
              </div>

              {/* Tipo de Problema Reportado */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  5. Tipo de Problema Reportado / Motivo *
                </label>
                <input
                  type="text"
                  id="input-problema-reportado"
                  value={tipoProblema}
                  onChange={(e) => setTipoProblema(e.target.value)}
                  placeholder="Ej: Ruido al frenar, cambio de aceite y filtros, fuga de agua, calibración..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* SECCIÓN DE REPUESTOS Y PIEZAS INSTALADAS CON CÁLCULO AUTOMÁTICO */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-blue-600" />
                    <span>Repuestos o Piezas Instaladas (Cálculo Automático)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Cálculo automático: Costo Total = Cantidad × Precio Unitario (GTQ)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAgregarFilaRepuesto}
                  id="btn-agregar-fila-repuesto"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar Pieza</span>
                </button>
              </div>

              {/* Tabla de Piezas */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="pb-2 pl-2">Repuesto o Pieza Instalada</th>
                      <th className="pb-2 w-24 text-center">Cantidad</th>
                      <th className="pb-2 w-32 text-right">Precio Unitario (Q)</th>
                      <th className="pb-2 w-32 text-right">Costo Total (Q)</th>
                      <th className="pb-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {repuestosItems.map((item, idx) => (
                      <tr key={idx} className="group">
                        <td className="py-2.5 pr-2 pl-2">
                          <input
                            type="text"
                            list="lista-repuestos-catalogo"
                            value={item.nombre}
                            onChange={(e) =>
                              handleCambioRepuesto(idx, 'nombre', e.target.value)
                            }
                            placeholder="Ej: Pastillas de freno, Filtro de aceite..."
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) =>
                              handleCambioRepuesto(
                                idx,
                                'cantidad',
                                Math.max(1, Number(e.target.value))
                              )
                            }
                            className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-center font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                              Q
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.precio}
                              onChange={(e) =>
                                handleCambioRepuesto(
                                  idx,
                                  'precio',
                                  Math.max(0, Number(e.target.value))
                                )
                              }
                              className="w-full pl-6 pr-2.5 py-2 bg-white border border-slate-300 rounded-xl text-right font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono font-black text-slate-900 text-right">
                            {formatQuetzales(item.total)}
                          </div>
                        </td>
                        <td className="py-2.5 pl-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleEliminarFilaRepuesto(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar repuesto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Datalist para sugerencias rápidas desde el catálogo existente */}
              <datalist id="lista-repuestos-catalogo">
                {repuestosCatalogo.map((r) => (
                  <option key={r.id} value={r.nombre}>
                    Q {r.precio.toFixed(2)} - {r.categoria || 'Repuesto'}
                  </option>
                ))}
              </datalist>

              {/* RESUMEN POR SERVICIO: SUMA TOTAL DE TODOS LOS REPUESTOS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-200 bg-white p-4 rounded-xl">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Mano de Obra / Taller (Q)
                    </label>
                    <div className="relative w-36 mt-0.5">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                        Q
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={costoManoObra}
                        onChange={(e) => setCostoManoObra(e.target.value)}
                        className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-right font-mono font-bold text-slate-800 text-xs focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">
                      Técnico Responsable
                    </span>
                    <input
                      type="text"
                      value={tecnicoNombre}
                      onChange={(e) => setTecnicoNombre(e.target.value)}
                      placeholder="Ej: Carlos Ramos"
                      className="w-40 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs mt-0.5 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-xs text-slate-600">
                    <span>Suma Total de Repuestos: </span>
                    <strong className="font-mono text-slate-900">
                      {formatQuetzales(sumaTotalRepuestos)}
                    </strong>
                  </div>
                  <div className="text-base font-black text-slate-950 flex items-center justify-end gap-2">
                    <span className="text-xs uppercase text-blue-700 tracking-wider">
                      Resumen / Costo Total del Servicio:
                    </span>
                    <span className="font-mono text-lg text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                      {formatQuetzales(costoTotalServicio)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila Opcional: Programación de Próximo Servicio & Observaciones */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Próxima Fecha de Servicio
                </label>
                <input
                  type="date"
                  value={proximaFecha}
                  onChange={(e) => setProximaFecha(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Próximo Kilometraje
                </label>
                <input
                  type="number"
                  value={proximoKm}
                  onChange={(e) => setProximoKm(e.target.value)}
                  placeholder="Ej: 50000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Notas / Observaciones
                </label>
                <input
                  type="text"
                  value={notasAdicionales}
                  onChange={(e) => setNotasAdicionales(e.target.value)}
                  placeholder="Detalles sobre garantía o pruebas de ruta..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {errorForm && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorForm}</span>
              </div>
            )}

            {/* Botones de Envío */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setFormularioAbierto(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                id="btn-guardar-mantenimiento-firebase"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {guardando
                    ? 'Guardando en Firebase Firestore...'
                    : 'Guardar Mantenimiento e Imprimir'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. LISTADO Y BÚSQUEDA DE REGISTROS DE MANTENIMIENTO */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4 print:hidden">
        {/* Barra de Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por placa, chofer, problema, repuesto o técnico..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Filtro por Placa */}
            <select
              value={filtroPlaca}
              onChange={(e) => setFiltroPlaca(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none uppercase"
            >
              <option value="TODAS">Todas las Placas</option>
              {vehiculos.map((v) => (
                <option key={v.placa} value={v.placa}>
                  {v.placa}
                </option>
              ))}
            </select>

            {/* Filtro por Tipo de Mantenimiento */}
            <select
              value={filtroTipoMantenimiento}
              onChange={(e) => setFiltroTipoMantenimiento(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="TODOS">Todos los Tipos</option>
              <option value="Preventivo">Preventivo</option>
              <option value="Correctivo">Correctivo</option>
            </select>
          </div>
        </div>

        {/* Tabla de Registros */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Placa & Vehículo</th>
                  <th className="p-3.5">Chofer / Piloto</th>
                  <th className="p-3.5">Fecha / Km</th>
                  <th className="p-3.5">Tipo Mantenimiento</th>
                  <th className="p-3.5">Problema Reportado</th>
                  <th className="p-3.5">Repuestos / Piezas Instaladas</th>
                  <th className="p-3.5 text-right">Costo Total (Q)</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {serviciosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No se encontraron registros de mantenimiento que coincidan con la búsqueda o filtro.
                    </td>
                  </tr>
                ) : (
                  serviciosFiltrados.map((s) => {
                    const tipoMto =
                      s.tipoMantenimiento ||
                      (s.tipoServicio?.toLowerCase().includes('preventivo')
                        ? 'Preventivo'
                        : 'Correctivo');

                    const esPreventivo = tipoMto.toLowerCase().includes('preventivo');

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition">
                        {/* Placa */}
                        <td className="p-3.5">
                          <span className="font-mono font-black text-slate-900 text-sm block">
                            {s.placa}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {s.tecnico || 'Taller MYG'}
                          </span>
                        </td>

                        {/* Chofer / Piloto */}
                        <td className="p-3.5 font-semibold text-slate-800">
                          {s.piloto}
                        </td>

                        {/* Fecha y Km */}
                        <td className="p-3.5">
                          <span className="text-slate-900 font-medium block">{s.fecha}</span>
                          {s.kilometraje ? (
                            <span className="text-[11px] font-mono text-slate-500">
                              {s.kilometraje.toLocaleString()} km
                            </span>
                          ) : null}
                        </td>

                        {/* Tipo de Mantenimiento */}
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                              esPreventivo
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {esPreventivo ? (
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Hammer className="w-3 h-3 text-amber-600" />
                            )}
                            <span>{tipoMto}</span>
                          </span>
                        </td>

                        {/* Problema Reportado */}
                        <td className="p-3.5 max-w-xs">
                          <p className="font-medium text-slate-800 line-clamp-2">
                            {s.tipoProblema || s.tipoServicio || s.descripcion}
                          </p>
                        </td>

                        {/* Repuestos / Piezas con Cantidad x Precio = Total */}
                        <td className="p-3.5 max-w-xs">
                          {s.repuestos && s.repuestos.length > 0 ? (
                            <div className="space-y-1">
                              {s.repuestos.map((r, ri) => (
                                <div
                                  key={ri}
                                  className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 flex items-center justify-between gap-2"
                                >
                                  <span className="font-medium truncate max-w-[140px]">
                                    {r.cantidad}x {r.nombre}
                                  </span>
                                  <span className="font-mono text-slate-500 font-bold shrink-0">
                                    Q {((r.cantidad || 1) * (r.precio || 0)).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Sin repuestos
                            </span>
                          )}
                        </td>

                        {/* Costo Total */}
                        <td className="p-3.5 text-right font-mono font-black text-emerald-800 text-sm">
                          {formatQuetzales(s.costoTotal)}
                        </td>

                        {/* Acciones: Imprimir & Eliminar */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* BOTÓN IMPRIMIR */}
                            <button
                              onClick={() => handleAbrirEImprimir(s, false)}
                              id={`btn-imprimir-mantenimiento-${s.id}`}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                              title="Imprimir Formato Completo de Mantenimiento"
                            >
                              <Printer className="w-3.5 h-3.5 text-blue-400" />
                              <span>Imprimir</span>
                            </button>

                            <button
                              onClick={() => handleEliminarServicio(s.id, s.placa)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. MODAL / VISTA OFICIAL DE IMPRESIÓN CON FORMATO COMPLETO */}
      {servicioAImprimir && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:static print:p-0 print:m-0 print:bg-transparent print:backdrop-blur-none print:overflow-visible">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none print:overflow-visible print:w-full animate-in fade-in zoom-in-95">
            {/* Barra superior del modal (oculta al imprimir) */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-sm">
                  Formato Oficial de Mantenimiento - Placa {servicioAImprimir.placa}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={ejecutarImpresion}
                  id="btn-trigger-print-mantenimiento"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Guardar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setServicioAImprimir(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                  title="Cerrar vista previa"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* FORMATO OFICIAL DE IMPRESIÓN (ESTILO FACTURA / COMPROBANTE DE TALLER) */}
            <div
              id="formato-impresion-mantenimiento"
              className="printable-document printable-area p-8 sm:p-10 overflow-y-auto space-y-6 text-slate-900 font-sans print:p-0 print:m-0 print:overflow-visible print:w-full"
            >
              {/* Membrete y Cabecera */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-base">
                      MYG
                    </div>
                    <div>
                      <h1 className="text-xl font-black tracking-tight text-slate-900">
                        CONTROL DE VEHÍCULOS "MYG"
                      </h1>
                      <p className="text-[11px] text-slate-500 font-bold uppercase">
                        Comprobante Oficial de Mantenimiento y Control de Taller
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 font-medium">
                    Guatemala, C.A. • Registro de Mantenimiento Flota
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                    No. Comprobante
                  </span>
                  <p className="font-mono text-sm font-black text-slate-900">
                    {servicioAImprimir.id.replace('srv_', 'MTO-').replace('mto_', 'MTO-').toUpperCase()}
                  </p>
                  <div className="mt-1.5 inline-block px-2.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-700">
                    FECHA: {servicioAImprimir.fecha}
                  </div>
                </div>
              </div>

              {/* Ficha del Vehículo y Chofer */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Número de Placa
                  </span>
                  <strong className="text-base font-black font-mono text-slate-900">
                    {servicioAImprimir.placa}
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Chofer / Piloto
                  </span>
                  <strong className="text-xs font-bold text-slate-800">
                    {servicioAImprimir.piloto}
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Tipo de Mantenimiento
                  </span>
                  <span className="inline-block font-black text-xs uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                    {servicioAImprimir.tipoMantenimiento || servicioAImprimir.tipoServicio}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Kilometraje al Servicio
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {servicioAImprimir.kilometraje
                      ? `${servicioAImprimir.kilometraje.toLocaleString()} km`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Problema Reportado / Motivo */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block mb-1">
                  Tipo de Problema Reportado / Trabajo Realizado:
                </span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {servicioAImprimir.tipoProblema ||
                    servicioAImprimir.descripcion ||
                    servicioAImprimir.tipoServicio}
                </p>
              </div>

              {/* TABLA DE REPUESTOS O PIEZAS INSTALADAS */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center justify-between">
                  <span>Desglose de Repuestos o Piezas Instaladas</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Precios expresados en Quetzales (GTQ)
                  </span>
                </h4>

                <table className="w-full text-left text-xs border border-slate-300 rounded-lg overflow-hidden">
                  <thead className="bg-slate-200/80 text-slate-800 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 border-b border-slate-300">#</th>
                      <th className="p-2.5 border-b border-slate-300">Descripción del Repuesto / Pieza</th>
                      <th className="p-2.5 border-b border-slate-300 text-center w-20">Cantidad</th>
                      <th className="p-2.5 border-b border-slate-300 text-right w-28">Precio Unitario</th>
                      <th className="p-2.5 border-b border-slate-300 text-right w-32">Costo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {servicioAImprimir.repuestos && servicioAImprimir.repuestos.length > 0 ? (
                      servicioAImprimir.repuestos.map((r, ri) => (
                        <tr key={ri}>
                          <td className="p-2.5 text-slate-400 font-mono text-center">{ri + 1}</td>
                          <td className="p-2.5 font-bold text-slate-800">{r.nombre}</td>
                          <td className="p-2.5 text-center font-semibold text-slate-700">
                            {r.cantidad}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-700">
                            Q {Number(r.precio).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            Q {((Number(r.cantidad) || 1) * (Number(r.precio) || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                          No se registraron repuestos o piezas adicionales en este servicio.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* RESUMEN DE COSTOS */}
              <div className="flex justify-end">
                <div className="w-72 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Suma Total Repuestos:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatQuetzales(servicioAImprimir.costoRepuestos || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Mano de Obra / Taller:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatQuetzales(servicioAImprimir.costoManoObra || 0)}
                    </span>
                  </div>

                  <div className="pt-2 border-t-2 border-slate-300 flex justify-between items-center text-sm font-black text-slate-900">
                    <span className="uppercase text-blue-900">Total General:</span>
                    <span className="font-mono text-base text-emerald-800">
                      {formatQuetzales(servicioAImprimir.costoTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Próximo Servicio si existe */}
              {(servicioAImprimir.proximaFecha || servicioAImprimir.proximoKm) && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs flex items-center justify-between text-amber-900">
                  <span className="font-bold">📅 Próximo Mantenimiento Recomendado:</span>
                  <span className="font-mono font-bold">
                    {servicioAImprimir.proximaFecha ? `Fecha: ${servicioAImprimir.proximaFecha}` : ''}{' '}
                    {servicioAImprimir.proximoKm
                      ? `| Kilometraje: ${servicioAImprimir.proximoKm.toLocaleString()} km`
                      : ''}
                  </span>
                </div>
              )}

              {/* SECCIÓN DE FIRMAS OFICIALES */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs">
                <div className="text-center">
                  <div className="h-14 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                    {servicioAImprimir.firmaPiloto ? (
                      <img
                        src={servicioAImprimir.firmaPiloto}
                        alt="Firma Chofer"
                        className="max-h-12 object-contain"
                      />
                    ) : null}
                  </div>
                  <span className="block font-bold text-slate-800 mt-2">
                    {servicioAImprimir.piloto}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">
                    Firma del Chofer / Piloto
                  </span>
                </div>

                <div className="text-center">
                  <div className="h-14 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                    {servicioAImprimir.firmaTecnico ? (
                      <img
                        src={servicioAImprimir.firmaTecnico}
                        alt="Firma Técnico"
                        className="max-h-12 object-contain"
                      />
                    ) : null}
                  </div>
                  <span className="block font-bold text-slate-800 mt-2">
                    {servicioAImprimir.tecnico || 'Jefe de Taller MYG'}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">
                    Firma del Técnico / Taller
                  </span>
                </div>
              </div>
            </div>

            {/* Pie del Modal */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between print:hidden">
              <span className="text-xs text-slate-500">
                Imprime o guarda en formato PDF para el archivo físico de la flota.
              </span>
              <button
                onClick={() => setServicioAImprimir(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Cerrar Formato
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
