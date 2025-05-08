// Configuración del backend
const isDevelopment = false; // Siempre en producción en el VPS
const BACKEND_URL = 'http://localhost:8000'; // Usar localhost cuando está en el mismo servidor
const API_URL = `${BACKEND_URL}/api`;
const AUTH_URL = BACKEND_URL;

// Configuración de la aplicación
const APP_CONFIG = {
    // Tiempo de expiración del token (en minutos)
    TOKEN_EXPIRATION: 60,
    
    // Tiempo de expiración de mensajes de error (en milisegundos)
    ERROR_MESSAGE_DURATION: 5000,
    
    // Rutas de la aplicación
    ROUTES: {
        LOGIN: 'login.html',
        HOME: 'index.html',
        RECORDINGS: 'recordings.html'
    },

    // Configuración de entorno
    ENV: {
        IS_DEVELOPMENT: isDevelopment
    }
};

// Exportar configuración
window.APP_CONFIG = APP_CONFIG;
window.API_URL = API_URL;
window.AUTH_URL = AUTH_URL; 