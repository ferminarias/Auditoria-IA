from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt, ExpiredSignatureError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import logging

from .config import settings
from .database import get_db
from .models import User, TokenData

# Configuración de logging
logger = logging.getLogger(__name__)

# Configuración de seguridad
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña coincide con el hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Genera un hash de la contraseña."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un token JWT con tiempo de expiración."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),  # Tiempo de emisión
        "type": "access"  # Tipo de token
    })
    try:
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"Error al crear token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al generar token"
        )

async def get_token_from_cookie(request: Request) -> Optional[str]:
    """Obtiene el token JWT de la cookie."""
    try:
        return request.cookies.get("access_token")
    except Exception as e:
        logger.error(f"Error al obtener token de cookie: {str(e)}")
        return None

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """Obtiene el usuario actual basado en el token JWT de la cookie."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = await get_token_from_cookie(request)
    if not token:
        logger.warning("Intento de acceso sin token")
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logger.warning("Token sin email")
            raise credentials_exception
        token_data = TokenData(email=email)
    except ExpiredSignatureError:
        logger.warning("Token expirado")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        logger.error(f"Error al decodificar token: {str(e)}")
        raise credentials_exception
    
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        logger.warning(f"Usuario no encontrado: {email}")
        raise credentials_exception
    if not user.is_active:
        logger.warning(f"Usuario inactivo: {email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Verifica que el usuario actual esté activo."""
    if current_user.role == "disabled":
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    return current_user

async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Verifica que el usuario actual sea administrador."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador"
        )
    return current_user

def set_auth_cookie(response: Response, token: str) -> None:
    """Establece la cookie de autenticación con configuraciones de seguridad."""
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,  # Solo HTTPS
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",  # Accesible en toda la aplicación
        domain=None  # Usar el dominio actual
    )
