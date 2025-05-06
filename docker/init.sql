-- Crear el esquema
CREATE SCHEMA IF NOT EXISTS auditoria_ia;

-- Crear las tablas
CREATE TABLE auditoria_ia.clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auditoria_ia.usuarios (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES auditoria_ia.clientes(id),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auditoria_ia.grabaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES auditoria_ia.usuarios(id),
    cliente_id INTEGER REFERENCES auditoria_ia.clientes(id),
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(255) NOT NULL,
    duracion INTEGER,
    fecha_grabacion TIMESTAMP,
    estado VARCHAR(50) DEFAULT 'pendiente',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auditoria_ia.analisis (
    id SERIAL PRIMARY KEY,
    grabacion_id INTEGER REFERENCES auditoria_ia.grabaciones(id),
    tipo_analisis VARCHAR(50) NOT NULL,
    resultado JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auditoria_ia.permisos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES auditoria_ia.usuarios(id),
    tipo_permiso VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 
