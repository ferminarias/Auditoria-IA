# Auditoria IA

Este proyecto es una aplicación FastAPI que permite transcribir y analizar archivos de audio, proporcionando análisis detallado de sentimiento, emoción y categorización.

## Características

- Transcripción de audio usando Whisper
- Análisis de sentimiento
- Análisis de emoción
- Categorización de llamadas
- Resumen automático
- Análisis de tono
- API RESTful
<<<<<<< HEAD
- Base de datos PostgreSQL
- Sistema de autenticación
- Gestión de clientes y usuarios
=======
>>>>>>> ea75b391a6cfa88ac04af222aeba605a0bf13dc8

## Requisitos

- Python 3.8+
<<<<<<< HEAD
- PostgreSQL 12+
=======
>>>>>>> ea75b391a6cfa88ac04af222aeba605a0bf13dc8
- FastAPI
- Faster Whisper
- Transformers
- Pydub

## Instalación

1. Clonar el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd fastapi-app
```

2. Crear un entorno virtual:
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

<<<<<<< HEAD
4. Configurar variables de entorno:
   - Crear un archivo `.env` en la raíz del proyecto
   - Copiar el siguiente contenido y ajustar según sea necesario:
   ```env
   # Configuración de la base de datos
   DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/auditoria_ia

   # Configuración de seguridad
   SECRET_KEY=reemplazar_con_tu_clave_secreta
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30

   # Configuración de la aplicación
   APP_NAME=Auditoria IA
   DEBUG=True
   ENVIRONMENT=development

   # Configuración de almacenamiento
   UPLOAD_DIR=uploads
   ANALYSIS_DIR=analysis
   ```

5. Configurar la base de datos:
   - Crear una base de datos PostgreSQL llamada `auditoria_ia`
   - Ejecutar las migraciones:
   ```bash
   alembic upgrade head
   ```

=======
>>>>>>> ea75b391a6cfa88ac04af222aeba605a0bf13dc8
## Uso

1. Iniciar el servidor:
```bash
uvicorn main:app --reload
```

2. Acceder a la interfaz web:
```
http://localhost:8000
```

## API Endpoints

- `POST /api/transcribe/`: Transcribe un archivo de audio
- `POST /api/analyze/`: Analiza el texto transcrito
<<<<<<< HEAD
- `POST /api/auth/login`: Iniciar sesión
- `POST /api/auth/register`: Registrar nuevo usuario
- `GET /api/clientes/`: Listar clientes
- `POST /api/clientes/`: Crear cliente
- `GET /api/usuarios/`: Listar usuarios
- `POST /api/usuarios/`: Crear usuario
=======
>>>>>>> ea75b391a6cfa88ac04af222aeba605a0bf13dc8

## Estructura del Proyecto

```
fastapi-app/
<<<<<<< HEAD
├── app/
│   ├── models/          # Modelos de la base de datos
│   ├── schemas/         # Esquemas Pydantic
│   ├── database.py      # Configuración de la base de datos
│   └── main.py          # Aplicación principal
├── alembic/             # Migraciones de la base de datos
=======
├── main.py              # Aplicación principal
├── requirements.txt     # Dependencias
>>>>>>> ea75b391a6cfa88ac04af222aeba605a0bf13dc8
├── static/             # Archivos estáticos
├── uploads/            # Directorio para archivos subidos
└── analysis/           # Directorio para análisis guardados
```

## Licencia

MIT 