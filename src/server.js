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

// =============================
// Socket.IO
// =============================
const io = new SocketIOServer(server, {
  // Si frontend y backend van en el mismo origen (localhost:4000),
  // esto realmente no es necesario, pero lo dejamos “seguro”.
  cors: {
    origin: ["http://localhost:4000", "http://127.0.0.1:4000"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("[socket] cliente conectado:", socket.id);

  // join por rol/usuario
  socket.on("join", ({ userId, rol }) => {
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

// ✅ CORS: si todo va en localhost:4000, no lo necesitas.
// Lo dejamos para que no falle si alguna vez abres el front desde otro origen.
// Importante: permitir requests sin header Origin (Postman/cURL).
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      const allowed = ["http://localhost:4000", "http://127.0.0.1:4000"];
      return cb(null, allowed.includes(origin));
    },
    credentials: true,
  })
);

// (opcional) preflight
app.options(/.*/, cors());

// ✅ Sesiones
app.use(sessionMiddleware());

// =============================
// Frontend estático (sin Live Server)
// =============================

// ✅ Sirve archivos estáticos: /login.html, /dashboard.html, /css/*, /js/*, etc.
app.use(express.static(FRONTEND_DIR));

// ✅ Página por defecto: cambia a "login.html" si esa es tu entrada
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

// ✅ 1) conectar primero
await connectMongoose();

// ✅ 2) luego seed
await initMongoData();

server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`Endpoint GraphQL en http://localhost:${PORT}/graphql`);
});
