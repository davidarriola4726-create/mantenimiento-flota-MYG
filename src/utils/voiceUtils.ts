/**
 * Utilidad de Audio y Síntesis de Voz
 * Saludo de bienvenida para CONTROL DE VEHÍCULOS "MYG"
 */

const SALUDO_TEXTO_DEFAULT = '¡Hola Ronald, bienvenido a tu sistema!';
const STORAGE_KEY_AUDIO = 'myg_audio_saludo_enabled';
const SESSION_KEY_PLAYED = 'myg_audio_saludo_reproducido';

export const isAudioSaludoEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEY_AUDIO);
  return stored === null ? true : stored === 'true';
};

export const setAudioSaludoEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_AUDIO, String(enabled));
};

let voicesLoaded = false;
let availableVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const updateVoices = () => {
    availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length > 0) {
      voicesLoaded = true;
    }
  };

  updateVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }
}

/**
 * Busca la voz femenina en español más natural, humanizada, cálida y de alta calidad
 */
const buscarVozFemeninaEspanol = (): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const nombresFemeninosPrioritarios = [
    'natural', 'neural', 'google español', 'paulina', 'monica', 'helena', 
    'sabina', 'dalia', 'elena', 'laura', 'sofia', 'lucia', 'marta', 
    'maria', 'rosa', 'carmen', 'alva', 'victoria', 'paloma', 'zira', 
    'samantha', 'femenina', 'female'
  ];

  for (const nombre of nombresFemeninosPrioritarios) {
    const voz = voices.find((v) => {
      const esEspanol = v.lang.toLowerCase().startsWith('es');
      const nombreMin = v.name.toLowerCase();
      return esEspanol && nombreMin.includes(nombre);
    });
    if (voz) return voz;
  }

  const cualquierEs = voices.find((v) => v.lang.toLowerCase().startsWith('es'));
  if (cualquierEs) return cualquierEs;

  return voices[0] || null;
};

/**
 * Genera el texto del saludo optimizado y natural
 */
export const obtenerTextoSaludo = (nombreUsuario?: string | null): string => {
  if (nombreUsuario && nombreUsuario.trim()) {
    const primerNombre = nombreUsuario.trim().split(' ')[0];
    return `¡Hola ${primerNombre}, bienvenido a tu sistema!`;
  }
  return '¡Hola Ronald, bienvenido a tu sistema!';
};

/**
 * Reproduce el saludo de audio utilizando la etiqueta HTML5 Audio o Web Speech API:
 * - Volumen: 70% (0.70)
 * - Reproduce una sola vez (controlado por sessionStorage)
 * - Sin bucles
 */
export const reproducirSaludoAudio = (
  audioElement?: HTMLAudioElement | null,
  force = false,
  nombreUsuario?: string | null
): boolean => {
  if (typeof window === 'undefined') return false;

  // Verificar si el usuario tiene el audio activado
  if (!force && !isAudioSaludoEnabled()) {
    return false;
  }

  // Verificar si ya se reprodujo en esta sesión (para no repetir en bucle)
  if (!force && sessionStorage.getItem(SESSION_KEY_PLAYED) === 'true') {
    return false;
  }

  const texto = obtenerTextoSaludo(nombreUsuario);

  // 1. Intentar reproducir desde elemento HTML5 Audio si tiene fuente válida
  if (audioElement && audioElement.src && audioElement.src !== window.location.href && !audioElement.src.endsWith('/')) {
    try {
      audioElement.volume = 0.70;
      audioElement.loop = false;
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            sessionStorage.setItem(SESSION_KEY_PLAYED, 'true');
          })
          .catch((error) => {
            console.warn('Autoplay bloqueado por el navegador, recurriendo a Web Speech:', error);
            reproducirVozDirecta(force, texto);
          });
        return true;
      }
    } catch (e) {
      console.warn('Error al reproducir HTML5 Audio:', e);
    }
  }

  // 2. Reproducción a través de síntesis vocal nativa humanizada (Web Speech API)
  return reproducirVozDirecta(force, texto);
};

const reproducirVozDirecta = (force = false, textoCustom?: string): boolean => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();

    const texto = textoCustom || SALUDO_TEXTO_DEFAULT;
    const utterance = new SpeechSynthesisUtterance(texto);

    utterance.volume = 0.70; // Volumen exacto al 70% (suave y agradable)
    utterance.rate = 0.84;   // Velocidad tranquila y pausada
    utterance.pitch = 1.08;  // Tono femenino cálido, suave y dulce
    utterance.lang = 'es-ES';

    const voz = buscarVozFemeninaEspanol();
    if (voz) {
      utterance.voice = voz;
      if (voz.lang) {
        utterance.lang = voz.lang;
      }
    }

    utterance.onend = () => {
      sessionStorage.setItem(SESSION_KEY_PLAYED, 'true');
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
    };

    window.speechSynthesis.speak(utterance);
    sessionStorage.setItem(SESSION_KEY_PLAYED, 'true');
    return true;
  } catch (error) {
    console.warn('No se pudo reproducir el saludo:', error);
    return false;
  }
};

export const reproducirSaludoVoz = (force = false, nombreUsuario?: string | null): boolean => {
  return reproducirSaludoAudio(null, force, nombreUsuario);
};

