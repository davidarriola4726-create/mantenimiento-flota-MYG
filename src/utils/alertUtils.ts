import { ResumenAlerta, Vehiculo } from '../types';

/**
 * Calcula el estado de alerta para un vehículo basado en Fecha y Kilometraje
 * 🟢 VERDE: Servicio al día / dentro del tiempo (> 7 días y > 500 km restantes)
 * 🟡 AMARILLO: Servicio a punto de vencer (<= 7 días o <= 500 km restantes)
 * 🔴 ROJO: Servicio vencido (fecha pasada <= 0 días o km actual >= km programado)
 */
export function calcularAlertaVehiculo(vehiculo: Vehiculo): ResumenAlerta {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let diasRestantes = 9999;
  let esVencidoPorFecha = false;
  let esProximoPorFecha = false;

  if (vehiculo.proximaFechaServicio) {
    const fechaObj = new Date(vehiculo.proximaFechaServicio + 'T00:00:00');
    const diffTime = fechaObj.getTime() - hoy.getTime();
    diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) {
      esVencidoPorFecha = true;
    } else if (diasRestantes <= 7) {
      esProximoPorFecha = true;
    }
  }

  let kmRestantes = 999999;
  let esVencidoPorKm = false;
  let esProximoPorKm = false;

  if (vehiculo.proximoKmServicio && vehiculo.proximoKmServicio > 0) {
    kmRestantes = vehiculo.proximoKmServicio - (vehiculo.kilometraje || 0);

    if (kmRestantes <= 0) {
      esVencidoPorKm = true;
    } else if (kmRestantes <= 500) {
      esProximoPorKm = true;
    }
  }

  // Determinar estado final
  if (esVencidoPorFecha || esVencidoPorKm) {
    let motivo = '';
    if (esVencidoPorFecha && esVencidoPorKm) {
      motivo = `Vencido por fecha (${Math.abs(diasRestantes)} días) y por kilometraje (excedido por ${Math.abs(kmRestantes)} km)`;
    } else if (esVencidoPorFecha) {
      motivo = `Vencido por fecha (${Math.abs(diasRestantes)} días atrasado)`;
    } else {
      motivo = `Vencido por kilometraje (excedido por ${Math.abs(kmRestantes)} km)`;
    }

    return {
      estado: 'rojo',
      mensaje: motivo,
      diasRestantes,
      kmRestantes,
      esVencidoPorFecha,
      esVencidoPorKm,
      esProximoPorFecha,
      esProximoPorKm,
    };
  }

  if (esProximoPorFecha || esProximoPorKm) {
    let motivo = '';
    if (esProximoPorFecha && esProximoPorKm) {
      motivo = `Próximo a vencer: faltan ${diasRestantes} días y ${kmRestantes} km`;
    } else if (esProximoPorFecha) {
      motivo = `Próximo a vencer: faltan ${diasRestantes} días`;
    } else {
      motivo = `Próximo a vencer: faltan ${kmRestantes} km`;
    }

    return {
      estado: 'amarillo',
      mensaje: motivo,
      diasRestantes,
      kmRestantes,
      esVencidoPorFecha,
      esVencidoPorKm,
      esProximoPorFecha,
      esProximoPorKm,
    };
  }

  return {
    estado: 'verde',
    mensaje: `Servicio al día (faltan ${diasRestantes > 5000 ? 'sin fecha fija' : diasRestantes + ' días'} y ${kmRestantes > 500000 ? 'km al día' : kmRestantes + ' km'})`,
    diasRestantes,
    kmRestantes,
    esVencidoPorFecha,
    esVencidoPorKm,
    esProximoPorFecha,
    esProximoPorKm,
  };
}

export function formatQuetzales(monto: number): string {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
  }).format(monto || 0).replace('GTQ', 'Q');
}
