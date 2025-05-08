# Auditoría de Llamadas IA

Sistema de análisis de llamadas utilizando inteligencia artificial para transcribir y analizar conversaciones.

## Requisitos

- Python 3.10+
- PostgreSQL 13+
- Redis (opcional)
- Nginx
- Supervisor
- Certbot (para SSL)

## Instalación en VPS

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd <nombre-del-repositorio>
```

2. Configurar las variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

3. Ejecutar el script de instalación:
```bash
chmod +x install.sh
sudo ./install.sh
```

4. Configurar el dominio:
- Editar el archivo `/etc/nginx/nginx.conf` con tu dominio
- Ejecutar `certbot --nginx -d tudominio.com -d www.tudominio.com`

5. Iniciar la aplicación:
```bash
sudo supervisorctl start auditoria_ia
```

## Estructura del Proyecto

```
/
├── app/                    # Código fuente principal (FastAPI)
│   ├── main.py            # Punto de entrada de la aplicación
│   ├── database.py        # Configuración de la base de datos
│   ├── requirements.txt   # Dependencias de Python
│   └── models/            # Modelos de datos
├── frontend/              # Frontend (React)
├── analysis/              # Scripts y herramientas de análisis
├── uploads/               # Carpeta de archivos de audio
├── docker/                # Archivos de configuración de Docker
├── nginx.conf            # Configuración de Nginx
├── install.sh            # Script de instalación
├── start.sh              # Script de inicio
└── README.md             # Este archivo
```

## Configuración

### Variables de Entorno

- `API_HOST`: Host de la API (default: 0.0.0.0)
- `API_PORT`: Puerto de la API (default: 8000)
- `API_WORKERS`: Número de workers (default: 4)
- `SECRET_KEY`: Clave secreta para JWT
- `DATABASE_URL`: URL de la base de datos
- `CORS_ORIGINS`: Orígenes permitidos para CORS
- `WHISPER_MODEL`: Modelo de Whisper a usar
- `LOG_LEVEL`: Nivel de logging
- `SMTP_*`: Configuración de email (opcional)
- `REDIS_*`: Configuración de Redis (opcional)

### Nginx

La configuración de Nginx incluye:
- SSL/TLS
- Compresión Gzip
- Caché
- Seguridad básica
- Proxy inverso para la API
- Servido de archivos estáticos

### Supervisor

Supervisor se usa para mantener la aplicación en ejecución y reiniciarla automáticamente si falla.

## Mantenimiento

### Logs

Los logs se encuentran en:
- `/var/log/auditoria_ia/access.log`
- `/var/log/auditoria_ia/error.log`
- `/var/log/auditoria_ia/supervisor.*.log`

### Backup

Se recomienda configurar backups automáticos de:
- Base de datos PostgreSQL
- Directorio `/app/uploads`
- Directorio `/app/analysis`

### Monitoreo

La aplicación incluye endpoints de monitoreo:
- `/health`: Health check básico
- `/metrics`: Métricas Prometheus (si está habilitado)

## Seguridad

- SSL/TLS obligatorio
- Headers de seguridad configurados
- Autenticación JWT
- Límites de tamaño de archivo
- CORS configurado
- Usuario no-root para la aplicación

## Contribución

1. Fork el repositorio
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles. 