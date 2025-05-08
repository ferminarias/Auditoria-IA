import { AppConfig, CorsConfig, FileConfig, CacheConfig, PaginationConfig, Messages } from '../types';

// Configuración base de la aplicación
const config: AppConfig = {
    NAME: 'Auditoría IA',
    VERSION: '1.0.0',
    ENVIRONMENT: 'production',
    DEBUG: false,
    TOKEN_EXPIRATION: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
    ERROR_MESSAGE_DURATION: 5000, // 5 segundos
    ROUTES: {
        LOGIN: '/login',
        HOME: '/',
        RECORDINGS: '/recordings',
        ANALYSIS: '/analysis',
        SETTINGS: '/settings'
    },
    ENV: {
        IS_DEVELOPMENT: false
    }
};

// URLs de la API - Configuradas para acceso local en la VPS
export const API_URLS = {
    BASE: 'http://localhost:8000',
    AUTH: 'http://localhost:8000/token',
    TRANSCRIPTION: 'http://localhost:8000/api/transcribe',
    ANALYSIS: 'http://localhost:8000/api/analyze',
    RECORDINGS: 'http://localhost:8000/api/recordings'
};

// Configuración de CORS para producción
export const CORS_CONFIG: CorsConfig = {
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    origin: 'http://localhost:3000'
};

// Configuración de archivos
export const FILE_CONFIG: FileConfig = {
    MAX_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    MAX_FILES: 5,
    UPLOAD_PATH: '/uploads'
};

// Configuración de mensajes
export const MESSAGES: Messages = {
    ERRORS: {
        FILE_SIZE: 'El archivo excede el tamaño máximo permitido (50MB)',
        FILE_TYPE: 'Tipo de archivo no permitido. Solo se aceptan archivos de audio',
        AUTH_REQUIRED: 'Debe iniciar sesión para acceder a esta página',
        TOKEN_EXPIRED: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente',
        NETWORK_ERROR: 'Error de conexión. Por favor, intente nuevamente',
        SERVER_ERROR: 'Error del servidor. Por favor, intente más tarde'
    },
    SUCCESS: {
        LOGIN: 'Inicio de sesión exitoso',
        LOGOUT: 'Sesión cerrada correctamente',
        UPLOAD: 'Archivo subido correctamente',
        ANALYSIS: 'Análisis completado correctamente'
    }
};

// Configuración de caché
export const CACHE_CONFIG: CacheConfig = {
    ENABLED: true,
    TTL: 3600, // 1 hora en segundos
    PREFIX: 'auditoria_ia_'
};

// Configuración de paginación
export const PAGINATION_CONFIG: PaginationConfig = {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
};

export default config; 