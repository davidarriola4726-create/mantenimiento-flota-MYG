import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  title?: string;
  detalle?: string;
  eliminando?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Eliminar Registro',
  detalle,
  eliminando = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 print:hidden">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera del modal */}
        <div className="p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">{title}</h3>
              <p className="text-xs text-red-100 font-medium">Sistema de Control de Vehículos MYG</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={eliminando}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="Cancelar y cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensaje de confirmación obligatorio */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-slate-900 leading-snug">
                ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
              </p>
              {detalle && (
                <p className="text-slate-600 text-xs mt-1 font-medium bg-white/80 p-2 rounded-lg border border-amber-200/60 font-mono">
                  {detalle}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Si confirmas, el registro se eliminará permanentemente de la base de datos del sistema.
          </p>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={eliminando}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={eliminando}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{eliminando ? 'Eliminando...' : 'Sí, Eliminar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
