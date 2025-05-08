// Configuración
const API_URL = 'http://34.55.18.0:8000/api';
const AUTH_URL = 'http://34.55.18.0:8000';

// Funciones de utilidad
function showError(message, duration = APP_CONFIG.ERROR_MESSAGE_DURATION) {
    console.error('Error:', message);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, duration);
}

function setToken(token) {
    if (!token) {
        console.error('Intento de guardar token inválido');
        return;
    }
    localStorage.setItem('token', token);
}

function getToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('No se encontró token en localStorage');
    }
    return token;
}

function removeToken() {
    localStorage.removeItem('token');
}

// Función para hacer peticiones autenticadas
async function fetchWithAuth(url, options = {}) {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('No hay token de autenticación');
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
        
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        if (response.status === 401) {
            removeToken();
            window.location.href = APP_CONFIG.ROUTES.LOGIN;
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Error en la petición: ${response.status}`);
        }
        
        return response;
    } catch (error) {
        console.error('Error en fetchWithAuth:', error);
        showError(error.message);
        throw error;
    }
}

// Verificar si el usuario está autenticado
function checkAuth() {
    const token = getToken();
    if (!token) {
        console.warn('Redirigiendo a login por falta de autenticación');
        window.location.href = APP_CONFIG.ROUTES.LOGIN;
    }
}

// Manejar el login
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password) {
                showError('Por favor, completa todos los campos');
                return;
            }

            try {
                const formData = new FormData();
                formData.append('username', email);
                formData.append('password', password);

                const response = await fetch(`${AUTH_URL}/token`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || 'Credenciales inválidas');
                }

                const data = await response.json();
                if (!data.access_token) {
                    throw new Error('No se recibió token de acceso');
                }

                setToken(data.access_token);
                window.location.href = APP_CONFIG.ROUTES.HOME;
            } catch (error) {
                console.error('Error en login:', error);
                showError(error.message);
            }
        });
    }
});

async function loadStats() {
    try {
        const response = await fetchWithAuth(`${API_URL}/recordings/stats`);
        if (!response.ok) throw new Error('Error al cargar estadísticas');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        showError('No se pudieron cargar las estadísticas');
        return null;
    }
} 
