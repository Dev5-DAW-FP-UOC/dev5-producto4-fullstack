import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import { createServer } from "http"; // [NUEVO] Necesario para unir Express + Socket.io
import { Server } from "socket.io";  // [NUEVO] Librería de WebSockets
import { createHandler } from "graphql-http/lib/use/express";
import { schema } from "./graphql/schema.js";
import { initMongoData } from "./services/almacenajeService.js";
import { connectDB } from "./db/mongoClient.js";

const app = express();
const PORT = process.env.PORT || 4000;

// [NUEVO] Creamos el servidor HTTP explícitamente
const httpServer = createServer(app);

// [NUEVO] Configuración de Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], // Tu Frontend
    credentials: true
  }
});

// Configuración de CORS para Express (igual que antes)
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], 
  credentials: true 
}));

app.use(express.json());

// Sesiones (igual que antes)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secreto_por_defecto",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/volunet",
      ttl: 24 * 60 * 60, 
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: false, 
    },
  })
);

app.get("/", (_req, res) => {
  res.send("API Volunet GraphQL + WebSockets funcionando");
});

// Endpoint GraphQL
app.all(
  "/graphql",
  (req, res, next) => {
    createHandler({
      schema,
      // [CLAVE] Pasamos 'io' al contexto para poder usarlo en los Resolvers
      context: { req, res, io }, 
    })(req, res, next);
  }
);

// Escuchamos conexiones de socket (Opcional, para debug)
io.on("connection", (socket) => {
  console.log("🔌 Nuevo cliente conectado vía WebSocket:", socket.id);
});

async function startServer() {
  try {
    await connectDB();
    await initMongoData();

    // [CAMBIO] Usamos httpServer.listen en vez de app.listen
    httpServer.listen(PORT, () => {
      console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
      console.log(`Endpoint GraphQL en http://localhost:${PORT}/graphql`);
      console.log(`⚡ WebSockets listos`);
    });
  } catch (error) {
    console.error("Error fatal al iniciar el servidor:", error);
  }
}

startServer();