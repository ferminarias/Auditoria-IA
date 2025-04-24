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

## Requisitos

- Python 3.8+
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

## Estructura del Proyecto

```
fastapi-app/
├── main.py              # Aplicación principal
├── requirements.txt     # Dependencias
├── static/             # Archivos estáticos
├── uploads/            # Directorio para archivos subidos
└── analysis/           # Directorio para análisis guardados
```

## Licencia

MIT 