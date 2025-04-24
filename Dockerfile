# Etapa 1: Construir el frontend
FROM node:18 AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
RUN npm run build && ls -la dist/

# Etapa 2: Construir el backend
FROM python:3.10-slim AS backend

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copiar y instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar archivos del backend
COPY main.py .
COPY test_transcribe_and_analyze.py .

# Crear directorios necesarios
RUN mkdir -p /app/uploads /app/analysis /app/static

# Copiar el frontend construido
COPY --from=frontend-builder /frontend/dist/. /app/static/
RUN ls -la /app/static/

# Configurar volúmenes
VOLUME ["/app/uploads", "/app/analysis"]

# Variables de entorno
ENV PYTHONUNBUFFERED=1
ENV MODEL_PATH=/app/models

# Exponer puerto
EXPOSE 8000

# Comando para ejecutar la aplicación
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
