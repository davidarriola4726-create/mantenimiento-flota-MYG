import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Vehiculo,
  Servicio,
  RegistroCombustible,
  RepuestoCatalogo,
  Usuario,
  HojaTrabajo,
  HojaCampoManual,
  PagoManoObra,
  CompraRepuesto,
} from '../types';

// Nombres de colecciones requeridas
export const COLLECTIONS = {
  VEHICULOS: 'vehiculos',
  SERVICIOS: 'servicios',
  COMBUSTIBLE: 'combustible',
  REPUESTOS: 'repuestos',
  USUARIOS: 'usuarios',
  HOJAS_TRABAJO: 'hojas_trabajo',
  HOJAS_CAMPO_HC: 'hojas_campo_hc',
  PAGOS_MANO_OBRA: 'pagos_mano_obra',
  COMPRAS_REPUESTOS: 'compras_repuestos',
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

export async function getCombustiblesDirectly(): Promise<RegistroCombustible[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.COMBUSTIBLE));
  const registros: RegistroCombustible[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    registros.push({
      ...data,
      id: docSnap.id,
    } as RegistroCombustible);
  });
  registros.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  return registros;
}

export async function deleteCombustible(id: string): Promise<void> {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new Error('El ID del documento de combustible es requerido y no puede ser nulo o vacío.');
  }
  const cleanId = id.trim();
  const docRef = doc(db, COLLECTIONS.COMBUSTIBLE, cleanId);
  await deleteDoc(docRef);
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
// 5B. HOJA DE CAMPO IMPRIMIBLE (CORRELATIVO HC-0001)
// ============================================
const crearRepuestosEnBlanco = () =>
  Array.from({ length: 8 }, () => ({
    cantidad: '',
    descripcion: '',
    precioUnitario: '',
    total: '',
  }));

export function formatearCorrelativoHC(numero: number): string {
  return `HC-${String(Math.max(1, numero)).padStart(4, '0')}`;
}

export function subscribeHojasCampoHC(callback: (hojas: HojaCampoManual[]) => void) {
  const q = collection(db, COLLECTIONS.HOJAS_CAMPO_HC);
  return onSnapshot(
    q,
    (snapshot) => {
      const hojas: HojaCampoManual[] = [];
      snapshot.forEach((docSnap) => {
        hojas.push({ id: docSnap.id, ...docSnap.data() } as HojaCampoManual);
      });
      hojas.sort((a, b) => (b.numeroSecuencial || 0) - (a.numeroSecuencial || 0));
      callback(hojas);
    },
    (error) => {
      console.error('Error al escuchar hojas de campo HC en tiempo real:', error);
    }
  );
}

export async function asegurarPrimeraHojaCampoHC(): Promise<HojaCampoManual> {
  const counterRef = doc(db, '_config', 'hoja_campo_hc_counter');
  return await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const ahora = new Date().toISOString();

    if (!counterSnap.exists()) {
      const numero = 1;
      const correlativo = formatearCorrelativoHC(numero);
      const hojaRef = doc(db, COLLECTIONS.HOJAS_CAMPO_HC, correlativo);
      const nuevaHoja: HojaCampoManual = {
        id: correlativo,
        correlativo,
        numeroSecuencial: numero,
        fecha: '',
        tipoVehiculo: '',
        placa: '',
        kilometrajeInicial: '',
        kilometrajeFinal: '',
        nombrePiloto: '',
        repuestos: crearRepuestosEnBlanco(),
        costoManoObra: '',
        fechaProximoMantenimiento: '',
        observaciones: '',
        estado: 'borrador',
        vecesImpresa: 0,
        creadoEn: ahora,
        actualizadoEn: ahora,
      };
      transaction.set(counterRef, { ultimoNumero: numero, actualizadoEn: ahora });
      transaction.set(hojaRef, nuevaHoja);
      return nuevaHoja;
    }

    const ultimoNumero = Number(counterSnap.data()?.ultimoNumero) || 1;
    const correlativo = formatearCorrelativoHC(ultimoNumero);
    const hojaRef = doc(db, COLLECTIONS.HOJAS_CAMPO_HC, correlativo);
    const hojaSnap = await transaction.get(hojaRef);
    if (hojaSnap.exists()) {
      return { id: hojaSnap.id, ...hojaSnap.data() } as HojaCampoManual;
    }

    const nuevaHoja: HojaCampoManual = {
      id: correlativo,
      correlativo,
      numeroSecuencial: ultimoNumero,
      fecha: '',
      tipoVehiculo: '',
      placa: '',
      kilometrajeInicial: '',
      kilometrajeFinal: '',
      nombrePiloto: '',
      repuestos: crearRepuestosEnBlanco(),
      costoManoObra: '',
      fechaProximoMantenimiento: '',
      observaciones: '',
      estado: 'borrador',
      vecesImpresa: 0,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    transaction.set(hojaRef, nuevaHoja);
    return nuevaHoja;
  });
}

export async function crearSiguienteHojaCampoHC(): Promise<HojaCampoManual> {
  const counterRef = doc(db, '_config', 'hoja_campo_hc_counter');
  return await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const ahora = new Date().toISOString();
    const ultimoActual = counterSnap.exists() ? Number(counterSnap.data()?.ultimoNumero) || 0 : 0;
    const siguienteNumero = ultimoActual + 1;
    const correlativo = formatearCorrelativoHC(siguienteNumero);
    const hojaRef = doc(db, COLLECTIONS.HOJAS_CAMPO_HC, correlativo);

    const nuevaHoja: HojaCampoManual = {
      id: correlativo,
      correlativo,
      numeroSecuencial: siguienteNumero,
      fecha: '',
      tipoVehiculo: '',
      placa: '',
      kilometrajeInicial: '',
      kilometrajeFinal: '',
      nombrePiloto: '',
      repuestos: crearRepuestosEnBlanco(),
      costoManoObra: '',
      fechaProximoMantenimiento: '',
      observaciones: '',
      estado: 'borrador',
      vecesImpresa: 0,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    transaction.set(counterRef, { ultimoNumero: siguienteNumero, actualizadoEn: ahora });
    transaction.set(hojaRef, nuevaHoja);
    return nuevaHoja;
  });
}

export async function saveHojaCampoHC(hoja: HojaCampoManual): Promise<void> {
  const docId = hoja.id || hoja.correlativo;
  const docRef = doc(db, COLLECTIONS.HOJAS_CAMPO_HC, docId);
  const dataToSave: HojaCampoManual = {
    ...hoja,
    id: docId,
    placa: (hoja.placa || '').trim().toUpperCase(),
    actualizadoEn: new Date().toISOString(),
  };
  await setDoc(docRef, dataToSave, { merge: true });
}

export async function deleteHojaCampoHC(id: string): Promise<void> {
  if (!id || !id.trim()) return;
  await deleteDoc(doc(db, COLLECTIONS.HOJAS_CAMPO_HC, id.trim()));
}

// ============================================
// 5C. REGISTRO DE PAGO DE MANO DE OBRA (CORRELATIVO PM-0001)
// ============================================
export function formatearCorrelativoPM(numero: number): string {
  return `PM-${String(Math.max(1, numero)).padStart(4, '0')}`;
}

export function subscribePagosManoObra(callback: (pagos: PagoManoObra[]) => void) {
  const q = collection(db, COLLECTIONS.PAGOS_MANO_OBRA);
  return onSnapshot(
    q,
    (snapshot) => {
      const pagos: PagoManoObra[] = [];
      snapshot.forEach((docSnap) => {
        pagos.push({ id: docSnap.id, ...docSnap.data() } as PagoManoObra);
      });
      pagos.sort((a, b) => (b.numeroSecuencial || 0) - (a.numeroSecuencial || 0));
      callback(pagos);
    },
    (error) => {
      console.error('Error al escuchar pagos de mano de obra en tiempo real:', error);
    }
  );
}

export async function crearPagoManoObra(
  datos: Omit<PagoManoObra, 'id' | 'correlativo' | 'numeroSecuencial' | 'creadoEn' | 'actualizadoEn'>
): Promise<PagoManoObra> {
  const counterRef = doc(db, '_config', 'pago_mano_obra_counter');
  return await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const ahora = new Date().toISOString();
    const ultimoActual = counterSnap.exists() ? Number(counterSnap.data()?.ultimoNumero) || 0 : 0;
    const siguienteNumero = ultimoActual + 1;
    const correlativo = formatearCorrelativoPM(siguienteNumero);
    const docRef = doc(db, COLLECTIONS.PAGOS_MANO_OBRA, correlativo);

    const nuevoPago: PagoManoObra = {
      ...datos,
      id: correlativo,
      correlativo,
      numeroSecuencial: siguienteNumero,
      placa: (datos.placa || '').trim().toUpperCase(),
      monto: Number(datos.monto) || 0,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    transaction.set(counterRef, { ultimoNumero: siguienteNumero, actualizadoEn: ahora });
    transaction.set(docRef, nuevoPago);
    return nuevoPago;
  });
}

export async function updatePagoManoObra(pago: PagoManoObra): Promise<void> {
  const docId = pago.id || pago.correlativo;
  const docRef = doc(db, COLLECTIONS.PAGOS_MANO_OBRA, docId);
  const dataToSave: PagoManoObra = {
    ...pago,
    id: docId,
    placa: (pago.placa || '').trim().toUpperCase(),
    monto: Number(pago.monto) || 0,
    actualizadoEn: new Date().toISOString(),
  };
  await setDoc(docRef, dataToSave, { merge: true });
}

export async function deletePagoManoObra(id: string): Promise<void> {
  if (!id || !id.trim()) return;
  await deleteDoc(doc(db, COLLECTIONS.PAGOS_MANO_OBRA, id.trim()));
}

// ============================================
// 5D. REGISTRO DE COMPRA DE REPUESTOS (CORRELATIVO PR-0001)
// ============================================
export function formatearCorrelativoPR(numero: number): string {
  return `PR-${String(Math.max(1, numero)).padStart(4, '0')}`;
}

export function subscribeComprasRepuestos(callback: (compras: CompraRepuesto[]) => void) {
  const q = collection(db, COLLECTIONS.COMPRAS_REPUESTOS);
  return onSnapshot(
    q,
    (snapshot) => {
      const compras: CompraRepuesto[] = [];
      snapshot.forEach((docSnap) => {
        compras.push({ id: docSnap.id, ...docSnap.data() } as CompraRepuesto);
      });
      compras.sort((a, b) => (b.numeroSecuencial || 0) - (a.numeroSecuencial || 0));
      callback(compras);
    },
    (error) => {
      console.error('Error al escuchar compras de repuestos en tiempo real:', error);
    }
  );
}

export async function crearCompraRepuesto(
  datos: Omit<CompraRepuesto, 'id' | 'correlativo' | 'numeroSecuencial' | 'creadoEn' | 'actualizadoEn'>
): Promise<CompraRepuesto> {
  const counterRef = doc(db, '_config', 'compra_repuestos_counter');
  return await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const ahora = new Date().toISOString();
    const ultimoActual = counterSnap.exists() ? Number(counterSnap.data()?.ultimoNumero) || 0 : 0;
    const siguienteNumero = ultimoActual + 1;
    const correlativo = formatearCorrelativoPR(siguienteNumero);
    const docRef = doc(db, COLLECTIONS.COMPRAS_REPUESTOS, correlativo);

    const nuevaCompra: CompraRepuesto = {
      ...datos,
      id: correlativo,
      correlativo,
      numeroSecuencial: siguienteNumero,
      placa: (datos.placa || '').trim().toUpperCase(),
      monto: Number(datos.monto) || 0,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    transaction.set(counterRef, { ultimoNumero: siguienteNumero, actualizadoEn: ahora });
    transaction.set(docRef, nuevaCompra);
    return nuevaCompra;
  });
}

export async function updateCompraRepuesto(compra: CompraRepuesto): Promise<void> {
  const docId = compra.id || compra.correlativo;
  const docRef = doc(db, COLLECTIONS.COMPRAS_REPUESTOS, docId);
  const dataToSave: CompraRepuesto = {
    ...compra,
    id: docId,
    placa: (compra.placa || '').trim().toUpperCase(),
    monto: Number(compra.monto) || 0,
    actualizadoEn: new Date().toISOString(),
  };
  await setDoc(docRef, dataToSave, { merge: true });
}

export async function deleteCompraRepuesto(id: string): Promise<void> {
  if (!id || !id.trim()) return;
  await deleteDoc(doc(db, COLLECTIONS.COMPRAS_REPUESTOS, id.trim()));
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

export async function deleteUsuario(idOrNumero: string): Promise<void> {
  const cleanId = idOrNumero.trim().toUpperCase();
  const docRef = doc(db, COLLECTIONS.USUARIOS, cleanId);
  await deleteDoc(docRef);
}

// ============================================
// 7. INICIALIZACIÓN AUTOMÁTICA DE DATOS (SEED)
// ============================================

// Lista de usuarios en código siguiendo el formato oficial
export const USUARIOS_PREDETERMINADOS: Usuario[] = [
  {
    id: 'ADMINISTRADOR',
    numeroUsuario: 'ADMINISTRADOR',
    nombre: 'administrador',
    email: 'administrador@myg.gt',
    password: 'MIG2026',
    rol: 'admin',
    creadoEn: new Date().toISOString(),
  },
  {
    id: 'TECNICO',
    numeroUsuario: 'TECNICO',
    nombre: 'técnico',
    email: 'tecnico@myg.gt',
    password: 'MIG2026',
    rol: 'tecnico',
    creadoEn: new Date().toISOString(),
  },
  {
    id: 'ADMIN01',
    numeroUsuario: 'ADMIN01',
    nombre: 'Administrador General - Sistema MYG',
    email: 'admin@myg.gt',
    password: 'admin',
    rol: 'admin',
    creadoEn: new Date().toISOString(),
  },
  {
    id: 'TEC01',
    numeroUsuario: 'TEC01',
    nombre: 'Carlos Ramos - Jefe de Taller',
    email: 'tec01@myg.gt',
    password: '123',
    rol: 'tecnico',
    creadoEn: new Date().toISOString(),
  },
  {
    id: 'PILOTO01',
    numeroUsuario: 'PILOTO01',
    nombre: 'Juan Pérez - Piloto Flota',
    email: 'piloto01@myg.gt',
    password: '123',
    rol: 'piloto',
    creadoEn: new Date().toISOString(),
  },
];

// Asegurar que los dos usuarios nuevos requeridos se inserten en Firestore si aún no existen
export async function asegurarUsuariosNuevos(): Promise<void> {
  try {
    const usuariosNuevos = USUARIOS_PREDETERMINADOS.slice(0, 2);
    for (const u of usuariosNuevos) {
      const uRef = doc(db, COLLECTIONS.USUARIOS, u.numeroUsuario);
      const snap = await getDoc(uRef);
      if (!snap.exists()) {
        await setDoc(uRef, u);
      }
    }
  } catch (err) {
    console.warn('Nota al sincronizar usuarios base en Firestore:', err);
  }
}

export async function inicializarDatosPredeterminados(): Promise<void> {
  try {
    // Sincronizar usuarios requeridos inmediatamente en Firestore
    await asegurarUsuariosNuevos();

    // Verificar si el sistema ya fue inicializado previamente para evitar reinsertar registros borrados
    const configRef = doc(db, '_config', 'seed_completed');
    const configSnap = await getDoc(configRef);
    if (configSnap.exists()) {
      return;
    }

    // 1. Usuarios iniciales si no existen
    const usersSnap = await getDocs(collection(db, COLLECTIONS.USUARIOS));
    if (usersSnap.empty) {
      const usuariosIniciales: Usuario[] = USUARIOS_PREDETERMINADOS;
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
