from sqlalchemy.orm import declarative_base

Base = declarative_base()

from .cliente import Cliente
from .usuario import Usuario
from .grabacion import Grabacion
from .analisis import Analisis
from .permiso import Permiso
