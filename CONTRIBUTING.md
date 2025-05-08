# Guía de Contribución

¡Gracias por tu interés en contribuir a nuestro proyecto! Aquí hay algunas pautas para ayudarte a contribuir.

## Cómo Contribuir

1. **Fork y Clone**
   - Haz fork del repositorio
   - Clona tu fork localmente
   ```bash
   git clone https://github.com/tu-usuario/auditoria-ia.git
   ```

2. **Configuración del Entorno**
   - Instala las dependencias del backend:
   ```bash
   cd app
   python -m venv venv
   source venv/bin/activate  # En Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
   - Instala las dependencias del frontend:
   ```bash
   cd frontend
   npm install
   ```

3. **Crear una Rama**
   - Crea una rama para tu feature:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```

4. **Desarrollo**
   - Sigue las convenciones de código
   - Escribe tests para tu código
   - Asegúrate de que todos los tests pasen
   - Actualiza la documentación si es necesario

5. **Commit**
   - Usa mensajes de commit descriptivos
   - Sigue el formato: `tipo(alcance): descripción`
   - Ejemplo: `feat(auth): agregar autenticación con Google`

6. **Pull Request**
   - Actualiza tu fork con los últimos cambios
   - Crea un Pull Request
   - Describe los cambios y su propósito
   - Espera la revisión

## Convenciones de Código

### Python (Backend)
- Sigue PEP 8
- Usa type hints
- Documenta funciones y clases
- Escribe docstrings

### JavaScript/TypeScript (Frontend)
- Sigue el estilo de Airbnb
- Usa TypeScript cuando sea posible
- Documenta componentes y funciones
- Usa ESLint y Prettier

## Estructura de Commits

```
tipo(alcance): descripción

[opcional: cuerpo más detallado]

[opcional: pie de página]
```

Tipos:
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato
- `refactor`: Refactorización de código
- `test`: Agregar o modificar tests
- `chore`: Cambios en tareas de construcción

## Proceso de Revisión

1. Todos los PRs serán revisados
2. Los revisores pueden solicitar cambios
3. Una vez aprobado, el PR será mergeado

## Reportar Bugs

1. Usa el sistema de issues de GitHub
2. Incluye:
   - Descripción del bug
   - Pasos para reproducir
   - Comportamiento esperado
   - Comportamiento actual
   - Screenshots si aplica
   - Versión del sistema

## Sugerencias de Mejoras

1. Usa el sistema de issues de GitHub
2. Describe la mejora propuesta
3. Explica por qué sería útil
4. Sugiere una implementación si es posible

## Contacto

Si tienes preguntas, contacta a:
- Email: [tu-email@ejemplo.com]
- GitHub: [@tu-usuario] 