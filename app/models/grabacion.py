from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from app.database import Base

class Grabacion(Base):
    __tablename__ = "grabaciones"
    __table_args__ = {"schema": "auditoria_ia"}

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("auditoria_ia.usuarios.id"))
    cliente_id = Column(Integer, ForeignKey("auditoria_ia.clientes.id"))
    nombre_archivo = Column(String(255), nullable=False)
    ruta_archivo = Column(String(255), nullable=False)
    duracion = Column(Integer)  # en segundos
    fecha_grabacion = Column(DateTime)
    estado = Column(String(50), default="pendiente")  # 'pendiente', 'procesando', 'completado', 'error'
    metadatos = Column(JSON)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relaciones
    usuario = relationship("Usuario", back_populates="grabaciones")
    cliente = relationship("Cliente", back_populates="grabaciones")
    analisis = relationship("Analisis", back_populates="grabacion") 
