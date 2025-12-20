// src/server.js
import session from "express-session";
import "dotenv/config"; // Carga automáticamente .env
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { graphqlHTTP } from "express-graphql";
import { schema, root } from "./graphql/schema.js"; // <--- traer también root
import { initMongoData, guardarSeleccionado, borrarSeleccionado, seleccionadosPorUsuario } from "./services/almacenajeService.js";
import Seleccionado from "./models/Seleccionados.js";
import Usuario from "./models/Usuarios.js";
import Voluntariado from "./models/Voluntariados.js";
import Categoria from "./models/Categorias.js";
import { getDb } from "./db/mongoClient.js";
import path from "path";

// Mongoose connection
try {
  // puerto dinamico import para compatibilidad CJS/ESM
  const m = await import('./db/mongoose.js');
  await (m.connect ? m.connect() : (m.default && m.default.connect ? m.default.connect() : Promise.reject(new Error('connect not found'))));
  console.log('Mongoose initialized via ./db/mongoose.js');
} catch (err) {
  console.error('Failed to connect to MongoDB via Mongoose', err);
  process.exit(1);
}

/**
 * Puerto en el que escucha la API HTTP.
 * Se puede sobreescribir con la variable de entorno `PORT`.
 * @type {number|string}
 */

const app = express();


// CORS: Permite todos los métodos y headers necesarios para GraphQL y credenciales
// Permite solicitudes desde el frontend en localhost:5500
const allowedOrigins = ['http://localhost:5500', 'http://127.0.0.1:5500'];
// Permite solicitudes desde el servidor GraphQL en localhost:4000
allowedOrigins.push('http://localhost:4000');

// Logs de cada petición HTTP
app.use((req, res, next) => {
  if (req.path.startsWith('/graphql') || req.headers.origin) {
    console.log(`[HTTP] ${req.method} ${req.path} Origin:${req.headers.origin || 'none'} Content-Type:${req.headers['content-type'] || 'none'}`);
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    // Permite herramientas / solicitudes del lado del servidor cuando el origen es indefinido
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.includes(origin);
    return callback(null, allowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// OPTIONS handler for /graphql
app.options('/graphql', cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Express sirve archivos estáticos desde p2-frontend
app.use(express.static(path.join(process.cwd(), 'p2-frontend')));
// Frontend en http://localhost:4000/dashboard.html (or index.html)

/**
 * Instancia principal de la aplicación Express.
 * @type {import("express").Express}
 */
const PORT = process.env.PORT || 4000;

// Middleware para parsear JSON en peticiones HTTP.
app.use(express.json());

// Configuración de sesiones
// Asegrura SameSite=Lax y cookies HTTPOnly para mayor seguridad
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_local_secret_9f3c1b2a5d7e4c1f';
if (!process.env.SESSION_SECRET) console.warn('WARNING: using default SESSION_SECRET; set SESSION_SECRET in .env for production');

app.use(
  session({
    name: "connect.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false, 
    cookie: {
      secure: false,          // localhost
      httpOnly: true,         // correcto
      sameSite: "lax",        
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
  if (!usuario) return res.status(401).json({ error: "Email o contraseña incorrectos" });
  // comparar contraseña hasheada
  try {
    const bcryptMod = await import('bcryptjs');
    const bcrypt = bcryptMod && bcryptMod.default ? bcryptMod.default : bcryptMod;
    const match = await bcrypt.compare(String(password), String(usuario.password));
    if (!match) return res.status(401).json({ error: "Email o contraseña incorrectos" });
  } catch (err) {
    console.error('bcrypt compare failed', err);
    return res.status(500).json({ error: 'Internal error' });
  }

  // Guardar datos esenciales en la sesión
  req.session.user = {
    id: usuario.id,
    email: usuario.email,
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
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      return callback(null, allowedOrigins.includes(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
  express.json(),
  graphqlHTTP((req) => ({
    schema,
    rootValue: root,
    context: { req, user: req.session?.user ?? null },
    graphiql: true,
    customFormatErrorFn: (err) => {
      console.error('GraphQL error:', err);
      return { message: err.message, stack: err.stack };
    },
  }))
);

// JSON errores handling for /graphql
app.use((err, req, res, next) => {
  if (req.path && req.path.startsWith('/graphql')) {
    console.error('GraphQL route error:', err && err.message);
    // Devuleve error JSON
    return res.status(500).json({ message: err?.message || 'Internal Server Error' });
  }
  next(err);
});

// Inicializamos datos en MongoDB y después arrancamos el servidor HTTP.
// Conectamos a Mongo
await getDb();

// Inicializamos datos
await initMongoData();

const server = app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`Endpoint GraphQL en http://localhost:${PORT}/graphql`);
});

// Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  }
});
app.locals.io = io;
io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected', socket.id));
});

// Emitir actualización cuando se inicializan datos
if (app.locals.io) {
  app.locals.io.emit('voluntariadoUpdated', { message: 'Datos inicializados' });
}

// ======================
// SELECCIONADOS - REST API
// ======================

// Create a selection for current user
app.post('/seleccionados', requireAuth, express.json(), async (req, res) => {
  const userId = req.session.user.id;
  const { id_voluntariado } = req.body;
  try {
    const created = await guardarSeleccionado(userId, Number(id_voluntariado));
    // Notify other clients
    if (app.locals.io) app.locals.io.emit('seleccionado:created', { userId, id_voluntariado: Number(id_voluntariado), seleccionId: created.id });
    res.json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Borrar selección por id_voluntariado para el usuario actual
app.delete('/seleccionados/byVol/:idVol', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const idVol = Number(req.params.idVol);
  try {
    const sel = await Seleccionado.findOne({ id_usuario: userId, id_voluntariado: idVol }).lean();
    if (!sel) return res.status(404).json({ error: 'Seleccion no encontrada' });
    const ok = await borrarSeleccionado(sel.id);
    if (ok && app.locals.io) app.locals.io.emit('seleccionado:deleted', { userId, id_voluntariado: idVol, seleccionId: sel.id });
    res.json({ deleted: ok });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Listar seleccionados del usuario actual
app.get('/seleccionados', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const list = await seleccionadosPorUsuario(userId);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
