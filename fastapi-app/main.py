from fastapi import FastAPI, UploadFile, File, Body, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from faster_whisper import WhisperModel
from pydub import AudioSegment
from transformers import pipeline
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import traceback
import os
import json
from pathlib import Path
from fastapi.responses import FileResponse
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración de la base de datos
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/auditoria_ia")

# Configuración de JWT
SECRET_KEY = os.getenv("SECRET_KEY", "tu_clave_secreta_muy_segura")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Configuración de seguridad
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Modelos Pydantic
class User(BaseModel):
    email: str
    nombre: str
    rol: str

class UserInDB(User):
    password_hash: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Funciones de utilidad
def get_db():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        yield conn
    finally:
        conn.close()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_user(conn, email: str):
    cur = conn.cursor()
    cur.execute("SELECT * FROM auditoria_ia.usuarios WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    return user

def authenticate_user(conn, email: str, password: str):
    user = get_user(conn, email)
    if not user:
        return False
    if not verify_password(password, user["password_hash"]):
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

async def get_current_user(token: str = Depends(oauth2_scheme), conn = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = get_user(conn, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

# Endpoints de autenticación
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), conn = Depends(get_db)):
    user = authenticate_user(conn, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/register")
async def register_user(email: str, password: str, nombre: str, rol: str, conn = Depends(get_db)):
    # Verificar si el usuario ya existe
    if get_user(conn, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Crear nuevo usuario
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO auditoria_ia.usuarios (email, password_hash, nombre, rol) VALUES (%s, %s, %s, %s) RETURNING id",
            (email, get_password_hash(password), nombre, rol)
        )
        conn.commit()
        return {"message": "Usuario registrado exitosamente"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()

app = FastAPI()

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
async def transcribe(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
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
async def analyze(
    text: str = Body(...),
    filename: str = Body(...),
    current_user: dict = Depends(get_current_user)
):
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
