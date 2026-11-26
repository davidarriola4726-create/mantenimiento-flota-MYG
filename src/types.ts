export type EstadoAlerta = 'verde' | 'amarillo' | 'rojo';

export interface RepuestoItem {
  nombre: string;
  precio: number; // En Quetzales (Q)
  cantidad: number;
  total: number; // precio * cantidad
}

export interface Vehiculo {
  placa: string; // ID único, e.g. "P-456XYZ"
  piloto: string; // Nombre del piloto asignado
  tipo: string; // "Camión", "Pickup", "Panel", "Camioneta", "Sedán", "Cabezal", "Moto", etc.
  marcaModelo?: string; // e.g. "Toyota Hilux 2.8"
  anio?: string | number;
  kilometraje: number; // Kilometraje actual
  proximaFechaServicio: string; // YYYY-MM-DD
  proximoKmServicio: number; // Kilometraje para el próximo servicio
  notas?: string;
  creadoEn: string;
  actualizadoEn?: string;
}

export interface Servicio {
  id: string;
  placa: string;
  piloto: string; // Nombre del chofer/piloto
  tipoProblema?: string; // Tipo de problema reportado
  tipoMantenimiento?: 'Preventivo' | 'Correctivo' | string; // Tipo de mantenimiento
  tipoServicio?: string; // e.g. "Preventivo", "Correctivo", "Cambio de Aceite", "Frenos", etc.
  fecha: string; // Fecha de ejecución del mantenimiento (YYYY-MM-DD)
  kilometraje?: number;
  proximaFecha?: string;
  proximoKm?: number;
  repuestos: RepuestoItem[]; // Repuesto o piezas instaladas (con cantidad, precio unitario y total)
  costoRepuestos: number; // Suma total de los repuestos usados en ese mantenimiento (Q)
  costoManoObra?: number; // En Quetzales Q
  costoTotal: number; // Suma total (costoRepuestos + costoManoObra) en Quetzales (GTQ)
  tecnico?: string;
  descripcion?: string;
  estado?: 'completado' | 'programado' | 'en_proceso';
  firmaPiloto?: string; // Data URL Base64
  firmaTecnico?: string; // Data URL Base64
  hojaTrabajoId?: string;
  creadoEn: string;
}

export interface RegistroCombustible {
  id: string;
  placa: string;
  mes: string; // e.g. "2026-08" o "Agosto 2026"
  semana: number; // 1, 2, 3, 4
  fecha: string; // YYYY-MM-DD
  montoQuetzales: number; // En Quetzales Q
  galones?: number;
  kilometraje?: number;
  piloto?: string;
  notas?: string;
  creadoEn: string;
}

export interface RepuestoCatalogo {
  id: string;
  nombre: string;
  precio: number; // En Quetzales (Q)
  categoria?: string;
  codigo?: string;
  actualizadoEn: string;
}

export interface Usuario {
  id: string;
  numeroUsuario: string; // e.g. "ADMIN01", "TEC01", "PILOTO01"
  nombre: string;
  email?: string;
  password: string;
  rol: 'admin' | 'tecnico' | 'piloto';
  creadoEn: string;
}

export interface HojaTrabajo {
  id: string;
  numeroOrden: string;
  placa: string;
  piloto: string;
  tecnico: string;
  tipoServicio: string;
  fecha: string;
  kilometraje: number;
  repuestos: RepuestoItem[];
  costoManoObra: number;
  totalQuetzales: number;
  observaciones: string;
  firmaPiloto: string; // Data URL
  firmaTecnico: string; // Data URL
  creadoEn: string;
}

export interface HojaCampoManualRepuesto {
  cantidad: string;
  descripcion: string;
  precioUnitario: string;
  total: string;
}

export interface HojaCampoManual {
  id: string;
  correlativo: string; // e.g. "HC-0001"
  numeroSecuencial: number; // e.g. 1
  fecha: string;
  tipoVehiculo: string;
  placa: string;
  kilometrajeInicial: string;
  kilometrajeFinal: string;
  nombrePiloto: string;
  repuestos: HojaCampoManualRepuesto[];
  costoManoObra: string;
  fechaProximoMantenimiento: string;
  observaciones: string;
  estado: 'borrador' | 'emitida';
  vecesImpresa?: number;
  creadoEn: string;
  actualizadoEn: string;
}

export type EstadoPagoRegistro = 'Efectivo' | 'Pagado' | 'Al crédito';

export interface PagoManoObra {
  id: string;
  correlativo: string; // e.g. "PM-0001"
  numeroSecuencial: number;
  fecha: string;
  monto: number;
  tipoMantenimiento: string;
  correlativoHC: string;
  modeloVehiculo: string;
  placa: string;
  numeroRuta: string;
  voucher: string;
  estadoPago: EstadoPagoRegistro;
  fechaPagoCancelado?: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CompraRepuesto {
  id: string;
  correlativo: string; // e.g. "PR-0001"
  numeroSecuencial: number;
  fecha: string;
  monto: number;
  nombreRepuesto: string;
  marcaProveedor: string;
  modeloVehiculo: string;
  placa: string;
  numeroRuta: string;
  voucher: string;
  estadoPago: EstadoPagoRegistro;
  fechaPagoCancelado?: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ResumenAlerta {
  estado: EstadoAlerta;
  mensaje: string;
  diasRestantes: number;
  kmRestantes: number;
  esVencidoPorFecha: boolean;
  esVencidoPorKm: boolean;
  esProximoPorFecha: boolean;
  esProximoPorKm: boolean;
}
