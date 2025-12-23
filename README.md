# Producto 4 – Aplicación FullStack (Dev5)

# Volunet · Plataforma de Voluntariado

Proyecto full stack desarrollado como práctica académica.
Permite gestionar voluntariados con creación, listado, selección y actualización en tiempo real.

---

## 🚀 Guía rápida de ejecución

### 1️⃣ Requisitos previos

- Node.js (v18 o superior)
- npm
- MongoDB en local o mediante Docker
- Navegador web moderno
- Visual Studio Code (recomendado)

---

### 2️⃣ Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd dev5-producto4-fullstack
```

Si trabajas en una rama concreta:

```bash
git checkout nombre-de-la-rama
```

---

### 3️⃣ Arrancar el backend

```bash
cd backend
npm install
npm start
```

Backend disponible en:

```
http://localhost:4000
```

Endpoint GraphQL:

```
http://localhost:4000/graphql
```

MongoDB debe estar activo antes de arrancar el backend.

---

### 4️⃣ Arrancar el frontend

Desde la carpeta `frontend`:

#### Comando 

```bash
npx http-server -p 5500
```

```
http://localhost:5500/dashboard.html
```


---

## 👤 Usuarios de prueba

### Administrador
- Email: admin@volunet.com
- Password: 123456

### Usuario
- Email: ana@volunet.com
- Password: 123456

---

## ⚙️ Funcionalidades

- Autenticación con sesiones
- Roles: administrador y usuario
- CRUD de voluntariados
- Selección con drag & drop
- Dashboard con Canvas
- Tiempo real con Socket.io
- Restricciones por rol
- Interfaz responsive

---

## 🔄 Tiempo real (Socket.io)

El dashboard se actualiza automáticamente cuando:
- Se crea un voluntariado
- Se selecciona o elimina un voluntariado

Para comprobarlo:
1. Abrir dos navegadores distintos
2. Iniciar sesión con usuarios diferentes
3. Crear o seleccionar voluntariados
4. Ver el refresco automático

---

## 🛠 Tecnologías

- Node.js
- Express
- GraphQL
- MongoDB + Mongoose
- Socket.io
- HTML, CSS y JavaScript
- Bootstrap 5

---

© 2025 · Volunet · Proyecto académico