from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = {"schema": "auditoria_ia"}

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("auditoria_ia.clientes.id"))
    nombre = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(50), nullable=False)  # 'admin', 'auditor', 'supervisor'
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relaciones
    cliente = relationship("Cliente", back_populates="usuarios")
    grabaciones = relationship("Grabacion", back_populates="usuario")
    permisos = relationship("Permiso", back_populates="usuario") 