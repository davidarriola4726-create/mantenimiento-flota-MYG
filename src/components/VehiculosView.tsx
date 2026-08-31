import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  FolderOpen,
  Calendar,
  Gauge,
  User,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Edit2,
  Trash2,
  Printer,
  ChevronRight,
  Filter,
  DollarSign,
  Fuel,
  FileText,
} from 'lucide-react';
import { Vehiculo, Servicio, RegistroCombustible, EstadoAlerta } from '../types';
import { saveVehiculo, deleteVehiculo, saveServicio } from '../services/firestoreService';
import { calcularAlertaVehiculo, formatQuetzales } from '../utils/alertUtils';

interface VehiculosViewProps {
  vehiculos: Vehiculo[];
  servicios: Servicio[];
  combustibles: RegistroCombustible[];
  onCrearServicioParaPlaca?: (placa: string) => void;
  onCrearHojaCampoParaPlaca?: (placa: string) => void;
}

export const VehiculosView: React.FC<VehiculosViewProps> = ({
  vehiculos,
  servicios,
  combustibles,
  onCrearServicioParaPlaca,
  onCrearHojaCampoParaPlaca,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroAlerta, setFiltroAlerta] = useState<string>('TODOS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');

  // Modal Nuevo Vehículo
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [placaForm, setPlacaForm] = useState('');
  const [pilotoForm, setPilotoForm] = useState('');
  const [tipoForm, setTipoForm] = useState('Pickup');
  const [marcaModeloForm, setMarcaModeloForm] = useState('');
  const [anioForm, setAnioForm] = useState<number | string>(2023);
  const [kmForm, setKmForm] = useState<number | string>('');
  const [proxFechaForm, setProxFechaForm] = useState('');
  const [proxKmForm, setProxKmForm] = useState<number | string>('');
  const [notasForm, setNotasForm] = useState('');
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Ficha / Subcarpeta individual de Vehículo
  const [vehiculoSeleccionadoFicha, setVehiculoSeleccionadoFicha] = useState<Vehiculo | null>(null);
  const [modalEditarKm, setModalEditarKm] = useState(false);
  const [nuevoKmInput, setNuevoKmInput] = useState<number | string>('');

  // Filtrado de vehículos
  const vehiculosConAlerta = useMemo(() => {
    return vehiculos.map((v) => ({
      vehiculo: v,
      alerta: calcularAlertaVehiculo(v),
    }));
  }, [vehiculos]);

  const vehiculosFiltrados = useMemo(() => {
    return vehiculosConAlerta.filter(({ vehiculo, alerta }) => {
      const term = busqueda.toLowerCase();
      const matchText =
        vehiculo.placa.toLowerCase().includes(term) ||
        vehiculo.piloto.toLowerCase().includes(term) ||
        vehiculo.tipo.toLowerCase().includes(term) ||
        (vehiculo.marcaModelo && vehiculo.marcaModelo.toLowerCase().includes(term));

      const matchAlerta = filtroAlerta === 'TODOS' || alerta.estado === filtroAlerta;
      const matchTipo = filtroTipo === 'TODOS' || vehiculo.tipo === filtroTipo;

      return matchText && matchAlerta && matchTipo;
    });
  }, [vehiculosConAlerta, busqueda, filtroAlerta, filtroTipo]);

  // Contadores de alertas
  const contadores = useMemo(() => {
    let verdes = 0, amarillos = 0, rojos = 0;
    vehiculosConAlerta.forEach(({ alerta }) => {
      if (alerta.estado === 'verde') verdes++;
      else if (alerta.estado === 'amarillo') amarillos++;
      else if (alerta.estado === 'rojo') rojos++;
    });
    return { verdes, amarillos, rojos, total: vehiculos.length };
  }, [vehiculosConAlerta, vehiculos.length]);

  const abrirNuevoVehiculo = () => {
    setPlacaForm('');
    setPilotoForm('');
    setTipoForm('Pickup');
    setMarcaModeloForm('');
    setAnioForm(new Date().getFullYear());
    setKmForm('');
    const proxF = new Date();
    proxF.setMonth(proxF.getMonth() + 3);
    setProxFechaForm(proxF.toISOString().split('T')[0]);
    setProxKmForm('');
    setNotasForm('');
    setErrorForm('');
    setModalNuevoAbierto(true);
  };

  const handleGuardarVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm('');

    const cleanPlaca = placaForm.trim().toUpperCase();
    if (!cleanPlaca) {
      setErrorForm('El número de placa es obligatorio y único.');
      return;
    }
    if (!pilotoForm.trim()) {
      setErrorForm('El nombre del piloto asignado es obligatorio.');
      return;
    }

    const existe = vehiculos.some((v) => v.placa.toUpperCase() === cleanPlaca);
    if (existe) {
      setErrorForm(`El vehículo con placa "${cleanPlaca}" ya existe en el sistema.`);
      return;
    }

    setGuardando(true);
    try {
      const nuevoV: Vehiculo = {
        placa: cleanPlaca,
        piloto: pilotoForm.trim(),
        tipo: tipoForm,
        marcaModelo: marcaModeloForm.trim() || undefined,
        anio: anioForm || undefined,
        kilometraje: Number(kmForm) || 0,
        proximaFechaServicio: proxFechaForm,
        proximoKmServicio: proxKmForm ? Number(proxKmForm) : (Number(kmForm) || 0) + 5000,
        notas: notasForm.trim() || undefined,
        creadoEn: new Date().toISOString(),
      };

      await saveVehiculo(nuevoV);
      setModalNuevoAbierto(false);
    } catch (err: any) {
      setErrorForm('Error al guardar vehículo: ' + (err.message || 'Error'));
    } finally {
      setGuardando(false);
    }
  };

  const handleActualizarKilometraje = async () => {
    if (!vehiculoSeleccionadoFicha) return;
    const kmNum = Number(nuevoKmInput);
    if (isNaN(kmNum) || kmNum < 0) {
      alert('Por favor ingrese un kilometraje válido.');
      return;
    }

    try {
      await saveVehiculo({
        ...vehiculoSeleccionadoFicha,
        kilometraje: kmNum,
      });
      setVehiculoSeleccionadoFicha({
        ...vehiculoSeleccionadoFicha,
        kilometraje: kmNum,
      });
      setModalEditarKm(false);
    } catch (err) {
      console.error('Error actualizando kilometraje:', err);
    }
  };

  const handleEliminarVehiculo = async (placa: string) => {
    if (confirm(`¿Está seguro de eliminar el vehículo placa ${placa} y toda su ficha?`)) {
      try {
        await deleteVehiculo(placa);
        if (vehiculoSeleccionadoFicha?.placa === placa) {
          setVehiculoSeleccionadoFicha(null);
        }
      } catch (err) {
        console.error('Error eliminando vehículo:', err);
      }
    }
  };

  // Historial de la placa seleccionada
  const historialServiciosPlaca = useMemo(() => {
    if (!vehiculoSeleccionadoFicha) return [];
    return servicios.filter(
      (s) => s.placa.toUpperCase() === vehiculoSeleccionadoFicha.placa.toUpperCase()
    );
  }, [servicios, vehiculoSeleccionadoFicha]);

  const historialCombustiblePlaca = useMemo(() => {
    if (!vehiculoSeleccionadoFicha) return [];
    return combustibles.filter(
      (c) => c.placa.toUpperCase() === vehiculoSeleccionadoFicha.placa.toUpperCase()
    );
  }, [combustibles, vehiculoSeleccionadoFicha]);

  const totalInvertidoPlaca = useMemo(() => {
    const totalServicios = historialServiciosPlaca.reduce((acc, s) => acc + (s.costoTotal || 0), 0);
    const totalCombustible = historialCombustiblePlaca.reduce((acc, c) => acc + (c.montoQuetzales || 0), 0);
    return { totalServicios, totalCombustible, totalGeneral: totalServicios + totalCombustible };
  }, [historialServiciosPlaca, historialCombustiblePlaca]);

  return (
    <div className="space-y-6">
      {/* Encabezado y Botón Nuevo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Registro y Fichas de Vehículos</h2>
            <p className="text-xs text-slate-500">
              Cada unidad identificada por su número de placa con historial y subcarpeta individual
            </p>
          </div>
        </div>

        <button
          onClick={abrirNuevoVehiculo}
          id="btn-nuevo-vehiculo-placa"
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Vehículo (Placa)</span>
        </button>
      </div>

      {/* Tarjetas Resumen de Estado de Flota */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <button
          onClick={() => setFiltroAlerta('TODOS')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
            filtroAlerta === 'TODOS'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block opacity-75">
              Total Flota
            </span>
            <p className="text-2xl font-black mt-0.5">{contadores.total}</p>
          </div>
          <Truck className="w-5 h-5 opacity-60" />
        </button>

        <button
          onClick={() => setFiltroAlerta('verde')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
            filtroAlerta === 'verde'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block text-emerald-600">
              🟢 Al Día
            </span>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">{contadores.verdes}</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </button>

        <button
          onClick={() => setFiltroAlerta('amarillo')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
            filtroAlerta === 'amarillo'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block text-amber-600">
              🟡 Por Vencer (7 días)
            </span>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{contadores.amarillos}</p>
          </div>
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        </button>

        <button
          onClick={() => setFiltroAlerta('rojo')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
            filtroAlerta === 'rojo'
              ? 'bg-red-700 text-white border-red-700 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:border-red-300'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block text-red-600">
              🔴 Vencidos / Urgente
            </span>
            <p className="text-2xl font-black text-red-700 mt-0.5">{contadores.rojos}</p>
          </div>
          <XCircle className="w-5 h-5 text-red-500" />
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 print:hidden">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="buscar-placa-input"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por número de placa (Ej: P-102MYG), piloto o tipo..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="TODOS">Todos los tipos</option>
            <option value="Pickup">Pickup</option>
            <option value="Camión">Camión</option>
            <option value="Panel">Panel</option>
            <option value="Camioneta">Camioneta</option>
            <option value="Sedán">Sedán</option>
            <option value="Cabezal">Cabezal</option>
            <option value="Motocicleta">Motocicleta</option>
          </select>
        </div>
      </div>

      {/* Grid de Fichas / Tarjetas de Vehículos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden">
        {vehiculosFiltrados.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
            No se encontraron vehículos que coincidan con la búsqueda o filtro.
          </div>
        ) : (
          vehiculosFiltrados.map(({ vehiculo: v, alerta }) => {
            const estadoBadge =
              alerta.estado === 'verde'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : alerta.estado === 'amarillo'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-red-50 text-red-800 border-red-300';

            const borderCard =
              alerta.estado === 'verde'
                ? 'border-emerald-200 hover:border-emerald-400'
                : alerta.estado === 'amarillo'
                ? 'border-amber-300 hover:border-amber-400'
                : 'border-red-300 hover:border-red-500 ring-1 ring-red-100';

            return (
              <div
                key={v.placa}
                className={`bg-white rounded-2xl p-5 border ${borderCard} shadow-xs flex flex-col justify-between transition hover:shadow-md`}
              >
                <div>
                  {/* Encabezado de Tarjeta: Placa y Estado */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xl font-black text-slate-950 tracking-tight">
                          {v.placa}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                          {v.tipo}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {v.marcaModelo || 'Flota MYG'} {v.anio ? `(${v.anio})` : ''}
                      </p>
                    </div>

                    {/* Semáforo de Alerta */}
                    <div
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${estadoBadge}`}
                    >
                      <span className="w-2 h-2 rounded-full animate-pulse bg-current" />
                      <span>
                        {alerta.estado === 'verde'
                          ? 'Al día'
                          : alerta.estado === 'amarillo'
                          ? 'Por vencer'
                          : 'Vencido'}
                      </span>
                    </div>
                  </div>

                  {/* Datos del Piloto y Kilometraje */}
                  <div className="space-y-2 py-2 border-y border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Piloto Asignado:
                      </span>
                      <strong className="text-slate-800 font-semibold">{v.piloto}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-slate-400" />
                        Kilometraje Actual:
                      </span>
                      <strong className="text-slate-900 font-mono font-bold text-sm">
                        {v.kilometraje.toLocaleString()} km
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Próximo Servicio:
                      </span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {v.proximaFechaServicio || 'Sin programar'}
                      </span>
                    </div>
                  </div>

                  {/* Mensaje de Alerta Detallado */}
                  <div className="mt-2.5">
                    <p
                      className={`text-[11px] font-semibold leading-relaxed p-2 rounded-lg ${
                        alerta.estado === 'verde'
                          ? 'bg-emerald-50/70 text-emerald-800'
                          : alerta.estado === 'amarillo'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {alerta.mensaje}
                    </p>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setVehiculoSeleccionadoFicha(v);
                    }}
                    id={`btn-ver-ficha-${v.placa}`}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
                  >
                    <FolderOpen className="w-4 h-4 text-blue-400" />
                    <span>Ver Ficha / Historial</span>
                  </button>

                  <button
                    onClick={() => handleEliminarVehiculo(v.placa)}
                    id={`btn-del-vehiculo-${v.placa}`}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                    title="Eliminar Vehículo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL / SUB-CARPETA INDIVIDUAL DE FICHA DE VEHÍCULO (POR PLACA) */}
      {vehiculoSeleccionadoFicha && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:static print:p-0 print:m-0 print:bg-transparent print:backdrop-blur-none print:overflow-visible">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200 print:max-h-none print:shadow-none print:border-none print:rounded-none print:overflow-visible print:w-full">
            {/* Cabecera Ficha */}
            <div className="p-6 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:bg-white print:text-black print:p-4 print:border-b-2 print:border-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-400/30 print:hidden">
                  <FolderOpen className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-2xl font-black font-mono tracking-tight text-white print:text-black">
                      {vehiculoSeleccionadoFicha.placa}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-400/20 text-blue-200 border border-blue-400/30 text-xs uppercase font-bold print:border-slate-400 print:text-slate-800">
                      {vehiculoSeleccionadoFicha.tipo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 print:text-slate-600 mt-0.5">
                    Ficha y Subcarpeta Individual de Mantenimiento Flota MYG
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (typeof window !== 'undefined') {
                        window.focus();
                        setTimeout(() => window.print(), 50);
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Ficha</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVehiculoSeleccionadoFicha(null)}
                  className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenido Ficha */}
            <div className="printable-document printable-area p-6 overflow-y-auto space-y-6 text-sm text-slate-800 print:p-0 print:m-0 print:overflow-visible">
              {/* Datos Generales y Botón Actualizar Km */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Piloto Asignado
                  </span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {vehiculoSeleccionadoFicha.piloto}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Modelo / Año
                  </span>
                  <p className="text-base font-semibold text-slate-900 mt-0.5">
                    {vehiculoSeleccionadoFicha.marcaModelo || 'N/A'}{' '}
                    {vehiculoSeleccionadoFicha.anio ? `(${vehiculoSeleccionadoFicha.anio})` : ''}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Kilometraje Actual
                    </span>
                    <button
                      onClick={() => {
                        setNuevoKmInput(vehiculoSeleccionadoFicha.kilometraje);
                        setModalEditarKm(true);
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Actualizar</span>
                    </button>
                  </div>
                  <p className="text-lg font-black font-mono text-blue-950 mt-0.5">
                    {vehiculoSeleccionadoFicha.kilometraje.toLocaleString()} km
                  </p>
                </div>
              </div>

              {/* Inversión total en esta placa */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase block">
                    Total Servicios y Mantenimiento
                  </span>
                  <p className="text-xl font-black font-mono text-emerald-900 mt-0.5">
                    {formatQuetzales(totalInvertidoPlaca.totalServicios)}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl">
                  <span className="text-[11px] font-bold text-blue-800 uppercase block">
                    Total Combustible Registrado
                  </span>
                  <p className="text-xl font-black font-mono text-blue-900 mt-0.5">
                    {formatQuetzales(totalInvertidoPlaca.totalCombustible)}
                  </p>
                </div>

                <div className="bg-slate-900 text-white p-3.5 rounded-xl">
                  <span className="text-[11px] font-bold text-blue-300 uppercase block">
                    Gasto Total Acumulado (Q)
                  </span>
                  <p className="text-xl font-black font-mono text-white mt-0.5">
                    {formatQuetzales(totalInvertidoPlaca.totalGeneral)}
                  </p>
                </div>
              </div>

              {/* HISTORIAL COMPLETO: Reparaciones, Cambios, Mantenimiento y Servicios */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-blue-600" />
                    <span>Control e Historial de Mantenimientos ({historialServiciosPlaca.length})</span>
                  </h4>

                  {onCrearServicioParaPlaca && (
                    <button
                      onClick={() => {
                        const p = vehiculoSeleccionadoFicha.placa;
                        setVehiculoSeleccionadoFicha(null);
                        onCrearServicioParaPlaca(p);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Nuevo Mantenimiento</span>
                    </button>
                  )}
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-3">Fecha / Km</th>
                        <th className="p-3">Tipo Mto. / Problema</th>
                        <th className="p-3">Chofer / Técnico</th>
                        <th className="p-3">Repuestos / Piezas Instaladas</th>
                        <th className="p-3 text-right">Total (Q)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historialServiciosPlaca.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            No hay registros de mantenimiento guardados para esta placa.
                          </td>
                        </tr>
                      ) : (
                        historialServiciosPlaca.map((s) => {
                          const tipoMto =
                            s.tipoMantenimiento ||
                            (s.tipoServicio?.toLowerCase().includes('preventivo')
                              ? 'Preventivo'
                              : 'Correctivo');
                          const esPrev = tipoMto.toLowerCase().includes('preventivo');

                          return (
                            <tr key={s.id} className="hover:bg-slate-50">
                              <td className="p-3 font-semibold">
                                <span className="block text-slate-900">{s.fecha}</span>
                                <span className="text-[11px] font-mono text-slate-500">
                                  {s.kilometraje ? `${s.kilometraje.toLocaleString()} km` : 'Odóm: N/A'}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span
                                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                      esPrev
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                                  >
                                    {tipoMto}
                                  </span>
                                </div>
                                <p className="font-bold text-slate-800 text-xs">
                                  {s.tipoProblema || s.tipoServicio}
                                </p>
                                {s.descripcion && s.descripcion !== s.tipoProblema && (
                                  <p className="text-[10px] text-slate-500 truncate max-w-xs">{s.descripcion}</p>
                                )}
                              </td>
                              <td className="p-3 text-slate-600">
                                <span className="font-medium block text-slate-800">Chofer: {s.piloto}</span>
                                <span className="block text-[11px] text-slate-500">Taller: {s.tecnico || 'MYG'}</span>
                              </td>
                              <td className="p-3">
                                {s.repuestos && s.repuestos.length > 0 ? (
                                  <div className="space-y-1 max-w-xs">
                                    {s.repuestos.map((r, ri) => (
                                      <div
                                        key={ri}
                                        className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 flex items-center justify-between gap-1"
                                      >
                                        <span className="font-medium truncate max-w-[120px]">
                                          {r.cantidad}x {r.nombre}
                                        </span>
                                        <span className="font-mono text-slate-600 font-bold shrink-0">
                                          Q {((r.cantidad || 1) * (r.precio || 0)).toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                    {s.costoRepuestos ? (
                                      <div className="text-[10px] text-slate-500 text-right pt-0.5">
                                        Subtotal repuestos: <strong className="font-mono">{formatQuetzales(s.costoRepuestos)}</strong>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Sin repuestos</span>
                                )}
                              </td>
                              <td className="p-3 text-right font-mono font-black text-emerald-800 text-sm">
                                {formatQuetzales(s.costoTotal)}
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

            {/* Pie del modal */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setVehiculoSeleccionadoFicha(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Kilometraje Rápido */}
      {modalEditarKm && vehiculoSeleccionadoFicha && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <h4 className="font-bold text-slate-900 text-base mb-1">
              Actualizar Kilometraje de {vehiculoSeleccionadoFicha.placa}
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Ingresa la lectura actual del odómetro
            </p>

            <div className="relative mb-4">
              <input
                type="number"
                value={nuevoKmInput}
                onChange={(e) => setNuevoKmInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-lg font-mono font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: 48500"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                km
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalEditarKm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleActualizarKilometraje}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Guardar Km
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR NUEVO VEHÍCULO */}
      {modalNuevoAbierto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Registrar Nuevo Vehículo</h3>
                  <p className="text-xs text-slate-300">Identificado ÚNICAMENTE por número de placa</p>
                </div>
              </div>
              <button
                onClick={() => setModalNuevoAbierto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarVehiculo} className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Número de Placa * (ID Único)
                  </label>
                  <input
                    type="text"
                    id="input-vehiculo-placa"
                    value={placaForm}
                    onChange={(e) => setPlacaForm(e.target.value.toUpperCase())}
                    placeholder="Ej: P-102MYG, C-554MYG"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-black uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tipo de Vehículo *
                  </label>
                  <select
                    value={tipoForm}
                    onChange={(e) => setTipoForm(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Pickup">Pickup</option>
                    <option value="Camión">Camión</option>
                    <option value="Panel">Panel</option>
                    <option value="Camioneta">Camioneta</option>
                    <option value="Sedán">Sedán</option>
                    <option value="Cabezal">Cabezal</option>
                    <option value="Motocicleta">Motocicleta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre del Piloto Asignado *
                </label>
                <input
                  type="text"
                  value={pilotoForm}
                  onChange={(e) => setPilotoForm(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Marca y Modelo
                  </label>
                  <input
                    type="text"
                    value={marcaModeloForm}
                    onChange={(e) => setMarcaModeloForm(e.target.value)}
                    placeholder="Ej: Toyota Hilux 2.8"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Kilometraje Actual *
                  </label>
                  <input
                    type="number"
                    value={kmForm}
                    onChange={(e) => setKmForm(e.target.value)}
                    placeholder="Ej: 45000"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Próxima Fecha de Servicio
                  </label>
                  <input
                    type="date"
                    value={proxFechaForm}
                    onChange={(e) => setProxFechaForm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Próximo Kilometraje
                  </label>
                  <input
                    type="number"
                    value={proxKmForm}
                    onChange={(e) => setProxKmForm(e.target.value)}
                    placeholder="Ej: 50000"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Notas / Rutas
                </label>
                <textarea
                  value={notasForm}
                  onChange={(e) => setNotasForm(e.target.value)}
                  rows={2}
                  placeholder="Detalles sobre el estado inicial o asignación..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {errorForm && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorForm}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalNuevoAbierto(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  id="btn-guardar-nuevo-vehiculo"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{guardando ? 'Guardando en la Nube...' : 'Registrar Vehículo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
