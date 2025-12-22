// src/server.js
import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import { createHandler } from "graphql-http/lib/use/express";
import { schema } from "./graphql/schema.js";
import { initMongoData } from "./services/almacenajeService.js";
import { sessionMiddleware } from "./auth/session.js";
import { connectMongoose } from "./db/mongoose.js";

import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

console.log("SERVER.JS CARGADO ✅");

const app = express();
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// =============================
// Rutas / paths (ESM)
// =============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Carpeta del frontend estático
const FRONTEND_DIR = path.join(__dirname, "../p2-frontend");

// ✅ Permitir cualquier origen localhost/127.0.0.1 (cualquier puerto) en desarrollo
const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Postman/cURL o mismo origen
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
};

// =============================
// Socket.IO
// =============================
const io = new SocketIOServer(server, {
  // ✅ Permite front servido desde 4000 o desde Live Server (cualquier puerto) en local
  cors: {
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("[socket] cliente conectado:", socket.id);

  // join por rol/usuario
  socket.on("join", ({ userId, rol }) => {
    // ✅ Room común: cualquier dashboard (da igual usuario/navegador)
    socket.join("dashboards");

    // Rooms opcionales por rol/usuario
    if (rol === "admin") socket.join("admins");
    if (userId) socket.join(`user:${userId}`);
  });

  socket.on("disconnect", () => {
    console.log("[socket] cliente desconectado:", socket.id);
  });
});

// =============================
// Middlewares base
// =============================
app.use(express.json());

// ✅ CORS Express (GraphQL / fetch)
app.use(
  cors({
    origin(origin, cb) {
      return cb(null, isAllowedOrigin(origin));
    },
    credentials: true,
  })
);

app.options(/.*/, cors());

// ✅ Sesiones
app.use(sessionMiddleware());

// =============================
// Frontend estático (sin Live Server)
// =============================
app.use(express.static(FRONTEND_DIR));

app.get("/", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

// =============================
// Debug / API
// =============================
app.get("/debug-session", (req, res) => {
  req.session.user = { id: 999, rol: "debug" };
  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    sessionID: req.sessionID,
    cookieName: req.session?.cookie?.name,
    user: req.session.user,
  });
});

// ✅ GraphQL
app.all(
  "/graphql",
  createHandler({
    schema,
    context: (req, res) => ({
      req: req.raw, // ✅ aquí vive req.session para graphql-http
      res, // ✅ Express res (tiene clearCookie)
      io,
    }),
  })
);

// =============================
// Arranque + seed
// =============================
await connectMongoose();
await initMongoData();

server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`Endpoint GraphQL en http://localhost:${PORT}/graphql`);
});
