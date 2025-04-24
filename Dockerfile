# Etapa 1: Construir el frontend
FROM node:18-slim AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --only=production

COPY frontend/ .
RUN npm run build && ls -la dist/

# Etapa 2: Construir el backend
FROM python:3.10-slim AS backend

# Crear usuario no-root
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Instalar dependencias del sistema de forma segura
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg=7:4.4.2-0ubuntu0.22.04.1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && chown -R appuser:appuser /app

# Copiar y instalar dependencias de Python
COPY --chown=appuser:appuser app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar archivos del backend
COPY --chown=appuser:appuser app/main.py .
COPY --chown=appuser:appuser app/test_transcribe_and_analyze.py .

# Crear directorios necesarios con permisos adecuados
RUN mkdir -p /app/uploads /app/analysis /app/static && \
    chown -R appuser:appuser /app/uploads /app/analysis /app/static && \
    chmod -R 750 /app/uploads /app/analysis /app/static

# Copiar el frontend construido
COPY --from=frontend-builder --chown=appuser:appuser /frontend/dist/. /app/static/

# Configurar volúmenes
VOLUME ["/app/uploads", "/app/analysis"]

# Variables de entorno
ENV PYTHONUNBUFFERED=1 \
    MODEL_PATH=/app/models \
    PORT=8000

# Exponer puerto
EXPOSE ${PORT}

# Cambiar al usuario no-root
USER appuser

# Healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/ || exit 1

# Comando para ejecutar la aplicación
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${PORT}", "--reload"] 