#!/bin/bash

# Crear directorios necesarios
mkdir -p /app/uploads /app/analysis /app/cache /var/log/auditoria_ia

# Configurar permisos
chown -R appuser:appuser /app/uploads /app/analysis /app/cache
chmod -R 750 /app/uploads /app/analysis
chmod -R 777 /app/cache

# Iniciar PostgreSQL si no está corriendo
if ! pg_isready -h localhost -p 5432; then
    echo "Iniciando PostgreSQL..."
    service postgresql start
fi

# Esperar a que PostgreSQL esté listo
while ! pg_isready -h localhost -p 5432; do
    echo "Esperando a PostgreSQL..."
    sleep 1
done

# Iniciar Redis si está configurado
if [ -n "$REDIS_HOST" ]; then
    if ! redis-cli ping > /dev/null 2>&1; then
        echo "Iniciando Redis..."
        service redis-server start
    fi
fi

# Iniciar la aplicación
echo "Iniciando la aplicación..."
cd /app
source venv/bin/activate

# Iniciar Gunicorn
gunicorn app.main:app \
    --workers $API_WORKERS \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind $API_HOST:$API_PORT \
    --log-level $LOG_LEVEL \
    --access-logfile /var/log/auditoria_ia/access.log \
    --error-logfile /var/log/auditoria_ia/error.log \
    --capture-output \
    --enable-stdio-inheritance \
    --daemon

# Iniciar Nginx
echo "Iniciando Nginx..."
nginx -g 'daemon off;' 