from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from app.database import Base

class Analisis(Base):
    __tablename__ = "analisis"
    __table_args__ = {"schema": "auditoria_ia"}

    id = Column(Integer, primary_key=True, index=True)
    grabacion_id = Column(Integer, ForeignKey("auditoria_ia.grabaciones.id"))
    tipo_analisis = Column(String(50), nullable=False)  # 'sentimiento', 'emoción', 'categorización'
    resultado = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=func.now())

    # Relaciones
    grabacion = relationship("Grabacion", back_populates="analisis") 