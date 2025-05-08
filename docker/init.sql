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
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('admin', 'auditor', 'supervisor')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auditoria_ia.grabaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES auditoria_ia.usuarios(id),
    cliente_id INTEGER REFERENCES auditoria_ia.clientes(id),
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(255) NOT NULL,
    duracion INTEGER CHECK (duracion > 0),
    fecha_grabacion TIMESTAMP,
    estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'procesando', 'completado', 'error')),
    metadatos JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auditoria_ia.analisis (
    id SERIAL PRIMARY KEY,
    grabacion_id INTEGER REFERENCES auditoria_ia.grabaciones(id),
    tipo_analisis VARCHAR(50) NOT NULL CHECK (tipo_analisis IN ('sentimiento', 'emoción', 'categorización')),
    resultado JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auditoria_ia.permisos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES auditoria_ia.usuarios(id),
    tipo_permiso VARCHAR(50) NOT NULL CHECK (tipo_permiso IN ('lectura', 'escritura', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX idx_usuarios_email ON auditoria_ia.usuarios(email);
CREATE INDEX idx_usuarios_cliente_id ON auditoria_ia.usuarios(cliente_id);
CREATE INDEX idx_grabaciones_usuario_id ON auditoria_ia.grabaciones(usuario_id);
CREATE INDEX idx_grabaciones_cliente_id ON auditoria_ia.grabaciones(cliente_id);
CREATE INDEX idx_grabaciones_estado ON auditoria_ia.grabaciones(estado);
CREATE INDEX idx_analisis_grabacion_id ON auditoria_ia.analisis(grabacion_id);
CREATE INDEX idx_permisos_usuario_id ON auditoria_ia.permisos(usuario_id);

-- Crear índices para búsqueda en JSONB
CREATE INDEX idx_grabaciones_metadatos ON auditoria_ia.grabaciones USING gin (metadatos);
CREATE INDEX idx_analisis_resultado ON auditoria_ia.analisis USING gin (resultado);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION auditoria_ia.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para updated_at
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON auditoria_ia.clientes
    FOR EACH ROW
    EXECUTE FUNCTION auditoria_ia.update_updated_at_column();

CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON auditoria_ia.usuarios
    FOR EACH ROW
    EXECUTE FUNCTION auditoria_ia.update_updated_at_column();

CREATE TRIGGER update_grabaciones_updated_at
    BEFORE UPDATE ON auditoria_ia.grabaciones
    FOR EACH ROW
    EXECUTE FUNCTION auditoria_ia.update_updated_at_column(); 
