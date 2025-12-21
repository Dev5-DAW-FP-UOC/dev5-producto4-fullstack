import "dotenv/config";
import express from "express";
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

const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("[socket] cliente conectado:", socket.id);

  // AQUÍ va el join (cuando el cliente avisa quién es)
  socket.on("join", ({ userId, rol }) => {
    if (rol === "admin") socket.join("admins");
    if (userId) socket.join(`user:${userId}`);
  });

  socket.on("disconnect", () => {
    console.log("[socket] cliente desconectado:", socket.id);
  });
});



app.use(express.json());

app.use(
  cors({
    origin: ["http://127.0.0.1:5500", "http://localhost:5500"],
    credentials: true, // necesario para cookies/sesión
  })
);

// (opcional pero recomendado) responder preflight
app.options(/.*/, cors());



app.use(sessionMiddleware());

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

app.get("/", (_req, res) => res.send("API Volunet GraphQL funcionando"));

app.all(
  "/graphql",
  createHandler({
    schema,
    context: (req, res) => ({
      req: req.raw, // ✅ aquí vive req.session (express-session lo engancha aquí en graphql-http)
      res,          // ✅ Express res (tiene clearCookie)
      io,
    }),
  })
);




// ✅ 1) conectar primero
await connectMongoose();

// ✅ 2) luego seed
await initMongoData();

// app.listen(PORT, () => {
//   console.log(`Servidor escuchando en http://localhost:${PORT}`);
//   console.log(`Endpoint GraphQL en http://localhost:${PORT}/graphql`);
// });


server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`Endpoint GraphQL en http://localhost:${PORT}/graphql`);
});
