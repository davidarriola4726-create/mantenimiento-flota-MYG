/**
 * Utilidad de Audio y Síntesis de Voz
 * Saludo de bienvenida para CONTROL DE VEHÍCULOS "MYG"
 */

const SALUDO_TEXTO_DEFAULT = 'Bienvenido a tu sistema';
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
 * Formatea el nombre para pronunciarlo con énfasis claro en la primera sílaba (RO-nald)
 */
const formatearNombreFonetico = (nombre?: string | null): string => {
  if (!nombre || !nombre.trim()) return 'Rónald';
  const primerNombre = nombre.trim().split(' ')[0];
  if (primerNombre.toLowerCase() === 'ronald' || primerNombre.toLowerCase() === 'ronal') {
    return 'Rónald';
  }
  return primerNombre;
};

/**
 * Reproduce el saludo de audio utilizando la etiqueta HTML5 Audio (archivo MP3 real) o Web Speech API:
 * - Archivo de audio MP3 real
 * - Volumen: 70% (0.70)
 * - Reproduce una sola vez por sesión (controlado por sessionStorage)
 * - Sin bucles (loop: false)
 * - Compatible con navegadores móviles y de escritorio
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

  // 1. Intentar reproducir desde elemento HTML5 Audio con el archivo MP3
  if (audioElement) {
    try {
      if (!audioElement.src || audioElement.src === window.location.href) {
        audioElement.src = '/audio/saludo.mp3';
      }
      audioElement.volume = 0.70; // 70% volumen (suave y agradable)
      audioElement.loop = false;  // Sin bucle
      audioElement.currentTime = 0;

      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            sessionStorage.setItem(SESSION_KEY_PLAYED, 'true');
          })
          .catch((error) => {
            console.warn('Autoplay bloqueado por el navegador o interacción requerida:', error);
            // Intentar síntesis de voz en caso de que el elemento de audio esté restringido
            reproducirVozDirecta(force, nombreUsuario);
          });
        return true;
      }
    } catch (e) {
      console.warn('Error al reproducir HTML5 Audio:', e);
    }
  }

  // 2. Si no hay elemento de audio, crear objeto Audio dinámico para reproducir el MP3
  try {
    const audioObj = new Audio('/audio/saludo.mp3');
    audioObj.volume = 0.70;
    audioObj.loop = false;
    const playPromise = audioObj.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          sessionStorage.setItem(SESSION_KEY_PLAYED, 'true');
        })
        .catch(() => {
          reproducirVozDirecta(force, nombreUsuario);
        });
      return true;
    }
  } catch {
    // Continuar a fallback
  }

  // 3. Fallback a través de síntesis vocal nativa humanizada (Web Speech API)
  return reproducirVozDirecta(force, nombreUsuario);
};

const reproducirVozDirecta = (force = false, nombreUsuario?: string | null): boolean => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();

    const voz = buscarVozFemeninaEspanol();
    const nombreFonetico = formatearNombreFonetico(nombreUsuario);

    // PARTE 1: "Bienvenido a tu sistema"
    // Voz pausada, clara y articulada
    const frase1 = new SpeechSynthesisUtterance('Bienvenido a tu sistema');
    frase1.volume = 0.70;
    frase1.rate = 0.80;   // Velocidad pausada y tranquila para pronunciar cada letra
    frase1.pitch = 1.06;  // Tono cálido, dulce y claro
    frase1.lang = 'es-ES';

    if (voz) {
      frase1.voice = voz;
      if (voz.lang) frase1.lang = voz.lang;
    }

    // PARTE 2: "Ronald" (con pausa intermedia de ~450ms, énfasis en la primera sílaba RO-nald y volumen sutilmente realzado)
    const frase2 = new SpeechSynthesisUtterance(nombreFonetico);
    frase2.volume = 0.78; // Volumen ligeramente superior para destacar el nombre con claridad
    frase2.rate = 0.74;   // Más lento y pausado al pronunciar el nombre (RO-nald)
    frase2.pitch = 1.08;  // Tono cálido y nítido
    frase2.lang = 'es-ES';

    if (voz) {
      frase2.voice = voz;
      if (voz.lang) frase2.lang = voz.lang;
    }

    frase1.onend = () => {
      // Pequeña pausa de silencio antes de decir "Ronald" ⏳
      setTimeout(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.speak(frase2);
        }
      }, 450);
    };

    frase2.onend = () => {
      sessionStorage.setItem(SESSION_KEY_PLAYED, 'true');
    };

    frase1.onerror = (e) => {
      console.warn('SpeechSynthesis frase1 error:', e);
    };

    frase2.onerror = (e) => {
      console.warn('SpeechSynthesis frase2 error:', e);
    };

    // Iniciar la primera parte del saludo
    window.speechSynthesis.speak(frase1);
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


