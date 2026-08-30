import React, { useState } from 'react';
import { Copy, Check, ExternalLink, X, ShieldCheck, Terminal, Server } from 'lucide-react';
import { firebaseConfig, customDatabaseId } from '../firebase';

interface VercelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VercelModal: React.FC<VercelModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const envVars = [
    { key: 'VITE_FIREBASE_API_KEY', val: firebaseConfig.apiKey },
    { key: 'VITE_FIREBASE_AUTH_DOMAIN', val: firebaseConfig.authDomain },
    { key: 'VITE_FIREBASE_PROJECT_ID', val: firebaseConfig.projectId },
    { key: 'VITE_FIREBASE_STORAGE_BUCKET', val: firebaseConfig.storageBucket },
    { key: 'VITE_FIREBASE_MESSAGING_SENDER_ID', val: firebaseConfig.messagingSenderId },
    { key: 'VITE_FIREBASE_APP_ID', val: firebaseConfig.appId },
    { key: 'VITE_FIREBASE_FIRESTORE_DATABASE_ID', val: customDatabaseId },
  ];

  const fullEnvText = envVars.map((e) => `${e.key}=${e.val}`).join('\n');

  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(identifier);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Encabezado */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Instrucciones de Despliegue en Vercel</h2>
              <p className="text-xs text-slate-300">Variables de entorno listas para producción en tiempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-vercel-modal-btn"
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <p className="font-semibold text-emerald-800 text-sm mb-1">
                ¡Firebase Firestore ya está 100% conectado y funcionando en tiempo real!
              </p>
              Para desplegar esta aplicación en <strong>Vercel</strong> o cualquier hosting externo, simplemente añade estas variables en la sección <strong>Environment Variables</strong> del panel de Vercel.
            </div>
          </div>

          {/* Bloque de copia rápida completa */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-blue-600" />
                Copiar Todo en Bloque (.env completo)
              </label>
              <button
                onClick={() => copyToClipboard(fullEnvText, 'all')}
                id="copy-all-env-btn"
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition"
              >
                {copiedKey === 'all' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar todo</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-950 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800 select-all">
              {fullEnvText}
            </pre>
          </div>

          {/* Lista individual de variables */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Variables individuales (Clave / Valor):
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {envVars.map((env) => (
                <div
                  key={env.key}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 transition text-xs"
                >
                  <div className="truncate mr-2 font-mono">
                    <span className="font-semibold text-blue-800">{env.key}</span>
                    <span className="text-slate-400 mx-1">=</span>
                    <span className="text-slate-600 truncate">{env.val}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(env.val, env.key)}
                    id={`copy-${env.key}-btn`}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition shrink-0"
                    title="Copiar valor"
                  >
                    {copiedKey === env.key ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Pasos de despliegue */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="font-semibold text-slate-900 mb-2">Pasos para Vercel:</h4>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600">
              <li>Sube este repositorio a tu cuenta de GitHub o GitLab.</li>
              <li>En Vercel, haz clic en <strong>Add New Project</strong> e importa el repositorio.</li>
              <li>En la sección <strong>Environment Variables</strong>, pega las variables de arriba.</li>
              <li>Haz clic en <strong>Deploy</strong>. Tu app MYG estará en línea sincronizada en tiempo real.</li>
            </ol>
          </div>
        </div>

        {/* Pie de modal */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            id="btn-entendido-vercel"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
          >
            Entendido, cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
