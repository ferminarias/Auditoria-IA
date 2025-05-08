import { API_URLS } from '../config';

/**
 * Interfaz para la respuesta de login
 */
interface LoginResponse {
  access_token: string;
  token_type: string;
}

/**
 * Interfaz para los datos de login
 */
interface LoginData {
  username: string; // FastAPI OAuth2 espera 'username' en lugar de 'email'
  password: string;
}

/**
 * Función para iniciar sesión
 * @param {LoginData} data - Datos de login (email y password)
 * @returns {Promise<LoginResponse>} Respuesta del servidor con token y datos del usuario
 * @throws {Error} Si hay un error en la petición
 */
export const login = async (data: LoginData): Promise<LoginResponse> => {
  try {
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);

    const response = await fetch(`${API_URLS.AUTH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
      credentials: 'include', // Importante para las cookies
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al iniciar sesión');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Error al iniciar sesión');
  }
};

/**
 * Función para cerrar sesión
 * @returns {Promise<void>}
 */
export const logout = async (): Promise<void> => {
  try {
    await fetch(`${API_URLS.BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
};

/**
 * Función para verificar si el token es válido
 * @returns {Promise<boolean>} true si el token es válido, false en caso contrario
 */
export const verifyToken = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URLS.BASE}/auth/verify`, {
      credentials: 'include',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}; 