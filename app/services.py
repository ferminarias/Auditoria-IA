import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from faster_whisper import WhisperModel
from transformers import pipeline, AutoTokenizer
import torch
from pydub import AudioSegment
import tempfile
import redis
from functools import lru_cache
import asyncio
from concurrent.futures import ThreadPoolExecutor
import gc

from .config import settings
from .models import Recording, Analysis, User

# Configuración de logging
logger = logging.getLogger(__name__)

# Inicialización de Redis
redis_client = None
if settings.REDIS_HOST:
    try:
        redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            db=settings.REDIS_DB,
            decode_responses=True,
            max_connections=10  # Limitar conexiones
        )
    except Exception as e:
        logger.error(f"Error al conectar con Redis: {str(e)}")

# Inicialización de modelos con manejo de errores
try:
    whisper = WhisperModel(
        settings.WHISPER_MODEL,
        device=settings.MODEL_DEVICE,
        compute_type=settings.MODEL_COMPUTE_TYPE,
        num_workers=settings.WHISPER_NUM_WORKERS,
        beam_size=settings.WHISPER_BEAM_SIZE,
        download_root=settings.TRANSFORMERS_CACHE
    )
    logger.info(f"Modelo Whisper cargado: {settings.WHISPER_MODEL}")
except Exception as e:
    logger.error(f"Error al cargar modelo Whisper: {str(e)}")
    whisper = None

# Inicialización de modelos de análisis
models = {}
tokenizers = {}

def load_model(model_name: str, task: str, model_id: str) -> None:
    """Carga un modelo específico con manejo de memoria."""
    try:
        models[model_name] = pipeline(
            task,
            model=model_id,
            device=settings.MODEL_DEVICE,
            batch_size=settings.MODEL_BATCH_SIZE,
            model_kwargs={"low_cpu_mem_usage": True}
        )
        tokenizers[model_name] = AutoTokenizer.from_pretrained(
            model_id,
            low_cpu_mem_usage=True
        )
        logger.info(f"Modelo {model_name} cargado correctamente")
    except Exception as e:
        logger.error(f"Error al cargar modelo {model_name}: {str(e)}")

try:
    # Cargar modelos uno por uno para mejor manejo de memoria
    load_model('sentiment', 'text-classification', 'nlptown/bert-base-multilingual-uncased-sentiment')
    load_model('summarizer', 'summarization', 'facebook/bart-large-cnn')
    load_model('emotion', 'text-classification', 'SamLowe/roberta-base-go_emotions')
    load_model('zero_shot', 'zero-shot-classification', 'facebook/bart-large-mnli')
    
    logger.info("Modelos de análisis cargados correctamente")
except Exception as e:
    logger.error(f"Error al cargar modelos de análisis: {str(e)}")
    models = {}
    tokenizers = {}

# Pool de workers para procesamiento en paralelo
executor = ThreadPoolExecutor(
    max_workers=settings.MAX_CONCURRENT_TRANSCRIPTIONS + settings.MAX_CONCURRENT_ANALYSES
)

@lru_cache(maxsize=500)  # Reducido para menor uso de memoria
def get_cached_analysis(text: str) -> Optional[Dict[str, Any]]:
    """Obtiene el análisis desde la caché."""
    if redis_client:
        try:
            cached = redis_client.get(f"analysis:{text}")
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.error(f"Error al obtener de caché: {str(e)}")
    return None

def cache_analysis(text: str, analysis: Dict[str, Any]) -> None:
    """Guarda el análisis en la caché."""
    if redis_client:
        try:
            redis_client.setex(
                f"analysis:{text}",
                settings.CACHE_TTL,
                json.dumps(analysis)
            )
        except Exception as e:
            logger.error(f"Error al guardar en caché: {str(e)}")

async def process_audio_chunk(chunk_path: str) -> str:
    """Procesa un chunk de audio en un hilo separado."""
    try:
        segments, _ = whisper.transcribe(
            chunk_path,
            batch_size=settings.WHISPER_BATCH_SIZE
        )
        result = " ".join([segment.text for segment in segments])
        # Limpiar memoria
        del segments
        gc.collect()
        return result
    except Exception as e:
        logger.error(f"Error al procesar chunk: {str(e)}")
        raise

async def transcribe_audio(file: UploadFile) -> str:
    """Transcribe un archivo de audio a texto usando procesamiento en paralelo."""
    if not whisper:
        raise HTTPException(
            status_code=503,
            detail="El servicio de transcripción no está disponible"
        )

    try:
        # Guardar archivo temporalmente
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        # Convertir a WAV si es necesario
        if not file.filename.lower().endswith('.wav'):
            audio = AudioSegment.from_file(temp_path)
            audio.export(temp_path, format="wav")
            del audio
            gc.collect()

        # Dividir el audio en chunks más pequeños
        audio = AudioSegment.from_wav(temp_path)
        chunk_length = 180000  # 3 minutos en milisegundos
        chunks = [audio[i:i+chunk_length] for i in range(0, len(audio), chunk_length)]
        del audio
        gc.collect()
        
        # Procesar chunks en paralelo
        chunk_paths = []
        for i, chunk in enumerate(chunks):
            chunk_path = f"{temp_path}_chunk_{i}.wav"
            chunk.export(chunk_path, format="wav")
            chunk_paths.append(chunk_path)
            del chunk
            gc.collect()

        # Procesar chunks en paralelo
        loop = asyncio.get_event_loop()
        tasks = [
            loop.run_in_executor(executor, process_audio_chunk, chunk_path)
            for chunk_path in chunk_paths
        ]
        transcriptions = await asyncio.gather(*tasks)

        # Limpiar archivos temporales
        for path in [temp_path] + chunk_paths:
            try:
                os.unlink(path)
            except Exception as e:
                logger.warning(f"Error al eliminar archivo temporal {path}: {str(e)}")

        return " ".join(transcriptions)

    except Exception as e:
        logger.error(f"Error en transcripción: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error al procesar el archivo de audio"
        )
    finally:
        # Limpiar memoria
        gc.collect()

async def analyze_text(text: str) -> Dict[str, Any]:
    """Analiza el texto transcrito usando procesamiento en paralelo."""
    # Verificar caché
    cached = get_cached_analysis(text)
    if cached:
        return cached

    if not all(models.values()):
        raise HTTPException(
            status_code=503,
            detail="Los servicios de análisis no están disponibles"
        )

    try:
        # Preparar tareas para procesamiento en paralelo
        loop = asyncio.get_event_loop()
        
        # Análisis de sentimiento
        sentiment_task = loop.run_in_executor(
            executor,
            lambda: models['sentiment'](
                text,
                truncation=True,
                max_length=settings.MODEL_MAX_LENGTH,
                return_tensors="pt"
            )[0]
        )
        
        # Resumen
        summary_task = loop.run_in_executor(
            executor,
            lambda: models['summarizer'](
                text,
                max_length=130,
                min_length=30,
                do_sample=False,
                truncation=True,
                return_tensors="pt"
            )[0]
        )
        
        # Análisis de emociones
        emotion_task = loop.run_in_executor(
            executor,
            lambda: models['emotion'](
                text,
                truncation=True,
                max_length=settings.MODEL_MAX_LENGTH,
                return_tensors="pt"
            )[0]
        )
        
        # Categorización
        categories = ["atención al cliente", "ventas", "soporte técnico", "reclamaciones"]
        categorization_task = loop.run_in_executor(
            executor,
            lambda: models['zero_shot'](
                text,
                categories,
                truncation=True,
                max_length=settings.MODEL_MAX_LENGTH,
                return_tensors="pt"
            )[0]
        )

        # Esperar resultados
        sentiment, summary, emotions, categorization = await asyncio.gather(
            sentiment_task, summary_task, emotion_task, categorization_task
        )

        analysis = {
            "sentiment": sentiment,
            "summary": summary["summary_text"],
            "emotions": emotions,
            "categorization": {
                "category": categorization["labels"][0],
                "score": float(categorization["scores"][0])
            },
            "timestamp": datetime.now().isoformat()
        }

        # Guardar en caché
        cache_analysis(text, analysis)

        return analysis

    except Exception as e:
        logger.error(f"Error en análisis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error al analizar el texto"
        )
    finally:
        # Limpiar memoria
        gc.collect()

async def save_analysis(
    analysis: Dict[str, Any],
    filename: str,
    user_id: int,
    db: Session
) -> None:
    """Guarda el análisis en la base de datos."""
    try:
        recording = Recording(
            user_id=user_id,
            filename=filename,
            status="completado",
            metadata=analysis
        )
        db.add(recording)
        db.commit()
        db.refresh(recording)

        analysis_record = Analysis(
            recording_id=recording.id,
            type="completo",
            result=analysis
        )
        db.add(analysis_record)
        db.commit()

    except Exception as e:
        logger.error(f"Error al guardar análisis: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Error al guardar el análisis"
        )

async def get_recording_stats(db: Session) -> Dict[str, Any]:
    """Obtiene estadísticas de las grabaciones."""
    try:
        total = db.query(Recording).count()
        completed = db.query(Recording).filter(Recording.status == "completado").count()
        pending = db.query(Recording).filter(Recording.status == "pendiente").count()
        error = db.query(Recording).filter(Recording.status == "error").count()

        return {
            "total": total,
            "completed": completed,
            "pending": pending,
            "error": error
        }

    except Exception as e:
        logger.error(f"Error al obtener estadísticas: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error al obtener estadísticas"
        )

def validate_audio_file(file: UploadFile) -> bool:
    """Valida que el archivo sea un formato de audio soportado."""
    allowed_types = {
        "audio/mpeg": [".mp3"],
        "audio/mp4": [".m4a"],
        "audio/wav": [".wav"],
        "audio/x-wav": [".wav"]
    }
    
    file_ext = Path(file.filename).suffix.lower()
    content_type = file.content_type
    
    if content_type not in allowed_types:
        return False
    
    if file_ext not in [ext for exts in allowed_types.values() for ext in exts]:
        return False
        
    return True 