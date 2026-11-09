/**
 * Utilidad unificada para impresión en computadoras y dispositivos móviles.
 * Compatible con Android Chrome, iOS Safari y navegadores de escritorio.
 * No utiliza popups ni ventanas emergentes (evita bloqueos en móviles e iframes).
 */
export function ejecutarImpresionMobile(): void {
  try {
    if (typeof window === 'undefined') return;

    // Asegurar foco en la ventana actual
    window.focus();

    // En móviles y tablets, un pequeño retardo asegura que el navegador complete
    // el cálculo de estilos y renderice adecuadamente el lienzo de impresión.
    setTimeout(() => {
      try {
        window.print();
      } catch (error) {
        console.error('Error al invocar window.print():', error);
      }
    }, 60);
  } catch (err) {
    console.error('Error al preparar impresión:', err);
  }
}
