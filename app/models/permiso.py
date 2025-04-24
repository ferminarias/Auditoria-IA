from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class Permiso(Base):
    __tablename__ = "permisos"
    __table_args__ = {"schema": "auditoria_ia"}

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("auditoria_ia.usuarios.id"))
    tipo_permiso = Column(String(50), nullable=False)  # 'lectura', 'escritura', 'admin'
    created_at = Column(DateTime, default=func.now())

    # Relaciones
    usuario = relationship("Usuario", back_populates="permisos") 