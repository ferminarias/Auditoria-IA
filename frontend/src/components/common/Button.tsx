import React from 'react';

/**
 * Props del componente Button
 * @interface ButtonProps
 * @property {string} variant - Variante del botón ('primary' | 'secondary' | 'danger')
 * @property {boolean} isLoading - Indica si el botón está en estado de carga
 * @property {string} type - Tipo del botón ('button' | 'submit' | 'reset')
 * @property {React.ReactNode} children - Contenido del botón
 * @property {() => void} onClick - Función que se ejecuta al hacer clic
 * @property {boolean} disabled - Indica si el botón está deshabilitado
 * @property {string} className - Clases CSS adicionales para el botón
 */
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Componente Button reutilizable
 * 
 * @example
 * // Botón primario
 * <Button variant="primary" onClick={() => console.log('click')}>
 *   Hacer clic
 * </Button>
 * 
 * // Botón con estado de carga y clases personalizadas
 * <Button isLoading className="w-full mt-4">
 *   Procesando...
 * </Button>
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  type = 'button',
  children,
  onClick,
  disabled = false,
  className = '',
}) => {
  // Estilos base del botón
  const baseStyles = "px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors";
  
  // Estilos según la variante
  const variantStyles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    secondary: "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };

  // Estilos para estado deshabilitado
  const disabledStyles = "opacity-50 cursor-not-allowed";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${(disabled || isLoading) ? disabledStyles : ''}
        ${className}
      `}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span className="ml-2">Cargando...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}; 