import React, { useState, useEffect, useMemo } from 'react';
import {
  subscribeVehiculos,
  subscribeServicios,
  subscribeCombustible,
  subscribeRepuestos,
  subscribeUsuarios,
  subscribeHojasTrabajo,
  inicializarDatosPredeterminados,
} from './services/firestoreService';
import {
  Vehiculo,
  Servicio,
  RegistroCombustible,
  RepuestoCatalogo,
  Usuario,
  HojaTrabajo,
} from './types';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { VehiculosView } from './components/VehiculosView';
import { ControlMantenimientosView } from './components/ControlMantenimientosView';
import { AlertasView } from './components/AlertasView';
import { CalendarioView } from './components/CalendarioView';
import { CombustibleView } from './components/CombustibleView';
import { RepuestosView } from './components/RepuestosView';
import { HojaTrabajoView } from './components/HojaTrabajoView';
import { InformesView } from './components/InformesView';
import { UsuariosView } from './components/UsuariosView';
import { LoginModal } from './components/LoginModal';
import { CambiarPasswordModal } from './components/CambiarPasswordModal';
import { VercelModal } from './components/VercelModal';
import { calcularAlertaVehiculo } from './utils/alertUtils';

export default function App() {
  // Estados de datos sincronizados en tiempo real
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [combustibles, setCombustibles] = useState<RegistroCombustible[]>([]);
  const [repuestos, setRepuestos] = useState<RepuestoCatalogo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [hojasTrabajo, setHojasTrabajo] = useState<HojaTrabajo[]>([]);

  // Estado de sesión de usuario
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('myg_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Pestaña activa
  const [activeTab, setActiveTab] = useState<string>('vehiculos');

  // Modales
  const [cambiarPasswordAbierto, setCambiarPasswordAbierto] = useState(false);
  const [vercelModalAbierto, setVercelModalAbierto] = useState(false);

  // Inicialización y suscripciones Firestore en tiempo real
  useEffect(() => {
    // Inicializar datos base si está vacío
    inicializarDatosPredeterminados();

    // 1. Vehículos
    const unsubVehiculos = subscribeVehiculos((data) => {
      setVehiculos(data);
    });

    // 2. Servicios
    const unsubServicios = subscribeServicios((data) => {
      setServicios(data);
    });

    // 3. Combustibles
    const unsubCombustible = subscribeCombustible((data) => {
      setCombustibles(data);
    });

    // 4. Repuestos
    const unsubRepuestos = subscribeRepuestos((data) => {
      setRepuestos(data);
    });

    // 5. Usuarios
    const unsubUsuarios = subscribeUsuarios((data) => {
      setUsuarios(data);
      // Actualizar sesión actual si el usuario cambió en Firestore
      const saved = localStorage.getItem('myg_user_session');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const updated = data.find((u) => u.numeroUsuario === parsed.numeroUsuario);
          if (updated) {
            setCurrentUser(updated);
            localStorage.setItem('myg_user_session', JSON.stringify(updated));
          }
        } catch {
          // ignore
        }
      }
    });

    // 6. Hojas de Trabajo
    const unsubHojas = subscribeHojasTrabajo((data) => {
      setHojasTrabajo(data);
    });

    return () => {
      unsubVehiculos();
      unsubServicios();
      unsubCombustible();
      unsubRepuestos();
      unsubUsuarios();
      unsubHojas();
    };
  }, []);

  // Manejo de inicio y cierre de sesión
  const handleLogin = (user: Usuario) => {
    setCurrentUser(user);
    localStorage.setItem('myg_user_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('myg_user_session');
  };

  const handlePasswordChanged = (newPass: string) => {
    if (currentUser) {
      const updated = { ...currentUser, password: newPass };
      setCurrentUser(updated);
      localStorage.setItem('myg_user_session', JSON.stringify(updated));
    }
  };

  // Contadores de alertas para badges
  const contadoresAlertas = useMemo(() => {
    let verdes = 0, amarillos = 0, rojos = 0;
    vehiculos.forEach((v) => {
      const al = calcularAlertaVehiculo(v);
      if (al.estado === 'verde') verdes++;
      else if (al.estado === 'amarillo') amarillos++;
      else if (al.estado === 'rojo') rojos++;
    });
    return { verdes, amarillos, rojos, total: vehiculos.length };
  }, [vehiculos]);

  // Transiciones rápidas entre vistas
  const handleProgramarServicio = (placa: string) => {
    setActiveTab('control_mantenimientos');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Barra de Encabezado */}
      <Header
        currentUser={currentUser}
        contadoresAlertas={contadoresAlertas}
        onOpenCambiarPassword={() => setCambiarPasswordAbierto(true)}
        onOpenVercelModal={() => setVercelModalAbierto(true)}
        onLogout={handleLogout}
        onSelectTab={setActiveTab}
      />

      {/* Barra de Navegación */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        badgeAlertasCount={contadoresAlertas.rojos + contadoresAlertas.amarillos}
      />

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
        {activeTab === 'vehiculos' && (
          <VehiculosView
            vehiculos={vehiculos}
            servicios={servicios}
            combustibles={combustibles}
            onCrearServicioParaPlaca={(placa) => {
              setActiveTab('control_mantenimientos');
            }}
            onCrearHojaCampoParaPlaca={handleProgramarServicio}
          />
        )}

        {activeTab === 'control_mantenimientos' && (
          <ControlMantenimientosView
            vehiculos={vehiculos}
            servicios={servicios}
            repuestosCatalogo={repuestos}
            onSeleccionarPlaca={(placa) => {
              // Si se requiere ver la ficha del vehiculo
              setActiveTab('vehiculos');
            }}
          />
        )}

        {activeTab === 'alertas' && (
          <AlertasView
            vehiculos={vehiculos}
            onProgramarServicio={handleProgramarServicio}
          />
        )}

        {activeTab === 'calendario' && (
          <CalendarioView
            vehiculos={vehiculos}
            servicios={servicios}
            repuestosCatalogo={repuestos}
            onProgramarServicio={handleProgramarServicio}
            onVerVehiculo={(placa) => {
              setActiveTab('vehiculos');
            }}
          />
        )}

        {activeTab === 'combustible' && (
          <CombustibleView
            combustibles={combustibles}
            vehiculos={vehiculos}
          />
        )}

        {activeTab === 'repuestos' && (
          <RepuestosView
            repuestos={repuestos}
            servicios={servicios}
          />
        )}

        {activeTab === 'hoja_campo' && (
          <HojaTrabajoView
            hojas={hojasTrabajo}
            vehiculos={vehiculos}
            repuestosCatalogo={repuestos}
            onVerVehiculo={() => setActiveTab('vehiculos')}
          />
        )}

        {activeTab === 'informes' && (
          <InformesView
            vehiculos={vehiculos}
            servicios={servicios}
            combustibles={combustibles}
            hojasTrabajo={hojasTrabajo}
          />
        )}

        {activeTab === 'usuarios' && currentUser && (
          <UsuariosView
            usuarios={usuarios}
            currentUser={currentUser}
            onOpenCambiarPassword={() => setCambiarPasswordAbierto(true)}
          />
        )}
      </main>

      {/* Modal de Inicio de Sesión si no hay sesión activa */}
      <LoginModal
        isOpen={!currentUser}
        usuarios={usuarios}
        onLogin={handleLogin}
      />

      {/* Modal para Cambiar Contraseña */}
      {currentUser && (
        <CambiarPasswordModal
          isOpen={cambiarPasswordAbierto}
          usuario={currentUser}
          onClose={() => setCambiarPasswordAbierto(false)}
          onSuccess={handlePasswordChanged}
        />
      )}

      {/* Modal de Despliegue en Vercel */}
      <VercelModal
        isOpen={vercelModalAbierto}
        onClose={() => setVercelModalAbierto(false)}
      />
    </div>
  );
}
