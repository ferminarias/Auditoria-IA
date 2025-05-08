// Tipos para el análisis
export interface AnalysisResult {
    // Análisis base
    satisfaction: string;
    urgency: string;
    resolution: string;
    tone: string;
    confidence: number;
    original_text: string;
    call_summary: string;
    timestamp: string;
    
    // Análisis de Agente
    agent_analysis: {
        professionalism: string;
        empathy: string;
        solution_effectiveness: string;
        compliance: string;
    };
    
    // Categorización de Llamada
    call_categorization: {
        type: string;
        topic: string;
        priority: string;
    };
    
    // Análisis de Tono y Emoción
    emotional_analysis: {
        customer_emotion: string;
        agent_emotion: string;
        interaction_quality: string;
    };
    
    // Seguimiento de Resolución
    resolution_tracking: {
        status: string;
        resolution_time: string;
        follow_up_required: boolean;
        escalation_level: number;
    };
}

// Tipos para el estado de los archivos
export interface FileWithAnalysis {
    file: File;
    status: 'pending' | 'analyzing' | 'completed' | 'error';
    transcription?: string;
    analysis?: AnalysisResult;
    error?: string;
}

/**
 * Configuración de la aplicación
 */
export interface AppConfig {
    TOKEN_EXPIRATION: number;
    ERROR_MESSAGE_DURATION: number;
    ROUTES: {
        LOGIN: string;
        HOME: string;
        RECORDINGS: string;
        ANALYSIS: string;
        SETTINGS: string;
    };
    ENV: {
        IS_DEVELOPMENT: boolean;
    };
}

/**
 * Configuración de CORS
 */
export interface CorsConfig {
    credentials: 'include' | 'same-origin' | 'omit';
    headers: {
        'Content-Type': string;
        'Accept': string;
    };
    origin: string;
}

/**
 * Configuración de archivos
 */
export interface FileConfig {
    MAX_SIZE: number;
    ALLOWED_TYPES: string[];
    MAX_FILES: number;
    UPLOAD_PATH: string;
}

/**
 * Configuración de caché
 */
export interface CacheConfig {
    ENABLED: boolean;
    TTL: number;
    PREFIX: string;
}

/**
 * Configuración de paginación
 */
export interface PaginationConfig {
    DEFAULT_PAGE_SIZE: number;
    PAGE_SIZE_OPTIONS: number[];
}

/**
 * Configuración de la aplicación
 */
export interface AppConfig {
    NAME: string;
    VERSION: string;
    ENVIRONMENT: 'development' | 'production';
    DEBUG: boolean;
}

/**
 * Mensajes de la aplicación
 */
export interface Messages {
    ERRORS: {
        FILE_SIZE: string;
        FILE_TYPE: string;
        AUTH_REQUIRED: string;
        TOKEN_EXPIRED: string;
        NETWORK_ERROR: string;
        SERVER_ERROR: string;
    };
    SUCCESS: {
        LOGIN: string;
        LOGOUT: string;
        UPLOAD: string;
        ANALYSIS: string;
    };
}

// Tipos para las respuestas de la API
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    detail?: string;
}

// Tipos para las estadísticas
export interface RecordingStats {
    totalRecordings: number;
    totalDuration: number;
    averageDuration: number;
    lastAnalyzed: string | null;
    satisfactionDistribution: {
        [key: string]: number;
    };
    urgencyDistribution: {
        [key: string]: number;
    };
}

// Tipos para las grabaciones
export interface Recording {
    id: number;
    user_id: number;
    filename: string;
    duration: number;
    created_at: string;
    lastAnalyzed?: string | null;
    transcription?: string;
    analysis?: AnalysisResult;
}

export interface User {
    id: number;
    email: string;
    is_active: boolean;
    created_at: string;
}

export interface ApiError {
    detail: string;
    status: number;
} 