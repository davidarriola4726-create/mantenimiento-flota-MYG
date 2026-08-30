import React, { useState, useMemo } from 'react';
import { Wrench, Plus, Search, Trash2, Edit2, Check, X, Tag, DollarSign, PackageCheck, AlertCircle } from 'lucide-react';
import { RepuestoCatalogo, Servicio } from '../types';
import { saveRepuesto, deleteRepuesto } from '../services/firestoreService';
import { formatQuetzales } from '../utils/alertUtils';

interface RepuestosViewProps {
  repuestos: RepuestoCatalogo[];
  servicios: Servicio[];
}

export const RepuestosView: React.FC<RepuestosViewProps> = ({ repuestos, servicios }) => {
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoRepuesto, setEditandoRepuesto] = useState<RepuestoCatalogo | null>(null);

  // Campos formulario
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState<number | string>('');
  const [categoria, setCategoria] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Filtrado de repuestos
  const repuestosFiltrados = useMemo(() => {
    return repuestos.filter((r) => {
      const term = busqueda.toLowerCase();
      return (
        r.nombre.toLowerCase().includes(term) ||
        (r.categoria && r.categoria.toLowerCase().includes(term)) ||
        (r.codigo && r.codigo.toLowerCase().includes(term))
      );
    });
  }, [repuestos, busqueda]);

  // Cálculo de total gastado en repuestos en todos los servicios
  const totalRepuestosUsadosEnServicios = useMemo(() => {
    let totalQ = 0;
    let cantidadTotalPiezas = 0;
    servicios.forEach((s) => {
      if (s.repuestos && Array.isArray(s.repuestos)) {
        s.repuestos.forEach((item) => {
          totalQ += (item.total || item.precio * item.cantidad || 0);
          cantidadTotalPiezas += item.cantidad || 1;
        });
      }
    });
    return { totalQ, cantidadTotalPiezas };
  }, [servicios]);

  const abrirModalNuevo = () => {
    setEditandoRepuesto(null);
    setNombre('');
    setPrecio('');
    setCategoria('General');
    setCodigo('');
    setError('');
    setModalAbierto(true);
  };

  const abrirModalEditar = (r: RepuestoCatalogo) => {
    setEditandoRepuesto(r);
    setNombre(r.nombre);
    setPrecio(r.precio);
    setCategoria(r.categoria || 'General');
    setCodigo(r.codigo || '');
    setError('');
    setModalAbierto(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numPrecio = Number(precio);
    if (!nombre.trim() || isNaN(numPrecio) || numPrecio < 0) {
      setError('Por favor ingrese un nombre válido y un precio en Quetzales mayor o igual a 0.');
      return;
    }

    setGuardando(true);
    try {
      const repuestoData: RepuestoCatalogo = {
        id: editandoRepuesto ? editandoRepuesto.id : `rep_${Date.now()}`,
        nombre: nombre.trim(),
        precio: numPrecio,
        categoria: categoria.trim() || 'General',
        codigo: codigo.trim() || undefined,
        actualizadoEn: new Date().toISOString(),
      };

      await saveRepuesto(repuestoData);
      setModalAbierto(false);
    } catch (err: any) {
      setError('Error al guardar repuesto: ' + (err.message || 'Error desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: string, nombreRepuesto: string) => {
    if (confirm(`¿Seguro que deseas eliminar "${nombreRepuesto}" del catálogo de repuestos?`)) {
      try {
        await deleteRepuesto(id);
      } catch (err) {
        console.error('Error al eliminar repuesto:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Métricas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Control de Repuestos y Precios (Q)</h2>
            <p className="text-xs text-slate-500">
              Catálogo de piezas, lista de precios en Quetzales y cálculo automático
            </p>
          </div>
        </div>

        <button
          onClick={abrirModalNuevo}
          id="btn-agregar-repuesto"
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Repuesto</span>
        </button>
      </div>

      {/* Resumen Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Repuestos en Catálogo</span>
            <p className="text-2xl font-black text-slate-800 mt-1">{repuestos.length}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invertido en Flota</span>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {formatQuetzales(totalRepuestosUsadosEnServicios.totalQ)}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Piezas Instaladas</span>
            <p className="text-2xl font-black text-purple-700 mt-1">
              {totalRepuestosUsadosEnServicios.cantidadTotalPiezas} <span className="text-xs font-medium text-slate-500">unidades</span>
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Tag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-buscar-repuesto"
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre de repuesto, código o categoría..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tabla Principal de 2 Columnas Requerida */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-sm uppercase tracking-wide text-slate-800">
              Tabla de Precios de Repuestos
            </h3>
            <span className="text-xs text-slate-500 font-mono">({repuestosFiltrados.length} elementos)</span>
          </div>
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Valores en Quetzales de Guatemala (Q)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="tabla-repuestos-myg">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-5 w-2/3 border-r border-slate-200">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-500" />
                    <span>Columna 1: Nombre del Repuesto</span>
                  </div>
                </th>
                <th className="py-3.5 px-5 w-1/3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <DollarSign className="w-4 h-4 text-slate-500" />
                    <span>Columna 2: Precio en Quetzales (Q)</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {repuestosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400 text-sm">
                    No se encontraron repuestos en el catálogo.
                  </td>
                </tr>
              ) : (
                repuestosFiltrados.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-blue-50/50 transition ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    {/* Columna 1: Nombre */}
                    <td className="py-3.5 px-5 border-r border-slate-100 font-semibold text-slate-900">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-900 font-bold">{item.nombre}</span>
                        {item.categoria && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {item.categoria}
                          </span>
                        )}
                      </div>
                      {item.codigo && (
                        <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                          Cód: {item.codigo}
                        </span>
                      )}
                    </td>

                    {/* Columna 2: Precio en Q */}
                    <td className="py-3.5 px-5 text-right font-mono font-black text-base text-emerald-800">
                      {formatQuetzales(item.precio)}
                    </td>

                    {/* Botones de acción */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => abrirModalEditar(item)}
                          id={`btn-edit-repuesto-${item.id}`}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(item.id, item.nombre)}
                          id={`btn-del-repuesto-${item.id}`}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar / Editar Repuesto */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editandoRepuesto ? 'Editar Repuesto' : 'Nuevo Repuesto al Catálogo'}
                  </h3>
                  <p className="text-xs text-slate-300">Valores en Quetzales (Q)</p>
                </div>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre del Repuesto *
                </label>
                <input
                  type="text"
                  id="input-repuesto-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej: Filtro de Aceite Sintético"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Precio en Quetzales (Q) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-500">Q</span>
                  <input
                    type="number"
                    id="input-repuesto-precio"
                    step="0.01"
                    min="0"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Filtros, Frenos, etc."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Código / SKU
                  </label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="FLT-001"
                  />
                </div>
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
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  id="btn-guardar-repuesto"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editandoRepuesto ? 'Actualizar' : 'Guardar Repuesto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
