# Producto 2 – Aplicación de Voluntariado (Frontend con APIs HTML5)

Este proyecto forma parte del **Producto 2** del módulo de *Desarrollo Frontend con JavaScript*.

El objetivo es crear la parte visible de una aplicación de voluntariado mejorando la interacción mediante el uso de **APIs HTML5**, **LocalStorage** e **IndexedDB**, aplicando Bootstrap para el diseño y modularización del código con ES Modules.

---

## Estructura del proyecto

```
/index.html
/login.html
/users.html
/volunteers.html
/dashboard.html
/js/
 ├─ storage.js        # Módulo de almacenamiento local (localStorage)
 ├─ login.js          # Manejo del inicio de sesión
 ├─ users.js          # Alta, listado y borrado de usuarios
 ├─ volunteers.js     # Gestión de voluntariados (IndexedDB)
 └─ dashboard.js      # Panel con tarjetas y arrastrar/soltar
/css/
 └─ bootstrap.min.css
```

---

## Funcionalidades principales

### Login (`login.html`)
- Permite al usuario iniciar sesión con su **correo y contraseña**.
- Valida los datos usando funciones del módulo `storage.js`.
- Guarda el usuario activo en **localStorage**.
- Muestra el mensaje **"Inicio de sesión exitoso"** y actualiza la barra de navegación.
- Persiste el usuario activo al cambiar de página.

### Usuarios (`users.html`)
- Alta, listado y eliminación de usuarios con validaciones básicas.
- Guarda los usuarios en **localStorage**.
- Si el usuario eliminado estaba logueado, se cierra su sesión automáticamente.
- Interfaz moderna con **Bootstrap** y alertas dinámicas.

### Voluntariados (`volunteers.html`)
- Formulario para crear y consultar voluntariados.
- Guarda la información en **IndexedDB**.
- Completa automáticamente el email del usuario activo.
- Muestra un gráfico HTML5 con el total de voluntariados.

### Dashboard (`dashboard.html`)
- Muestra las tarjetas de voluntariados creados.
- Permite **arrastrar y soltar (Drag & Drop)** para seleccionar.
- Refleja la sesión activa del usuario en la navbar.

### Gráfico HTML5 (Canvas)
- En la página de **Voluntariados** se genera un **gráfico dinámico en Canvas** que muestra el número de voluntariados por tipo (peticiones y ofertas).
- Se programa de forma nativa usando la API de **CanvasRenderingContext2D**.

### Arrastrar y Soltar (Drag & Drop)
- En el **Dashboard** se implementa la funcionalidad de **arrastrar y soltar (Drag & Drop)** para seleccionar voluntariados.
- Utiliza los eventos nativos `dragstart`, `dragover`, `drop` y `dragend` para manejar la interacción del usuario.


---

## Persistencia de datos

| Tipo de dato     | Tecnología usada | Clave / almacenamiento |
|------------------|------------------|-------------------------|
| Usuarios         | `localStorage`   | `volunet:users`         |
| Usuario activo   | `localStorage`   | `volunet:active_email`  |
| Voluntariados    | `IndexedDB`      | `volunet_db` (obj.store `volunteers`) |

Los datos se almacenan solo en el navegador, por lo tanto, **no hay conexión con servidor** ni soporte multiusuario real.

---

## Cómo ejecutar el proyecto

1. Clonar o descargar este repositorio.
2. Abrir una terminal en la carpeta raíz.
3. Iniciar un servidor local (por ejemplo con VS Code Live Server):
4. Abrir `http://127.0.0.1:5500/login.html` en el navegador.
5. Crear un usuario en **Usuarios** → iniciar sesión → comprobar persistencia en las demás páginas.
6. En **Voluntariados**, crear varios registros para visualizar el **gráfico Canvas** con el conteo de peticiones y ofertas.
7. En **Dashboard**, probar la funcionalidad de **arrastrar y soltar (Drag & Drop)** moviendo las tarjetas de voluntariados entre los contenedores.

---

## Conocimientos aplicados
- **JavaScript ES6+** (módulos, funciones asíncronas)
- **Bootstrap 5**
- **localStorage** e **IndexedDB**
- **Eventos DOM y manejo de formularios**
- **Programación modular**
- **Buenas prácticas de UI con feedback al usuario**

---

## Autor/a
Proyecto desarrollado por Dev5 como parte del módulo **FP067 – Frontend con JavaScript (Producto 2)**.  
Tutor/a: Gemma Pinyol Soto.

---