# Stage 1: Build the frontend
FROM node:18-slim AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./

# Instalar dependencias con --platform=linux
RUN --mount=type=cache,target=/root/.npm npm ci --platform=linux --arch=x64

COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend
FROM python:3.10-slim AS backend

# Create non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install system dependencies securely
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    libpq-dev \
    gcc \
    python3-dev \
    git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    chown -R appuser:appuser /app

# Copy and install Python dependencies
COPY --chown=appuser:appuser app/requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip pip install --no-cache-dir -r requirements.txt && \
    rm -rf /root/.cache/pip

# Copy backend files
COPY --chown=appuser:appuser app/main.py ./
COPY --chown=appuser:appuser app/test_transcribe_and_analyze.py ./
COPY --chown=appuser:appuser app/database.py ./
COPY --chown=appuser:appuser app/models/ ./models/

# Create necessary directories with proper permissions
RUN mkdir -p /app/uploads /app/analysis /app/static /app/cache && \
    chown -R appuser:appuser /app/uploads /app/analysis /app/static /app/cache && \
    chmod -R 750 /app/uploads /app/analysis /app/static /app/cache

# Copy the built frontend
COPY --from=frontend-builder --chown=appuser:appuser /frontend/dist/. /app/static/

# Configure volumes
VOLUME ["/app/uploads", "/app/analysis", "/app/cache"]

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    MODEL_PATH=/app/models \
    PORT=8000 \
    DATABASE_URL=postgresql://postgres:postgres@db:5432/auditoria_ia \
    TRANSFORMERS_CACHE=/app/cache \
    HF_HOME=/app/cache \
    HF_DATASETS_CACHE=/app/cache

# Expose port
EXPOSE ${PORT}

# Switch to non-root user
USER appuser

# Healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/ || exit 1

# Command to run the application
CMD uvicorn main:app --host 0.0.0.0 --port $PORT --reload
