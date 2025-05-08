#!/bin/bash

# Actualizar sistema
apt-get update
apt-get upgrade -y

# Instalar dependencias del sistema
apt-get install -y \
    python3.10 \
    python3.10-venv \
    python3-pip \
    postgresql \
    postgresql-contrib \
    nginx \
    redis-server \
    ffmpeg \
    curl \
    git \
    supervisor

# Crear usuario de la aplicación
useradd -m -s /bin/bash appuser

# Crear directorios
mkdir -p /app/uploads /app/analysis /app/cache /var/log/auditoria_ia

# Configurar permisos
chown -R appuser:appuser /app
chmod -R 750 /app/uploads /app/analysis
chmod -R 777 /app/cache

# Configurar PostgreSQL
sudo -u postgres psql -c "CREATE USER appuser WITH PASSWORD 'tu_contraseña_segura';"
sudo -u postgres psql -c "CREATE DATABASE auditoria_ia OWNER appuser;"
sudo -u postgres psql -d auditoria_ia -f /app/docker/init.sql

# Configurar Python
python3 -m venv /app/venv
source /app/venv/bin/activate
pip install --upgrade pip
pip install gunicorn uvicorn

# Configurar Nginx
cp nginx.conf /etc/nginx/nginx.conf

# Configurar Supervisor
cat > /etc/supervisor/conf.d/auditoria_ia.conf << EOL
[program:auditoria_ia]
command=/app/start.sh
user=appuser
autostart=true
autorestart=true
stderr_logfile=/var/log/auditoria_ia/supervisor.err.log
stdout_logfile=/var/log/auditoria_ia/supervisor.out.log
EOL

# Reiniciar servicios
systemctl restart postgresql
systemctl restart redis-server
systemctl restart nginx
supervisorctl reload

echo "Instalación completada. Por favor, configura las variables de entorno en /app/.env" 