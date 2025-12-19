// src/server.js
import session from "express-session";
import "dotenv/config"; // Carga automáticamente .env
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { graphqlHTTP } from "express-graphql";
import { schema, root } from "./graphql/schema.js"; // <--- traer también root
import { initMongoData } from "./services/almacenajeService.js";
import Usuario from "./models/Usuarios.js";
import Voluntariado from "./models/Voluntariados.js";
import Categoria from "./models/Categorias.js";
import { getDb } from "./db/mongoClient.js";
import path from "path";

/**
 * Puerto en el que escucha la API HTTP.
 * Se puede sobreescribir con la variable de entorno `PORT`.
 * @type {number|string}
 */

const app = express();

// Debug route to check server health (must be after app is initialized)
app.get('/test', (req, res) => {
  res.json({ status: 'ok' });
});


// CORS: Permite todos los métodos y headers necesarios para GraphQL y credenciales
app.use(cors({
  origin: 'http://localhost:5500',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Preflight OPTIONS handler for /graphql
app.options('/graphql', cors({
  origin: 'http://localhost:5500',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// SIRVE el frontend desde Express para evitar problemas de CORS y sesión
// (opcional, pero recomendado)
// app.use(express.static(path.join(process.cwd(), 'p2-frontend')));
// Si usas esto, accede a tu app desde http://localhost:4000/index.html

/**
 * Instancia principal de la aplicación Express.
 * @type {import("express").Express}
 */
const PORT = process.env.PORT || 4000;

// Middleware para parsear JSON en peticiones HTTP.
app.use(express.json());

// Configuración de sesiones
app.use(
  session({
    name: "connect.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // 🔴 CLAVE
    cookie: {
      secure: false,          // localhost
      httpOnly: true,         // correcto
      sameSite: "lax",        // 🔴 CLAVE
      maxAge: 1000 * 60 * 60 * 24, // 1 día
    },
  })
);

/**
 * Ruta raíz de la API. Sirve como comprobación rápida
 * de que el servidor Express está levantado.
 */
app.get("/", (_req, res) => {
  res.send("API Volunet GraphQL funcionando");
});

app.get("/test", (req, res) => {
  res.json({ session: req.session });
});

// ======================
// LOGIN / LOGOUT
// ======================

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const usuario = await Usuario.findOne({ email });

  if (!usuario || usuario.password !== password) {
    return res.status(401).json({ error: "Email o contraseña incorrectos" });
  }

  // Guardar datos esenciales en la sesión
  req.session.user = {
    id: usuario.id,
    rol: usuario.rol,
    nombre: usuario.nombre,
  };

  // Guardar datos esenciales en la sesión
  req.session.user = {
    id: usuario.id,
    rol: usuario.rol,
    nombre: usuario.nombre,
  };

  // Guardar datos esenciales en la sesión
  req.session.user = {
    id: usuario.id,
    rol: usuario.rol,
    nombre: usuario.nombre,
  };

  console.log("SESSION ID:", req.sessionID);  // <--- depuración

  req.session.save((err) => {
    if (err) console.log('session save error', err);
    else console.log('session saved for user', req.session.user.nombre);
    res.json({ mensaje: "Login correcto", user: req.session.user });
  });
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "No se pudo cerrar sesión" });
    res.json({ mensaje: "Sesión cerrada" });
  });
});

// ======================
// Middleware de roles
// ======================

export const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: "No autenticado" });
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: "No autenticado" });
  if (req.session.user.rol !== "admin") return res.status(403).json({ error: "Acceso denegado" });
  next();
};

// Ejemplo de ruta protegida
app.get("/usuarios", requireAdmin, async (_req, res) => {
  const usuarios = await Usuario.find();
  res.json(usuarios);
});

/**
 * Endpoint GraphQL.
 * Todas las peticiones a `/graphql` se procesan mediante `graphql-http`.
 */
// GraphQL endpoint: handle POST and GET, with CORS and proper preflight
app.use(
  '/graphql',
  cors({
    origin: 'http://localhost:5500',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
  express.json(),
  graphqlHTTP((req) => ({
    schema,
    rootValue: root,
    context: { user: req.session?.user ?? null },
    graphiql: true,
    customFormatErrorFn: (err) => {
      console.error('GraphQL error:', err);
      return { message: err.message, stack: err.stack };
    },
  }))
);

// Inicializamos datos en MongoDB y después arrancamos el servidor HTTP.
// Conectamos a Mongo
await getDb();

// Inicializamos datos
await initMongoData();

const server = app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`Endpoint GraphQL en http://localhost:${PORT}/graphql`);
});

// WebSockets con Socket.io
const io = new Server(server, { cors: { origin: true, credentials: true } });
io.on('connection', (socket) => {
  console.log('Usuario conectado via WebSocket');
  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
});

// Emitir actualización cuando se inicializan datos
io.emit('voluntariadoUpdated', { message: 'Datos inicializados' });
