from fastapi import FastAPI, UploadFile, File, Body, HTTPException
from faster_whisper import WhisperModel
from pydub import AudioSegment
from transformers import pipeline
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import traceback
import os
import json
from datetime import datetime
import tempfile
from pathlib import Path
import shutil
from fastapi.responses import FileResponse

app = FastAPI(title="FastAPI App")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurar directorios
STATIC_DIR = Path("/app/static")
UPLOAD_DIR = Path("/app/uploads")
ANALYSIS_DIR = Path("/app/analysis")

# Crear directorios si no existen
STATIC_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)
ANALYSIS_DIR.mkdir(exist_ok=True)

# Montar archivos estáticos después de las rutas API
app.mount("/static", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

# Modelos
whisper = WhisperModel("small", device="cpu", compute_type="int8")
classifier = pipeline("text-classification", model="nlptown/bert-base-multilingual-uncased-sentiment")
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
emotion_analyzer = pipeline("text-classification", model="SamLowe/roberta-base-go_emotions")
zero_shot_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

def validate_audio_file(file: UploadFile) -> bool:
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

@app.post("/api/transcribe/")
async def transcribe(file: UploadFile = File(...)):
    try:
        if not validate_audio_file(file):
            raise HTTPException(status_code=400, detail="Tipo de archivo no soportado")

        print(f"📥 Archivo recibido: {file.filename}")
        audio = await file.read()
        print(f"📏 Tamaño del archivo: {len(audio)} bytes")

        # Usar un directorio temporal para los archivos
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_dir = Path(temp_dir)
            temp_mp3 = temp_dir / "temp_input.mp3"
            temp_wav = temp_dir / "temp_audio.wav"

            # Guardar archivo temporal
            with open(temp_mp3, "wb") as f:
                f.write(audio)
            print("💾 Archivo temporal guardado")

            # Convertir a WAV
            sound = AudioSegment.from_file(str(temp_mp3))
            sound.export(str(temp_wav), format="wav")
            print("🔁 Conversión a WAV completada")

            # Transcripción
            print("🚀 Enviando a Whisper...")
            segments, _ = whisper.transcribe(str(temp_wav))
            transcription = " ".join([seg.text for seg in segments])
            print("✅ Transcripción completada")

        return {"text": transcription}

    except Exception as e:
        print("❌ ERROR en la transcripción:")
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze/")
async def analyze(text: str = Body(...), filename: str = Body(...)):
    try:
        if not text:
            raise HTTPException(status_code=400, detail="El texto no puede estar vacío")

        print("📊 Texto recibido para análisis:")
        print(text)

        # Análisis de sentimiento base
        result = classifier(text)
        print("✅ Análisis completado:", result)

        # Generar resumen de la llamada
        summary = summarizer(text, max_length=130, min_length=30, do_sample=False)
        call_summary = summary[0]['summary_text']

        # Análisis de emoción
        emotion_result = emotion_analyzer(text)
        emotion = emotion_result[0]['label']

        # Categorización de llamada
        categories = ["CONSULTA", "RECLAMO", "SOLICITUD", "INFORMACIÓN", "QUEJA"]
        category_result = zero_shot_classifier(text, categories)
        call_category = category_result['labels'][0]

        # Análisis de tono
        tones = ["PROFESIONAL", "EMPÁTICO", "NEUTRAL", "DEFENSIVO", "AGRESIVO"]
        tone_result = zero_shot_classifier(text, tones)
        tone = tone_result['labels'][0]

        # Mapeo específico para servicio al cliente
        sentiment_map = {
            "1 star": {
                "satisfaction": "MUY INSATISFECHO",
                "urgency": "ALTA",
                "resolution": "NO RESUELTO",
                "tone": "NEGATIVO"
            },
            "2 stars": {
                "satisfaction": "INSATISFECHO",
                "urgency": "MEDIA",
                "resolution": "PARCIALMENTE RESUELTO",
                "tone": "LEVEMENTE NEGATIVO"
            },
            "3 stars": {
                "satisfaction": "NEUTRAL",
                "urgency": "BAJA",
                "resolution": "EN PROCESO",
                "tone": "NEUTRAL"
            },
            "4 stars": {
                "satisfaction": "SATISFECHO",
                "urgency": "BAJA",
                "resolution": "RESUELTO",
                "tone": "POSITIVO"
            },
            "5 stars": {
                "satisfaction": "MUY SATISFECHO",
                "urgency": "BAJA",
                "resolution": "COMPLETAMENTE RESUELTO",
                "tone": "MUY POSITIVO"
            }
        }
        
        # Obtener el análisis base
        base_analysis = sentiment_map[result[0]["label"]]
        
        # Crear análisis completo
        analysis = {
            "summary": call_summary,
            "detailed_analysis": {
                "satisfaction": float(result[0]["label"].split()[0]),  # Convertir "X stars" a número
                "urgency": 1.0 if base_analysis["urgency"] == "ALTA" else 0.5 if base_analysis["urgency"] == "MEDIA" else 0.0,
                "resolution_status": base_analysis["resolution"],
                "emotion_analysis": {
                    "dominant_emotion": emotion,
                    "emotion_scores": {
                        "satisfaction": result[0]["score"],
                        "professionalism": 1.0 if tone == "PROFESIONAL" else 0.5 if tone == "NEUTRAL" else 0.0,
                        "empathy": 1.0 if tone == "EMPÁTICO" else 0.5 if tone == "NEUTRAL" else 0.0
                    },
                    "interaction_quality": "POSITIVA" if base_analysis["satisfaction"] in ["SATISFECHO", "MUY SATISFECHO"] else "NEGATIVA" if base_analysis["satisfaction"] in ["INSATISFECHO", "MUY INSATISFECHO"] else "NEUTRAL"
                }
            }
        }

        # Guardar análisis en archivo JSON
        safe_filename = "".join(c for c in filename if c.isalnum() or c in "._- ")
        output_filename = ANALYSIS_DIR / f"devolucion_{safe_filename}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(output_filename, "w", encoding="utf-8") as f:
            json.dump(analysis, f, ensure_ascii=False, indent=4)

        return {"analysis": analysis, "saved_to": str(output_filename)}

    except Exception as e:
        print("❌ ERROR durante el análisis:")
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

# Servir el frontend
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    static_dir = Path("static")
    requested_path = static_dir / full_path
    
    if not requested_path.exists() or not requested_path.is_file():
        return FileResponse(static_dir / "index.html")
        
    return FileResponse(requested_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
