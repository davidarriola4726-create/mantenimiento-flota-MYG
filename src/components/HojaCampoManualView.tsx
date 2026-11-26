import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ClipboardList,
  Printer,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  FileEdit,
  Eye,
  RotateCcw,
  Cloud,
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { HojaCampoManual, HojaCampoManualRepuesto, Usuario, Vehiculo } from '../types';
import {
  asegurarPrimeraHojaCampoHC,
  crearSiguienteHojaCampoHC,
  saveHojaCampoHC,
  deleteHojaCampoHC,
} from '../services/firestoreService';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface HojaCampoManualViewProps {
  hojas: HojaCampoManual[];
  vehiculos: Vehiculo[];
  currentUser?: Usuario | null;
}

const crearRepuestosVacios = (): HojaCampoManualRepuesto[] =>
  Array.from({ length: 8 }, () => ({
    cantidad: '',
    descripcion: '',
    precioUnitario: '',
    total: '',
  }));

export const HojaCampoManualView: React.FC<HojaCampoManualViewProps> = ({
  hojas,
  vehiculos,
  currentUser,
}) => {
  const [hojaActiva, setHojaActiva] = useState<HojaCampoManual | null>(null);
  const [inicializando, setInicializando] = useState<boolean>(true);
  const [guardandoAuto, setGuardandoAuto] = useState<boolean>(false);
  const [ultimoGuardado, setUltimoGuardado] = useState<string>('');
  const [mostrarPrellenado, setMostrarPrellenado] = useState<boolean>(false);
  const [generandoPDF, setGenerandoPDF] = useState<boolean>(false);
  const [creandoNueva, setCreandoNueva] = useState<boolean>(false);
  const [hojaAEliminar, setHojaAEliminar] = useState<HojaCampoManual | null>(null);
  const [eliminando, setEliminando] = useState<boolean>(false);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inicializadoRef = useRef<boolean>(false);

  // Al cargar el apartado, asegurar que exista y quede guardado automáticamente HC-0001
  useEffect(() => {
    let montado = true;

    const inicializar = async () => {
      if (inicializadoRef.current) return;
      inicializadoRef.current = true;
      try {
        if (hojas.length > 0) {
          if (montado) {
            setHojaActiva((prev) => prev || hojas[0]);
            setInicializando(false);
          }
          return;
        }
        const primera = await asegurarPrimeraHojaCampoHC();
        if (montado) {
          setHojaActiva(primera);
          setUltimoGuardado(new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }));
        }
      } catch (err) {
        console.error('Error al inicializar correlativo HC-0001:', err);
      } finally {
        if (montado) setInicializando(false);
      }
    };

    inicializar();
    return () => {
      montado = false;
    };
  }, [hojas]);

  // Si llegan hojas desde Firestore y aún no hay hojaActiva, seleccionar la más reciente
  useEffect(() => {
    if (!hojaActiva && hojas.length > 0) {
      setHojaActiva(hojas[0]);
      setInicializando(false);
    }
  }, [hojas, hojaActiva]);

  // Limpiar timer de auto-guardado al desmontar
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // Auto-guardado en Firestore cuando el usuario modifica cualquier campo opcional
  const programarAutoGuardado = useCallback((hojaActualizada: HojaCampoManual) => {
    setHojaActiva(hojaActualizada);
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setGuardandoAuto(true);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await saveHojaCampoHC(hojaActualizada);
        setUltimoGuardado(
          new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
        );
      } catch (err) {
        console.error('Error en guardado automático de Hoja de Campo HC:', err);
      } finally {
        setGuardandoAuto(false);
      }
    }, 450);
  }, []);

  const actualizarCampo = (campo: keyof HojaCampoManual, valor: string) => {
    if (!hojaActiva) return;
    programarAutoGuardado({
      ...hojaActiva,
      [campo]: valor,
    });
  };

  const actualizarRepuestoFila = (
    idx: number,
    campo: keyof HojaCampoManualRepuesto,
    valor: string
  ) => {
    if (!hojaActiva) return;
    const base =
      hojaActiva.repuestos && hojaActiva.repuestos.length > 0
        ? [...hojaActiva.repuestos]
        : crearRepuestosVacios();
    while (base.length < 8) {
      base.push({ cantidad: '', descripcion: '', precioUnitario: '', total: '' });
    }
    const fila = { ...base[idx], [campo]: valor };
    // Calcular total si cantidad y precioUnitario son numéricos válidos
    if (campo === 'cantidad' || campo === 'precioUnitario') {
      const cant = parseFloat(fila.cantidad);
      const precio = parseFloat(fila.precioUnitario);
      if (!isNaN(cant) && !isNaN(precio) && fila.cantidad.trim() !== '' && fila.precioUnitario.trim() !== '') {
        fila.total = (cant * precio).toFixed(2);
      }
    }
    base[idx] = fila;
    programarAutoGuardado({
      ...hojaActiva,
      repuestos: base,
    });
  };

  const handlePrellenarVehiculo = (placa: string) => {
    if (!hojaActiva) return;
    if (!placa) {
      programarAutoGuardado({
        ...hojaActiva,
        placa: '',
        tipoVehiculo: '',
        nombrePiloto: '',
        kilometrajeInicial: '',
      });
      return;
    }
    const v = vehiculos.find((x) => x.placa === placa);
    if (v) {
      programarAutoGuardado({
        ...hojaActiva,
        placa: v.placa,
        tipoVehiculo: v.tipo || '',
        nombrePiloto: v.piloto || '',
        kilometrajeInicial: v.kilometraje ? String(v.kilometraje) : '',
      });
    }
  };

  const handleLimpiarCamposParaMano = () => {
    if (!hojaActiva) return;
    programarAutoGuardado({
      ...hojaActiva,
      fecha: '',
      tipoVehiculo: '',
      placa: '',
      kilometrajeInicial: '',
      kilometrajeFinal: '',
      nombrePiloto: '',
      repuestos: crearRepuestosVacios(),
      costoManoObra: '',
      fechaProximoMantenimiento: '',
      observaciones: '',
    });
  };

  const registrarEmisionEnFirestore = async (): Promise<HojaCampoManual | null> => {
    if (!hojaActiva) return null;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const hojaEmitida: HojaCampoManual = {
      ...hojaActiva,
      estado: 'emitida',
      vecesImpresa: (hojaActiva.vecesImpresa || 0) + 1,
      actualizadoEn: new Date().toISOString(),
    };
    setHojaActiva(hojaEmitida);
    await saveHojaCampoHC(hojaEmitida);
    setUltimoGuardado(
      new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
    );
    return hojaEmitida;
  };

  const handleNuevaHojaCorrelativo = async () => {
    if (creandoNueva) return;
    setCreandoNueva(true);
    try {
      if (hojaActiva) {
        await saveHojaCampoHC(hojaActiva);
      }
      const nueva = await crearSiguienteHojaCampoHC();
      setHojaActiva(nueva);
      setUltimoGuardado(
        new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
      );
    } catch (err) {
      console.error('Error al generar siguiente correlativo HC:', err);
    } finally {
      setCreandoNueva(false);
    }
  };

  const handleImprimirDirecto = async () => {
    try {
      await registrarEmisionEnFirestore();
    } catch (err) {
      console.error('Error guardando antes de imprimir:', err);
    }
    try {
      window.print();
    } catch (err) {
      console.error('Error al invocar window.print():', err);
    }
  };

  const handleDescargarPDF = async () => {
    if (generandoPDF || !hojaActiva) return;
    setGenerandoPDF(true);
    const correlativoActual = hojaActiva.correlativo || 'HC-0001';
    const nombreArchivo = `Hoja_Campo_${correlativoActual}_MYG.pdf`;

    try {
      await registrarEmisionEnFirestore();

      const elemento = document.getElementById('formato-impresion-hoja-campo-hc');
      if (!elemento) {
        throw new Error('No se encontró el formato de la hoja de campo.');
      }

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 960,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById('formato-impresion-hoja-campo-hc');
          if (clonedEl) {
            clonedEl.style.width = '840px';
            clonedEl.style.maxWidth = '840px';
            clonedEl.style.borderRadius = '0';
            clonedEl.style.border = 'none';
            clonedEl.style.boxShadow = 'none';
            clonedEl.style.padding = '16px';
          }
        },
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidthMm = pageWidth - margin * 2;
      const contentHeightMm = pageHeight - margin * 2;

      let imgWidthMm = contentWidthMm;
      let imgHeightMm = (canvas.height * contentWidthMm) / canvas.width;

      // Ajustar proporcionalmente para garantizar 1 sola página tamaño carta cuando quepa
      if (imgHeightMm > contentHeightMm) {
        const ratio = contentHeightMm / imgHeightMm;
        imgHeightMm = contentHeightMm;
        imgWidthMm = contentWidthMm * ratio;
      }

      const xOffset = (pageWidth - imgWidthMm) / 2;
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', xOffset, margin, imgWidthMm, imgHeightMm, undefined, 'FAST');
      pdf.save(nombreArchivo);
    } catch (error) {
      console.error('Error al capturar Hoja de Campo PDF, usando respaldo jsPDF:', error);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('SISTEMA DE CONTROL DE VEHICULOS MYG', 14, 16);
      pdf.setFontSize(11);
      pdf.text(`HOJA DE CAMPO - CORRELATIVO: ${correlativoActual}`, 14, 23);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Fecha: ${hojaActiva.fecha || '____ / ____ / ________'}   Tipo Vehiculo: ${hojaActiva.tipoVehiculo || '__________________'}`, 14, 33);
      pdf.text(`Placa: ${hojaActiva.placa || '____________'}   Km Inicial: ${hojaActiva.kilometrajeInicial || '_________'}   Km Final: ${hojaActiva.kilometrajeFinal || '_________'}`, 14, 41);
      pdf.text(`Nombre del Piloto: ${hojaActiva.nombrePiloto || '_______________________________________'}`, 14, 49);
      pdf.text('Repuestos Utilizados:', 14, 59);
      let y = 66;
      for (let i = 0; i < 8; i++) {
        const rep = hojaActiva.repuestos?.[i];
        pdf.text(`${i + 1}. Cant: ${rep?.cantidad || '____'}  Desc: ${rep?.descripcion || '__________________________________'}  P/U: ${rep?.precioUnitario || '_____'}  Total: ${rep?.total || '_____'}`, 14, y);
        y += 8;
      }
      y += 4;
      pdf.text(`Costo Mano de Obra (Q): ${hojaActiva.costoManoObra || '______________'}   Proximo Mantenimiento: ${hojaActiva.fechaProximoMantenimiento || '____/____/______'}`, 14, y);
      y += 12;
      pdf.text(`Observaciones: ${hojaActiva.observaciones || '__________________________________________________________'}`, 14, y);
      y += 28;
      pdf.text('Firma del Piloto: _______________________________', 14, y);
      pdf.save(nombreArchivo);
    } finally {
      setGenerandoPDF(false);
    }
  };

  const handleConfirmarEliminar = async () => {
    if (!hojaAEliminar) return;
    setEliminando(true);
    try {
      await deleteHojaCampoHC(hojaAEliminar.id);
      if (hojaActiva?.id === hojaAEliminar.id) {
        const restantes = hojas.filter((h) => h.id !== hojaAEliminar.id);
        if (restantes.length > 0) {
          setHojaActiva(restantes[0]);
        } else {
          const primera = await asegurarPrimeraHojaCampoHC();
          setHojaActiva(primera);
        }
      }
      setHojaAEliminar(null);
    } catch (err) {
      console.error('Error al eliminar Hoja de Campo HC:', err);
    } finally {
      setEliminando(false);
    }
  };

  const filasRepuestos: HojaCampoManualRepuesto[] = (() => {
    const base = hojaActiva?.repuestos ? [...hojaActiva.repuestos] : [];
    while (base.length < 8) {
      base.push({ cantidad: '', descripcion: '', precioUnitario: '', total: '' });
    }
    return base.slice(0, 8);
  })();

  const observacionesLineas = hojaActiva?.observaciones?.trim()
    ? hojaActiva.observaciones.split('\n')
    : [];

  return (
    <div className="space-y-6">
      {/* Barra Superior de Control (Oculta al imprimir) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Hoja de Campo Imprimible
                </h2>
                <span className="px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-black font-mono">
                  {hojaActiva?.correlativo || 'HC-0001'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold">
                  <Cloud className="w-3 h-3" />
                  {guardandoAuto
                    ? 'Guardando...'
                    : ultimoGuardado
                      ? `Guardado automático (${ultimoGuardado})`
                      : 'Guardado automático activo'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Formato oficial MYG con correlativo automático para imprimir en papel y llenar a mano en campo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMostrarPrellenado((v) => !v)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                mostrarPrellenado
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <FileEdit className="w-4 h-4" />
              <span>{mostrarPrellenado ? 'Ocultar Pre-llenado' : 'Pre-llenar (Opcional)'}</span>
            </button>

            <button
              type="button"
              onClick={handleNuevaHojaCorrelativo}
              disabled={creandoNueva || inicializando}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Generar y guardar automáticamente el siguiente correlativo HC"
            >
              <Plus className="w-4 h-4" />
              <span>{creandoNueva ? 'Generando...' : 'Nueva Hoja (Siguiente HC)'}</span>
            </button>

            <button
              type="button"
              onClick={handleImprimirDirecto}
              disabled={!hojaActiva}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Hoja</span>
            </button>

            <button
              type="button"
              onClick={handleDescargarPDF}
              disabled={!hojaActiva || generandoPDF}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{generandoPDF ? 'Generando PDF...' : 'Descargar PDF'}</span>
            </button>
          </div>
        </div>

        {/* Panel Opcional de Pre-llenado rápido antes de imprimir */}
        {mostrarPrellenado && hojaActiva && (
          <div className="mt-5 pt-5 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-600">
                Opcional: Puedes dejar todo en blanco para llenarlo a mano en papel, o pre-llenar algunos datos antes de imprimir.
              </p>
              <button
                type="button"
                onClick={handleLimpiarCamposParaMano}
                className="text-xs font-bold text-slate-600 hover:text-red-600 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Dejar hoja en blanco</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Cargar vehículo del sistema (opcional)
                </label>
                <select
                  value={vehiculos.some((v) => v.placa === hojaActiva.placa) ? hojaActiva.placa : ''}
                  onChange={(e) => handlePrellenarVehiculo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- En blanco (llenar a mano) --</option>
                  {vehiculos.map((v) => (
                    <option key={v.placa} value={v.placa}>
                      {v.placa} - {v.tipo} ({v.piloto})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha</label>
                <input
                  type="date"
                  value={hojaActiva.fecha}
                  onChange={(e) => actualizarCampo('fecha', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo de vehículo</label>
                <input
                  type="text"
                  value={hojaActiva.tipoVehiculo}
                  onChange={(e) => actualizarCampo('tipoVehiculo', e.target.value)}
                  placeholder="Ej: Pickup, Camión, Panel..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Placa</label>
                <input
                  type="text"
                  value={hojaActiva.placa}
                  onChange={(e) => actualizarCampo('placa', e.target.value.toUpperCase())}
                  placeholder="Ej: P-102MYG"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Kilometraje inicial</label>
                <input
                  type="text"
                  value={hojaActiva.kilometrajeInicial}
                  onChange={(e) => actualizarCampo('kilometrajeInicial', e.target.value)}
                  placeholder="Ej: 42500"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Kilometraje final</label>
                <input
                  type="text"
                  value={hojaActiva.kilometrajeFinal}
                  onChange={(e) => actualizarCampo('kilometrajeFinal', e.target.value)}
                  placeholder="Ej: 42650"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre del piloto</label>
                <input
                  type="text"
                  value={hojaActiva.nombrePiloto}
                  onChange={(e) => actualizarCampo('nombrePiloto', e.target.value)}
                  placeholder="Nombre completo del piloto"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Costo de mano de obra (Q)</label>
                <input
                  type="text"
                  value={hojaActiva.costoManoObra}
                  onChange={(e) => actualizarCampo('costoManoObra', e.target.value)}
                  placeholder="Ej: 250.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha próximo mantenimiento</label>
                <input
                  type="date"
                  value={hojaActiva.fechaProximoMantenimiento}
                  onChange={(e) => actualizarCampo('fechaProximoMantenimiento', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Observaciones</label>
                <input
                  type="text"
                  value={hojaActiva.observaciones}
                  onChange={(e) => actualizarCampo('observaciones', e.target.value)}
                  placeholder="Notas opcionales..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Edición rápida opcional de filas de repuestos */}
            <div>
              <p className="text-[11px] font-bold text-slate-600 mb-1.5">
                Repuestos utilizados (opcional, dejar vacío para llenar a mano)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filasRepuestos.slice(0, 4).map((fila, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <span className="col-span-1 text-[10px] font-black text-slate-400 text-center">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={fila.cantidad}
                      onChange={(e) => actualizarRepuestoFila(idx, 'cantidad', e.target.value)}
                      placeholder="Cant."
                      className="col-span-2 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px]"
                    />
                    <input
                      type="text"
                      value={fila.descripcion}
                      onChange={(e) => actualizarRepuestoFila(idx, 'descripcion', e.target.value)}
                      placeholder="Descripción del repuesto"
                      className="col-span-5 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px]"
                    />
                    <input
                      type="text"
                      value={fila.precioUnitario}
                      onChange={(e) => actualizarRepuestoFila(idx, 'precioUnitario', e.target.value)}
                      placeholder="P/U Q"
                      className="col-span-2 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px]"
                    />
                    <input
                      type="text"
                      value={fila.total}
                      onChange={(e) => actualizarRepuestoFila(idx, 'total', e.target.value)}
                      placeholder="Total"
                      className="col-span-2 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
          DOCUMENTO IMPRIMIBLE OFICIAL: HOJA DE CAMPO PARA LLENAR A MANO
         ==================================================================== */}
      <div
        id="formato-impresion-hoja-campo-hc"
        className="printable-document printable-area bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 max-w-4xl mx-auto text-slate-900"
      >
        {/* Encabezado Oficial con Logo de la Empresa y Correlativo */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b-2 border-slate-900 pb-4 mb-5">
          <div className="flex items-center gap-4">
            <img
              src="/logo_myg.png"
              alt="Logo Empresa MYG"
              className="h-16 sm:h-20 w-auto max-w-[180px] object-contain rounded-xl border border-slate-200 bg-white p-1 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                Sistema de Control de Vehículos MYG
              </h1>
              <p className="text-xs sm:text-sm font-extrabold text-blue-700 uppercase tracking-wide mt-0.5">
                Hoja de Campo — Control de Mantenimiento
              </p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Documento oficial de control en campo • Llenado manual en sitio
              </p>
            </div>
          </div>

          <div className="border-2 border-slate-900 rounded-xl px-4 py-2 text-center bg-slate-50 shrink-0 min-w-[155px]">
            <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
              Correlativo N.º
            </span>
            <span className="block text-xl font-black font-mono text-red-600 tracking-wider mt-0.5">
              {hojaActiva?.correlativo || 'HC-0001'}
            </span>
          </div>
        </div>

        {/* Bloque 1: Datos Generales del Vehículo y Kilometraje (Para llenar a mano) */}
        <div className="border border-slate-400 rounded-xl overflow-hidden mb-5">
          <div className="bg-slate-900 text-white px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider">
            1. Datos del Vehículo y Servicio en Campo
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 border-b border-slate-300">
            <div className="p-3">
              <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Fecha
              </span>
              <div className="mt-2 min-h-[24px] border-b border-slate-400 text-sm font-bold text-slate-900 pb-0.5">
                {hojaActiva?.fecha ? (
                  <span>{hojaActiva.fecha}</span>
                ) : (
                  <span className="text-slate-300 font-normal text-xs tracking-widest">
                    ____ / ____ / ________
                  </span>
                )}
              </div>
            </div>

            <div className="p-3">
              <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Tipo de Vehículo
              </span>
              <div className="mt-2 min-h-[24px] border-b border-slate-400 text-sm font-bold text-slate-900 pb-0.5">
                {hojaActiva?.tipoVehiculo || '\u00A0'}
              </div>
            </div>

            <div className="p-3">
              <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Placa
              </span>
              <div className="mt-2 min-h-[24px] border-b border-slate-400 text-sm font-black uppercase text-slate-900 pb-0.5">
                {hojaActiva?.placa || '\u00A0'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-300">
            <div className="p-3">
              <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Kilometraje Inicial
              </span>
              <div className="mt-2 min-h-[24px] border-b border-slate-400 text-sm font-bold text-slate-900 flex items-end justify-between pb-0.5">
                <span>{hojaActiva?.kilometrajeInicial || '\u00A0'}</span>
                <span className="text-[10px] font-bold text-slate-400">km</span>
              </div>
            </div>

            <div className="p-3">
              <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Kilometraje Final
              </span>
              <div className="mt-2 min-h-[24px] border-b border-slate-400 text-sm font-bold text-slate-900 flex items-end justify-between pb-0.5">
                <span>{hojaActiva?.kilometrajeFinal || '\u00A0'}</span>
                <span className="text-[10px] font-bold text-slate-400">km</span>
              </div>
            </div>

            <div className="p-3">
              <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Nombre del Piloto
              </span>
              <div className="mt-2 min-h-[24px] border-b border-slate-400 text-sm font-bold text-slate-900 pb-0.5">
                {hojaActiva?.nombrePiloto || '\u00A0'}
              </div>
            </div>
          </div>
        </div>

        {/* Bloque 2: Tabla de Repuestos Utilizados */}
        <div className="mb-5">
          <div className="bg-slate-900 text-white px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider rounded-t-xl border border-b-0 border-slate-400">
            2. Repuestos Utilizados
          </div>
          <div className="border border-slate-400 rounded-b-xl overflow-hidden">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 text-slate-700 font-extrabold uppercase text-[10px]">
                  <th className="py-2 px-2 border-r border-slate-300 w-10 text-center">N.º</th>
                  <th className="py-2 px-2 border-r border-slate-300 w-20 text-center">Cant.</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-left">
                    Descripción del Repuesto Utilizado
                  </th>
                  <th className="py-2 px-2 border-r border-slate-300 w-28 text-right">
                    Precio Unit. (Q)
                  </th>
                  <th className="py-2 px-2 w-28 text-right">Total (Q)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {filasRepuestos.map((item, index) => (
                  <tr key={index} className="h-8">
                    <td className="px-2 border-r border-slate-300 text-center font-bold text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-2 border-r border-slate-300 text-center font-semibold text-slate-900">
                      {item.cantidad || '\u00A0'}
                    </td>
                    <td className="px-3 border-r border-slate-300 font-semibold text-slate-900">
                      {item.descripcion || '\u00A0'}
                    </td>
                    <td className="px-2 border-r border-slate-300 text-right font-semibold text-slate-900">
                      {item.precioUnitario ? `Q ${item.precioUnitario}` : '\u00A0'}
                    </td>
                    <td className="px-2 text-right font-bold text-slate-900">
                      {item.total ? `Q ${item.total}` : '\u00A0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bloque 3: Costo de Mano de Obra y Fecha del Próximo Mantenimiento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="border border-slate-400 rounded-xl p-3.5 bg-slate-50/50">
            <span className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
              Costo de Mano de Obra (Q)
            </span>
            <div className="mt-3 min-h-[26px] border-b border-slate-500 flex items-end justify-between pb-0.5">
              <span className="text-sm font-black text-slate-700">Q</span>
              <span className="text-sm font-black text-slate-900 flex-1 pl-2">
                {hojaActiva?.costoManoObra || '\u00A0'}
              </span>
            </div>
          </div>

          <div className="border border-slate-400 rounded-xl p-3.5 bg-slate-50/50">
            <span className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
              Fecha del Próximo Mantenimiento
            </span>
            <div className="mt-3 min-h-[26px] border-b border-slate-500 text-sm font-bold text-slate-900 pb-0.5">
              {hojaActiva?.fechaProximoMantenimiento ? (
                <span>{hojaActiva.fechaProximoMantenimiento}</span>
              ) : (
                <span className="text-slate-300 font-normal text-xs tracking-widest">
                  ____ / ____ / ________
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bloque 4: Observaciones (Líneas para escritura a mano) */}
        <div className="border border-slate-400 rounded-xl overflow-hidden mb-6">
          <div className="bg-slate-100 border-b border-slate-400 px-3.5 py-1.5 text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
            3. Observaciones
          </div>
          <div className="p-3.5 space-y-4">
            {[0, 1, 2, 3].map((lineIdx) => (
              <div
                key={lineIdx}
                className="min-h-[20px] border-b border-slate-300 text-xs font-medium text-slate-900 pb-0.5"
              >
                {observacionesLineas[lineIdx] || '\u00A0'}
              </div>
            ))}
          </div>
        </div>

        {/* Bloque 5: Firma del Piloto */}
        <div className="signature-block pt-4 grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
          <div className="text-center">
            <div className="h-14 border-b-2 border-slate-700 mx-4" />
            <p className="text-xs font-black text-slate-800 uppercase tracking-wide mt-1.5">
              Firma del Piloto
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {hojaActiva?.nombrePiloto
                ? `Piloto: ${hojaActiva.nombrePiloto}`
                : 'Nombre y firma de conformidad'}
            </p>
          </div>

          <div className="text-center">
            <div className="h-14 border-b-2 border-slate-400 mx-4" />
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mt-1.5">
              Vo. Bo. / Responsable de Taller
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Control de Flota • Sistema MYG
            </p>
          </div>
        </div>
      </div>

      {/* Historial de Correlativos HC Guardados (Oculto al imprimir) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Historial de Hojas de Campo ({hojas.length})
            </h3>
            <p className="text-xs text-slate-500">
              Cada correlativo HC se guarda automáticamente en la nube para control y reimpresión.
            </p>
          </div>
        </div>

        {hojas.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Generando primer correlativo HC-0001...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Correlativo</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Placa</th>
                  <th className="py-2.5 px-3">Piloto</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hojas.map((h) => {
                  const esActiva = hojaActiva?.id === h.id;
                  return (
                    <tr
                      key={h.id}
                      className={`hover:bg-slate-50 transition ${esActiva ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="py-2.5 px-3 font-mono font-black text-red-600">
                        {h.correlativo}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {h.fecha || 'En blanco (a mano)'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {h.placa || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {h.nombrePiloto || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        {h.estado === 'emitida' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Emitida {h.vecesImpresa ? `(${h.vecesImpresa})` : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                            Lista para imprimir
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setHojaActiva(h)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              esActiva
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{esActiva ? 'Viendo' : 'Cargar'}</span>
                          </button>

                          {currentUser?.rol === 'admin' && (
                            <button
                              type="button"
                              onClick={() => setHojaAEliminar(h)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title={`Eliminar correlativo ${h.correlativo}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmación de Eliminación (Solo Administrador) */}
      <ConfirmDeleteModal
        isOpen={!!hojaAEliminar}
        titulo={`Eliminar Hoja ${hojaAEliminar?.correlativo || ''}`}
        mensaje="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
        isDeleting={eliminando}
        onCancel={() => setHojaAEliminar(null)}
        onConfirm={handleConfirmarEliminar}
      />
    </div>
  );
};
