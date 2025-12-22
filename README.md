# Producto 4 – Aplicación FullStack (Dev5)

## Descripción
Este repositorio contiene la aplicación **FullStack**, integrando el FrontEnd y Backend en una solución completa.  
Se añadirá comunicación asíncrona con **Fetch API** y **WebSockets** para funcionalidades colaborativas en tiempo real.

## Objetivos
- Integrar el FrontEnd y Backend en una sola aplicación.
- Usar **Fetch API** para comunicación cliente-servidor.
- Implementar **WebSockets** con `socket.io` para trabajo colaborativo.
- Preparar la aplicación para su defensa y presentación final.

## Estado
En construcción 🚧

## Cómo arrancar el proyecto

Hay dos formas de ejecutar la aplicación: con Docker (recomendado para entornos replicables) o de forma local con `npm`.

1) Con Docker (construir y ejecutar):

```bash
# Construir la imagen y dependencias (desde la raíz del proyecto)
docker-compose build

# Arrancar los servicios en segundo plano
docker-compose up -d

# Ver logs (opcional)
docker-compose logs -f
```

Después de levantar los contenedores, la API y el servidor sirven el frontend estático. Abre en el navegador:

- Frontend / UI: http://localhost:4000/
- Endpoint GraphQL: http://localhost:4000/graphql

2) Sin Docker (ejecución local con Node):

```bash
# Instala dependencias
npm install

# Arranca el servidor (escucha por defecto en 4000)
npm start
```

Abre la UI en `http://localhost:4000/` y las páginas concretas:

- Login: http://localhost:4000/login.html
- Dashboard: http://localhost:4000/dashboard.html
- Usuarios: http://localhost:4000/usuarios.html
- Voluntariados: http://localhost:4000/voluntariados.html

Notas rápidas:
- El backend usa sesiones servidor-side; sirve `p2-frontend/` como estático para evitar problemas de CORS/ cookies cuando abres la UI desde el mismo origen.
- Socket.IO está disponible y el cliente se conecta a `http://localhost:4000` (ver `p2-frontend/js/int_dashboard.js`).
- No dejes opciones de desarrollo habilitadas (como permitir listar usuarios públicamente) en entornos de producción.

