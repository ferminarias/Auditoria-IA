from fastapi import FastAPI, UploadFile, File, Body, HTTPException, Depends
from faster_whisper import WhisperModel
from pydub import AudioSegment
from transformers import pipeline
from fastapi.middleware.cors import CORSMiddleware
import traceback
import os
import json
from datetime import datetime, timedelta
import tempfile
from pathlib import Path
import shutil
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Usuario, Grabacion, Analisis

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
UPLOAD_DIR = Path("/app/uploads")
ANALYSIS_DIR = Path("/app/analysis")

# Crear directorios si no existen
UPLOAD_DIR.mkdir(exist_ok=True)
ANALYSIS_DIR.mkdir(exist_ok=True)

# Modelos
whisper = WhisperModel("small", device="cpu", compute_type="int8")
classifier = pipeline("text-classification", model="nlptown/bert-base-multilingual-uncased-sentiment")
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
emotion_analyzer = pipeline("text-classification", model="SamLowe/roberta-base-go_emotions")
zero_shot_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

# Configuración de seguridad
SECRET_KEY = "tu_clave_secreta_muy_segura"  # En producción, usar una clave segura
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Funciones de autenticación
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(Usuario).filter(Usuario.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

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

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Endpoints de autenticación
@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/admin/users")
async def create_user(
    nombre: str = Body(...),
    email: str = Body(...),
    password: str = Body(...),
    rol: str = Body(...),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verificar que el usuario actual es admin
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para crear usuarios")
    
    # Verificar si el usuario ya existe
    db_user = db.query(Usuario).filter(Usuario.email == email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    # Crear nuevo usuario
    hashed_password = get_password_hash(password)
    db_user = Usuario(
        email=email,
        password_hash=hashed_password,
        nombre=nombre,
        rol=rol
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return {"message": "Usuario creado exitosamente"}

@app.get("/admin/users")
async def list_users(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verificar que el usuario actual es admin
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para listar usuarios")
    
    users = db.query(Usuario).all()
    return [{"id": user.id, "nombre": user.nombre, "email": user.email, "rol": user.rol} for user in users]

@app.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verificar que el usuario actual es admin
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar usuarios")
    
    # No permitir eliminar al propio usuario
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")
    
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db.delete(user)
    db.commit()
    return {"message": "Usuario eliminado exitosamente"}

@app.put("/admin/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    rol: str = Body(...),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verificar que el usuario actual es admin
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para cambiar roles")
    
    # No permitir cambiar el rol del propio usuario
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="No puedes cambiar tu propio rol")
    
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user.rol = rol
    db.commit()
    return {"message": "Rol actualizado exitosamente"}

# Crear superusuario inicial
@app.post("/initialize-admin")
async def initialize_admin(db: Session = Depends(get_db)):
    # Verificar si ya existe algún usuario
    if db.query(Usuario).first():
        raise HTTPException(status_code=400, detail="La base de datos ya está inicializada")
    
    # Crear superusuario
    hashed_password = get_password_hash("admin232323")
    admin_user = Usuario(
        email="adminagusfer@example.com",
        password_hash=hashed_password,
        nombre="adminagusfer",
        rol="admin"
    )
    db.add(admin_user)
    db.commit()
    return {"message": "Superusuario creado exitosamente"}

# Middleware para verificar token
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(Usuario).filter(Usuario.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# Proteger rutas que requieren autenticación
@app.get("/users/me")
async def read_users_me(current_user: Usuario = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "nombre": current_user.nombre,
        "rol": current_user.rol
    }

@app.get("/api/recordings/stats")
async def get_recordings_stats(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Obtener todas las grabaciones del usuario
    recordings = db.query(Grabacion).filter(
        Grabacion.usuario_id == current_user.id
    ).all()
    
    if not recordings:
        return {
            "total": 0,
            "lastAnalyzed": None,
            "avgSatisfaction": 0,
            "generalStatus": "Sin grabaciones"
        }
    
    # Calcular estadísticas
    total = len(recordings)
    last_analyzed = max(recordings, key=lambda x: x.fecha_grabacion).fecha_grabacion
    
    # Calcular satisfacción promedio
    satisfaction_sum = 0
    satisfaction_count = 0
    positive_count = 0
    negative_count = 0
    neutral_count = 0
    
    for rec in recordings:
        if rec.analisis and rec.analisis[0].resultado:
            satisfaction = rec.analisis[0].resultado["detailed_analysis"]["satisfaction"]
            satisfaction_sum += satisfaction
            satisfaction_count += 1
            
            quality = rec.analisis[0].resultado["detailed_analysis"]["emotion_analysis"]["interaction_quality"]
            if quality == "POSITIVA":
                positive_count += 1
            elif quality == "NEGATIVA":
                negative_count += 1
            else:
                neutral_count += 1
    
    avg_satisfaction = (satisfaction_sum / satisfaction_count * 20) if satisfaction_count > 0 else 0
    
    # Determinar estado general
    if positive_count > negative_count and positive_count > neutral_count:
        general_status = "POSITIVO"
    elif negative_count > positive_count and negative_count > neutral_count:
        general_status = "NEGATIVO"
    else:
        general_status = "NEUTRAL"
    
    return {
        "total": total,
        "lastAnalyzed": last_analyzed,
        "avgSatisfaction": avg_satisfaction,
        "generalStatus": general_status
    }

@app.get("/api/recordings")
async def list_recordings(
    current_user: Usuario = Depends(get_current_user),
    date_from: str = None,
    date_to: str = None,
    status: str = None,
    db: Session = Depends(get_db)
):
    # Siempre filtrar por el usuario actual
    query = db.query(Grabacion).filter(Grabacion.usuario_id == current_user.id)
    
    if date_from:
        query = query.filter(Grabacion.fecha_grabacion >= date_from)
    if date_to:
        query = query.filter(Grabacion.fecha_grabacion <= date_to)
    if status:
        query = query.filter(Grabacion.estado == status)
    
    recordings = query.order_by(Grabacion.fecha_grabacion.desc()).all()
    
    return [
        {
            "id": rec.id,
            "nombre_archivo": rec.nombre_archivo,
            "duracion": rec.duracion,
            "fecha_grabacion": rec.fecha_grabacion,
            "estado": rec.estado,
            "transcription": rec.metadata.get("transcription", ""),
            "analysis": rec.analisis[0].resultado if rec.analisis else None
        }
        for rec in recordings
    ]

@app.post("/api/recordings/{recording_id}/download")
async def download_recording_analysis(
    recording_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recording = db.query(Grabacion).filter(
        Grabacion.id == recording_id,
        Grabacion.usuario_id == current_user.id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Grabación no encontrada")
    
    analysis = recording.analisis[0] if recording.analisis else None
    if not analysis:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")
    
    # Generar nombre de archivo
    filename = f"analisis_{recording.nombre_archivo}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    # Crear el contenido del archivo
    content = {
        "recording": {
            "nombre": recording.nombre_archivo,
            "duracion": recording.duracion,
            "fecha": recording.fecha_grabacion.isoformat(),
            "transcription": recording.metadata.get("transcription", "")
        },
        "analysis": analysis.resultado
    }
    
    # Guardar temporalmente y devolver
    temp_path = ANALYSIS_DIR / filename
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=4)
    
    return FileResponse(
        path=temp_path,
        filename=filename,
        media_type="application/json"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
