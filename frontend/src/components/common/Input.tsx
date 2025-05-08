import React from 'react';

/**
 * Props del componente Input
 * @interface InputProps
 * @property {string} id - Identificador único del input
 * @property {string} name - Nombre del campo
 * @property {string} type - Tipo de input ('text' | 'email' | 'password' | 'number')
 * @property {string} value - Valor del input
 * @property {string} placeholder - Texto de placeholder
 * @property {boolean} required - Indica si el campo es requerido
 * @property {string} error - Mensaje de error
 * @property {boolean} disabled - Indica si el input está deshabilitado
 * @property {string} className - Clases CSS adicionales
 * @property {(e: React.ChangeEvent<HTMLInputElement>) => void} onChange - Función que maneja cambios
 * @property {string} autoComplete - Valor para el atributo autoComplete
 */
interface InputProps {
  id: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number';
  value: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
}

/**
 * Componente Input reutilizable
 * 
 * @example
 * // Input básico
 * <Input
 *   id="email"
 *   name="email"
 *   type="email"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   placeholder="Correo electrónico"
 * />
 * 
 * // Input con error
 * <Input
 *   id="password"
 *   name="password"
 *   type="password"
 *   value={password}
 *   onChange={(e) => setPassword(e.target.value)}
 *   error="La contraseña es requerida"
 * />
 */
export const Input: React.FC<InputProps> = ({
  id,
  name,
  type = 'text',
  value,
  placeholder,
  required = false,
  error,
  disabled = false,
  className = '',
  onChange,
  autoComplete,
}) => {
  const baseStyles = "appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:z-10 sm:text-sm";
  const borderStyles = error 
    ? "border-red-300 focus:ring-red-500 focus:border-red-500" 
    : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500";
  const disabledStyles = disabled ? "bg-gray-100 cursor-not-allowed" : "";

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        onChange={onChange}
        autoComplete={autoComplete}
        className={`
          ${baseStyles}
          ${borderStyles}
          ${disabledStyles}
          ${className}
        `}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}; 