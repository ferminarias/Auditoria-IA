#!/bin/bash

# Instalar dependencias
npm install

# Crear archivo de configuración de PostCSS
echo "module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}" > postcss.config.js

# Crear archivo de estilos base
mkdir -p src/styles
echo "@tailwind base;
@tailwind components;
@tailwind utilities;" > src/styles/index.css

# Crear archivo index.html
echo '<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NODS Calidad</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>' > index.html

# Crear archivo principal
echo 'import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);' > src/main.tsx 