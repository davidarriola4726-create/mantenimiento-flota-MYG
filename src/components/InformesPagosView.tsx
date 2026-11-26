import React, { useState, useMemo } from 'react';
import {
  FileBarChart,
  Clock,
  CheckCircle2,
  Wrench,
  ShoppingCart,
  Edit3,
  Printer,
  Download,
  Filter,
  X,
  Save,
  DollarSign,
  Banknote,
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import {
  PagoManoObra,
  CompraRepuesto,
  EstadoPagoRegistro,
  Vehiculo,
} from '../types';
import {
  updatePagoManoObra,
  updateCompraRepuesto,
} from '../services/firestoreService';
import { formatQuetzales } from '../utils/alertUtils';

interface InformesPagosViewProps {
  pagosManoObra: PagoManoObra[];
  comprasRepuestos: CompraRepuesto[];
  vehiculos: Vehiculo[];
}

type TipoInformePagos =
  | 'credito_mano_obra'
  | 'credito_repuestos'
  | 'pagados_mano_obra'
  | 'pagados_repuestos';

export const InformesPagosView: React.FC<InformesPagosViewProps> = ({
  pagosManoObra,
  comprasRepuestos,
  vehiculos,
}) => {
  const hoyStr = new Date().toISOString().split('T')[0];

  const [informeActivo, setInformeActivo] = useState<TipoInformePagos>('credito_mano_obra');
  const [filtroMarcaCredito, setFiltroMarcaCredito] = useState<string>('TODAS');
  const [filtroMarcaPagados, setFiltroMarcaPagados] = useState<string>('TODAS');
  const [generandoPDF, setGenerandoPDF] = useState(false);

  // Modales de edición / marcar como pagado
  const [editandoPM, setEditandoPM] = useState<PagoManoObra | null>(null);
  const [editandoPR, setEditandoPR] = useState<CompraRepuesto | null>(null);
  const [confirmandoPagoPM, setConfirmandoPagoPM] = useState<PagoManoObra | null>(null);
  const [confirmandoPagoPR, setConfirmandoPagoPR] = useState<CompraRepuesto | null>(null);
  const [voucherCancelacion, setVoucherCancelacion] = useState('');
  const [fechaCancelacion, setFechaCancelacion] = useState(hoyStr);
  const [guardandoModal, setGuardandoModal] = useState(false);

  // Listas base de cada uno de los 4 informes
  const creditoManoObra = useMemo(
    () => pagosManoObra.filter((p) => p.estadoPago === 'Al crédito'),
    [pagosManoObra]
  );

  const pagadosManoObra = useMemo(
    () => pagosManoObra.filter((p) => p.estadoPago === 'Pagado' || p.estadoPago === 'Efectivo'),
    [pagosManoObra]
  );

  const creditoRepuestosBase = useMemo(
    () => comprasRepuestos.filter((c) => c.estadoPago === 'Al crédito'),
    [comprasRepuestos]
  );

  const pagadosRepuestosBase = useMemo(
    () => comprasRepuestos.filter((c) => c.estadoPago === 'Pagado' || c.estadoPago === 'Efectivo'),
    [comprasRepuestos]
  );

  // Marcas / casas proveedoras disponibles para filtro en informes de repuestos
  const marcasCreditoDisponibles = useMemo(() => {
    const set = new Set<string>();
    creditoRepuestosBase.forEach((c) => {
      if (c.marcaProveedor && c.marcaProveedor.trim()) {
        set.add(c.marcaProveedor.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [creditoRepuestosBase]);

  const marcasPagadosDisponibles = useMemo(() => {
    const set = new Set<string>();
    pagadosRepuestosBase.forEach((c) => {
      if (c.marcaProveedor && c.marcaProveedor.trim()) {
        set.add(c.marcaProveedor.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [pagadosRepuestosBase]);

  const creditoRepuestosFiltrados = useMemo(() => {
    if (filtroMarcaCredito === 'TODAS') return creditoRepuestosBase;
    return creditoRepuestosBase.filter(
      (c) => (c.marcaProveedor || '').trim().toLowerCase() === filtroMarcaCredito.toLowerCase()
    );
  }, [creditoRepuestosBase, filtroMarcaCredito]);

  const pagadosRepuestosFiltrados = useMemo(() => {
    if (filtroMarcaPagados === 'TODAS') return pagadosRepuestosBase;
    return pagadosRepuestosBase.filter(
      (c) => (c.marcaProveedor || '').trim().toLowerCase() === filtroMarcaPagados.toLowerCase()
    );
  }, [pagadosRepuestosBase, filtroMarcaPagados]);

  // Totales de los 4 informes
  const sumaCreditoPM = useMemo(
    () => creditoManoObra.reduce((acc, p) => acc + (Number(p.monto) || 0), 0),
    [creditoManoObra]
  );
  const sumaPagadosPM = useMemo(
    () => pagadosManoObra.reduce((acc, p) => acc + (Number(p.monto) || 0), 0),
    [pagadosManoObra]
  );
  const sumaCreditoPR = useMemo(
    () => creditoRepuestosFiltrados.reduce((acc, c) => acc + (Number(c.monto) || 0), 0),
    [creditoRepuestosFiltrados]
  );
  const sumaPagadosPR = useMemo(
    () => pagadosRepuestosFiltrados.reduce((acc, c) => acc + (Number(c.monto) || 0), 0),
    [pagadosRepuestosFiltrados]
  );

  const esInformeManoObra =
    informeActivo === 'credito_mano_obra' || informeActivo === 'pagados_mano_obra';
  const esInformeCredito =
    informeActivo === 'credito_mano_obra' || informeActivo === 'credito_repuestos';

  const tituloInformeActual = (() => {
    switch (informeActivo) {
      case 'credito_mano_obra':
        return 'Informe 1: Crédito de Mano de Obra';
      case 'credito_repuestos':
        return 'Informe 2: Crédito de Repuestos';
      case 'pagados_mano_obra':
        return 'Informe 3: Pagados de Mano de Obra';
      case 'pagados_repuestos':
        return 'Informe 4: Pagados de Repuestos';
    }
  })();

  const totalActual = (() => {
    switch (informeActivo) {
      case 'credito_mano_obra':
        return sumaCreditoPM;
      case 'credito_repuestos':
        return sumaCreditoPR;
      case 'pagados_mano_obra':
        return sumaPagadosPM;
      case 'pagados_repuestos':
        return sumaPagadosPR;
    }
  })();

  const filtroMarcaActual =
    informeActivo === 'credito_repuestos' ? filtroMarcaCredito : filtroMarcaPagados;

  // Abrir modal rápido para marcar un crédito como pagado
  const abrirConfirmacionPagoPM = (reg: PagoManoObra) => {
    setConfirmandoPagoPM(reg);
    setVoucherCancelacion(reg.voucher || '');
    setFechaCancelacion(hoyStr);
  };

  const abrirConfirmacionPagoPR = (reg: CompraRepuesto) => {
    setConfirmandoPagoPR(reg);
    setVoucherCancelacion(reg.voucher || '');
    setFechaCancelacion(hoyStr);
  };

  const ejecutarMarcarPagadoPM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmandoPagoPM) return;
    setGuardandoModal(true);
    try {
      await updatePagoManoObra({
        ...confirmandoPagoPM,
        estadoPago: 'Pagado',
        voucher: voucherCancelacion.trim(),
        fechaPagoCancelado: fechaCancelacion || hoyStr,
      });
      setConfirmandoPagoPM(null);
    } catch (err) {
      console.error('Error al marcar PM como pagado:', err);
    } finally {
      setGuardandoModal(false);
    }
  };

  const ejecutarMarcarPagadoPR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmandoPagoPR) return;
    setGuardandoModal(true);
    try {
      await updateCompraRepuesto({
        ...confirmandoPagoPR,
        estadoPago: 'Pagado',
        voucher: voucherCancelacion.trim(),
        fechaPagoCancelado: fechaCancelacion || hoyStr,
      });
      setConfirmandoPagoPR(null);
    } catch (err) {
      console.error('Error al marcar PR como pagado:', err);
    } finally {
      setGuardandoModal(false);
    }
  };

  const guardarEdicionPM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editandoPM) return;
    setGuardandoModal(true);
    try {
      await updatePagoManoObra({
        ...editandoPM,
        fechaPagoCancelado:
          editandoPM.estadoPago === 'Al crédito'
            ? ''
            : editandoPM.fechaPagoCancelado || hoyStr,
      });
      setEditandoPM(null);
    } catch (err) {
      console.error('Error al editar PM:', err);
    } finally {
      setGuardandoModal(false);
    }
  };

  const guardarEdicionPR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editandoPR) return;
    setGuardandoModal(true);
    try {
      await updateCompraRepuesto({
        ...editandoPR,
        fechaPagoCancelado:
          editandoPR.estadoPago === 'Al crédito'
            ? ''
            : editandoPR.fechaPagoCancelado || hoyStr,
      });
      setEditandoPR(null);
    } catch (err) {
      console.error('Error al editar PR:', err);
    } finally {
      setGuardandoModal(false);
    }
  };

  const handleDescargarPDF = async () => {
    if (generandoPDF) return;
    setGenerandoPDF(true);
    const nombreArchivo = `${informeActivo}_MYG_${hoyStr}.pdf`;

    try {
      const elemento = document.getElementById('formato-impresion-informe-pagos');
      if (!elemento) throw new Error('No se encontró el contenedor del informe.');

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById('formato-impresion-informe-pagos');
          if (clonedEl) {
            clonedEl.style.width = '940px';
            clonedEl.style.maxWidth = '940px';
            clonedEl.style.borderRadius = '0';
            clonedEl.style.border = 'none';
            clonedEl.style.boxShadow = 'none';
            clonedEl.style.padding = '16px';
          }
          clonedDoc.querySelectorAll('.no-pdf-export').forEach((el) => {
            (el as HTMLElement).style.display = 'none';
          });
        },
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidthMm = pageWidth - margin * 2;
      const contentHeightMm = pageHeight - margin * 2;
      const totalImgHeightMm = (canvas.height * contentWidthMm) / canvas.width;

      if (totalImgHeightMm <= contentHeightMm) {
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidthMm, totalImgHeightMm, undefined, 'FAST');
      } else {
        const pxPerMm = canvas.width / contentWidthMm;
        const pageSliceHeightPx = Math.floor(contentHeightMm * pxPerMm);
        let offsetY = 0;
        let pageIndex = 0;

        while (offsetY < canvas.height) {
          const sliceHeight = Math.min(pageSliceHeightPx, canvas.height - offsetY);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          const ctx = pageCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(
              canvas,
              0,
              offsetY,
              canvas.width,
              sliceHeight,
              0,
              0,
              canvas.width,
              sliceHeight
            );
          }
          const sliceImgData = pageCanvas.toDataURL('image/png');
          const sliceHeightMm = (sliceHeight * contentWidthMm) / canvas.width;
          if (pageIndex > 0) pdf.addPage();
          pdf.addImage(sliceImgData, 'PNG', margin, margin, contentWidthMm, sliceHeightMm, undefined, 'FAST');
          offsetY += sliceHeight;
          pageIndex++;
        }
      }

      pdf.save(nombreArchivo);
    } catch (err) {
      console.error('Error generando PDF de informe pagos, usando respaldo jsPDF:', err);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('SISTEMA DE CONTROL DE VEHICULOS MYG', 14, 16);
      pdf.setFontSize(11);
      pdf.text(tituloInformeActual.toUpperCase(), 14, 23);
      pdf.setFontSize(10);
      pdf.text(`Suma Total: ${formatQuetzales(totalActual)}`, 14, 31);
      pdf.save(nombreArchivo);
    } finally {
      setGenerandoPDF(false);
    }
  };

  const handleExportarCSV = () => {
    const rows: string[][] = [
      ['SISTEMA DE CONTROL DE VEHÍCULOS MYG'],
      [tituloInformeActual],
      [`Generado: ${new Date().toLocaleString('es-GT')}`],
    ];

    if (esInformeManoObra) {
      const lista = informeActivo === 'credito_mano_obra' ? creditoManoObra : pagadosManoObra;
      rows.push(['Correlativo', 'Fecha', 'Tipo Mantenimiento', 'Correlativo HC', 'Placa', 'Modelo', 'Ruta', 'Voucher', 'Estado', 'Monto (Q)']);
      lista.forEach((p) => {
        rows.push([
          p.correlativo,
          p.fecha,
          p.tipoMantenimiento,
          p.correlativoHC || '',
          p.placa,
          p.modeloVehiculo || '',
          p.numeroRuta || '',
          p.voucher || '',
          p.estadoPago,
          String(p.monto || 0),
        ]);
      });
      rows.push(['', '', '', '', '', '', '', '', 'TOTAL (Q)', String(totalActual)]);
    } else {
      const lista =
        informeActivo === 'credito_repuestos'
          ? creditoRepuestosFiltrados
          : pagadosRepuestosFiltrados;
      if (filtroMarcaActual !== 'TODAS') {
        rows.push([`Filtro Marca/Proveedor: ${filtroMarcaActual}`]);
      }
      rows.push(['Correlativo', 'Fecha', 'Repuesto', 'Marca/Proveedor', 'Placa', 'Modelo', 'Ruta', 'Voucher/Factura', 'Estado', 'Monto (Q)']);
      lista.forEach((c) => {
        rows.push([
          c.correlativo,
          c.fecha,
          c.nombreRepuesto,
          c.marcaProveedor,
          c.placa,
          c.modeloVehiculo || '',
          c.numeroRuta || '',
          c.voucher || '',
          c.estadoPago,
          String(c.monto || 0),
        ]);
      });
      rows.push(['', '', '', '', '', '', '', '', 'TOTAL (Q)', String(totalActual)]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${informeActivo}_MYG_${hoyStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const listaManoObraActual =
    informeActivo === 'credito_mano_obra' ? creditoManoObra : pagadosManoObra;
  const listaRepuestosActual =
    informeActivo === 'credito_repuestos'
      ? creditoRepuestosFiltrados
      : pagadosRepuestosFiltrados;

  return (
    <div className="space-y-6">
      {/* Panel Superior de Selección de los 4 Informes Separados (Oculto al imprimir) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-5 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/logo_myg.png"
              alt="Logo Empresa MYG"
              className="h-14 sm:h-16 w-auto max-w-[160px] object-contain rounded-xl border border-slate-200 bg-white p-1 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Informes de Mano de Obra y Repuestos
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                4 informes separados de Crédito y Pagados. Los registros al crédito se pueden editar y marcar como pagados.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportarCSV}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>CSV / Excel</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleDescargarPDF}
              disabled={generandoPDF}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{generandoPDF ? 'Generando PDF...' : 'Descargar PDF'}</span>
            </button>
          </div>
        </div>

        {/* Selector de los 4 Informes Separados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setInformeActivo('credito_mano_obra')}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
              informeActivo === 'credito_mano_obra'
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-200'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-800">
                <Clock className="w-4 h-4 text-amber-600" />
                1) Crédito Mano de Obra
              </span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black">
                {creditoManoObra.length}
              </span>
            </div>
            <p className="text-sm font-black text-slate-900">{formatQuetzales(sumaCreditoPM)}</p>
          </button>

          <button
            type="button"
            onClick={() => setInformeActivo('credito_repuestos')}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
              informeActivo === 'credito_repuestos'
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-200'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-800">
                <ShoppingCart className="w-4 h-4 text-amber-600" />
                2) Crédito Repuestos
              </span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black">
                {creditoRepuestosBase.length}
              </span>
            </div>
            <p className="text-sm font-black text-slate-900">
              {formatQuetzales(
                creditoRepuestosBase.reduce((acc, c) => acc + (Number(c.monto) || 0), 0)
              )}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setInformeActivo('pagados_mano_obra')}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
              informeActivo === 'pagados_mano_obra'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800">
                <Wrench className="w-4 h-4 text-emerald-600" />
                3) Pagados Mano de Obra
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">
                {pagadosManoObra.length}
              </span>
            </div>
            <p className="text-sm font-black text-slate-900">{formatQuetzales(sumaPagadosPM)}</p>
          </button>

          <button
            type="button"
            onClick={() => setInformeActivo('pagados_repuestos')}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
              informeActivo === 'pagados_repuestos'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                4) Pagados Repuestos
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">
                {pagadosRepuestosBase.length}
              </span>
            </div>
            <p className="text-sm font-black text-slate-900">
              {formatQuetzales(
                pagadosRepuestosBase.reduce((acc, c) => acc + (Number(c.monto) || 0), 0)
              )}
            </p>
          </button>
        </div>

        {/* Filtro por Marca / Proveedor (para informes 2 y 4 de Repuestos) */}
        {!esInformeManoObra && (
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-black text-slate-700">
              <Filter className="w-4 h-4 text-blue-600" />
              <span>Filtrar por Marca o Casa Proveedora:</span>
            </div>

            {informeActivo === 'credito_repuestos' ? (
              <select
                value={filtroMarcaCredito}
                onChange={(e) => setFiltroMarcaCredito(e.target.value)}
                className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none sm:w-72"
              >
                <option value="TODAS">Todas las marcas / proveedores</option>
                {marcasCreditoDisponibles.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={filtroMarcaPagados}
                onChange={(e) => setFiltroMarcaPagados(e.target.value)}
                className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none sm:w-72"
              >
                <option value="TODAS">Todas las marcas / proveedores</option>
                {marcasPagadosDisponibles.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* ============================================================
          DOCUMENTO DEL INFORME ACTIVO (Con Logo, Registros y Suma Total)
         ============================================================ */}
      <div
        id="formato-impresion-informe-pagos"
        className="printable-document printable-area bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8"
      >
        {/* Encabezado Oficial del Informe con Logo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-900 pb-4 mb-5">
          <div className="flex items-center gap-4">
            <img
              src="/logo_myg.png"
              alt="Logo Empresa MYG"
              className="h-16 sm:h-20 w-auto max-w-[180px] object-contain rounded-xl border border-slate-200 bg-white p-1 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                Sistema de Control de Vehículos MYG
              </h1>
              <p className="text-xs sm:text-sm font-black text-blue-700 uppercase mt-0.5">
                {tituloInformeActual}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Fecha de emisión: {new Date().toLocaleDateString('es-GT')}
                {!esInformeManoObra && filtroMarcaActual !== 'TODAS'
                  ? ` • Marca/Proveedor: ${filtroMarcaActual}`
                  : ''}
              </p>
            </div>
          </div>

          <div
            className={`rounded-xl px-4 py-2.5 border text-right shrink-0 ${
              esInformeCredito
                ? 'bg-amber-50 border-amber-300'
                : 'bg-emerald-50 border-emerald-300'
            }`}
          >
            <span
              className={`block text-[10px] font-extrabold uppercase tracking-wider ${
                esInformeCredito ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              Suma Total del Informe
            </span>
            <span className="text-xl font-black text-slate-900">
              {formatQuetzales(totalActual)}
            </span>
          </div>
        </div>

        {/* Tabla del Informe */}
        {esInformeManoObra ? (
          listaManoObraActual.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No hay registros en {tituloInformeActual}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-extrabold uppercase">
                    <th className="py-2.5 px-3">Correlativo</th>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Mantenimiento</th>
                    <th className="py-2.5 px-3">HC</th>
                    <th className="py-2.5 px-3">Placa / Modelo</th>
                    <th className="py-2.5 px-3">Ruta</th>
                    <th className="py-2.5 px-3">Voucher</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Monto (Q)</th>
                    <th className="py-2.5 px-3 text-right print:hidden no-pdf-export">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {listaManoObraActual.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-black text-blue-700">
                        {p.correlativo}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{p.fecha}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {p.tipoMantenimiento}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-red-600">
                        {p.correlativoHC || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-black text-slate-900 block">{p.placa}</span>
                        <span className="text-[10px] text-slate-500">{p.modeloVehiculo || '—'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{p.numeroRuta || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.voucher || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
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
                      <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden no-pdf-export">
                        <div className="inline-flex items-center gap-1">
                          {p.estadoPago === 'Al crédito' && (
                            <button
                              type="button"
                              onClick={() => abrirConfirmacionPagoPM(p)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              Marcar Pagado
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditandoPM({ ...p })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Editar registro"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-900 font-black text-slate-900">
                    <td colSpan={8} className="py-3 px-3 text-right uppercase text-xs">
                      Suma Total ({listaManoObraActual.length} registros):
                    </td>
                    <td className="py-3 px-3 text-right text-sm whitespace-nowrap">
                      {formatQuetzales(totalActual)}
                    </td>
                    <td className="print:hidden no-pdf-export" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        ) : listaRepuestosActual.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No hay registros en {tituloInformeActual}
            {filtroMarcaActual !== 'TODAS' ? ` para "${filtroMarcaActual}"` : ''}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-extrabold uppercase">
                  <th className="py-2.5 px-3">Correlativo</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Repuesto</th>
                  <th className="py-2.5 px-3">Marca / Proveedor</th>
                  <th className="py-2.5 px-3">Placa / Modelo</th>
                  <th className="py-2.5 px-3">Ruta</th>
                  <th className="py-2.5 px-3">Voucher / Factura</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Monto (Q)</th>
                  <th className="py-2.5 px-3 text-right print:hidden no-pdf-export">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {listaRepuestosActual.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-black text-blue-700">
                      {c.correlativo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{c.fecha}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{c.nombreRepuesto}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{c.marcaProveedor}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-black text-slate-900 block">{c.placa}</span>
                      <span className="text-[10px] text-slate-500">{c.modeloVehiculo || '—'}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{c.numeroRuta || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-600">{c.voucher || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
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
                    <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden no-pdf-export">
                      <div className="inline-flex items-center gap-1">
                        {c.estadoPago === 'Al crédito' && (
                          <button
                            type="button"
                            onClick={() => abrirConfirmacionPagoPR(c)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                          >
                            Marcar Pagado
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditandoPR({ ...c })}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Editar registro"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-900 font-black text-slate-900">
                  <td colSpan={8} className="py-3 px-3 text-right uppercase text-xs">
                    Suma Total ({listaRepuestosActual.length} registros):
                  </td>
                  <td className="py-3 px-3 text-right text-sm whitespace-nowrap">
                    {formatQuetzales(totalActual)}
                  </td>
                  <td className="print:hidden no-pdf-export" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Marcar Crédito de Mano de Obra como Pagado */}
      {confirmandoPagoPM && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <form
            onSubmit={ejecutarMarcarPagadoPM}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                Marcar {confirmandoPagoPM.correlativo} como Pagado
              </h3>
              <button
                type="button"
                onClick={() => setConfirmandoPagoPM(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Placa <strong>{confirmandoPagoPM.placa}</strong> • Monto:{' '}
              <strong>{formatQuetzales(confirmandoPagoPM.monto)}</strong>
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Voucher / Recibo de Pago
              </label>
              <input
                type="text"
                value={voucherCancelacion}
                onChange={(e) => setVoucherCancelacion(e.target.value)}
                placeholder="Ingrese N.º de voucher o transacción"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fecha de Cancelación
              </label>
              <input
                type="date"
                value={fechaCancelacion}
                onChange={(e) => setFechaCancelacion(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmandoPagoPM(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{guardandoModal ? 'Guardando...' : 'Confirmar Pago'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Marcar Crédito de Repuesto como Pagado */}
      {confirmandoPagoPR && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <form
            onSubmit={ejecutarMarcarPagadoPR}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                Marcar {confirmandoPagoPR.correlativo} como Pagado
              </h3>
              <button
                type="button"
                onClick={() => setConfirmandoPagoPR(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              {confirmandoPagoPR.nombreRepuesto} ({confirmandoPagoPR.marcaProveedor}) •{' '}
              <strong>{formatQuetzales(confirmandoPagoPR.monto)}</strong>
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Voucher / Factura / Transacción de Cancelación
              </label>
              <input
                type="text"
                value={voucherCancelacion}
                onChange={(e) => setVoucherCancelacion(e.target.value)}
                placeholder="Ingrese N.º de factura, voucher o transacción"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fecha de Cancelación
              </label>
              <input
                type="date"
                value={fechaCancelacion}
                onChange={(e) => setFechaCancelacion(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmandoPagoPR(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{guardandoModal ? 'Guardando...' : 'Confirmar Pago'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Editar Registro de Mano de Obra */}
      {editandoPM && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <form
            onSubmit={guardarEdicionPM}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                Editar Registro {editandoPM.correlativo}
              </h3>
              <button
                type="button"
                onClick={() => setEditandoPM(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={editandoPM.fecha}
                  onChange={(e) => setEditandoPM({ ...editandoPM, fecha: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Monto (Q)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editandoPM.monto}
                  onChange={(e) =>
                    setEditandoPM({ ...editandoPM, monto: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Mantenimiento
                </label>
                <input
                  type="text"
                  value={editandoPM.tipoMantenimiento}
                  onChange={(e) =>
                    setEditandoPM({ ...editandoPM, tipoMantenimiento: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Correlativo HC</label>
                <input
                  type="text"
                  value={editandoPM.correlativoHC}
                  onChange={(e) =>
                    setEditandoPM({ ...editandoPM, correlativoHC: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Placa</label>
                <input
                  type="text"
                  list="edit-placas-pm"
                  value={editandoPM.placa}
                  onChange={(e) =>
                    setEditandoPM({ ...editandoPM, placa: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase"
                />
                <datalist id="edit-placas-pm">
                  {vehiculos.map((v) => (
                    <option key={v.placa} value={v.placa} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Modelo del Vehículo
                </label>
                <input
                  type="text"
                  value={editandoPM.modeloVehiculo}
                  onChange={(e) =>
                    setEditandoPM({ ...editandoPM, modeloVehiculo: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Número de Ruta</label>
                <input
                  type="text"
                  value={editandoPM.numeroRuta}
                  onChange={(e) => setEditandoPM({ ...editandoPM, numeroRuta: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Voucher / Transacción
                </label>
                <input
                  type="text"
                  value={editandoPM.voucher}
                  onChange={(e) => setEditandoPM({ ...editandoPM, voucher: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Estado de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Efectivo', 'Pagado', 'Al crédito'] as EstadoPagoRegistro[]).map((est) => (
                    <button
                      key={est}
                      type="button"
                      onClick={() => setEditandoPM({ ...editandoPM, estadoPago: est })}
                      className={`py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                        editandoPM.estadoPago === est
                          ? est === 'Al crédito'
                            ? 'bg-amber-500 text-white border-amber-600'
                            : est === 'Efectivo'
                              ? 'bg-blue-600 text-white border-blue-700'
                              : 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {est}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditandoPM(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{guardandoModal ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Editar Registro de Compra de Repuestos */}
      {editandoPR && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <form
            onSubmit={guardarEdicionPR}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                Editar Registro {editandoPR.correlativo}
              </h3>
              <button
                type="button"
                onClick={() => setEditandoPR(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={editandoPR.fecha}
                  onChange={(e) => setEditandoPR({ ...editandoPR, fecha: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Monto (Q)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editandoPR.monto}
                  onChange={(e) =>
                    setEditandoPR({ ...editandoPR, monto: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Repuesto
                </label>
                <input
                  type="text"
                  value={editandoPR.nombreRepuesto}
                  onChange={(e) =>
                    setEditandoPR({ ...editandoPR, nombreRepuesto: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Marca / Casa Proveedora
                </label>
                <input
                  type="text"
                  value={editandoPR.marcaProveedor}
                  onChange={(e) =>
                    setEditandoPR({ ...editandoPR, marcaProveedor: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Placa</label>
                <input
                  type="text"
                  list="edit-placas-pr"
                  value={editandoPR.placa}
                  onChange={(e) =>
                    setEditandoPR({ ...editandoPR, placa: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase"
                />
                <datalist id="edit-placas-pr">
                  {vehiculos.map((v) => (
                    <option key={v.placa} value={v.placa} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Modelo del Vehículo
                </label>
                <input
                  type="text"
                  value={editandoPR.modeloVehiculo}
                  onChange={(e) =>
                    setEditandoPR({ ...editandoPR, modeloVehiculo: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Número de Ruta</label>
                <input
                  type="text"
                  value={editandoPR.numeroRuta}
                  onChange={(e) => setEditandoPR({ ...editandoPR, numeroRuta: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Voucher / Factura / Transacción
                </label>
                <input
                  type="text"
                  value={editandoPR.voucher}
                  onChange={(e) => setEditandoPR({ ...editandoPR, voucher: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Estado de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Efectivo', 'Pagado', 'Al crédito'] as EstadoPagoRegistro[]).map((est) => (
                    <button
                      key={est}
                      type="button"
                      onClick={() => setEditandoPR({ ...editandoPR, estadoPago: est })}
                      className={`py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                        editandoPR.estadoPago === est
                          ? est === 'Al crédito'
                            ? 'bg-amber-500 text-white border-amber-600'
                            : est === 'Efectivo'
                              ? 'bg-blue-600 text-white border-blue-700'
                              : 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {est}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditandoPR(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{guardandoModal ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
