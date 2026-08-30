import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

// Configuración cargada desde el entorno o archivo de configuración
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD5cD-zHwzVhPOCBTO15_pvzRn-lpWAFYE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0113824051.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0113824051",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0113824051.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "692119291861",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:692119291861:web:db2fa2bec9b2886db4df5c",
};

const customDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-5ab1f397-05cf-4970-931a-cfcbb1dccdb6";

// Inicialización de la aplicación Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inicialización de Firestore con ID de base de datos específico si existe
let dbInstance;
try {
  if (customDatabaseId && customDatabaseId !== "(default)") {
    dbInstance = getFirestore(app, customDatabaseId);
  } else {
    dbInstance = getFirestore(app);
  }
} catch (error) {
  console.warn("Inicializando Firestore por defecto:", error);
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
export { app, firebaseConfig, customDatabaseId };
