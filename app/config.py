from pydantic_settings import BaseSettings
from typing import List
import os
import json
import secrets

class Settings(BaseSettings):
    # Configuración de la API
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    API_WORKERS: int = int(os.getenv("API_WORKERS", "2"))  # Reducido para menor uso de memoria
    API_RELOAD: bool = os.getenv("API_RELOAD", "false").lower() == "true"
    
    # Configuración de seguridad
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # Configuración de CORS
    CORS_ORIGINS: List[str] = json.loads(os.getenv("CORS_ORIGINS", '["http://192.168.1.100"]'))
    CORS_CREDENTIALS: bool = os.getenv("CORS_CREDENTIALS", "true").lower() == "true"
    
    # Configuración de directorios
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/app/uploads")
    ANALYSIS_DIR: str = os.getenv("ANALYSIS_DIR", "/app/analysis")
    CACHE_DIR: str = os.getenv("CACHE_DIR", "/app/cache")
    
    # Configuración de modelos
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "tiny")  # Modelo más ligero
    WHISPER_BATCH_SIZE: int = int(os.getenv("WHISPER_BATCH_SIZE", "8"))  # Reducido
    WHISPER_NUM_WORKERS: int = int(os.getenv("WHISPER_NUM_WORKERS", "2"))  # Reducido
    WHISPER_BEAM_SIZE: int = int(os.getenv("WHISPER_BEAM_SIZE", "3"))  # Reducido
    
    TRANSFORMERS_CACHE: str = os.getenv("TRANSFORMERS_CACHE", "/app/cache")
    MODEL_DEVICE: str = os.getenv("MODEL_DEVICE", "cpu")  # Forzar CPU para menor uso de memoria
    MODEL_COMPUTE_TYPE: str = os.getenv("MODEL_COMPUTE_TYPE", "int8")  # Usar int8 para menor uso de memoria
    MODEL_BATCH_SIZE: int = int(os.getenv("MODEL_BATCH_SIZE", "16"))  # Reducido
    MODEL_MAX_LENGTH: int = int(os.getenv("MODEL_MAX_LENGTH", "256"))  # Reducido
    
    # Configuración de caché
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")
    CACHE_TTL: int = int(os.getenv("CACHE_TTL", "1800"))  # 30 minutos
    
    # Configuración de base de datos
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://appuser:tu_contraseña_segura@localhost:5432/auditoria_ia"
    )
    
    # Configuración de logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "/var/log/auditoria_ia/app.log")
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    
    # Configuración de procesamiento
    MAX_CONCURRENT_TRANSCRIPTIONS: int = int(os.getenv("MAX_CONCURRENT_TRANSCRIPTIONS", "2"))  # Reducido
    MAX_CONCURRENT_ANALYSES: int = int(os.getenv("MAX_CONCURRENT_ANALYSES", "4"))  # Reducido
    PROCESSING_TIMEOUT: int = int(os.getenv("PROCESSING_TIMEOUT", "180"))  # 3 minutos
    
    # Configuración de archivos
    MAX_FILE_SIZE: int = 25 * 1024 * 1024  # 25MB
    ALLOWED_AUDIO_TYPES: List[str] = ["audio/wav", "audio/mpeg", "audio/mp3"]
    
    class Config:
        env_file = ".env"

settings = Settings() 