// Configuración
const API_URL = 'http://localhost:8000';

// Elementos del DOM
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegisterBtn = document.getElementById('showRegister');
const closeRegisterBtn = document.getElementById('closeRegister');
const registerModal = document.getElementById('registerModal');

// Funciones de utilidad
function showError(message) {
    alert(message); // En producción, usar un sistema de notificaciones más elegante
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function getToken() {
    return localStorage.getItem('token');
}

function removeToken() {
    localStorage.removeItem('token');
}

// Verificar si el usuario está autenticado
function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
    }
}

// Manejar el login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('username', document.getElementById('email').value);
    formData.append('password', document.getElementById('password').value);

    try {
        const response = await fetch(`${API_URL}/token`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Credenciales inválidas');
        }

        const data = await response.json();
        setToken(data.access_token);
        window.location.href = 'index.html';
    } catch (error) {
        showError(error.message);
    }
});

// Manejar el registro
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userData = {
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        nombre: document.getElementById('regName').value,
        rol: document.getElementById('regRole').value
    };

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            throw new Error('Error en el registro');
        }

        alert('Registro exitoso. Por favor, inicia sesión.');
        registerModal.classList.add('hidden');
        registerForm.reset();
    } catch (error) {
        showError(error.message);
    }
});

// Mostrar modal de registro
showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerModal.classList.remove('hidden');
});

// Cerrar modal de registro
closeRegisterBtn.addEventListener('click', () => {
    registerModal.classList.add('hidden');
    registerForm.reset();
});

// Cerrar modal al hacer clic fuera
registerModal.addEventListener('click', (e) => {
    if (e.target === registerModal) {
        registerModal.classList.add('hidden');
        registerForm.reset();
    }
}); 