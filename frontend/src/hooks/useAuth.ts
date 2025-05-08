import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { login as loginService, logout as logoutService, verifyToken } from '../services/auth';

/**
 * Hook personalizado para manejar la autenticación
 * 
 * @returns {Object} Objeto con funciones y estado de autenticación
 * @property {boolean} isAuthenticated - Indica si el usuario está autenticado
 * @property {boolean} isLoading - Indica si hay una operación en curso
 * @property {string | null} error - Mensaje de error si existe
 * @property {Function} login - Función para iniciar sesión
 * @property {Function} logout - Función para cerrar sesión
 * @property {Function} clearError - Función para limpiar el mensaje de error
 */
interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Verificar el estado de autenticación al cargar
  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const isValid = await verifyToken();
        if (isMounted) {
          setIsAuthenticated(isValid);
        }
      } catch (error) {
        if (isMounted) {
          setIsAuthenticated(false);
          setError('Sesión expirada');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Interceptor para manejar errores de autenticación
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          setIsAuthenticated(false);
          setError('Sesión expirada');
          navigate('/login', { 
            state: { from: window.location.pathname },
            replace: true 
          });
        } else if (error.response?.status === 403) {
          setError('No tienes permisos para acceder a este recurso');
        } else if (error.response?.status === 500) {
          setError('Error del servidor. Por favor, intenta más tarde');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [navigate]);

  /**
   * Función para iniciar sesión
   * @param {string} username - Nombre de usuario del usuario
   * @param {string} password - Contraseña del usuario
   */
  const login = async (username: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      await loginService({ username, password });
      setIsAuthenticated(true);
      
      // Obtener la ruta anterior del estado de navegación
      const from = (window.history.state?.from as string) || '/';
      navigate(from, { replace: true });
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else if (typeof error === 'string') {
        setError(error);
      } else {
        setError('Error al iniciar sesión');
      }
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Función para cerrar sesión
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      await logoutService();
      setIsAuthenticated(false);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setError('Error al cerrar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
    error,
    clearError
  };
}; 