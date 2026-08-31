import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Vehiculo,
  Servicio,
  RegistroCombustible,
  RepuestoCatalogo,
  Usuario,
  HojaTrabajo,
} from '../types';

// Nombres de colecciones requeridas
export const COLLECTIONS = {
  VEHICULOS: 'vehiculos',
  SERVICIOS: 'servicios',
  COMBUSTIBLE: 'combustible',
  REPUESTOS: 'repuestos',
  USUARIOS: 'usuarios',
  HOJAS_TRABAJO: 'hojas_trabajo',
};

// ============================================
// 1. VEHÍCULOS (Por número de placa)
// ============================================
export function subscribeVehiculos(callback: (vehiculos: Vehiculo[]) => void) {
  const q = collection(db, COLLECTIONS.VEHICULOS);
  return onSnapshot(q, (snapshot) => {
    const vehiculos: Vehiculo[] = [];
    snapshot.forEach((docSnap) => {
      vehiculos.push(docSnap.data() as Vehiculo);
    });
    // Ordenar por placa
    vehiculos.sort((a, b) => a.placa.localeCompare(b.placa));
    callback(vehiculos);
  }, (error) => {
    console.error('Error al escuchar vehiculos en tiempo real:', error);
  });
}

export async function saveVehiculo(vehiculo: Vehiculo): Promise<void> {
  const cleanPlaca = vehiculo.placa.trim().toUpperCase();
  const docRef = doc(db, COLLECTIONS.VEHICULOS, cleanPlaca);
  const dataToSave: Vehiculo = {
    ...vehiculo,
    placa: cleanPlaca,
    actualizadoEn: new Date().toISOString(),
  };
  await setDoc(docRef, dataToSave, { merge: true });
}

export async function deleteVehiculo(placa: string): Promise<void> {
  const cleanPlaca = placa.trim().toUpperCase();
  await deleteDoc(doc(db, COLLECTIONS.VEHICULOS, cleanPlaca));
}

// ============================================
// 2. SERVICIOS (Historial de Mantenimiento)
// ============================================
export function subscribeServicios(callback: (servicios: Servicio[]) => void) {
  const q = collection(db, COLLECTIONS.SERVICIOS);
  return onSnapshot(q, (snapshot) => {
    const servicios: Servicio[] = [];
    snapshot.forEach((docSnap) => {
      servicios.push({ id: docSnap.id, ...docSnap.data() } as Servicio);
    });
    servicios.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    callback(servicios);
  }, (error) => {
    console.error('Error al escuchar servicios en tiempo real:', error);
  });
}

export async function saveServicio(servicio: Servicio): Promise<void> {
  const docId = servicio.id || `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, COLLECTIONS.SERVICIOS, docId);
  const dataToSave = {
    ...servicio,
    id: docId,
    placa: servicio.placa.trim().toUpperCase(),
  };
  await setDoc(docRef, dataToSave, { merge: true });

  // Actualizar también el kilometraje del vehículo si este servicio tiene mayor kilometraje
  try {
    const vehiculoRef = doc(db, COLLECTIONS.VEHICULOS, servicio.placa.trim().toUpperCase());
    const vehiculoUpdates: Partial<Vehiculo> = {
      actualizadoEn: new Date().toISOString(),
    };
    if (servicio.proximaFecha) {
      vehiculoUpdates.proximaFechaServicio = servicio.proximaFecha;
    }
    if (servicio.proximoKm) {
      vehiculoUpdates.proximoKmServicio = servicio.proximoKm;
    }
    if (servicio.kilometraje) {
      vehiculoUpdates.kilometraje = servicio.kilometraje;
    }
    await setDoc(vehiculoRef, vehiculoUpdates, { merge: true });
  } catch (err) {
    console.error('Error actualizando vehículo tras servicio:', err);
  }
}

export async function deleteServicio(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.SERVICIOS, id));
}

// ============================================
// 3. COMBUSTIBLE (Registros Semanales en Q)
// ============================================
export function subscribeCombustible(callback: (registros: RegistroCombustible[]) => void) {
  const q = collection(db, COLLECTIONS.COMBUSTIBLE);
  return onSnapshot(q, (snapshot) => {
    const registros: RegistroCombustible[] = [];
    snapshot.forEach((docSnap) => {
      registros.push({ id: docSnap.id, ...docSnap.data() } as RegistroCombustible);
    });
    registros.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    callback(registros);
  }, (error) => {
    console.error('Error al escuchar combustible en tiempo real:', error);
  });
}

export async function saveCombustible(registro: RegistroCombustible): Promise<void> {
  const docId = registro.id || `comb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, COLLECTIONS.COMBUSTIBLE, docId);
  const dataToSave = {
    ...registro,
    id: docId,
    placa: registro.placa.trim().toUpperCase(),
  };
  await setDoc(docRef, dataToSave, { merge: true });
}

export async function deleteCombustible(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.COMBUSTIBLE, id));
}

// ============================================
// 4. REPUESTOS (Catálogo y Precios en Quetzales Q)
// ============================================
export function subscribeRepuestos(callback: (repuestos: RepuestoCatalogo[]) => void) {
  const q = collection(db, COLLECTIONS.REPUESTOS);
  return onSnapshot(q, (snapshot) => {
    const repuestos: RepuestoCatalogo[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      repuestos.push({
        ...data,
        id: docSnap.id,
      } as RepuestoCatalogo);
    });
    repuestos.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    callback(repuestos);
  }, (error) => {
    console.error('Error al escuchar repuestos en tiempo real:', error);
  });
}

export async function getRepuestosDirectly(): Promise<RepuestoCatalogo[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.REPUESTOS));
  const repuestos: RepuestoCatalogo[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    repuestos.push({
      ...data,
      id: docSnap.id,
    } as RepuestoCatalogo);
  });
  repuestos.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  return repuestos;
}

export async function saveRepuesto(repuesto: RepuestoCatalogo): Promise<void> {
  const docId = repuesto.id && repuesto.id.trim()
    ? repuesto.id.trim()
    : `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, COLLECTIONS.REPUESTOS, docId);
  const dataToSave = {
    ...repuesto,
    id: docId,
    actualizadoEn: new Date().toISOString(),
  };
  await setDoc(docRef, dataToSave, { merge: true });
}

export async function deleteRepuesto(id: string): Promise<void> {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new Error('El ID del documento de repuesto es requerido y no puede ser nulo o vacío.');
  }
  const cleanId = id.trim();
  const docRef = doc(db, COLLECTIONS.REPUESTOS, cleanId);
  await deleteDoc(docRef);
}

// ============================================
// 5. HOJAS DE TRABAJO EN CAMPO
// ============================================
export function subscribeHojasTrabajo(callback: (hojas: HojaTrabajo[]) => void) {
  const q = collection(db, COLLECTIONS.HOJAS_TRABAJO);
  return onSnapshot(q, (snapshot) => {
    const hojas: HojaTrabajo[] = [];
    snapshot.forEach((docSnap) => {
      hojas.push({ id: docSnap.id, ...docSnap.data() } as HojaTrabajo);
    });
    hojas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    callback(hojas);
  }, (error) => {
    console.error('Error al escuchar hojas de trabajo en tiempo real:', error);
  });
}

export async function saveHojaTrabajo(hoja: HojaTrabajo): Promise<void> {
  const docId = hoja.id || `ht_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, COLLECTIONS.HOJAS_TRABAJO, docId);
  const dataToSave = {
    ...hoja,
    id: docId,
    placa: hoja.placa.trim().toUpperCase(),
  };
  await setDoc(docRef, dataToSave, { merge: true });
}

export async function deleteHojaTrabajo(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.HOJAS_TRABAJO, id));
}

// ============================================
// 6. USUARIOS Y CONTRASEÑAS
// ============================================
export function subscribeUsuarios(callback: (usuarios: Usuario[]) => void) {
  const q = collection(db, COLLECTIONS.USUARIOS);
  return onSnapshot(q, (snapshot) => {
    const usuarios: Usuario[] = [];
    snapshot.forEach((docSnap) => {
      usuarios.push({ id: docSnap.id, ...docSnap.data() } as Usuario);
    });
    callback(usuarios);
  }, (error) => {
    console.error('Error al escuchar usuarios en tiempo real:', error);
  });
}

export async function saveUsuario(usuario: Usuario): Promise<void> {
  const cleanUser = usuario.numeroUsuario.trim().toUpperCase();
  const docRef = doc(db, COLLECTIONS.USUARIOS, cleanUser);
  const dataToSave = {
    ...usuario,
    id: cleanUser,
    numeroUsuario: cleanUser,
  };
  await setDoc(docRef, dataToSave, { merge: true });
}

export async function cambiarPasswordUsuario(numeroUsuario: string, nuevaPassword: string): Promise<void> {
  const cleanUser = numeroUsuario.trim().toUpperCase();
  const docRef = doc(db, COLLECTIONS.USUARIOS, cleanUser);
  await setDoc(docRef, { password: nuevaPassword }, { merge: true });
}

// ============================================
// 7. INICIALIZACIÓN AUTOMÁTICA DE DATOS (SEED)
// ============================================
export async function inicializarDatosPredeterminados(): Promise<void> {
  try {
    // Verificar si el sistema ya fue inicializado previamente para evitar reinsertar registros borrados
    const configRef = doc(db, '_config', 'seed_completed');
    const configSnap = await getDoc(configRef);
    if (configSnap.exists()) {
      return;
    }

    // 1. Usuarios iniciales si no existen
    const usersSnap = await getDocs(collection(db, COLLECTIONS.USUARIOS));
    if (usersSnap.empty) {
      const usuariosIniciales: Usuario[] = [
        {
          id: 'ADMIN01',
          numeroUsuario: 'ADMIN01',
          nombre: 'Administrador General MYG',
          password: 'admin',
          rol: 'admin',
          creadoEn: new Date().toISOString(),
        },
        {
          id: 'TEC01',
          numeroUsuario: 'TEC01',
          nombre: 'Carlos Ramos - Jefe de Taller',
          password: '123',
          rol: 'tecnico',
          creadoEn: new Date().toISOString(),
        },
        {
          id: 'PILOTO01',
          numeroUsuario: 'PILOTO01',
          nombre: 'Juan Pérez - Piloto Flota',
          password: '123',
          rol: 'piloto',
          creadoEn: new Date().toISOString(),
        },
      ];
      for (const u of usuariosIniciales) {
        await setDoc(doc(db, COLLECTIONS.USUARIOS, u.numeroUsuario), u);
      }
    }

    // 2. Repuestos de catálogo si está vacío (sólo en primer despliegue)
    const repuestosSnap = await getDocs(collection(db, COLLECTIONS.REPUESTOS));
    if (repuestosSnap.empty) {
      const repuestosIniciales: RepuestoCatalogo[] = [
        { id: 'rep_1', nombre: 'Filtro de Aceite Sintético', precio: 120.00, categoria: 'Filtros', codigo: 'FLT-001', actualizadoEn: new Date().toISOString() },
        { id: 'rep_2', nombre: 'Aceite 15W-40 Galón Premium', precio: 280.00, categoria: 'Aceites', codigo: 'OIL-1540', actualizadoEn: new Date().toISOString() },
        { id: 'rep_3', nombre: 'Filtro de Aire Motor', precio: 180.00, categoria: 'Filtros', codigo: 'AIR-002', actualizadoEn: new Date().toISOString() },
        { id: 'rep_4', nombre: 'Filtro de Combustible Diesel', precio: 150.00, categoria: 'Filtros', codigo: 'DSL-003', actualizadoEn: new Date().toISOString() },
        { id: 'rep_5', nombre: 'Pastillas de Freno Delanteras (Juego)', precio: 450.00, categoria: 'Frenos', codigo: 'BRK-FRN', actualizadoEn: new Date().toISOString() },
        { id: 'rep_6', nombre: 'Zapatas de Freno Traseras', precio: 380.00, categoria: 'Frenos', codigo: 'BRK-TRS', actualizadoEn: new Date().toISOString() },
        { id: 'rep_7', nombre: 'Líquido de Frenos DOT 4', precio: 65.00, categoria: 'Fluidos', codigo: 'FL-DOT4', actualizadoEn: new Date().toISOString() },
        { id: 'rep_8', nombre: 'Refrigerante / Coolant Galón 50/50', precio: 110.00, categoria: 'Fluidos', codigo: 'COOL-50', actualizadoEn: new Date().toISOString() },
        { id: 'rep_9', nombre: 'Bujías de Iridio (Set de 4)', precio: 320.00, categoria: 'Encendido', codigo: 'SPK-IR4', actualizadoEn: new Date().toISOString() },
        { id: 'rep_10', nombre: 'Batería 12V 13 Placas Pesada', precio: 850.00, categoria: 'Eléctrico', codigo: 'BAT-13P', actualizadoEn: new Date().toISOString() },
        { id: 'rep_11', nombre: 'Faja de Alternador y Accesorios', precio: 195.00, categoria: 'Motor', codigo: 'BLT-ALT', actualizadoEn: new Date().toISOString() },
        { id: 'rep_12', nombre: 'Amortiguador Delantero Reforzado', precio: 620.00, categoria: 'Suspensión', codigo: 'SUS-DEL', actualizadoEn: new Date().toISOString() },
      ];
      for (const r of repuestosIniciales) {
        await setDoc(doc(db, COLLECTIONS.REPUESTOS, r.id), r);
      }
    }

    // 3. Vehículos iniciales con estados de prueba (verde, amarillo, rojo) si está vacío
    const vehiculosSnap = await getDocs(collection(db, COLLECTIONS.VEHICULOS));
    if (vehiculosSnap.empty) {
      const hoy = new Date();
      const fechaVerde = new Date(hoy.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const fechaAmarilla = new Date(hoy.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const fechaRoja = new Date(hoy.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const vehiculosIniciales: Vehiculo[] = [
        {
          placa: 'P-102MYG',
          piloto: 'Juan Pérez',
          tipo: 'Pickup',
          marcaModelo: 'Toyota Hilux 2.8 D-4D 4x4',
          anio: 2023,
          kilometraje: 42500,
          proximaFechaServicio: fechaVerde,
          proximoKmServicio: 47500,
          notas: 'Ruta Costa Sur y Occidente. En excelente estado.',
          creadoEn: new Date().toISOString(),
        },
        {
          placa: 'C-554MYG',
          piloto: 'Mario Gómez',
          tipo: 'Camión',
          marcaModelo: 'Hino Dutro 300 5 Toneladas',
          anio: 2021,
          kilometraje: 89650,
          proximaFechaServicio: fechaAmarilla,
          proximoKmServicio: 90000,
          notas: 'Falta poco para servicio de 90,000 km y revisión de frenos.',
          creadoEn: new Date().toISOString(),
        },
        {
          placa: 'P-889MYG',
          piloto: 'Rodrigo Méndez',
          tipo: 'Panel',
          marcaModelo: 'Toyota Hiace Diesel Cargo',
          anio: 2020,
          kilometraje: 115200,
          proximaFechaServicio: fechaRoja,
          proximoKmServicio: 115000,
          notas: '⚠️ URGENTE: Servicio vencido. Requiere cambio de aceite, filtros y revisión de suspensión.',
          creadoEn: new Date().toISOString(),
        },
        {
          placa: 'M-301MYG',
          piloto: 'Edwin Castillo',
          tipo: 'Motocicleta',
          marcaModelo: 'Honda Cargo 150cc',
          anio: 2024,
          kilometraje: 12400,
          proximaFechaServicio: fechaVerde,
          proximoKmServicio: 15000,
          notas: 'Mensajería metropolitana express.',
          creadoEn: new Date().toISOString(),
        },
      ];

      for (const v of vehiculosIniciales) {
        await setDoc(doc(db, COLLECTIONS.VEHICULOS, v.placa), v);
      }

      // Historial inicial de servicios
      const servicioInicial: Servicio = {
        id: 'srv_inicial_1',
        placa: 'P-102MYG',
        piloto: 'Juan Pérez',
        tecnico: 'Carlos Ramos',
        tipoServicio: 'Preventivo / Cambio de Aceite y Filtros',
        fecha: new Date(hoy.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        kilometraje: 37500,
        proximaFecha: fechaVerde,
        proximoKm: 47500,
        repuestos: [
          { nombre: 'Aceite 15W-40 Galón Premium', precio: 280.00, cantidad: 2, total: 560.00 },
          { nombre: 'Filtro de Aceite Sintético', precio: 120.00, cantidad: 1, total: 120.00 },
          { nombre: 'Filtro de Aire Motor', precio: 180.00, cantidad: 1, total: 180.00 },
        ],
        costoManoObra: 250.00,
        costoRepuestos: 860.00,
        costoTotal: 1110.00,
        descripcion: 'Mantenimiento preventivo general de 37,500 km. Todo en orden.',
        estado: 'completado',
        creadoEn: new Date().toISOString(),
      };
      await setDoc(doc(db, COLLECTIONS.SERVICIOS, servicioInicial.id), servicioInicial);

      // Combustibles iniciales para gráficas
      const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
      const combustiblesIniciales: RegistroCombustible[] = [
        { id: 'comb_1', placa: 'P-102MYG', mes: mesActual, semana: 1, fecha: new Date(hoy.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], montoQuetzales: 650, galones: 18.5, piloto: 'Juan Pérez', creadoEn: new Date().toISOString() },
        { id: 'comb_2', placa: 'P-102MYG', mes: mesActual, semana: 2, fecha: new Date(hoy.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], montoQuetzales: 720, galones: 20.2, piloto: 'Juan Pérez', creadoEn: new Date().toISOString() },
        { id: 'comb_3', placa: 'P-102MYG', mes: mesActual, semana: 3, fecha: new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], montoQuetzales: 580, galones: 16.4, piloto: 'Juan Pérez', creadoEn: new Date().toISOString() },
        { id: 'comb_4', placa: 'P-102MYG', mes: mesActual, semana: 4, fecha: hoy.toISOString().split('T')[0], montoQuetzales: 690, galones: 19.3, piloto: 'Juan Pérez', creadoEn: new Date().toISOString() },
        { id: 'comb_5', placa: 'C-554MYG', mes: mesActual, semana: 1, fecha: new Date(hoy.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], montoQuetzales: 1400, galones: 42.0, piloto: 'Mario Gómez', creadoEn: new Date().toISOString() },
        { id: 'comb_6', placa: 'C-554MYG', mes: mesActual, semana: 2, fecha: new Date(hoy.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], montoQuetzales: 1550, galones: 46.5, piloto: 'Mario Gómez', creadoEn: new Date().toISOString() },
        { id: 'comb_7', placa: 'C-554MYG', mes: mesActual, semana: 3, fecha: new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], montoQuetzales: 1380, galones: 41.2, piloto: 'Mario Gómez', creadoEn: new Date().toISOString() },
        { id: 'comb_8', placa: 'C-554MYG', mes: mesActual, semana: 4, fecha: hoy.toISOString().split('T')[0], montoQuetzales: 1490, galones: 44.8, piloto: 'Mario Gómez', creadoEn: new Date().toISOString() },
      ];
      for (const c of combustiblesIniciales) {
        await setDoc(doc(db, COLLECTIONS.COMBUSTIBLE, c.id), c);
      }
    }

    // Registrar marca de configuración inicial completada
    await setDoc(configRef, { initializedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    console.error('Error al inicializar datos predeterminados en Firestore:', error);
  }
}
