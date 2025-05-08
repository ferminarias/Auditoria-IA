import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_URLS } from '../config';

// Crear instancia de axios
const api: AxiosInstance = axios.create({
  baseURL: API_URLS.BASE,
  withCredentials: true, // Importante para las cookies
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api; 