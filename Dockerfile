# Etapa 1: Construir el frontend
FROM node:18-slim AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --platform=linux --arch=x64
COPY frontend/ .
RUN npm install && \
    chmod -R 777 /frontend && \
    npx tsc && \
    npx vite build

# Etapa 2: Backend
FROM python:3.10-slim AS backend

# Crear usuario no-root
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl libpq-dev gcc python3-dev git && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Crear entorno virtual
RUN python3 -m venv /app/venv

# Instalar dependencias de Python
COPY app/requirements.txt .
RUN /app/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /app/venv/bin/pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY --chown=appuser:appuser app/ ./



# Copiar el frontend construido
COPY --from=frontend-builder --chown=appuser:appuser /frontend/dist/ /app/static/

# Crear carpetas necesarias y dar permisos correctos
RUN mkdir -p /app/uploads /app/analysis /app/cache/hub && \
    chown -R appuser:appuser /app/uploads /app/analysis /app/cache && \
    chmod -R 777 /app/cache && \
    chmod -R 750 /app/uploads /app/analysis

# Variables de entorno
ENV PYTHONUNBUFFERED=1 \
    PATH="/app/venv/bin:$PATH" \
    MODEL_PATH=/app/models \
    PORT=8000 \
    DATABASE_URL=postgresql://postgres:postgres@db:5432/auditoria_ia \
    TRANSFORMERS_CACHE=/app/cache \
    HF_HOME=/app/cache \
    HF_DATASETS_CACHE=/app/cache

# Exponer puerto
EXPOSE ${PORT}

# Volúmenes
VOLUME ["/app/uploads", "/app/analysis"]

# Cambiar al usuario no-root
USER appuser

# Healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Comando de inicio
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
