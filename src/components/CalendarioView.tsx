import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Truck,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wrench,
  Info,
  DollarSign,
  Printer,
  FileText,
  Search,
  Filter,
  X,
  User,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { Vehiculo, Servicio, RepuestoCatalogo, RepuestoItem } from '../types';
import { calcularAlertaVehiculo, formatQuetzales } from '../utils/alertUtils';
import { saveServicio } from '../services/firestoreService';

interface CalendarioViewProps {
  vehiculos: Vehiculo[];
  servicios: Servicio[];
  repuestosCatalogo?: RepuestoCatalogo[];
  onProgramarServicio: (placa: string) => void;
  onVerVehiculo?: (placa: string) => void;
}

export const CalendarioView: React.FC<CalendarioViewProps> = ({
  vehiculos,
  servicios,
  repuestosCatalogo = [],
  onProgramarServicio,
  onVerVehiculo,
}) => {
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  // Estado del Mes y Año visible
  const [currentDate, setCurrentDate] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(hoyStr);

  // Filtros internos
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'REALIZADOS' | 'PROGRAMADOS'>('TODOS');
  const [filtroPlaca, setFiltroPlaca] = useState<string>('TODAS');
  const [busqueda, setBusqueda] = useState<string>('');

  // Modal para Registrar Mantenimiento en una fecha específica
  const [modalRegistroAbierto, setModalRegistroAbierto] = useState(false);
  const [guardandoServicio, setGuardandoServicio] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [exitoForm, setExitoForm] = useState('');

  // Campos del formulario de registro rápido
  const [formPlaca, setFormPlaca] = useState('');
  const [formPiloto, setFormPiloto] = useState('');
  const [formFecha, setFormFecha] = useState(hoyStr);
  const [formTipoMantenimiento, setFormTipoMantenimiento] = useState<'Preventivo' | 'Correctivo'>('Preventivo');
  const [formTipoServicio, setFormTipoServicio] = useState('Cambio de Aceite y Filtro');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formKilometraje, setFormKilometraje] = useState<number | string>('');
  const [formTecnico, setFormTecnico] = useState('');
  const [formCostoManoObra, setFormCostoManoObra] = useState<number | string>(0);
  const [formProximaFecha, setFormProximaFecha] = useState('');
  const [formProximoKm, setFormProximoKm] = useState<number | string>('');
  const [formRepuestos, setFormRepuestos] = useState<RepuestoItem[]>([
    { nombre: 'Aceite de Motor Sintético', cantidad: 1, precio: 250, total: 250 },
  ]);

  // Modal para Reporte Imprimible del Mes
  const [modalReporteMesAbierto, setModalReporteMesAbierto] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Años disponibles para selección rápida (desde 2020 hasta 2035)
  const aniosDisponibles = useMemo(() => {
    const list = [];
    for (let y = 2020; y <= 2035; y++) {
      list.push(y);
    }
    return list;
  }, []);

  // ------------------------------------------------------------------
  // Navegación de Meses y Años
  // ------------------------------------------------------------------
  const mesAnterior = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const mesSiguiente = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const anioAnterior = () => {
    setCurrentDate(new Date(year - 1, month, 1));
  };

  const anioSiguiente = () => {
    setCurrentDate(new Date(year + 1, month, 1));
  };

  const irAHoy = () => {
    setCurrentDate(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    setDiaSeleccionado(hoyStr);
  };

  const cambiarMes = (nuevoMes: number) => {
    setCurrentDate(new Date(year, nuevoMes, 1));
  };

  const cambiarAnio = (nuevoAnio: number) => {
    setCurrentDate(new Date(nuevoAnio, month, 1));
  };

  // ------------------------------------------------------------------
  // Cálculo de Eventos (Programados y Realizados) para CUALQUIER mes
  // ------------------------------------------------------------------
  const eventosPorFecha = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        tipo: 'programado' | 'realizado';
        vehiculo: Vehiculo;
        servicio?: Servicio;
        estado: 'verde' | 'amarillo' | 'rojo';
        motivoAlerta?: string;
      }[]
    >();

    // 1. Próximos servicios programados de los vehículos
    vehiculos.forEach((v) => {
      if (v.proximaFechaServicio) {
        const f = v.proximaFechaServicio.trim();
        const alerta = calcularAlertaVehiculo(v);
        const list = map.get(f) || [];
        list.push({
          id: `prog_${v.placa}_${f}`,
          tipo: 'programado',
          vehiculo: v,
          estado: alerta.estado,
          motivoAlerta: alerta.mensaje,
        });
        map.set(f, list);
      }
    });

    // 2. Historial de servicios ya realizados
    servicios.forEach((s) => {
      if (s.fecha) {
        const f = s.fecha.trim();
        const v = vehiculos.find((x) => x.placa.toUpperCase() === s.placa.toUpperCase()) || {
          placa: s.placa,
          piloto: s.piloto,
          tipo: 'Vehículo',
          kilometraje: s.kilometraje || 0,
          proximaFechaServicio: '',
          proximoKmServicio: 0,
          creadoEn: '',
        };
        const list = map.get(f) || [];
        list.push({
          id: s.id,
          tipo: 'realizado',
          vehiculo: v,
          servicio: s,
          estado: 'verde',
          motivoAlerta: 'Mantenimiento ejecutado con éxito',
        });
        map.set(f, list);
      }
    });

    return map;
  }, [vehiculos, servicios]);

  // ------------------------------------------------------------------
  // Matriz de Días para renderizar el mes (con días adyacentes)
  // ------------------------------------------------------------------
  const diasMatriz = useMemo(() => {
    const primerDiaSemana = new Date(year, month, 1).getDay();
    const diasEnMes = new Date(year, month + 1, 0).getDate();
    const diasMesAnterior = new Date(year, month, 0).getDate();

    const dias = [];

    // Días del mes anterior para completar la primera fila
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      const d = diasMesAnterior - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const fechaStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dias.push({
        dia: d,
        fechaStr,
        esMesActual: false,
        esHoy: fechaStr === hoyStr,
        eventos: eventosPorFecha.get(fechaStr) || [],
      });
    }

    // Días del mes actual
    for (let d = 1; d <= diasEnMes; d++) {
      const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dias.push({
        dia: d,
        fechaStr,
        esMesActual: true,
        esHoy: fechaStr === hoyStr,
        eventos: eventosPorFecha.get(fechaStr) || [],
      });
    }

    // Días del mes siguiente para completar la cuadrícula (hasta múltiplos de 7)
    const totalCeldas = Math.ceil(dias.length / 7) * 7;
    const diasRestantes = totalCeldas - dias.length;
    for (let d = 1; d <= diasRestantes; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const fechaStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dias.push({
        dia: d,
        fechaStr,
        esMesActual: false,
        esHoy: fechaStr === hoyStr,
        eventos: eventosPorFecha.get(fechaStr) || [],
      });
    }

    return dias;
  }, [year, month, eventosPorFecha, hoyStr]);

  // ------------------------------------------------------------------
  // Métricas del Mes Visible (KPIs)
  // ------------------------------------------------------------------
  const metricasMesVisible = useMemo(() => {
    const prefijoMes = `${year}-${String(month + 1).padStart(2, '0')}`;
    let realizados = 0;
    let programados = 0;
    let rojos = 0;
    let amarillos = 0;
    let verdes = 0;
    let totalCostoQuetzales = 0;
    const listaServiciosMes: Servicio[] = [];
    const listaProgramadosMes: { vehiculo: Vehiculo; fecha: string; estado: string }[] = [];

    // Servicios realizados en este mes
    servicios.forEach((s) => {
      if (s.fecha && s.fecha.startsWith(prefijoMes)) {
        realizados++;
        verdes++;
        totalCostoQuetzales += s.costoTotal || 0;
        listaServiciosMes.push(s);
      }
    });

    // Servicios programados en este mes
    vehiculos.forEach((v) => {
      if (v.proximaFechaServicio && v.proximaFechaServicio.startsWith(prefijoMes)) {
        programados++;
        const al = calcularAlertaVehiculo(v);
        if (al.estado === 'rojo') rojos++;
        else if (al.estado === 'amarillo') amarillos++;
        else verdes++;
        listaProgramadosMes.push({ vehiculo: v, fecha: v.proximaFechaServicio, estado: al.estado });
      }
    });

    return {
      total: realizados + programados,
      realizados,
      programados,
      rojos,
      amarillos,
      verdes,
      totalCostoQuetzales,
      listaServiciosMes,
      listaProgramadosMes,
    };
  }, [year, month, servicios, vehiculos]);

  // ------------------------------------------------------------------
  // Eventos del Día Seleccionado con Filtros
  // ------------------------------------------------------------------
  const eventosDiaSeleccionado = useMemo(() => {
    if (!diaSeleccionado) return [];
    const todos = eventosPorFecha.get(diaSeleccionado) || [];

    return todos.filter((ev) => {
      if (filtroTipo === 'REALIZADOS' && ev.tipo !== 'realizado') return false;
      if (filtroTipo === 'PROGRAMADOS' && ev.tipo !== 'programado') return false;
      if (filtroPlaca !== 'TODAS' && ev.vehiculo.placa !== filtroPlaca) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const coincidePlaca = ev.vehiculo.placa.toLowerCase().includes(q);
        const coincidePiloto = ev.vehiculo.piloto.toLowerCase().includes(q);
        const coincideServicio = ev.servicio?.tipoServicio?.toLowerCase().includes(q) || false;
        if (!coincidePlaca && !coincidePiloto && !coincideServicio) return false;
      }
      return true;
    });
  }, [diaSeleccionado, eventosPorFecha, filtroTipo, filtroPlaca, busqueda]);

  // ------------------------------------------------------------------
  // Abrir Formulario de Registro con Fecha Pre-seleccionada
  // ------------------------------------------------------------------
  const abrirRegistroParaFecha = (fecha: string, placaPrevia?: string) => {
    setFormFecha(fecha);
    setErrorForm('');
    setExitoForm('');

    const targetPlaca = placaPrevia || (vehiculos.length > 0 ? vehiculos[0].placa : '');
    setFormPlaca(targetPlaca);

    const veh = vehiculos.find((v) => v.placa === targetPlaca);
    if (veh) {
      setFormPiloto(veh.piloto || '');
      setFormKilometraje(veh.kilometraje || '');
      setFormProximoKm((veh.kilometraje || 0) + 5000);
    } else {
      setFormPiloto('');
      setFormKilometraje('');
      setFormProximoKm('');
    }

    // Calcular fecha futura sugerida (+3 meses)
    const fechaObj = new Date(fecha + 'T00:00:00');
    fechaObj.setMonth(fechaObj.getMonth() + 3);
    const sugeridaStr = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}-${String(fechaObj.getDate()).padStart(2, '0')}`;
    setFormProximaFecha(sugeridaStr);

    setFormTipoMantenimiento('Preventivo');
    setFormTipoServicio('Mantenimiento Preventivo / Cambio de Aceite');
    setFormDescripcion('');
    setFormTecnico('TALLERES E. GARCÍA');
    setFormCostoManoObra(200);
    setFormRepuestos([
      { nombre: 'Aceite de Motor Sintético 15W-40', cantidad: 1, precio: 280, total: 280 },
      { nombre: 'Filtro de Aceite', cantidad: 1, precio: 65, total: 65 },
    ]);

    setModalRegistroAbierto(true);
  };

  const handleCambioPlacaForm = (nuevaPlaca: string) => {
    setFormPlaca(nuevaPlaca);
    const veh = vehiculos.find((v) => v.placa === nuevaPlaca);
    if (veh) {
      setFormPiloto(veh.piloto || '');
      setFormKilometraje(veh.kilometraje || '');
      setFormProximoKm((veh.kilometraje || 0) + 5000);
    }
  };

  // Manejo de Repuestos en el Formulario
  const handleAgregarRepuesto = () => {
    setFormRepuestos([...formRepuestos, { nombre: '', cantidad: 1, precio: 0, total: 0 }]);
  };

  const handleEliminarRepuesto = (idx: number) => {
    setFormRepuestos(formRepuestos.filter((_, i) => i !== idx));
  };

  const handleUpdateRepuesto = (idx: number, campo: keyof RepuestoItem, valor: any) => {
    const list = [...formRepuestos];
    const item = { ...list[idx], [campo]: valor };
    if (campo === 'cantidad' || campo === 'precio') {
      const cant = campo === 'cantidad' ? Number(valor) || 0 : item.cantidad;
      const prec = campo === 'precio' ? Number(valor) || 0 : item.precio;
      item.total = cant * prec;
    }
    list[idx] = item;
    setFormRepuestos(list);
  };

  const totalRepuestos = useMemo(() => {
    return formRepuestos.reduce((acc, r) => acc + (r.total || 0), 0);
  }, [formRepuestos]);

  const totalMantenimiento = useMemo(() => {
    return totalRepuestos + (Number(formCostoManoObra) || 0);
  }, [totalRepuestos, formCostoManoObra]);

  // Guardar Servicio en Firestore
  const handleGuardarServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm('');
    setExitoForm('');

    if (!formPlaca) {
      setErrorForm('Debe seleccionar la placa del vehículo.');
      return;
    }

    if (!formFecha) {
      setErrorForm('Debe ingresar la fecha de ejecución.');
      return;
    }

    setGuardandoServicio(true);
    try {
      const nuevoServicio: Servicio = {
        id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        placa: formPlaca.trim().toUpperCase(),
        piloto: formPiloto.trim() || 'Piloto No Asignado',
        tipoMantenimiento: formTipoMantenimiento,
        tipoServicio: formTipoServicio.trim(),
        descripcion: formDescripcion.trim() || `${formTipoMantenimiento}: ${formTipoServicio}`,
        fecha: formFecha,
        kilometraje: Number(formKilometraje) || 0,
        tecnico: formTecnico.trim() || 'TALLERES E. GARCÍA',
        proximaFecha: formProximaFecha || undefined,
        proximoKm: Number(formProximoKm) || undefined,
        repuestos: formRepuestos.filter((r) => r.nombre.trim()),
        costoRepuestos: totalRepuestos,
        costoManoObra: Number(formCostoManoObra) || 0,
        costoTotal: totalMantenimiento,
        estado: 'completado',
        creadoEn: new Date().toISOString(),
      };

      await saveServicio(nuevoServicio);
      setExitoForm('¡Mantenimiento guardado y registrado exitosamente en Firebase!');

      setTimeout(() => {
        setModalRegistroAbierto(false);
        setDiaSeleccionado(formFecha);
      }, 1000);
    } catch (err: any) {
      console.error('Error al guardar mantenimiento desde calendario:', err);
      setErrorForm('Error al guardar el servicio: ' + (err.message || 'Intente nuevamente'));
    } finally {
      setGuardandoServicio(false);
    }
  };

  // Formato para mostrar fecha bonita
  const formatearFechaBonita = (fechaStr: string) => {
    if (!fechaStr) return '';
    try {
      const [y, m, d] = fechaStr.split('-').map(Number);
      const fechaObj = new Date(y, m - 1, d);
      return fechaObj.toLocaleDateString('es-GT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return fechaStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* -------------------------------------------------------------- */}
      {/* 1. ENCABEZADO Y CONTROLES DE NAVEGACIÓN DE MES/AÑO              */}
      {/* -------------------------------------------------------------- */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Título & Logo */}
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-md">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Calendario de Mantenimientos
              </h2>
              <span className="bg-blue-100 text-blue-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                Navegación Total
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Visualiza, programa y registra servicios para cualquier mes y año en tiempo real
            </p>
          </div>
        </div>

        {/* Barra de Control de Navegación (Año Anterior, Mes Anterior, Dropdowns, Mes Siguiente, Año Siguiente, Hoy) */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
          {/* Año Anterior ⏪ */}
          <button
            onClick={anioAnterior}
            className="p-2 bg-white hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-200 shadow-2xs cursor-pointer"
            title="Año Anterior (-1 año)"
            id="btn-anio-anterior"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Mes Anterior ⬅️ */}
          <button
            onClick={mesAnterior}
            className="p-2 bg-white hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-200 shadow-2xs cursor-pointer"
            title="Mes Anterior (-1 mes)"
            id="btn-mes-anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Selector de Mes */}
          <select
            value={month}
            onChange={(e) => cambiarMes(Number(e.target.value))}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer shadow-2xs"
            id="select-mes-calendario"
          >
            {mesesNombres.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>

          {/* Selector de Año */}
          <select
            value={year}
            onChange={(e) => cambiarAnio(Number(e.target.value))}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer shadow-2xs"
            id="select-anio-calendario"
          >
            {aniosDisponibles.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Mes Siguiente ➡️ */}
          <button
            onClick={mesSiguiente}
            className="p-2 bg-white hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-200 shadow-2xs cursor-pointer"
            title="Mes Siguiente (+1 mes)"
            id="btn-mes-siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Año Siguiente ⏩ */}
          <button
            onClick={anioSiguiente}
            className="p-2 bg-white hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-200 shadow-2xs cursor-pointer"
            title="Año Siguiente (+1 año)"
            id="btn-anio-siguiente"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>

          {/* Botón Mes Actual / Hoy */}
          <button
            onClick={irAHoy}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer ml-1"
            id="btn-mes-actual"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Mes Actual</span>
          </button>
        </div>

        {/* Botones de Acción Global */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalReporteMesAbierto(true)}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-2 border border-slate-300 cursor-pointer"
            id="btn-imprimir-informe-mes"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Informe del Mes</span>
          </button>

          <button
            onClick={() => abrirRegistroParaFecha(diaSeleccionado || hoyStr)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer"
            id="btn-nuevo-mantenimiento-calendario"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Mantenimiento</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* 2. RESUMEN DEL MES VISIBLE (KPIs & Alertas)                    */}
      {/* -------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Servicios del Mes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-slate-400">Total en {mesesNombres[month]}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{metricasMesVisible.total}</span>
            <span className="text-[10px] text-slate-500 font-semibold">eventos</span>
          </div>
        </div>

        {/* Realizados */}
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase text-emerald-800">🟢 Realizados</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-950">{metricasMesVisible.realizados}</span>
            <span className="text-[10px] text-emerald-700 font-semibold">ejecutados</span>
          </div>
        </div>

        {/* Programados / Próximos */}
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase text-amber-800">🟡 Programados</p>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-950">{metricasMesVisible.programados}</span>
            <span className="text-[10px] text-amber-700 font-semibold">pendientes</span>
          </div>
        </div>

        {/* Vencidos / Urgentes */}
        <div className="bg-red-50/70 p-4 rounded-2xl border border-red-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase text-red-800">🔴 Vencidos</p>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-red-950">{metricasMesVisible.rojos}</span>
            <span className="text-[10px] text-red-700 font-semibold">urgentes</span>
          </div>
        </div>

        {/* Gasto Total del Mes en Quetzales */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase text-slate-300">Gasto en Mantenimiento</p>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-emerald-400">
              {formatQuetzales(metricasMesVisible.totalCostoQuetzales)}
            </span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* 3. FILTROS RÁPIDOS Y BÚSQUEDA                                   */}
      {/* -------------------------------------------------------------- */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Filtro Tipo */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFiltroTipo('TODOS')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                filtroTipo === 'TODOS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({metricasMesVisible.total})
            </button>
            <button
              onClick={() => setFiltroTipo('REALIZADOS')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                filtroTipo === 'REALIZADOS' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Realizados ({metricasMesVisible.realizados})
            </button>
            <button
              onClick={() => setFiltroTipo('PROGRAMADOS')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                filtroTipo === 'PROGRAMADOS' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Programados ({metricasMesVisible.programados})
            </button>
          </div>

          {/* Filtro por Placa */}
          <select
            value={filtroPlaca}
            onChange={(e) => setFiltroPlaca(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="TODAS">Todas las Placas ({vehiculos.length})</option>
            {vehiculos.map((v) => (
              <option key={v.placa} value={v.placa}>
                {v.placa} - {v.piloto}
              </option>
            ))}
          </select>
        </div>

        {/* Buscador */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar placa, piloto, servicio..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* 4. GRID DEL CALENDARIO (7 COLUMNAS) + PANEL DE DÍA             */}
      {/* -------------------------------------------------------------- */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* CUADRÍCULA DE DÍAS (8 columnas en desktop grande) */}
        <div className="xl:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            {/* Título de Mes Visible */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <span className="text-lg font-black text-slate-900 tracking-tight">
                {mesesNombres[month]} {year}
              </span>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Realizado / Al día
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> 7 Días / Próximo
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Vencido
                </span>
              </div>
            </div>

            {/* Encabezado Días de la semana */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs uppercase text-slate-400 mb-2">
              {diasSemana.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Días del Calendario (Totalmente Interactivos y Clicables) */}
            <div className="grid grid-cols-7 gap-1.5">
              {diasMatriz.map((item, idx) => {
                const isSelected = diaSeleccionado === item.fechaStr;
                const totalEv = item.eventos.length;
                const hasRed = item.eventos.some((e) => e.estado === 'rojo');
                const hasYellow = item.eventos.some((e) => e.estado === 'amarillo');
                const hasGreen = item.eventos.some((e) => e.estado === 'verde');

                return (
                  <div
                    key={`${item.fechaStr}-${idx}`}
                    onClick={() => setDiaSeleccionado(item.fechaStr)}
                    className={`min-h-[85px] sm:min-h-[95px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group relative select-none ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-500/40 shadow-sm'
                        : item.esHoy
                        ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400'
                        : item.esMesActual
                        ? 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-2xs'
                        : 'bg-slate-50/40 border-slate-100 text-slate-400 hover:bg-slate-100/60'
                    }`}
                  >
                    {/* Fila Superior: Número del Día + Badge Contador */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black rounded-lg px-1.5 py-0.5 transition ${
                          item.esHoy
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : isSelected
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : item.esMesActual
                            ? 'text-slate-800 group-hover:text-blue-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.dia}
                      </span>

                      {totalEv > 0 && (
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                            hasRed
                              ? 'bg-red-100 text-red-800'
                              : hasYellow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {totalEv}
                        </span>
                      )}
                    </div>

                    {/* Fila Central: Badges de Servicios / Mantenimientos */}
                    <div className="space-y-1 my-1 overflow-hidden">
                      {item.eventos.slice(0, 2).map((ev, ei) => (
                        <div
                          key={ei}
                          className={`text-[9px] sm:text-[10px] font-black truncate px-1.5 py-0.5 rounded flex items-center justify-between gap-1 shadow-2xs ${
                            ev.estado === 'rojo'
                              ? 'bg-red-600 text-white'
                              : ev.estado === 'amarillo'
                              ? 'bg-amber-500 text-slate-950'
                              : ev.tipo === 'realizado'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                          title={`${ev.vehiculo.placa} (${ev.tipo === 'realizado' ? 'Realizado' : 'Programado'}) - ${ev.motivoAlerta || ''}`}
                        >
                          <span className="truncate">{ev.vehiculo.placa}</span>
                          <span className="text-[8px] opacity-90 shrink-0 uppercase">
                            {ev.tipo === 'realizado' ? '✓' : '⏰'}
                          </span>
                        </div>
                      ))}

                      {totalEv > 2 && (
                        <span className="text-[9px] text-slate-500 block text-center font-bold bg-slate-100 rounded py-0.5">
                          +{totalEv - 2} más
                        </span>
                      )}
                    </div>

                    {/* Botón rápido flotante en hover para añadir servicio */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirRegistroParaFecha(item.fechaStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-0.5 py-0.5 rounded bg-blue-100/80 cursor-pointer"
                      title="Registrar mantenimiento en este día"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Registrar</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-4 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <span>💡 Haz clic en cualquier día para ver o registrar mantenimientos para esa fecha.</span>
            <span className="font-semibold text-slate-700">Día seleccionado: {diaSeleccionado}</span>
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* PANEL LATERAL: DETALLE DE EVENTOS DEL DÍA SELECCIONADO        */}
        {/* -------------------------------------------------------------- */}
        <div className="xl:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            {/* Encabezado del Día */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <h3 className="font-black text-slate-900 text-base capitalize">
                    {formatearFechaBonita(diaSeleccionado)}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {eventosDiaSeleccionado.length} servicios registrados / programados
                </p>
              </div>

              <button
                onClick={() => abrirRegistroParaFecha(diaSeleccionado)}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Registrar servicio en esta fecha"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nuevo</span>
              </button>
            </div>

            {/* Lista de Eventos del Día */}
            <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
              {eventosDiaSeleccionado.length === 0 ? (
                <div className="py-14 text-center text-slate-400 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 p-6">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">
                    No hay mantenimientos registrados en esta fecha.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Puedes programar o registrar un mantenimiento para este día con el botón inferior.
                  </p>
                  <button
                    onClick={() => abrirRegistroParaFecha(diaSeleccionado)}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Registrar Mantenimiento Aquí</span>
                  </button>
                </div>
              ) : (
                eventosDiaSeleccionado.map((ev) => (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-2xl border transition-all text-xs ${
                      ev.estado === 'rojo'
                        ? 'bg-red-50/80 border-red-200 text-red-950'
                        : ev.estado === 'amarillo'
                        ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                        : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    {/* Encabezado del Evento */}
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-black/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-base tracking-wide bg-white/80 px-2 py-0.5 rounded-lg border border-black/5">
                            {ev.vehiculo.placa}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/60">
                            {ev.vehiculo.tipo}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold mt-1 text-slate-700">
                          Piloto: <strong>{ev.vehiculo.piloto}</strong>
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-2xs ${
                          ev.estado === 'rojo'
                            ? 'bg-red-600 text-white'
                            : ev.estado === 'amarillo'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {ev.tipo === 'programado' ? '⏰ Programado' : '✓ Realizado'}
                      </span>
                    </div>

                    {/* Detalle si es Servicio Realizado */}
                    {ev.servicio ? (
                      <div className="mt-2.5 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{ev.servicio.tipoServicio}</span>
                          <span className="font-black text-emerald-700">
                            {formatQuetzales(ev.servicio.costoTotal || 0)}
                          </span>
                        </div>
                        <p className="text-slate-600">{ev.servicio.descripcion}</p>

                        {ev.servicio.repuestos && ev.servicio.repuestos.length > 0 && (
                          <div className="pt-2 border-t border-black/5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                              Repuestos Instalados ({ev.servicio.repuestos.length}):
                            </span>
                            <div className="space-y-0.5">
                              {ev.servicio.repuestos.map((r, ri) => (
                                <div key={ri} className="flex justify-between text-[10px] text-slate-700">
                                  <span>• {r.cantidad}x {r.nombre}</span>
                                  <span className="font-semibold">{formatQuetzales(r.total)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-black/5">
                          <span>Técnico: {ev.servicio.tecnico || 'TALLERES E. GARCÍA'}</span>
                          <span>Km: {ev.servicio.kilometraje?.toLocaleString() || 'N/A'}</span>
                        </div>
                      </div>
                    ) : (
                      /* Detalle si es Servicio Programado */
                      <div className="mt-2.5 space-y-2 text-[11px]">
                        <div className="bg-white/70 p-2.5 rounded-xl border border-black/5">
                          <p className="font-bold text-slate-800">
                            Km Actual: {ev.vehiculo.kilometraje?.toLocaleString() || 0} km
                          </p>
                          {ev.vehiculo.proximoKmServicio ? (
                            <p className="text-[10px] text-slate-600 mt-0.5">
                              Próximo servicio a los {ev.vehiculo.proximoKmServicio?.toLocaleString()} km
                            </p>
                          ) : null}
                          {ev.motivoAlerta && (
                            <p className="text-[10px] font-semibold text-slate-600 mt-1">
                              Estado: {ev.motivoAlerta}
                            </p>
                          )}
                        </div>

                        {/* Botón de Realizar Servicio */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => abrirRegistroParaFecha(diaSeleccionado, ev.vehiculo.placa)}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Registrar Servicio Ahora</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pie del Panel Lateral */}
          <div className="border-t border-slate-100 pt-3 mt-4">
            <button
              onClick={() => abrirRegistroParaFecha(diaSeleccionado)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Mantenimiento para {diaSeleccionado}</span>
            </button>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* MODAL 1: FORMULARIO DE REGISTRO DE MANTENIMIENTO               */}
      {/* -------------------------------------------------------------- */}
      {modalRegistroAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base">Registrar Mantenimiento por Fecha</h3>
                  <p className="text-xs text-blue-200">
                    Fecha programada/ejecutada: <strong>{formFecha}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalRegistroAbierto(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleGuardarServicio} className="p-6 space-y-4">
              {/* Placa y Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Placa del Vehículo *
                  </label>
                  <select
                    value={formPlaca}
                    onChange={(e) => handleCambioPlacaForm(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                    required
                  >
                    <option value="">Seleccione una Placa</option>
                    {vehiculos.map((v) => (
                      <option key={v.placa} value={v.placa}>
                        {v.placa} - {v.piloto} ({v.tipo})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Fecha de Ejecución *
                  </label>
                  <input
                    type="date"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Piloto y Kilometraje */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Piloto Asignado
                  </label>
                  <input
                    type="text"
                    value={formPiloto}
                    onChange={(e) => setFormPiloto(e.target.value)}
                    placeholder="Nombre del piloto"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Kilometraje Actual (km)
                  </label>
                  <input
                    type="number"
                    value={formKilometraje}
                    onChange={(e) => setFormKilometraje(e.target.value)}
                    placeholder="Ej: 45200"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tipo Mantenimiento y Servicio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tipo de Mantenimiento
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormTipoMantenimiento('Preventivo')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${
                        formTipoMantenimiento === 'Preventivo'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      Preventivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTipoMantenimiento('Correctivo')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${
                        formTipoMantenimiento === 'Correctivo'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      Correctivo
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tipo de Servicio / Trabajo
                  </label>
                  <input
                    type="text"
                    value={formTipoServicio}
                    onChange={(e) => setFormTipoServicio(e.target.value)}
                    placeholder="Ej: Cambio de Aceite, Frenos, Suspensión..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Técnico Responsable */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Técnico o Taller Responsable
                </label>
                <input
                  type="text"
                  value={formTecnico}
                  onChange={(e) => setFormTecnico(e.target.value)}
                  placeholder="Ej: TALLERES E. GARCÍA / Tec. Carlos Pérez"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Sección de Repuestos Instalados */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <span>⚙️ Repuestos y Piezas Instaladas</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAgregarRepuesto}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-600 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Repuesto</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formRepuestos.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                      <input
                        type="text"
                        value={item.nombre}
                        onChange={(e) => handleUpdateRepuesto(idx, 'nombre', e.target.value)}
                        placeholder="Descripción o nombre del repuesto"
                        className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none"
                      />
                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => handleUpdateRepuesto(idx, 'cantidad', e.target.value)}
                          placeholder="Cant."
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.precio}
                          onChange={(e) => handleUpdateRepuesto(idx, 'precio', e.target.value)}
                          placeholder="Q Precio"
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-right"
                        />
                      </div>
                      <span className="w-24 text-right text-xs font-black text-slate-900 pr-1">
                        {formatQuetzales(item.total)}
                      </span>
                      {formRepuestos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleEliminarRepuesto(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Subtotal Repuestos + Mano de Obra */}
                <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Mano de Obra (Q):</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formCostoManoObra}
                      onChange={(e) => setFormCostoManoObra(e.target.value)}
                      className="w-28 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 text-right"
                    />
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 block font-medium">Costo Total en Quetzales:</span>
                    <span className="text-lg font-black text-emerald-600">
                      {formatQuetzales(totalMantenimiento)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Próximo Servicio Programado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-blue-100 bg-blue-50/40 p-3.5 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-blue-950 uppercase mb-1">
                    📅 Próxima Fecha de Servicio
                  </label>
                  <input
                    type="date"
                    value={formProximaFecha}
                    onChange={(e) => setFormProximaFecha(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-950 uppercase mb-1">
                    🎯 Próximo Kilometraje (km)
                  </label>
                  <input
                    type="number"
                    value={formProximoKm}
                    onChange={(e) => setFormProximoKm(e.target.value)}
                    placeholder="Ej: 50200"
                    className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Mensajes de Alerta/Exito */}
              {errorForm && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorForm}</span>
                </div>
              )}

              {exitoForm && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{exitoForm}</span>
                </div>
              )}

              {/* Botones de Envío */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalRegistroAbierto(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoServicio}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{guardandoServicio ? 'Guardando...' : 'Guardar Mantenimiento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* MODAL 2: INFORME / REPORTE IMPRIMIBLE DEL MES VISIBLE           */}
      {/* -------------------------------------------------------------- */}
      {modalReporteMesAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 p-6">
            {/* Header del Reporte */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/logo_talleres.png"
                  alt="Logo TALLERES E. GARCÍA"
                  className="h-12 w-auto aspect-square object-contain rounded-lg border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="font-black text-slate-900 text-lg uppercase">
                    TALLERES E. GARCÍA
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Informe Consolidado de Mantenimiento - {mesesNombres[month]} {year}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    try {
                      window.print();
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  onClick={() => setModalReporteMesAbierto(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Resumen Estadístico */}
            <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Mantenimientos</span>
                <span className="text-xl font-black text-slate-900">{metricasMesVisible.total}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Ejecutados</span>
                <span className="text-xl font-black text-emerald-700">{metricasMesVisible.realizados}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase block">Programados</span>
                <span className="text-xl font-black text-amber-700">{metricasMesVisible.programados}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Inversión Total</span>
                <span className="text-xl font-black text-slate-900">
                  {formatQuetzales(metricasMesVisible.totalCostoQuetzales)}
                </span>
              </div>
            </div>

            {/* Tabla de Mantenimientos Realizados */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Servicios Realizados en {mesesNombres[month]} {year}
              </h4>
              {metricasMesVisible.listaServiciosMes.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No hay servicios realizados registrados para este mes.
                </p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Fecha</th>
                        <th className="p-2.5">Placa</th>
                        <th className="p-2.5">Piloto</th>
                        <th className="p-2.5">Tipo Servicio</th>
                        <th className="p-2.5">Km</th>
                        <th className="p-2.5 text-right">Costo Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {metricasMesVisible.listaServiciosMes.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-mono">{s.fecha}</td>
                          <td className="p-2.5 font-bold font-mono text-blue-700">{s.placa}</td>
                          <td className="p-2.5">{s.piloto}</td>
                          <td className="p-2.5">{s.tipoServicio}</td>
                          <td className="p-2.5">{s.kilometraje?.toLocaleString() || 'N/A'}</td>
                          <td className="p-2.5 text-right font-black text-emerald-700">
                            {formatQuetzales(s.costoTotal || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tabla de Servicios Programados */}
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-2">
                2. Servicios Programados para {mesesNombres[month]} {year}
              </h4>
              {metricasMesVisible.listaProgramadosMes.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No hay servicios programados pendientes para este mes.
                </p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Fecha Programada</th>
                        <th className="p-2.5">Placa</th>
                        <th className="p-2.5">Piloto</th>
                        <th className="p-2.5">Tipo Vehículo</th>
                        <th className="p-2.5">Estado de Alerta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {metricasMesVisible.listaProgramadosMes.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-mono font-bold">{p.fecha}</td>
                          <td className="p-2.5 font-bold font-mono text-blue-700">{p.vehiculo.placa}</td>
                          <td className="p-2.5">{p.vehiculo.piloto}</td>
                          <td className="p-2.5 uppercase">{p.vehiculo.tipo}</td>
                          <td className="p-2.5">
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                p.estado === 'rojo'
                                  ? 'bg-red-100 text-red-800'
                                  : p.estado === 'amarillo'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {p.estado === 'rojo' ? '🔴 Vencido' : p.estado === 'amarillo' ? '🟡 Próximo' : '🟢 Al día'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
