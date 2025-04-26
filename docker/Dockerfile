# Stage 1: Build the frontend
FROM node:18-slim AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./

# Asegura que traiga devDependencies (typescript, vite, etc.)
ENV NODE_ENV=development

# Instala TODO (prod + dev) y herramientas de desarrollo globalmente
RUN npm ci && \
    npm install -g typescript@5.2.2 vite@latest

COPY frontend/ ./

RUN npm run build   # ahora tsc y vite estarán disponibles

# Stage 2: Build the backend
FROM python:3.10-slim AS backend-builder

# Create a non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install system dependencies
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

# Configure pip to use a more reliable mirror
RUN pip config set global.index-url https://pypi.org/simple && \
    pip config set global.trusted-host pypi.org

# Copy requirements first to leverage Docker cache
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install numpy==1.24.3  # Fijamos la versión de numpy para compatibilidad

# Copy backend files
COPY --chown=appuser:appuser app/ ./

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
    HF_DATASETS_CACHE=/app/cache \
    HOME=/app

# Expose port
EXPOSE ${PORT}

# Switch to non-root user
USER appuser

# Healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/ || exit 1

# Command to run the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Stage 3: Final image
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    libpq-dev \
    gcc \
    python3-dev \
    git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Configure pip to use a more reliable mirror
RUN pip config set global.index-url https://pypi.org/simple && \
    pip config set global.trusted-host pypi.org

# Copy requirements and install dependencies
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install numpy==1.24.3  # Fijamos la versión de numpy para compatibilidad

# Copy built frontend from frontend-builder
COPY --from=frontend-builder /frontend/dist /app/static

# Copy backend from backend-builder
COPY --from=backend-builder /app /app
COPY --from=backend-builder /etc/passwd /etc/passwd

# Create necessary directories
RUN mkdir -p /app/uploads /app/analysis /app/cache && \
    chmod -R 750 /app/uploads /app/analysis /app/cache

# Set environment variables
ENV HOME=/app \
    TRANSFORMERS_CACHE=/app/cache \
    HF_HOME=/app/cache \
    HF_DATASETS_CACHE=/app/cache

# Use non-root user
USER appuser

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
