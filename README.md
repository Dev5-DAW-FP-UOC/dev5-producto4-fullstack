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

## Desarrollo local — sesión y CRUD de usuarios

Por defecto la API usa sesiones en servidor. Para que el frontend use las mismas cookies de sesión y permita crear/listar/editar/borar usuarios desde la UI, acceder a la UI desde el mismo origen del servidor es la forma más sencilla:

- Abre la app en: http://localhost:4000/login.html  (el servidor ya sirve `p2-frontend/` como estático)

Si quieres depurar sin servir el frontend desde el mismo origen (ej. usando `Live Server` en `localhost:5500`), el navegador puede bloquear la cookie de sesión. Para pruebas rápidas puedes arrancar el servidor permitiendo el listado público de usuarios (solo para desarrollo):

Windows PowerShell:

```powershell
$env:ALLOW_PUBLIC_USERS='1'
npm start
```

Linux / macOS:

```bash
ALLOW_PUBLIC_USERS=1 npm start
```

Esto habilita temporalmente que la consulta `usuarios` devuelva la lista aunque no exista sesión. No uses esta opción en un entorno de producción.

