from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr

Base = declarative_base()

# Modelos SQLAlchemy
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String)
    role = Column(String, default="user")
    created_at = Column(DateTime, default=datetime.now)
    recordings = relationship("Recording", back_populates="user")

class Recording(Base):
    __tablename__ = "recordings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String)
    duration = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    status = Column(String, default="pending")
    metadata = Column(JSON, nullable=True)
    user = relationship("User", back_populates="recordings")
    analysis = relationship("Analysis", back_populates="recording")

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    recording_id = Column(Integer, ForeignKey("recordings.id"))
    result = Column(JSON)
    created_at = Column(DateTime, default=datetime.now)
    recording = relationship("Recording", back_populates="analysis")

# Modelos Pydantic
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "user"

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class RecordingBase(BaseModel):
    filename: str
    duration: Optional[float] = None
    status: str = "pending"
    metadata: Optional[dict] = None

class RecordingCreate(RecordingBase):
    pass

class Recording(RecordingBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class AnalysisBase(BaseModel):
    result: dict

class AnalysisCreate(AnalysisBase):
    pass

class Analysis(AnalysisBase):
    id: int
    recording_id: int
    created_at: datetime

    class Config:
        from_attributes = True 