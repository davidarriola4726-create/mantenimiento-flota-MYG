import React from 'react';
import {
  Truck,
  AlertTriangle,
  Calendar,
  Fuel,
  Wrench,
  FileText,
  FileBarChart,
  Users,
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  badgeAlertasCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  badgeAlertasCount = 0,
}) => {
  const tabs = [
    { id: 'vehiculos', label: 'Vehículos & Fichas', icon: Truck },
    { id: 'alertas', label: 'Alertas Semáforo', icon: AlertTriangle, badge: badgeAlertasCount },
    { id: 'calendario', label: 'Calendario', icon: Calendar },
    { id: 'combustible', label: 'Combustible (Q)', icon: Fuel },
    { id: 'repuestos', label: 'Control Repuestos', icon: Wrench },
    { id: 'hoja_campo', label: 'Hoja de Campo', icon: FileText },
    { id: 'informes', label: 'Informes & Imprimir', icon: FileBarChart },
    { id: 'usuarios', label: 'Usuarios & Claves', icon: Users },
  ];

  return (
    <>
      {/* Barra de navegación superior para Desktop / Tablet */}
      <nav className="bg-white border-b border-slate-200 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2.5 no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  id={`nav-tab-${tab.id}`}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition relative shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>

                  {tab.badge && tab.badge > 0 ? (
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white text-blue-700' : 'bg-red-500 text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Barra de navegación fija inferior para Móviles (Smartphones) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 text-white border-t border-slate-800 flex items-center justify-around px-2 py-2 print:hidden shadow-lg">
        {tabs.slice(0, 5).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-bold relative transition ${
                isActive ? 'text-blue-400 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="truncate max-w-[64px]">{tab.label.split(' ')[0]}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-red-500" />
              ) : null}
            </button>
          );
        })}
      </div>
    </>
  );
};
