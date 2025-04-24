# Auditoría de Llamadas IA

Sistema de análisis de llamadas utilizando inteligencia artificial para transcribir y analizar conversaciones.

## Requisitos

- Docker y Docker Compose
- Python 3.10+
- Node.js 18+

## Configuración

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd <nombre-del-repositorio>
```

2. Configurar las variables de entorno necesarias en tu sistema.

## Ejecución

1. Construir y levantar los contenedores:
```bash
docker-compose up --build
```

2. Acceder a la aplicación:
- Frontend: http://localhost:8000
- API: http://localhost:8000/api

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
├── fastapi-app/           # Carpeta para futuras expansiones
├── docker-compose.yml     # Configuración de Docker Compose
└── README.md             # Este archivo
```

## Desarrollo

### Backend (FastAPI)

```bash
cd app
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

## Contribución

1. Fork el repositorio
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles. 