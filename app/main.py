from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import json
import logging
from datetime import datetime, timedelta
import jwt
from pathlib import Path

# Importaciones locales
from .database import get_db, init_db
from .auth import (
    get_current_user,
    create_access_token,
    verify_password,
    get_password_hash
)
from .models import (
    User,
    Recording,
    Analysis,
    UserCreate,
    Token,
    RecordingCreate,
    AnalysisCreate
)
from .config import settings
from .services import (
    transcribe_audio,
    analyze_text,
    save_analysis,
    get_recording_stats
)

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="API de Análisis de Audio")

# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar directorios estáticos
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/analysis", StaticFiles(directory="analysis"), name="analysis")

# Constantes para validación de archivos
ALLOWED_AUDIO_TYPES = {
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/x-m4a": ".m4a"
}

def validate_audio_file(file: UploadFile) -> None:
    """Valida que el archivo sea de un tipo de audio permitido."""
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido. Tipos permitidos: {', '.join(ALLOWED_AUDIO_TYPES.values())}"
        )

# Endpoints de autenticación
@app.post("/token", response_model=Token)
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Credenciales inválidas"
        )
    access_token = create_access_token(data={"sub": user.email})
    
    # Establecer cookie httpOnly
    set_auth_cookie(response, access_token)
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/logout")
async def logout(response: Response):
    """Cierra la sesión eliminando la cookie."""
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=True,
        samesite="lax"
    )
    return {"message": "Sesión cerrada correctamente"}

# Endpoints de transcripción y análisis
@app.post("/api/transcribe/")
async def transcribe_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Validar tipo de archivo
        validate_audio_file(file)
        
        text = await transcribe_audio(file)
        return {"text": text}
    except Exception as e:
        logger.error(f"Error en transcripción: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze/")
async def analyze_endpoint(
    text: str = Form(...),
    filename: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        analysis = await analyze_text(text)
        await save_analysis(analysis, filename, current_user.id, db)
        return {"analysis": analysis}
    except Exception as e:
        logger.error(f"Error en análisis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoints de grabaciones
@app.get("/api/recordings", response_model=List[Recording])
async def get_recordings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 10
):
    recordings = db.query(Recording).filter(
        Recording.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return recordings

@app.get("/api/recordings/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await get_recording_stats(current_user.id, db)

# Inicialización
@app.on_event("startup")
async def startup_event():
    init_db()
    logger.info("Aplicación iniciada")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.API_RELOAD
    )
